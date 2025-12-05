import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import connectDB from '@/lib/mongodb';
import MarketingCampaign from '@/models/MarketingCampaign';
import MarketingPlatformConfig from '@/models/MarketingPlatformConfig';
import mongoose from 'mongoose';

interface RouteParams {
  params: Promise<{ id: string }>;
}

// Platform-specific API helpers
async function publishToMeta(campaign: any, config: any): Promise<{ success: boolean; externalId?: string; error?: string }> {
  try {
    const accessToken = config.credentials?.accessToken;
    const adAccountId = config.credentials?.adAccountId;

    if (!accessToken || !adAccountId) {
      return { success: false, error: 'Meta no está configurado correctamente' };
    }

    // Create campaign on Meta
    const campaignResponse = await fetch(
      `https://graph.facebook.com/v18.0/act_${adAccountId}/campaigns`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          access_token: accessToken,
          name: campaign.name,
          objective: mapObjectiveToMeta(campaign.objective),
          status: 'PAUSED', // Start paused for review
          special_ad_categories: [],
        }),
      }
    );

    const campaignData = await campaignResponse.json();

    if (campaignData.error) {
      return { success: false, error: campaignData.error.message };
    }

    const metaCampaignId = campaignData.id;

    // Create ad set
    const adSetResponse = await fetch(
      `https://graph.facebook.com/v18.0/act_${adAccountId}/adsets`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          access_token: accessToken,
          name: `${campaign.name} - Ad Set`,
          campaign_id: metaCampaignId,
          daily_budget: campaign.budgetType === 'DAILY' ? Math.round(campaign.budget * 100) : undefined,
          lifetime_budget: campaign.budgetType === 'LIFETIME' ? Math.round(campaign.budget * 100) : undefined,
          start_time: campaign.startDate ? new Date(campaign.startDate).toISOString() : undefined,
          end_time: campaign.endDate ? new Date(campaign.endDate).toISOString() : undefined,
          billing_event: 'IMPRESSIONS',
          optimization_goal: 'REACH',
          targeting: mapTargetingToMeta(campaign.targeting),
          status: 'PAUSED',
        }),
      }
    );

    const adSetData = await adSetResponse.json();

    if (adSetData.error) {
      return { success: false, error: adSetData.error.message };
    }

    // Create ad with creative if available
    if (campaign.creativeData) {
      const adResponse = await fetch(
        `https://graph.facebook.com/v18.0/act_${adAccountId}/ads`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            access_token: accessToken,
            name: `${campaign.name} - Ad`,
            adset_id: adSetData.id,
            creative: {
              object_story_spec: {
                page_id: config.credentials?.pageId,
                link_data: {
                  link: campaign.creativeData.linkUrl || 'https://example.com',
                  message: campaign.creativeData.bodyText || '',
                  name: campaign.creativeData.headline || '',
                  call_to_action: {
                    type: mapCtaToMeta(campaign.creativeData.callToAction),
                  },
                },
              },
            },
            status: 'PAUSED',
          }),
        }
      );

      const adData = await adResponse.json();
      if (adData.error) {
        console.warn('Ad creation warning:', adData.error.message);
      }
    }

    return { success: true, externalId: metaCampaignId };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

async function publishToLinkedIn(campaign: any, config: any): Promise<{ success: boolean; externalId?: string; error?: string }> {
  try {
    const accessToken = config.credentials?.accessToken;
    const accountId = config.credentials?.accountId;

    if (!accessToken || !accountId) {
      return { success: false, error: 'LinkedIn no está configurado correctamente' };
    }

    // Create campaign group
    const groupResponse = await fetch(
      'https://api.linkedin.com/rest/adCampaignGroups',
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
          'LinkedIn-Version': '202401',
          'X-Restli-Protocol-Version': '2.0.0',
        },
        body: JSON.stringify({
          account: `urn:li:sponsoredAccount:${accountId}`,
          name: campaign.name,
          status: 'DRAFT',
          runSchedule: {
            start: campaign.startDate ? new Date(campaign.startDate).getTime() : Date.now(),
            end: campaign.endDate ? new Date(campaign.endDate).getTime() : undefined,
          },
        }),
      }
    );

    if (!groupResponse.ok) {
      const errorData = await groupResponse.json();
      return { success: false, error: errorData.message || 'Error al crear campaña en LinkedIn' };
    }

    const groupId = groupResponse.headers.get('x-restli-id');

    // Create campaign
    const campaignResponse = await fetch(
      'https://api.linkedin.com/rest/adCampaigns',
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
          'LinkedIn-Version': '202401',
          'X-Restli-Protocol-Version': '2.0.0',
        },
        body: JSON.stringify({
          account: `urn:li:sponsoredAccount:${accountId}`,
          campaignGroup: `urn:li:sponsoredCampaignGroup:${groupId}`,
          name: `${campaign.name} - Campaign`,
          status: 'DRAFT',
          type: 'SPONSORED_UPDATES',
          objectiveType: mapObjectiveToLinkedIn(campaign.objective),
          dailyBudget: campaign.budgetType === 'DAILY' ? {
            amount: String(Math.round(campaign.budget * 100)),
            currencyCode: 'MXN',
          } : undefined,
          totalBudget: campaign.budgetType === 'LIFETIME' ? {
            amount: String(Math.round(campaign.budget * 100)),
            currencyCode: 'MXN',
          } : undefined,
        }),
      }
    );

    if (!campaignResponse.ok) {
      const errorData = await campaignResponse.json();
      return { success: false, error: errorData.message || 'Error al crear campaña en LinkedIn' };
    }

    return { success: true, externalId: groupId || undefined };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

// Helper functions to map our data to platform formats
function mapObjectiveToMeta(objective: string): string {
  const mapping: Record<string, string> = {
    awareness: 'OUTCOME_AWARENESS',
    traffic: 'OUTCOME_TRAFFIC',
    engagement: 'OUTCOME_ENGAGEMENT',
    leads: 'OUTCOME_LEADS',
    conversions: 'OUTCOME_SALES',
    messages: 'OUTCOME_ENGAGEMENT',
    video_views: 'OUTCOME_AWARENESS',
  };
  return mapping[objective] || 'OUTCOME_AWARENESS';
}

function mapObjectiveToLinkedIn(objective: string): string {
  const mapping: Record<string, string> = {
    awareness: 'BRAND_AWARENESS',
    traffic: 'WEBSITE_VISITS',
    engagement: 'ENGAGEMENT',
    leads: 'LEAD_GENERATION',
    conversions: 'WEBSITE_CONVERSIONS',
    video_views: 'VIDEO_VIEWS',
  };
  return mapping[objective] || 'BRAND_AWARENESS';
}

function mapTargetingToMeta(targeting: any): any {
  const metaTargeting: any = {
    geo_locations: {},
  };

  if (targeting?.locations?.length > 0) {
    metaTargeting.geo_locations.countries = targeting.locations;
  } else {
    metaTargeting.geo_locations.countries = ['MX']; // Default to Mexico
  }

  if (targeting?.ageMin || targeting?.ageMax) {
    metaTargeting.age_min = targeting.ageMin || 18;
    metaTargeting.age_max = targeting.ageMax || 65;
  }

  if (targeting?.interests?.length > 0) {
    metaTargeting.flexible_spec = [{ interests: targeting.interests }];
  }

  return metaTargeting;
}

function mapCtaToMeta(cta: string): string {
  const mapping: Record<string, string> = {
    'learn_more': 'LEARN_MORE',
    'shop_now': 'SHOP_NOW',
    'sign_up': 'SIGN_UP',
    'download': 'DOWNLOAD',
    'contact': 'CONTACT_US',
    'book': 'BOOK_TRAVEL',
    'watch': 'WATCH_VIDEO',
    'apply': 'APPLY_NOW',
    'get_offer': 'GET_OFFER',
    'subscribe': 'SUBSCRIBE',
  };
  return mapping[cta?.toLowerCase()] || 'LEARN_MORE';
}

// POST - Publish campaign to platform
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const user = session.user as any;
    if (!user.permissions?.canManageCampaigns && user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Sin permisos' }, { status: 403 });
    }

    const { id } = await params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ error: 'ID inválido' }, { status: 400 });
    }

    await connectDB();

    const campaign = await MarketingCampaign.findById(id);

    if (!campaign) {
      return NextResponse.json({ error: 'Campaña no encontrada' }, { status: 404 });
    }

    if (campaign.status !== 'DRAFT') {
      return NextResponse.json(
        { error: 'Solo se pueden publicar campañas en estado borrador' },
        { status: 400 }
      );
    }

    // Get platform configuration
    const platformConfig = await MarketingPlatformConfig.findOne({
      platform: campaign.platform,
      isConnected: true,
    });

    if (!platformConfig) {
      return NextResponse.json(
        { error: `${campaign.platform} no está conectado. Configúralo en Admin > Integraciones.` },
        { status: 400 }
      );
    }

    // Publish to the appropriate platform
    let result: { success: boolean; externalId?: string; error?: string };

    switch (campaign.platform) {
      case 'META':
        result = await publishToMeta(campaign, platformConfig);
        break;
      case 'LINKEDIN':
        result = await publishToLinkedIn(campaign, platformConfig);
        break;
      case 'TWITTER':
      case 'TIKTOK':
      case 'YOUTUBE':
        // Placeholder for other platforms
        result = {
          success: false,
          error: `Publicación a ${campaign.platform} aún no implementada`,
        };
        break;
      default:
        result = { success: false, error: 'Plataforma no soportada' };
    }

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    // Update campaign with external ID and status
    campaign.externalAdId = result.externalId;
    campaign.status = 'PENDING_REVIEW';
    await campaign.save();

    return NextResponse.json({
      success: true,
      message: `Campaña publicada exitosamente en ${campaign.platform}`,
      externalId: result.externalId,
      status: 'PENDING_REVIEW',
    });
  } catch (error: any) {
    console.error('Error publishing campaign:', error);
    return NextResponse.json(
      { error: error.message || 'Error al publicar campaña' },
      { status: 500 }
    );
  }
}
