/**
 * Customer Acquisition Cost (CAC) Calculator
 *
 * Calculates CAC from ad platform metrics and CRM conversion data.
 */

import MarketingMetric from '@/models/MarketingMetric';
import MarketingCampaign from '@/models/MarketingCampaign';
import Conversion from '@/models/Conversion';
import { MarketingPlatform } from '@/models/MarketingPlatformConfig';
import mongoose from 'mongoose';

export interface CACMetrics {
  totalSpend: number;
  totalConversions: number;
  cac: number;
  currency: string;
}

export interface PlatformCACMetrics extends CACMetrics {
  platform: MarketingPlatform;
  percentOfSpend: number;
  percentOfConversions: number;
}

export interface CampaignCACMetrics extends CACMetrics {
  campaignId: string;
  campaignName: string;
  platform: MarketingPlatform;
  roas: number;
  conversionValue: number;
}

export interface CACTrend {
  date: string;
  spend: number;
  conversions: number;
  cac: number;
}

export interface CACOverview {
  period: {
    start: Date;
    end: Date;
  };
  overall: CACMetrics;
  byPlatform: PlatformCACMetrics[];
  topCampaigns: CampaignCACMetrics[];
  trend: CACTrend[];
  comparison?: {
    previousPeriod: CACMetrics;
    change: {
      spend: number;
      conversions: number;
      cac: number;
    };
  };
}

/**
 * Calculate CAC for a given date range
 */
export async function calculateCAC(
  startDate: Date,
  endDate: Date,
  options: {
    currency?: string;
    includeComparison?: boolean;
    campaignLimit?: number;
  } = {}
): Promise<CACOverview> {
  const { currency = 'USD', includeComparison = true, campaignLimit = 10 } = options;

  // Get metrics for the period
  const metrics = await MarketingMetric.aggregate([
    {
      $match: {
        date: { $gte: startDate, $lte: endDate },
        platform: { $in: ['META', 'GOOGLE_ADS', 'LINKEDIN', 'TIKTOK', 'TWITTER'] },
      },
    },
    {
      $group: {
        _id: '$platform',
        totalSpend: { $sum: '$spend' },
        totalConversions: { $sum: '$conversions' },
        totalConversionValue: { $sum: '$conversionValue' },
      },
    },
  ]);

  // Calculate overall totals
  let totalSpend = 0;
  let totalConversions = 0;

  const byPlatform: PlatformCACMetrics[] = [];

  for (const m of metrics) {
    totalSpend += m.totalSpend || 0;
    totalConversions += m.totalConversions || 0;
  }

  // Calculate per-platform metrics
  for (const m of metrics) {
    const spend = m.totalSpend || 0;
    const conversions = m.totalConversions || 0;

    byPlatform.push({
      platform: m._id as MarketingPlatform,
      totalSpend: spend,
      totalConversions: conversions,
      cac: conversions > 0 ? spend / conversions : 0,
      currency,
      percentOfSpend: totalSpend > 0 ? (spend / totalSpend) * 100 : 0,
      percentOfConversions: totalConversions > 0 ? (conversions / totalConversions) * 100 : 0,
    });
  }

  // Sort by spend
  byPlatform.sort((a, b) => b.totalSpend - a.totalSpend);

  // Get top campaigns
  const campaignMetrics = await MarketingMetric.aggregate([
    {
      $match: {
        date: { $gte: startDate, $lte: endDate },
        campaignId: { $exists: true },
      },
    },
    {
      $group: {
        _id: '$campaignId',
        platform: { $first: '$platform' },
        totalSpend: { $sum: '$spend' },
        totalConversions: { $sum: '$conversions' },
        totalConversionValue: { $sum: '$conversionValue' },
      },
    },
    { $sort: { totalSpend: -1 } },
    { $limit: campaignLimit },
  ]);

  // Get campaign names
  const campaignIds = campaignMetrics.map((c) => c._id);
  const campaigns = await MarketingCampaign.find({ _id: { $in: campaignIds } }).select('name');
  const campaignMap = new Map(campaigns.map((c) => [c._id.toString(), c.name]));

  const topCampaigns: CampaignCACMetrics[] = campaignMetrics.map((c) => ({
    campaignId: c._id.toString(),
    campaignName: campaignMap.get(c._id.toString()) || 'Unknown',
    platform: c.platform as MarketingPlatform,
    totalSpend: c.totalSpend || 0,
    totalConversions: c.totalConversions || 0,
    cac: c.totalConversions > 0 ? c.totalSpend / c.totalConversions : 0,
    currency,
    conversionValue: c.totalConversionValue || 0,
    roas: c.totalSpend > 0 ? (c.totalConversionValue || 0) / c.totalSpend : 0,
  }));

  // Get daily trend
  const dailyMetrics = await MarketingMetric.aggregate([
    {
      $match: {
        date: { $gte: startDate, $lte: endDate },
        platform: { $in: ['META', 'GOOGLE_ADS', 'LINKEDIN', 'TIKTOK', 'TWITTER'] },
      },
    },
    {
      $group: {
        _id: { $dateToString: { format: '%Y-%m-%d', date: '$date' } },
        spend: { $sum: '$spend' },
        conversions: { $sum: '$conversions' },
      },
    },
    { $sort: { _id: 1 } },
  ]);

  const trend: CACTrend[] = dailyMetrics.map((d) => ({
    date: d._id,
    spend: d.spend || 0,
    conversions: d.conversions || 0,
    cac: d.conversions > 0 ? d.spend / d.conversions : 0,
  }));

  // Calculate overall CAC
  const overallCAC = totalConversions > 0 ? totalSpend / totalConversions : 0;

  const result: CACOverview = {
    period: { start: startDate, end: endDate },
    overall: {
      totalSpend,
      totalConversions,
      cac: overallCAC,
      currency,
    },
    byPlatform,
    topCampaigns,
    trend,
  };

  // Calculate comparison with previous period
  if (includeComparison) {
    const periodDays = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
    const previousStart = new Date(startDate);
    previousStart.setDate(previousStart.getDate() - periodDays);
    const previousEnd = new Date(startDate);
    previousEnd.setDate(previousEnd.getDate() - 1);

    const previousMetrics = await MarketingMetric.aggregate([
      {
        $match: {
          date: { $gte: previousStart, $lte: previousEnd },
          platform: { $in: ['META', 'GOOGLE_ADS', 'LINKEDIN', 'TIKTOK', 'TWITTER'] },
        },
      },
      {
        $group: {
          _id: null,
          totalSpend: { $sum: '$spend' },
          totalConversions: { $sum: '$conversions' },
        },
      },
    ]);

    const prev = previousMetrics[0] || { totalSpend: 0, totalConversions: 0 };
    const prevCAC = prev.totalConversions > 0 ? prev.totalSpend / prev.totalConversions : 0;

    result.comparison = {
      previousPeriod: {
        totalSpend: prev.totalSpend || 0,
        totalConversions: prev.totalConversions || 0,
        cac: prevCAC,
        currency,
      },
      change: {
        spend: prev.totalSpend > 0 ? ((totalSpend - prev.totalSpend) / prev.totalSpend) * 100 : 0,
        conversions: prev.totalConversions > 0 ? ((totalConversions - prev.totalConversions) / prev.totalConversions) * 100 : 0,
        cac: prevCAC > 0 ? ((overallCAC - prevCAC) / prevCAC) * 100 : 0,
      },
    };
  }

  return result;
}

/**
 * Calculate CAC with attribution from CRM conversions
 */
export async function calculateCACWithAttribution(
  startDate: Date,
  endDate: Date,
  attributionModel: 'first_touch' | 'last_touch' | 'linear' = 'last_touch'
): Promise<CACOverview> {
  // Get CRM conversions with attribution
  const conversions = await Conversion.find({
    convertedAt: { $gte: startDate, $lte: endDate },
    attribution: { $exists: true, $ne: [] },
  });

  // Get ad spend from metrics
  const metrics = await MarketingMetric.aggregate([
    {
      $match: {
        date: { $gte: startDate, $lte: endDate },
        platform: { $in: ['META', 'GOOGLE_ADS', 'LINKEDIN', 'TIKTOK', 'TWITTER'] },
      },
    },
    {
      $group: {
        _id: '$platform',
        totalSpend: { $sum: '$spend' },
      },
    },
  ]);

  const spendByPlatform = new Map<string, number>();
  let totalSpend = 0;

  for (const m of metrics) {
    spendByPlatform.set(m._id, m.totalSpend || 0);
    totalSpend += m.totalSpend || 0;
  }

  // Count attributed conversions by platform
  const conversionsByPlatform = new Map<string, number>();
  let totalConversions = conversions.length;

  for (const conv of conversions) {
    // Find attribution results for the specified model
    const attributionResults = conv.attribution?.filter(
      (r: any) => r.model === attributionModel
    ) || [];

    // Sum credits by channel/platform
    for (const result of attributionResults) {
      const platform = mapChannelToPlatform(result.channel);
      if (platform) {
        const current = conversionsByPlatform.get(platform) || 0;
        // credit is 0-100, convert to 0-1
        conversionsByPlatform.set(platform, current + (result.credit / 100));
      }
    }
  }

  // Build platform metrics with attribution
  const byPlatform: PlatformCACMetrics[] = [];

  for (const [platform, spend] of spendByPlatform) {
    const conversions = conversionsByPlatform.get(platform) || 0;
    byPlatform.push({
      platform: platform as MarketingPlatform,
      totalSpend: spend,
      totalConversions: conversions,
      cac: conversions > 0 ? spend / conversions : 0,
      currency: 'USD',
      percentOfSpend: totalSpend > 0 ? (spend / totalSpend) * 100 : 0,
      percentOfConversions: totalConversions > 0 ? (conversions / totalConversions) * 100 : 0,
    });
  }

  byPlatform.sort((a, b) => b.totalSpend - a.totalSpend);

  return {
    period: { start: startDate, end: endDate },
    overall: {
      totalSpend,
      totalConversions,
      cac: totalConversions > 0 ? totalSpend / totalConversions : 0,
      currency: 'USD',
    },
    byPlatform,
    topCampaigns: [],
    trend: [],
  };
}

/**
 * Map marketing channel to ad platform
 */
function mapChannelToPlatform(channel: string): MarketingPlatform | null {
  const channelLower = channel.toLowerCase();

  if (channelLower.includes('facebook') || channelLower.includes('instagram') || channelLower.includes('meta')) {
    return 'META';
  }
  if (channelLower.includes('google') || channelLower.includes('ads')) {
    return 'GOOGLE_ADS';
  }
  if (channelLower.includes('linkedin')) {
    return 'LINKEDIN';
  }
  if (channelLower.includes('tiktok')) {
    return 'TIKTOK';
  }
  if (channelLower.includes('twitter') || channelLower.includes('x.com')) {
    return 'TWITTER';
  }

  return null;
}

/**
 * Get aggregated spend by platform for a date range
 */
export async function getSpendByPlatform(
  startDate: Date,
  endDate: Date
): Promise<{ platform: MarketingPlatform; spend: number }[]> {
  const metrics = await MarketingMetric.aggregate([
    {
      $match: {
        date: { $gte: startDate, $lte: endDate },
        platform: { $in: ['META', 'GOOGLE_ADS', 'LINKEDIN', 'TIKTOK', 'TWITTER'] },
      },
    },
    {
      $group: {
        _id: '$platform',
        spend: { $sum: '$spend' },
      },
    },
    { $sort: { spend: -1 } },
  ]);

  return metrics.map((m) => ({
    platform: m._id as MarketingPlatform,
    spend: m.spend || 0,
  }));
}

/**
 * Get total ad spend for a date range
 */
export async function getTotalSpend(startDate: Date, endDate: Date): Promise<number> {
  const result = await MarketingMetric.aggregate([
    {
      $match: {
        date: { $gte: startDate, $lte: endDate },
        platform: { $in: ['META', 'GOOGLE_ADS', 'LINKEDIN', 'TIKTOK', 'TWITTER'] },
      },
    },
    {
      $group: {
        _id: null,
        total: { $sum: '$spend' },
      },
    },
  ]);

  return result[0]?.total || 0;
}
