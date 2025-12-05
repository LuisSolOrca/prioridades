import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import connectDB from '@/lib/mongodb';
import MarketingCampaign from '@/models/MarketingCampaign';
import MarketingPlatformConfig from '@/models/MarketingPlatformConfig';
import MarketingMetric from '@/models/MarketingMetric';
import MarketingSyncLog from '@/models/MarketingSyncLog';
import { decryptToken } from '@/lib/marketing/tokenEncryption';

// POST - Sync campaign metrics from platform
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    await connectDB();

    const campaign = await MarketingCampaign.findById(params.id);
    if (!campaign) {
      return NextResponse.json({ error: 'Campaña no encontrada' }, { status: 404 });
    }

    // Get platform config
    const config = await MarketingPlatformConfig.findOne({
      platform: campaign.platform,
      isActive: true,
    });

    if (!config || !config.accessToken) {
      return NextResponse.json(
        { error: `${campaign.platform} no está conectado` },
        { status: 400 }
      );
    }

    // Create sync log
    const syncLog = await MarketingSyncLog.create({
      platform: campaign.platform,
      platformConfigId: config._id,
      syncType: 'METRICS',
      status: 'IN_PROGRESS',
      startedAt: new Date(),
      triggerType: 'MANUAL',
      triggeredBy: (session.user as any).id,
      recordsProcessed: 0,
      apiCallsMade: 0,
    });

    try {
      const accessToken = decryptToken(config.accessToken);
      let metrics: any = null;

      // Platform-specific sync logic
      switch (campaign.platform) {
        case 'META':
          metrics = await syncMetaCampaign(campaign, accessToken, config);
          break;
        case 'LINKEDIN':
          metrics = await syncLinkedInCampaign(campaign, accessToken, config);
          break;
        case 'TWITTER':
          metrics = await syncTwitterCampaign(campaign, accessToken, config);
          break;
        case 'TIKTOK':
          metrics = await syncTikTokCampaign(campaign, accessToken, config);
          break;
        case 'YOUTUBE':
          metrics = await syncYouTubeCampaign(campaign, accessToken, config);
          break;
        default:
          // For platforms without external campaigns, just update lastSyncAt
          metrics = campaign.metrics || {};
      }

      syncLog.apiCallsMade = 1;

      // Update campaign with synced metrics
      if (metrics) {
        campaign.metrics = {
          ...campaign.metrics,
          ...metrics,
          lastUpdatedAt: new Date(),
        };
        campaign.spentAmount = metrics.spend || campaign.spentAmount;
        campaign.lastSyncAt = new Date();
        campaign.syncError = undefined;
        await campaign.save();

        // Save historical metric record
        await MarketingMetric.create({
          campaignId: campaign._id,
          platformConfigId: config._id,
          platform: campaign.platform,
          date: new Date(),
          periodType: 'DAY',
          impressions: metrics.impressions || 0,
          reach: metrics.reach || 0,
          clicks: metrics.clicks || 0,
          spend: metrics.spend || 0,
          conversions: metrics.conversions || 0,
          conversionValue: metrics.conversionValue || 0,
          likes: metrics.likes || 0,
          shares: metrics.shares || 0,
          comments: metrics.comments || 0,
        });
      }

      // Update sync log
      syncLog.status = 'SUCCESS';
      syncLog.completedAt = new Date();
      syncLog.recordsProcessed = 1;
      syncLog.recordsUpdated = 1;
      await syncLog.save();

      return NextResponse.json({
        success: true,
        message: 'Campaña sincronizada exitosamente',
        metrics: campaign.metrics,
      });
    } catch (apiError: any) {
      // Update campaign with error
      campaign.syncError = apiError.message;
      campaign.lastSyncAt = new Date();
      await campaign.save();

      // Update sync log
      syncLog.status = 'FAILED';
      syncLog.completedAt = new Date();
      (syncLog as any).errors = [{ error: apiError.message, timestamp: new Date() }];
      await syncLog.save();

      throw apiError;
    }
  } catch (error: any) {
    console.error('Error syncing campaign:', error);
    return NextResponse.json(
      { error: error.message || 'Error al sincronizar campaña' },
      { status: 500 }
    );
  }
}

// Meta (Facebook/Instagram) sync
async function syncMetaCampaign(campaign: any, accessToken: string, config: any) {
  if (!campaign.externalCampaignId) {
    return null;
  }

  const fields = 'impressions,reach,clicks,spend,actions,action_values,ctr,cpc,frequency';
  const response = await fetch(
    `https://graph.facebook.com/v18.0/${campaign.externalCampaignId}/insights?fields=${fields}&date_preset=lifetime`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    }
  );

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error?.message || 'Error fetching Meta campaign data');
  }

  const data = await response.json();
  const insights = data.data?.[0];

  if (!insights) {
    return null;
  }

  // Extract conversion data from actions
  let conversions = 0;
  let conversionValue = 0;

  if (insights.actions) {
    const purchaseAction = insights.actions.find(
      (a: any) => a.action_type === 'purchase' || a.action_type === 'omni_purchase'
    );
    const leadAction = insights.actions.find((a: any) => a.action_type === 'lead');

    conversions = parseInt(purchaseAction?.value || leadAction?.value || '0');
  }

  if (insights.action_values) {
    const purchaseValue = insights.action_values.find(
      (a: any) => a.action_type === 'purchase' || a.action_type === 'omni_purchase'
    );
    conversionValue = parseFloat(purchaseValue?.value || '0');
  }

  return {
    impressions: parseInt(insights.impressions || '0'),
    reach: parseInt(insights.reach || '0'),
    clicks: parseInt(insights.clicks || '0'),
    spend: parseFloat(insights.spend || '0'),
    ctr: parseFloat(insights.ctr || '0') / 100,
    costPerClick: parseFloat(insights.cpc || '0'),
    frequency: parseFloat(insights.frequency || '0'),
    conversions,
    conversionValue,
    costPerResult: conversions > 0 ? parseFloat(insights.spend || '0') / conversions : 0,
  };
}

// LinkedIn sync
async function syncLinkedInCampaign(campaign: any, accessToken: string, config: any) {
  if (!campaign.externalCampaignId) {
    return null;
  }

  const response = await fetch(
    `https://api.linkedin.com/v2/adAnalyticsV2?q=analytics&pivot=CAMPAIGN&campaigns=urn:li:sponsoredCampaign:${campaign.externalCampaignId}&dateRange.start.day=1&dateRange.start.month=1&dateRange.start.year=2024&dateRange.end.day=31&dateRange.end.month=12&dateRange.end.year=2024`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'X-Restli-Protocol-Version': '2.0.0',
      },
    }
  );

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.message || 'Error fetching LinkedIn campaign data');
  }

  const data = await response.json();
  const analytics = data.elements?.[0];

  if (!analytics) {
    return null;
  }

  return {
    impressions: analytics.impressions || 0,
    clicks: analytics.clicks || 0,
    spend: (analytics.costInLocalCurrency || 0) / 100, // LinkedIn returns cents
    ctr: analytics.clicks && analytics.impressions ? analytics.clicks / analytics.impressions : 0,
    conversions: analytics.externalWebsiteConversions || 0,
    conversionValue: analytics.externalWebsitePostClickConversionValue || 0,
    costPerClick: analytics.clicks > 0 ? (analytics.costInLocalCurrency || 0) / 100 / analytics.clicks : 0,
    likes: analytics.likes || 0,
    shares: analytics.shares || 0,
    comments: analytics.comments || 0,
  };
}

// Twitter sync
async function syncTwitterCampaign(campaign: any, accessToken: string, config: any) {
  if (!campaign.externalCampaignId) {
    return null;
  }

  // Twitter Ads API requires account ID
  const accountId = config.platformData?.accountId;
  if (!accountId) {
    return null;
  }

  const response = await fetch(
    `https://ads-api.twitter.com/12/stats/accounts/${accountId}/campaigns/${campaign.externalCampaignId}?granularity=TOTAL&metric_groups=ENGAGEMENT,BILLING`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    }
  );

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.errors?.[0]?.message || 'Error fetching Twitter campaign data');
  }

  const data = await response.json();
  const metrics = data.data?.[0]?.id_data?.[0]?.metrics;

  if (!metrics) {
    return null;
  }

  return {
    impressions: metrics.impressions?.[0] || 0,
    clicks: metrics.clicks?.[0] || 0,
    spend: (metrics.billed_charge_local_micro?.[0] || 0) / 1000000,
    likes: metrics.likes?.[0] || 0,
    shares: metrics.retweets?.[0] || 0,
    replies: metrics.replies?.[0] || 0,
  };
}

// TikTok sync
async function syncTikTokCampaign(campaign: any, accessToken: string, config: any) {
  if (!campaign.externalCampaignId) {
    return null;
  }

  const advertiserId = config.platformData?.advertiserId;
  if (!advertiserId) {
    return null;
  }

  const response = await fetch(
    `https://business-api.tiktok.com/open_api/v1.3/report/integrated/get/`,
    {
      method: 'POST',
      headers: {
        'Access-Token': accessToken,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        advertiser_id: advertiserId,
        report_type: 'BASIC',
        dimensions: ['campaign_id'],
        metrics: ['spend', 'impressions', 'clicks', 'conversion', 'video_views'],
        filters: [
          {
            field_name: 'campaign_id',
            filter_type: 'IN',
            filter_value: [campaign.externalCampaignId],
          },
        ],
        data_level: 'AUCTION_CAMPAIGN',
        lifetime: true,
      }),
    }
  );

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.message || 'Error fetching TikTok campaign data');
  }

  const data = await response.json();
  const row = data.data?.list?.[0]?.metrics;

  if (!row) {
    return null;
  }

  return {
    impressions: parseInt(row.impressions || '0'),
    clicks: parseInt(row.clicks || '0'),
    spend: parseFloat(row.spend || '0'),
    conversions: parseInt(row.conversion || '0'),
    videoViews: parseInt(row.video_views || '0'),
  };
}

// YouTube sync (through Google Ads)
async function syncYouTubeCampaign(campaign: any, accessToken: string, config: any) {
  // YouTube video campaigns are managed through Google Ads
  // This is a placeholder - actual implementation requires Google Ads API
  if (!campaign.externalCampaignId) {
    return null;
  }

  // For YouTube organic content, use YouTube Analytics API
  // For ads, use Google Ads API

  return null;
}
