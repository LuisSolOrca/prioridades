import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import connectDB from '@/lib/mongodb';
import LandingPage from '@/models/LandingPage';
import LandingPageView from '@/models/LandingPageView';
import mongoose from 'mongoose';

// GET - Get landing page analytics
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    await connectDB();

    if (!mongoose.Types.ObjectId.isValid(params.id)) {
      return NextResponse.json({ error: 'ID invalido' }, { status: 400 });
    }

    const { searchParams } = new URL(request.url);
    const days = parseInt(searchParams.get('days') || '30');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    const page = await LandingPage.findById(params.id).lean();
    if (!page) {
      return NextResponse.json(
        { error: 'Landing page no encontrada' },
        { status: 404 }
      );
    }

    const pageId = new mongoose.Types.ObjectId(params.id);

    // Date range
    let dateStart: Date | undefined;
    let dateEnd: Date | undefined;

    if (startDate) {
      dateStart = new Date(startDate);
    } else {
      dateStart = new Date();
      dateStart.setDate(dateStart.getDate() - days);
    }

    if (endDate) {
      dateEnd = new Date(endDate);
    }

    // Get analytics data in parallel
    const [
      overallStats,
      trafficSources,
      deviceBreakdown,
      viewsOverTime,
      abTestResults,
    ] = await Promise.all([
      (LandingPageView as any).getPageAnalytics(pageId, dateStart, dateEnd),
      (LandingPageView as any).getTrafficSources(pageId, 10),
      (LandingPageView as any).getDeviceBreakdown(pageId),
      (LandingPageView as any).getViewsOverTime(pageId, days),
      page.abTest?.enabled ? (LandingPageView as any).getABTestResults(pageId) : null,
    ]);

    // Get top pages/referrers
    const topReferrers = await LandingPageView.aggregate([
      {
        $match: {
          pageId,
          referrer: { $exists: true, $nin: [null, ''] },
          createdAt: { $gte: dateStart },
        },
      },
      {
        $group: {
          _id: '$referrer',
          count: { $sum: 1 },
          conversions: { $sum: { $cond: ['$converted', 1, 0] } },
        },
      },
      { $sort: { count: -1 } },
      { $limit: 10 },
    ]);

    // Get UTM breakdown
    const utmBreakdown = await LandingPageView.aggregate([
      {
        $match: {
          pageId,
          utmSource: { $exists: true, $ne: null },
          createdAt: { $gte: dateStart },
        },
      },
      {
        $group: {
          _id: {
            source: '$utmSource',
            medium: '$utmMedium',
            campaign: '$utmCampaign',
          },
          count: { $sum: 1 },
          conversions: { $sum: { $cond: ['$converted', 1, 0] } },
        },
      },
      { $sort: { count: -1 } },
      { $limit: 20 },
    ]);

    // Get browser breakdown
    const browserBreakdown = await LandingPageView.aggregate([
      {
        $match: {
          pageId,
          browser: { $exists: true },
          createdAt: { $gte: dateStart },
        },
      },
      {
        $group: {
          _id: '$browser',
          count: { $sum: 1 },
        },
      },
      { $sort: { count: -1 } },
      { $limit: 10 },
    ]);

    // Get country breakdown
    const countryBreakdown = await LandingPageView.aggregate([
      {
        $match: {
          pageId,
          country: { $exists: true },
          createdAt: { $gte: dateStart },
        },
      },
      {
        $group: {
          _id: '$country',
          count: { $sum: 1 },
          conversions: { $sum: { $cond: ['$converted', 1, 0] } },
        },
      },
      { $sort: { count: -1 } },
      { $limit: 10 },
    ]);

    // Calculate conversion rate
    const conversionRate = overallStats.uniqueVisitors > 0
      ? ((overallStats.conversions / overallStats.uniqueVisitors) * 100).toFixed(2)
      : '0.00';

    return NextResponse.json({
      page: {
        id: page._id,
        name: page.name,
        slug: page.slug,
        status: page.status,
        publishedAt: page.publishedAt,
        url: `/lp/${page.slug}`,
      },
      dateRange: {
        start: dateStart,
        end: dateEnd || new Date(),
        days,
      },
      overview: {
        ...overallStats,
        conversionRate: parseFloat(conversionRate),
      },
      viewsOverTime,
      trafficSources,
      devices: deviceBreakdown,
      topReferrers,
      utmBreakdown: utmBreakdown.map((u) => ({
        source: u._id.source,
        medium: u._id.medium,
        campaign: u._id.campaign,
        count: u.count,
        conversions: u.conversions,
      })),
      browsers: browserBreakdown,
      countries: countryBreakdown,
      abTest: abTestResults ? {
        enabled: page.abTest?.enabled,
        variants: page.abTest?.variants,
        results: abTestResults,
        startedAt: page.abTest?.startedAt,
        winnerCriteria: page.abTest?.winnerCriteria,
      } : null,
    });
  } catch (error: any) {
    console.error('Error fetching analytics:', error);
    return NextResponse.json(
      { error: error.message || 'Error al obtener analytics' },
      { status: 500 }
    );
  }
}
