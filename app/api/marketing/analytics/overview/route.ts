import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import connectDB from '@/lib/mongodb';
import MarketingCampaign from '@/models/MarketingCampaign';
import MarketingMetric from '@/models/MarketingMetric';
import MarketingPlatformConfig from '@/models/MarketingPlatformConfig';

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

    // Get connected platforms
    const connectedPlatforms = await MarketingPlatformConfig.find({ isActive: true })
      .select('platform platformAccountName lastSyncAt')
      .lean();

    // Get campaign stats
    const campaignStats = await MarketingCampaign.aggregate([
      {
        $facet: {
          byStatus: [
            { $group: { _id: '$status', count: { $sum: 1 } } },
          ],
          byPlatform: [
            { $group: { _id: '$platform', count: { $sum: 1 } } },
          ],
          totals: [
            {
              $group: {
                _id: null,
                totalCampaigns: { $sum: 1 },
                totalBudget: { $sum: '$budget' },
                totalSpent: { $sum: '$spentAmount' },
                activeCampaigns: {
                  $sum: { $cond: [{ $eq: ['$status', 'ACTIVE'] }, 1, 0] },
                },
              },
            },
          ],
          topCampaigns: [
            { $match: { status: 'ACTIVE' } },
            { $sort: { 'metrics.impressions': -1 } },
            { $limit: 5 },
            {
              $project: {
                name: 1,
                platform: 1,
                budget: 1,
                spentAmount: 1,
                metrics: 1,
              },
            },
          ],
        },
      },
    ]);

    // Get metrics aggregation for the period
    const metricsAggregation = await MarketingMetric.aggregate([
      {
        $match: {
          date: { $gte: startDate, $lte: endDate },
        },
      },
      {
        $group: {
          _id: null,
          totalImpressions: { $sum: '$impressions' },
          totalReach: { $sum: '$reach' },
          totalClicks: { $sum: '$clicks' },
          totalSpend: { $sum: '$spend' },
          totalConversions: { $sum: '$conversions' },
          totalConversionValue: { $sum: '$conversionValue' },
          totalVideoViews: { $sum: '$videoViews' },
          totalLikes: { $sum: '$likes' },
          totalShares: { $sum: '$shares' },
          totalComments: { $sum: '$comments' },
        },
      },
    ]);

    // Get metrics by platform
    const metricsByPlatform = await MarketingMetric.aggregate([
      {
        $match: {
          date: { $gte: startDate, $lte: endDate },
        },
      },
      {
        $group: {
          _id: '$platform',
          impressions: { $sum: '$impressions' },
          clicks: { $sum: '$clicks' },
          spend: { $sum: '$spend' },
          conversions: { $sum: '$conversions' },
        },
      },
    ]);

    // Get daily trends
    const dailyTrends = await MarketingMetric.aggregate([
      {
        $match: {
          date: { $gte: startDate, $lte: endDate },
          periodType: 'DAY',
        },
      },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$date' } },
          impressions: { $sum: '$impressions' },
          clicks: { $sum: '$clicks' },
          spend: { $sum: '$spend' },
          conversions: { $sum: '$conversions' },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    const stats = campaignStats[0];
    const metrics = metricsAggregation[0] || {};

    // Calculate derived metrics
    const ctr = metrics.totalImpressions > 0
      ? (metrics.totalClicks / metrics.totalImpressions) * 100
      : 0;

    const cpc = metrics.totalClicks > 0
      ? metrics.totalSpend / metrics.totalClicks
      : 0;

    const roas = metrics.totalSpend > 0
      ? metrics.totalConversionValue / metrics.totalSpend
      : 0;

    const cpm = metrics.totalImpressions > 0
      ? (metrics.totalSpend / metrics.totalImpressions) * 1000
      : 0;

    return NextResponse.json({
      period: {
        startDate,
        endDate,
        days: daysBack,
      },
      connectedPlatforms,
      campaigns: {
        total: stats.totals[0]?.totalCampaigns || 0,
        active: stats.totals[0]?.activeCampaigns || 0,
        byStatus: stats.byStatus.reduce((acc: any, item: any) => {
          acc[item._id] = item.count;
          return acc;
        }, {}),
        byPlatform: stats.byPlatform.reduce((acc: any, item: any) => {
          acc[item._id] = item.count;
          return acc;
        }, {}),
        topCampaigns: stats.topCampaigns,
      },
      metrics: {
        impressions: metrics.totalImpressions || 0,
        reach: metrics.totalReach || 0,
        clicks: metrics.totalClicks || 0,
        spend: metrics.totalSpend || 0,
        conversions: metrics.totalConversions || 0,
        conversionValue: metrics.totalConversionValue || 0,
        videoViews: metrics.totalVideoViews || 0,
        engagement: {
          likes: metrics.totalLikes || 0,
          shares: metrics.totalShares || 0,
          comments: metrics.totalComments || 0,
        },
        calculated: {
          ctr: parseFloat(ctr.toFixed(2)),
          cpc: parseFloat(cpc.toFixed(2)),
          cpm: parseFloat(cpm.toFixed(2)),
          roas: parseFloat(roas.toFixed(2)),
        },
      },
      byPlatform: metricsByPlatform,
      trends: dailyTrends,
    });
  } catch (error) {
    console.error('Error fetching marketing overview:', error);
    return NextResponse.json(
      { error: 'Error al obtener resumen de marketing' },
      { status: 500 }
    );
  }
}
