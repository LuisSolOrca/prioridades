import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import connectDB from '@/lib/mongodb';
import WebAnalyticsEvent from '@/models/WebAnalyticsEvent';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    await connectDB();

    const { searchParams } = new URL(request.url);
    const daysBack = parseInt(searchParams.get('days') || '30');

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - daysBack);
    startDate.setHours(0, 0, 0, 0);

    const endDate = new Date();

    // Get overall stats
    const overallStats = await WebAnalyticsEvent.aggregate([
      {
        $match: {
          eventTimestamp: { $gte: startDate, $lte: endDate },
        },
      },
      {
        $group: {
          _id: null,
          totalEvents: { $sum: 1 },
          uniqueSessions: { $addToSet: '$sessionId' },
          uniqueUsers: { $addToSet: '$clientId' },
          pageViews: {
            $sum: { $cond: [{ $eq: ['$eventCategory', 'PAGE_VIEW'] }, 1, 0] },
          },
          downloads: {
            $sum: { $cond: [{ $eq: ['$eventCategory', 'DOWNLOAD'] }, 1, 0] },
          },
          formSubmits: {
            $sum: { $cond: [{ $eq: ['$eventCategory', 'FORM_SUBMIT'] }, 1, 0] },
          },
        },
      },
      {
        $project: {
          totalEvents: 1,
          uniqueSessions: { $size: '$uniqueSessions' },
          uniqueUsers: { $size: '$uniqueUsers' },
          pageViews: 1,
          downloads: 1,
          formSubmits: 1,
        },
      },
    ]);

    // Get top pages
    const topPages = await WebAnalyticsEvent.aggregate([
      {
        $match: {
          eventCategory: 'PAGE_VIEW',
          eventTimestamp: { $gte: startDate, $lte: endDate },
        },
      },
      {
        $group: {
          _id: { pagePath: '$pagePath', pageTitle: '$pageTitle' },
          views: { $sum: 1 },
          uniqueUsers: { $addToSet: '$clientId' },
        },
      },
      {
        $project: {
          pagePath: '$_id.pagePath',
          pageTitle: '$_id.pageTitle',
          views: 1,
          uniqueUsers: { $size: '$uniqueUsers' },
        },
      },
      { $sort: { views: -1 } },
      { $limit: 10 },
    ]);

    // Get top downloads
    const topDownloads = await WebAnalyticsEvent.aggregate([
      {
        $match: {
          eventCategory: 'DOWNLOAD',
          eventTimestamp: { $gte: startDate, $lte: endDate },
        },
      },
      {
        $group: {
          _id: {
            documentUrl: '$documentUrl',
            documentTitle: '$documentTitle',
            documentType: '$documentType',
          },
          downloads: { $sum: 1 },
          uniqueUsers: { $addToSet: '$clientId' },
        },
      },
      {
        $project: {
          documentUrl: '$_id.documentUrl',
          documentTitle: '$_id.documentTitle',
          documentType: '$_id.documentType',
          downloads: 1,
          uniqueUsers: { $size: '$uniqueUsers' },
        },
      },
      { $sort: { downloads: -1 } },
      { $limit: 10 },
    ]);

    // Get traffic sources
    const trafficSources = await WebAnalyticsEvent.aggregate([
      {
        $match: {
          eventCategory: 'PAGE_VIEW',
          eventTimestamp: { $gte: startDate, $lte: endDate },
        },
      },
      {
        $group: {
          _id: {
            source: { $ifNull: ['$utmSource', 'direct'] },
            medium: { $ifNull: ['$utmMedium', 'none'] },
          },
          sessions: { $addToSet: '$sessionId' },
          pageViews: { $sum: 1 },
        },
      },
      {
        $project: {
          source: '$_id.source',
          medium: '$_id.medium',
          sessions: { $size: '$sessions' },
          pageViews: 1,
        },
      },
      { $sort: { sessions: -1 } },
      { $limit: 10 },
    ]);

    // Get device breakdown
    const deviceBreakdown = await WebAnalyticsEvent.aggregate([
      {
        $match: {
          eventTimestamp: { $gte: startDate, $lte: endDate },
          deviceType: { $exists: true },
        },
      },
      {
        $group: {
          _id: '$deviceType',
          sessions: { $addToSet: '$sessionId' },
        },
      },
      {
        $project: {
          device: '$_id',
          sessions: { $size: '$sessions' },
        },
      },
    ]);

    // Get daily trends
    const dailyTrends = await WebAnalyticsEvent.aggregate([
      {
        $match: {
          eventTimestamp: { $gte: startDate, $lte: endDate },
        },
      },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$eventTimestamp' } },
          pageViews: {
            $sum: { $cond: [{ $eq: ['$eventCategory', 'PAGE_VIEW'] }, 1, 0] },
          },
          uniqueUsers: { $addToSet: '$clientId' },
          downloads: {
            $sum: { $cond: [{ $eq: ['$eventCategory', 'DOWNLOAD'] }, 1, 0] },
          },
        },
      },
      {
        $project: {
          date: '$_id',
          pageViews: 1,
          uniqueUsers: { $size: '$uniqueUsers' },
          downloads: 1,
        },
      },
      { $sort: { date: 1 } },
    ]);

    // Get geo breakdown
    const geoBreakdown = await WebAnalyticsEvent.aggregate([
      {
        $match: {
          eventTimestamp: { $gte: startDate, $lte: endDate },
          country: { $exists: true, $ne: null },
        },
      },
      {
        $group: {
          _id: '$country',
          sessions: { $addToSet: '$sessionId' },
        },
      },
      {
        $project: {
          country: '$_id',
          sessions: { $size: '$sessions' },
        },
      },
      { $sort: { sessions: -1 } },
      { $limit: 10 },
    ]);

    return NextResponse.json({
      period: {
        startDate,
        endDate,
        days: daysBack,
      },
      overview: overallStats[0] || {
        totalEvents: 0,
        uniqueSessions: 0,
        uniqueUsers: 0,
        pageViews: 0,
        downloads: 0,
        formSubmits: 0,
      },
      topPages,
      topDownloads,
      trafficSources,
      deviceBreakdown,
      geoBreakdown,
      trends: dailyTrends,
    });
  } catch (error) {
    console.error('Error fetching web analytics:', error);
    return NextResponse.json(
      { error: 'Error al obtener analytics web' },
      { status: 500 }
    );
  }
}
