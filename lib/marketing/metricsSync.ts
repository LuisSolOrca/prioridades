/**
 * Marketing Metrics Sync
 *
 * This module provides functions to sync campaign metrics from various ad platforms.
 */

import MarketingCampaign from '@/models/MarketingCampaign';
import MarketingMetric from '@/models/MarketingMetric';
import MarketingPlatformConfig from '@/models/MarketingPlatformConfig';
import MarketingSyncLog from '@/models/MarketingSyncLog';
import mongoose from 'mongoose';

interface MetricsData {
  impressions: number;
  reach: number;
  clicks: number;
  ctr: number;
  cpc: number;
  cpm: number;
  spend: number;
  conversions: number;
  costPerConversion: number;
  roas: number;
  frequency: number;
  likes?: number;
  comments?: number;
  shares?: number;
  saves?: number;
  videoViews?: number;
  videoViewsP25?: number;
  videoViewsP50?: number;
  videoViewsP75?: number;
  videoViewsP100?: number;
}

interface SyncResult {
  success: boolean;
  campaignsUpdated: number;
  metricsRecorded: number;
  errors: string[];
}

/**
 * Sync metrics from Meta (Facebook/Instagram)
 */
async function syncMetaMetrics(config: any, campaignIds: string[]): Promise<SyncResult> {
  const result: SyncResult = {
    success: true,
    campaignsUpdated: 0,
    metricsRecorded: 0,
    errors: [],
  };

  const accessToken = config.credentials?.accessToken;
  if (!accessToken) {
    result.success = false;
    result.errors.push('Meta access token not found');
    return result;
  }

  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const dateStr = yesterday.toISOString().split('T')[0];

  for (const campaignId of campaignIds) {
    try {
      const campaign = await MarketingCampaign.findById(campaignId);
      if (!campaign?.externalAdId) continue;

      // Fetch insights from Meta Graph API
      const response = await fetch(
        `https://graph.facebook.com/v18.0/${campaign.externalAdId}/insights?` +
        `fields=impressions,reach,clicks,ctr,cpc,cpm,spend,actions,cost_per_action_type,frequency,video_p25_watched_actions,video_p50_watched_actions,video_p75_watched_actions,video_p100_watched_actions` +
        `&date_preset=yesterday` +
        `&access_token=${accessToken}`
      );

      const data = await response.json();

      if (data.error) {
        result.errors.push(`Campaign ${campaignId}: ${data.error.message}`);
        continue;
      }

      if (!data.data || data.data.length === 0) continue;

      const insights = data.data[0];

      // Extract conversions from actions
      const conversions = insights.actions?.find(
        (a: any) => a.action_type === 'purchase' || a.action_type === 'lead'
      )?.value || 0;

      const costPerConversion = insights.cost_per_action_type?.find(
        (a: any) => a.action_type === 'purchase' || a.action_type === 'lead'
      )?.value || 0;

      const metrics: MetricsData = {
        impressions: parseInt(insights.impressions) || 0,
        reach: parseInt(insights.reach) || 0,
        clicks: parseInt(insights.clicks) || 0,
        ctr: parseFloat(insights.ctr) || 0,
        cpc: parseFloat(insights.cpc) || 0,
        cpm: parseFloat(insights.cpm) || 0,
        spend: parseFloat(insights.spend) || 0,
        conversions: parseInt(conversions),
        costPerConversion: parseFloat(costPerConversion),
        roas: 0, // Would need revenue data to calculate
        frequency: parseFloat(insights.frequency) || 0,
        videoViewsP25: parseInt(insights.video_p25_watched_actions?.[0]?.value) || 0,
        videoViewsP50: parseInt(insights.video_p50_watched_actions?.[0]?.value) || 0,
        videoViewsP75: parseInt(insights.video_p75_watched_actions?.[0]?.value) || 0,
        videoViewsP100: parseInt(insights.video_p100_watched_actions?.[0]?.value) || 0,
      };

      // Save metrics
      await MarketingMetric.findOneAndUpdate(
        {
          campaignId: campaign._id,
          platform: 'META',
          date: new Date(dateStr),
        },
        {
          $set: { metrics },
        },
        { upsert: true }
      );

      // Update campaign total metrics
      await MarketingCampaign.findByIdAndUpdate(campaignId, {
        $set: {
          'metrics.impressions': metrics.impressions,
          'metrics.reach': metrics.reach,
          'metrics.clicks': metrics.clicks,
          'metrics.ctr': metrics.ctr,
          'metrics.cpc': metrics.cpc,
          'metrics.cpm': metrics.cpm,
          'metrics.spend': metrics.spend,
          'metrics.conversions': metrics.conversions,
          'metrics.costPerConversion': metrics.costPerConversion,
          'metrics.frequency': metrics.frequency,
          'metrics.lastSyncAt': new Date(),
        },
      });

      result.campaignsUpdated++;
      result.metricsRecorded++;
    } catch (error: any) {
      result.errors.push(`Campaign ${campaignId}: ${error.message}`);
    }
  }

  return result;
}

/**
 * Sync metrics from LinkedIn
 */
async function syncLinkedInMetrics(config: any, campaignIds: string[]): Promise<SyncResult> {
  const result: SyncResult = {
    success: true,
    campaignsUpdated: 0,
    metricsRecorded: 0,
    errors: [],
  };

  const accessToken = config.credentials?.accessToken;
  if (!accessToken) {
    result.success = false;
    result.errors.push('LinkedIn access token not found');
    return result;
  }

  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const dateStr = yesterday.toISOString().split('T')[0];

  for (const campaignId of campaignIds) {
    try {
      const campaign = await MarketingCampaign.findById(campaignId);
      if (!campaign?.externalAdId) continue;

      // Fetch analytics from LinkedIn API
      const response = await fetch(
        `https://api.linkedin.com/rest/adAnalytics?q=analytics&pivot=CAMPAIGN&` +
        `campaigns=urn:li:sponsoredCampaign:${campaign.externalAdId}&` +
        `dateRange.start.day=${yesterday.getDate()}&` +
        `dateRange.start.month=${yesterday.getMonth() + 1}&` +
        `dateRange.start.year=${yesterday.getFullYear()}&` +
        `dateRange.end.day=${yesterday.getDate()}&` +
        `dateRange.end.month=${yesterday.getMonth() + 1}&` +
        `dateRange.end.year=${yesterday.getFullYear()}&` +
        `fields=impressions,clicks,costInLocalCurrency,conversions,externalWebsiteConversions`,
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'LinkedIn-Version': '202401',
            'X-Restli-Protocol-Version': '2.0.0',
          },
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        result.errors.push(`Campaign ${campaignId}: ${errorData.message || 'API error'}`);
        continue;
      }

      const data = await response.json();
      const element = data.elements?.[0];

      if (!element) continue;

      const impressions = element.impressions || 0;
      const clicks = element.clicks || 0;
      const spend = parseFloat(element.costInLocalCurrency) || 0;
      const conversions = (element.conversions || 0) + (element.externalWebsiteConversions || 0);

      const metrics: MetricsData = {
        impressions,
        reach: impressions, // LinkedIn doesn't provide reach separately
        clicks,
        ctr: impressions > 0 ? (clicks / impressions) * 100 : 0,
        cpc: clicks > 0 ? spend / clicks : 0,
        cpm: impressions > 0 ? (spend / impressions) * 1000 : 0,
        spend,
        conversions,
        costPerConversion: conversions > 0 ? spend / conversions : 0,
        roas: 0,
        frequency: 0,
      };

      // Save metrics
      await MarketingMetric.findOneAndUpdate(
        {
          campaignId: campaign._id,
          platform: 'LINKEDIN',
          date: new Date(dateStr),
        },
        {
          $set: { metrics },
        },
        { upsert: true }
      );

      // Update campaign
      await MarketingCampaign.findByIdAndUpdate(campaignId, {
        $set: {
          'metrics.impressions': metrics.impressions,
          'metrics.clicks': metrics.clicks,
          'metrics.ctr': metrics.ctr,
          'metrics.cpc': metrics.cpc,
          'metrics.cpm': metrics.cpm,
          'metrics.spend': metrics.spend,
          'metrics.conversions': metrics.conversions,
          'metrics.lastSyncAt': new Date(),
        },
      });

      result.campaignsUpdated++;
      result.metricsRecorded++;
    } catch (error: any) {
      result.errors.push(`Campaign ${campaignId}: ${error.message}`);
    }
  }

  return result;
}

/**
 * Sync metrics from Google Ads
 */
async function syncGoogleAdsMetrics(config: any, campaignIds: string[]): Promise<SyncResult> {
  const result: SyncResult = {
    success: true,
    campaignsUpdated: 0,
    metricsRecorded: 0,
    errors: [],
  };

  const accessToken = config.accessToken;
  const developerToken = process.env.GOOGLE_ADS_DEVELOPER_TOKEN;
  const customerId = config.platformData?.customerAccounts?.[0]?.id;

  if (!accessToken || !developerToken) {
    result.success = false;
    result.errors.push('Google Ads credentials not configured');
    return result;
  }

  if (!customerId) {
    result.success = false;
    result.errors.push('No Google Ads customer account configured');
    return result;
  }

  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const dateStr = yesterday.toISOString().split('T')[0].replace(/-/g, '');

  for (const campaignId of campaignIds) {
    try {
      const campaign = await MarketingCampaign.findById(campaignId);
      if (!campaign?.externalCampaignId) continue;

      // Query Google Ads API using GAQL
      const query = `
        SELECT
          campaign.id,
          metrics.impressions,
          metrics.clicks,
          metrics.cost_micros,
          metrics.conversions,
          metrics.conversions_value,
          metrics.ctr,
          metrics.average_cpc,
          metrics.average_cpm,
          metrics.video_views,
          metrics.video_quartile_p25_rate,
          metrics.video_quartile_p50_rate,
          metrics.video_quartile_p75_rate,
          metrics.video_quartile_p100_rate
        FROM campaign
        WHERE campaign.id = ${campaign.externalCampaignId}
          AND segments.date = '${dateStr}'
      `;

      const response = await fetch(
        `https://googleads.googleapis.com/v15/customers/${customerId}/googleAds:searchStream`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'developer-token': developerToken,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ query }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        result.errors.push(`Campaign ${campaignId}: ${errorData.error?.message || 'API error'}`);
        continue;
      }

      const data = await response.json();
      const row = data[0]?.results?.[0];

      if (!row) continue;

      const m = row.metrics || {};
      const spend = (m.costMicros || 0) / 1000000; // Convert micros to currency

      const metrics: MetricsData = {
        impressions: parseInt(m.impressions) || 0,
        reach: parseInt(m.impressions) || 0, // Google Ads doesn't have reach
        clicks: parseInt(m.clicks) || 0,
        ctr: parseFloat(m.ctr) * 100 || 0,
        cpc: parseFloat(m.averageCpc) / 1000000 || 0,
        cpm: parseFloat(m.averageCpm) / 1000000 || 0,
        spend,
        conversions: parseFloat(m.conversions) || 0,
        costPerConversion: m.conversions > 0 ? spend / m.conversions : 0,
        roas: spend > 0 ? (m.conversionsValue || 0) / spend : 0,
        frequency: 0,
        videoViews: parseInt(m.videoViews) || 0,
        videoViewsP25: parseFloat(m.videoQuartileP25Rate) || 0,
        videoViewsP50: parseFloat(m.videoQuartileP50Rate) || 0,
        videoViewsP75: parseFloat(m.videoQuartileP75Rate) || 0,
        videoViewsP100: parseFloat(m.videoQuartileP100Rate) || 0,
      };

      // Save metrics
      await MarketingMetric.findOneAndUpdate(
        {
          campaignId: campaign._id,
          platform: 'GOOGLE_ADS',
          date: yesterday,
        },
        {
          $set: {
            impressions: metrics.impressions,
            clicks: metrics.clicks,
            spend: metrics.spend,
            conversions: metrics.conversions,
            ctr: metrics.ctr,
            cpc: metrics.cpc,
            cpm: metrics.cpm,
            costPerConversion: metrics.costPerConversion,
            videoViews: metrics.videoViews,
            platformConfigId: config._id,
          },
        },
        { upsert: true }
      );

      // Update campaign
      await MarketingCampaign.findByIdAndUpdate(campaignId, {
        $set: {
          'metrics.impressions': metrics.impressions,
          'metrics.clicks': metrics.clicks,
          'metrics.ctr': metrics.ctr,
          'metrics.cpc': metrics.cpc,
          'metrics.cpm': metrics.cpm,
          'metrics.spend': metrics.spend,
          'metrics.conversions': metrics.conversions,
          'metrics.costPerResult': metrics.costPerConversion,
          'metrics.lastUpdatedAt': new Date(),
        },
        lastSyncAt: new Date(),
      });

      result.campaignsUpdated++;
      result.metricsRecorded++;
    } catch (error: any) {
      result.errors.push(`Campaign ${campaignId}: ${error.message}`);
    }
  }

  return result;
}

/**
 * Sync metrics from TikTok Ads
 */
async function syncTikTokMetrics(config: any, campaignIds: string[]): Promise<SyncResult> {
  const result: SyncResult = {
    success: true,
    campaignsUpdated: 0,
    metricsRecorded: 0,
    errors: [],
  };

  const accessToken = config.accessToken;
  const advertiserId = config.platformData?.advertiserId;

  if (!accessToken || !advertiserId) {
    result.success = false;
    result.errors.push('TikTok Ads credentials not configured');
    return result;
  }

  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const dateStr = yesterday.toISOString().split('T')[0];

  for (const campaignId of campaignIds) {
    try {
      const campaign = await MarketingCampaign.findById(campaignId);
      if (!campaign?.externalCampaignId) continue;

      // TikTok Ads API
      const response = await fetch(
        `https://business-api.tiktok.com/open_api/v1.3/report/integrated/get/` +
        `?advertiser_id=${advertiserId}` +
        `&report_type=BASIC` +
        `&dimensions=["campaign_id"]` +
        `&metrics=["impressions","clicks","spend","conversion","ctr","cpc","cpm","video_views","video_watched_2s","video_watched_6s"]` +
        `&data_level=AUCTION_CAMPAIGN` +
        `&start_date=${dateStr}` +
        `&end_date=${dateStr}` +
        `&filtering=[{"field_name":"campaign_ids","filter_type":"IN","filter_value":"[${campaign.externalCampaignId}]"}]`,
        {
          headers: {
            'Access-Token': accessToken,
          },
        }
      );

      const data = await response.json();

      if (data.code !== 0) {
        result.errors.push(`Campaign ${campaignId}: ${data.message || 'API error'}`);
        continue;
      }

      const row = data.data?.list?.[0]?.metrics;
      if (!row) continue;

      const spend = parseFloat(row.spend) || 0;
      const conversions = parseInt(row.conversion) || 0;

      const metrics: MetricsData = {
        impressions: parseInt(row.impressions) || 0,
        reach: parseInt(row.impressions) || 0,
        clicks: parseInt(row.clicks) || 0,
        ctr: parseFloat(row.ctr) * 100 || 0,
        cpc: parseFloat(row.cpc) || 0,
        cpm: parseFloat(row.cpm) || 0,
        spend,
        conversions,
        costPerConversion: conversions > 0 ? spend / conversions : 0,
        roas: 0,
        frequency: 0,
        videoViews: parseInt(row.video_views) || 0,
      };

      // Save metrics
      await MarketingMetric.findOneAndUpdate(
        {
          campaignId: campaign._id,
          platform: 'TIKTOK',
          date: yesterday,
        },
        {
          $set: {
            impressions: metrics.impressions,
            clicks: metrics.clicks,
            spend: metrics.spend,
            conversions: metrics.conversions,
            ctr: metrics.ctr,
            cpc: metrics.cpc,
            cpm: metrics.cpm,
            costPerConversion: metrics.costPerConversion,
            videoViews: metrics.videoViews,
            platformConfigId: config._id,
          },
        },
        { upsert: true }
      );

      // Update campaign
      await MarketingCampaign.findByIdAndUpdate(campaignId, {
        $set: {
          'metrics.impressions': metrics.impressions,
          'metrics.clicks': metrics.clicks,
          'metrics.ctr': metrics.ctr,
          'metrics.cpc': metrics.cpc,
          'metrics.cpm': metrics.cpm,
          'metrics.spend': metrics.spend,
          'metrics.conversions': metrics.conversions,
          'metrics.videoViews': metrics.videoViews,
          'metrics.lastUpdatedAt': new Date(),
        },
        lastSyncAt: new Date(),
      });

      result.campaignsUpdated++;
      result.metricsRecorded++;
    } catch (error: any) {
      result.errors.push(`Campaign ${campaignId}: ${error.message}`);
    }
  }

  return result;
}

/**
 * Sync metrics from Twitter/X Ads
 */
async function syncTwitterMetrics(config: any, campaignIds: string[]): Promise<SyncResult> {
  const result: SyncResult = {
    success: true,
    campaignsUpdated: 0,
    metricsRecorded: 0,
    errors: [],
  };

  const accessToken = config.accessToken;
  const accountId = config.platformData?.accountId;

  if (!accessToken || !accountId) {
    result.success = false;
    result.errors.push('Twitter Ads credentials not configured');
    return result;
  }

  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const dateStr = yesterday.toISOString().split('T')[0];

  for (const campaignId of campaignIds) {
    try {
      const campaign = await MarketingCampaign.findById(campaignId);
      if (!campaign?.externalCampaignId) continue;

      // Twitter Ads API
      const response = await fetch(
        `https://ads-api.twitter.com/12/stats/accounts/${accountId}` +
        `?entity=CAMPAIGN` +
        `&entity_ids=${campaign.externalCampaignId}` +
        `&start_time=${dateStr}T00:00:00Z` +
        `&end_time=${dateStr}T23:59:59Z` +
        `&granularity=DAY` +
        `&metric_groups=ENGAGEMENT,BILLING,VIDEO`,
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
          },
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        result.errors.push(`Campaign ${campaignId}: ${errorData.errors?.[0]?.message || 'API error'}`);
        continue;
      }

      const data = await response.json();
      const stats = data.data?.[0]?.id_data?.[0]?.metrics;

      if (!stats) continue;

      const impressions = parseInt(stats.impressions?.[0]) || 0;
      const clicks = parseInt(stats.clicks?.[0]) || 0;
      const spend = parseFloat(stats.billed_charge_local_micro?.[0]) / 1000000 || 0;
      const conversions = parseInt(stats.conversion_purchases?.[0]) || 0;

      const metrics: MetricsData = {
        impressions,
        reach: impressions,
        clicks,
        ctr: impressions > 0 ? (clicks / impressions) * 100 : 0,
        cpc: clicks > 0 ? spend / clicks : 0,
        cpm: impressions > 0 ? (spend / impressions) * 1000 : 0,
        spend,
        conversions,
        costPerConversion: conversions > 0 ? spend / conversions : 0,
        roas: 0,
        frequency: 0,
        videoViews: parseInt(stats.video_views_50?.[0]) || 0,
        likes: parseInt(stats.likes?.[0]) || 0,
        shares: parseInt(stats.retweets?.[0]) || 0,
      };

      // Save metrics
      await MarketingMetric.findOneAndUpdate(
        {
          campaignId: campaign._id,
          platform: 'TWITTER',
          date: yesterday,
        },
        {
          $set: {
            impressions: metrics.impressions,
            clicks: metrics.clicks,
            spend: metrics.spend,
            conversions: metrics.conversions,
            ctr: metrics.ctr,
            cpc: metrics.cpc,
            cpm: metrics.cpm,
            costPerConversion: metrics.costPerConversion,
            videoViews: metrics.videoViews,
            likes: metrics.likes,
            shares: metrics.shares,
            platformConfigId: config._id,
          },
        },
        { upsert: true }
      );

      // Update campaign
      await MarketingCampaign.findByIdAndUpdate(campaignId, {
        $set: {
          'metrics.impressions': metrics.impressions,
          'metrics.clicks': metrics.clicks,
          'metrics.ctr': metrics.ctr,
          'metrics.cpc': metrics.cpc,
          'metrics.cpm': metrics.cpm,
          'metrics.spend': metrics.spend,
          'metrics.conversions': metrics.conversions,
          'metrics.likes': metrics.likes,
          'metrics.shares': metrics.shares,
          'metrics.lastUpdatedAt': new Date(),
        },
        lastSyncAt: new Date(),
      });

      result.campaignsUpdated++;
      result.metricsRecorded++;
    } catch (error: any) {
      result.errors.push(`Campaign ${campaignId}: ${error.message}`);
    }
  }

  return result;
}

/**
 * Sync all platform metrics
 */
export async function syncAllMetrics(): Promise<{
  success: boolean;
  results: Record<string, SyncResult>;
}> {
  const results: Record<string, SyncResult> = {};
  let overallSuccess = true;

  // Get all connected platforms
  const platforms = await MarketingPlatformConfig.find({ isConnected: true });

  for (const platform of platforms) {
    // Create sync log
    const syncLog = new MarketingSyncLog({
      platform: platform.platform,
      syncType: 'METRICS',
      status: 'STARTED',
      startedAt: new Date(),
    });
    await syncLog.save();

    try {
      // Get active campaigns for this platform
      const campaigns = await MarketingCampaign.find({
        platform: platform.platform,
        status: { $in: ['ACTIVE', 'PAUSED'] },
        externalAdId: { $exists: true },
      }).select('_id externalAdId');

      const campaignIds = campaigns.map((c) => c._id.toString());

      let result: SyncResult;

      switch (platform.platform) {
        case 'META':
          result = await syncMetaMetrics(platform, campaignIds);
          break;
        case 'LINKEDIN':
          result = await syncLinkedInMetrics(platform, campaignIds);
          break;
        case 'GOOGLE_ADS':
          result = await syncGoogleAdsMetrics(platform, campaignIds);
          break;
        case 'TIKTOK':
          result = await syncTikTokMetrics(platform, campaignIds);
          break;
        case 'TWITTER':
          result = await syncTwitterMetrics(platform, campaignIds);
          break;
        default:
          result = {
            success: false,
            campaignsUpdated: 0,
            metricsRecorded: 0,
            errors: [`Platform ${platform.platform} metrics sync not implemented`],
          };
      }

      results[platform.platform] = result;

      if (!result.success) {
        overallSuccess = false;
      }

      // Update sync log
      await MarketingSyncLog.findByIdAndUpdate(syncLog._id, {
        status: result.success ? 'COMPLETED' : 'FAILED',
        completedAt: new Date(),
        recordsProcessed: result.metricsRecorded,
        recordsFailed: result.errors.length,
        errors: result.errors,
      });

      // Update platform last sync
      await MarketingPlatformConfig.findByIdAndUpdate(platform._id, {
        lastSyncAt: new Date(),
        lastError: result.errors.length > 0 ? result.errors[0] : null,
        lastErrorAt: result.errors.length > 0 ? new Date() : null,
      });
    } catch (error: any) {
      results[platform.platform] = {
        success: false,
        campaignsUpdated: 0,
        metricsRecorded: 0,
        errors: [error.message],
      };
      overallSuccess = false;

      await MarketingSyncLog.findByIdAndUpdate(syncLog._id, {
        status: 'FAILED',
        completedAt: new Date(),
        errors: [error.message],
      });
    }
  }

  return { success: overallSuccess, results };
}

/**
 * Sync metrics for a specific campaign
 */
export async function syncCampaignMetrics(campaignId: string): Promise<SyncResult> {
  const campaign = await MarketingCampaign.findById(campaignId);

  if (!campaign) {
    return {
      success: false,
      campaignsUpdated: 0,
      metricsRecorded: 0,
      errors: ['Campaign not found'],
    };
  }

  if (!campaign.externalAdId) {
    return {
      success: false,
      campaignsUpdated: 0,
      metricsRecorded: 0,
      errors: ['Campaign has no external ID (not published)'],
    };
  }

  const config = await MarketingPlatformConfig.findOne({
    platform: campaign.platform,
    isConnected: true,
  });

  if (!config) {
    return {
      success: false,
      campaignsUpdated: 0,
      metricsRecorded: 0,
      errors: [`${campaign.platform} is not connected`],
    };
  }

  switch (campaign.platform) {
    case 'META':
      return syncMetaMetrics(config, [campaignId]);
    case 'LINKEDIN':
      return syncLinkedInMetrics(config, [campaignId]);
    case 'GOOGLE_ADS':
      return syncGoogleAdsMetrics(config, [campaignId]);
    case 'TIKTOK':
      return syncTikTokMetrics(config, [campaignId]);
    case 'TWITTER':
      return syncTwitterMetrics(config, [campaignId]);
    default:
      return {
        success: false,
        campaignsUpdated: 0,
        metricsRecorded: 0,
        errors: [`Platform ${campaign.platform} metrics sync not implemented`],
      };
  }
}
