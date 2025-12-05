import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import connectDB from '@/lib/mongodb';
import MarketingPlatformConfig from '@/models/MarketingPlatformConfig';
import MarketingCampaign from '@/models/MarketingCampaign';
import MarketingMetric from '@/models/MarketingMetric';
import MarketingSyncLog from '@/models/MarketingSyncLog';
import { decryptToken } from '@/lib/marketing/tokenEncryption';

const VALID_PLATFORMS = ['META', 'LINKEDIN', 'TWITTER', 'TIKTOK', 'YOUTUBE', 'WHATSAPP', 'GA4'];

// POST - Sync specific platform
export async function POST(
  request: NextRequest,
  { params }: { params: { platform: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const platform = params.platform.toUpperCase();

    if (!VALID_PLATFORMS.includes(platform)) {
      return NextResponse.json(
        { error: `Plataforma inválida. Válidas: ${VALID_PLATFORMS.join(', ')}` },
        { status: 400 }
      );
    }

    await connectDB();

    // Get platform config
    const config = await MarketingPlatformConfig.findOne({
      platform,
      isActive: true,
    });

    if (!config) {
      return NextResponse.json(
        { error: `${platform} no está conectado` },
        { status: 400 }
      );
    }

    if (!config.accessToken) {
      return NextResponse.json(
        { error: `${platform} no tiene token de acceso configurado` },
        { status: 400 }
      );
    }

    // Create sync log
    const syncLog = await MarketingSyncLog.create({
      platform,
      platformConfigId: config._id,
      syncType: 'FULL',
      status: 'IN_PROGRESS',
      startedAt: new Date(),
      triggerType: 'MANUAL',
      triggeredBy: (session.user as any).id,
      recordsProcessed: 0,
      recordsCreated: 0,
      recordsUpdated: 0,
      recordsFailed: 0,
      apiCallsMade: 0,
    });

    try {
      const accessToken = decryptToken(config.accessToken);
      let syncResult: SyncResult;

      // Platform-specific sync logic
      switch (platform) {
        case 'META':
          syncResult = await syncMetaPlatform(config, accessToken, syncLog);
          break;
        case 'LINKEDIN':
          syncResult = await syncLinkedInPlatform(config, accessToken, syncLog);
          break;
        case 'TWITTER':
          syncResult = await syncTwitterPlatform(config, accessToken, syncLog);
          break;
        case 'TIKTOK':
          syncResult = await syncTikTokPlatform(config, accessToken, syncLog);
          break;
        case 'YOUTUBE':
          syncResult = await syncYouTubePlatform(config, accessToken, syncLog);
          break;
        case 'WHATSAPP':
          syncResult = await syncWhatsAppPlatform(config, accessToken, syncLog);
          break;
        case 'GA4':
          syncResult = await syncGA4Platform(config, accessToken, syncLog);
          break;
        default:
          syncResult = { success: true, message: 'No sync logic for this platform' };
      }

      // Update sync log
      syncLog.status = syncResult.errors && syncResult.errors.length > 0 ? 'PARTIAL' : 'SUCCESS';
      syncLog.completedAt = new Date();
      syncLog.durationMs = new Date().getTime() - syncLog.startedAt.getTime();
      if (syncResult.errors) {
        (syncLog as any).errors = syncResult.errors;
      }
      await syncLog.save();

      // Update config
      config.lastSyncAt = new Date();
      config.consecutiveErrors = 0;
      config.lastError = undefined;
      await config.save();

      return NextResponse.json({
        success: true,
        platform,
        message: syncResult.message || 'Sincronización completada',
        duration: syncLog.durationMs,
        stats: {
          processed: syncLog.recordsProcessed,
          created: syncLog.recordsCreated,
          updated: syncLog.recordsUpdated,
          failed: syncLog.recordsFailed,
          apiCalls: syncLog.apiCallsMade,
        },
        errors: syncResult.errors,
      });
    } catch (error: any) {
      // Update sync log with error
      syncLog.status = 'FAILED';
      syncLog.completedAt = new Date();
      syncLog.durationMs = new Date().getTime() - syncLog.startedAt.getTime();
      (syncLog as any).errors = [{ error: error.message, timestamp: new Date() }];
      await syncLog.save();

      // Update config with error
      config.lastError = error.message;
      config.lastErrorAt = new Date();
      config.consecutiveErrors = (config.consecutiveErrors || 0) + 1;
      await config.save();

      throw error;
    }
  } catch (error: any) {
    console.error(`Error syncing ${params.platform}:`, error);
    return NextResponse.json(
      { error: error.message || 'Error al sincronizar plataforma' },
      { status: 500 }
    );
  }
}

// GET - Get sync status for platform
export async function GET(
  request: NextRequest,
  { params }: { params: { platform: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const platform = params.platform.toUpperCase();

    await connectDB();

    const config = await MarketingPlatformConfig.findOne({
      platform,
      isActive: true,
    });

    if (!config) {
      return NextResponse.json({
        platform,
        connected: false,
        message: `${platform} no está conectado`,
      });
    }

    // Get last sync logs
    const recentSyncs = await MarketingSyncLog.find({
      platform,
    })
      .sort({ startedAt: -1 })
      .limit(10)
      .lean();

    // Check if there's an active sync
    const activeSync = await MarketingSyncLog.findOne({
      platform,
      status: 'IN_PROGRESS',
    });

    return NextResponse.json({
      platform,
      connected: true,
      syncEnabled: config.syncEnabled,
      syncFrequency: config.syncFrequency,
      lastSyncAt: config.lastSyncAt,
      lastError: config.lastError,
      lastErrorAt: config.lastErrorAt,
      consecutiveErrors: config.consecutiveErrors,
      isCurrentlySyncing: !!activeSync,
      recentSyncs: recentSyncs.map((s) => ({
        id: s._id,
        syncType: s.syncType,
        status: s.status,
        startedAt: s.startedAt,
        completedAt: s.completedAt,
        durationMs: s.durationMs,
        recordsProcessed: s.recordsProcessed,
      })),
    });
  } catch (error) {
    console.error('Error getting sync status:', error);
    return NextResponse.json(
      { error: 'Error al obtener estado de sincronización' },
      { status: 500 }
    );
  }
}

// Types
interface SyncResult {
  success: boolean;
  message?: string;
  errors?: { error: string; timestamp: Date }[];
}

// Platform-specific sync functions
async function syncMetaPlatform(config: any, accessToken: string, syncLog: any): Promise<SyncResult> {
  const errors: { error: string; timestamp: Date }[] = [];

  try {
    // Fetch campaigns from Meta
    const adAccountId = config.platformData?.adAccountId;
    if (!adAccountId) {
      return { success: true, message: 'No ad account configured' };
    }

    const response = await fetch(
      `https://graph.facebook.com/v18.0/act_${adAccountId}/campaigns?fields=id,name,status,objective,daily_budget,lifetime_budget,start_time,stop_time&limit=100`,
      {
        headers: { Authorization: `Bearer ${accessToken}` },
      }
    );

    syncLog.apiCallsMade++;

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error?.message || 'Error fetching Meta campaigns');
    }

    const data = await response.json();
    const campaigns = data.data || [];

    for (const metaCampaign of campaigns) {
      try {
        // Check if campaign exists
        let campaign = await MarketingCampaign.findOne({
          externalCampaignId: metaCampaign.id,
          platform: 'META',
        });

        const campaignData = {
          name: metaCampaign.name,
          platform: 'META',
          externalCampaignId: metaCampaign.id,
          objective: mapMetaObjective(metaCampaign.objective),
          status: mapMetaStatus(metaCampaign.status),
          budget: metaCampaign.lifetime_budget ? parseFloat(metaCampaign.lifetime_budget) / 100 : 0,
          budgetType: metaCampaign.lifetime_budget ? 'LIFETIME' : 'DAILY',
          startDate: metaCampaign.start_time ? new Date(metaCampaign.start_time) : undefined,
          endDate: metaCampaign.stop_time ? new Date(metaCampaign.stop_time) : undefined,
        };

        if (campaign) {
          await MarketingCampaign.findByIdAndUpdate(campaign._id, campaignData);
          syncLog.recordsUpdated++;
        } else {
          await MarketingCampaign.create({
            ...campaignData,
            currency: 'MXN',
            createdBy: config.configuredBy,
            ownerId: config.configuredBy,
          });
          syncLog.recordsCreated++;
        }
        syncLog.recordsProcessed++;
      } catch (err: any) {
        errors.push({ error: `Campaign ${metaCampaign.id}: ${err.message}`, timestamp: new Date() });
        syncLog.recordsFailed++;
      }
    }

    await syncLog.save();
    return { success: true, message: `Synced ${campaigns.length} campaigns from Meta`, errors };
  } catch (error: any) {
    errors.push({ error: error.message, timestamp: new Date() });
    return { success: false, message: error.message, errors };
  }
}

async function syncLinkedInPlatform(config: any, accessToken: string, syncLog: any): Promise<SyncResult> {
  // LinkedIn API sync logic
  syncLog.apiCallsMade++;
  return { success: true, message: 'LinkedIn sync completed (placeholder)' };
}

async function syncTwitterPlatform(config: any, accessToken: string, syncLog: any): Promise<SyncResult> {
  // Twitter API sync logic
  syncLog.apiCallsMade++;
  return { success: true, message: 'Twitter sync completed (placeholder)' };
}

async function syncTikTokPlatform(config: any, accessToken: string, syncLog: any): Promise<SyncResult> {
  // TikTok API sync logic
  syncLog.apiCallsMade++;
  return { success: true, message: 'TikTok sync completed (placeholder)' };
}

async function syncYouTubePlatform(config: any, accessToken: string, syncLog: any): Promise<SyncResult> {
  // YouTube API sync logic
  syncLog.apiCallsMade++;
  return { success: true, message: 'YouTube sync completed (placeholder)' };
}

async function syncWhatsAppPlatform(config: any, accessToken: string, syncLog: any): Promise<SyncResult> {
  // WhatsApp templates are synced via separate endpoint
  syncLog.apiCallsMade++;
  return { success: true, message: 'WhatsApp sync completed' };
}

async function syncGA4Platform(config: any, accessToken: string, syncLog: any): Promise<SyncResult> {
  // GA4 API sync logic
  syncLog.apiCallsMade++;
  return { success: true, message: 'GA4 sync completed (placeholder)' };
}

// Helper functions
function mapMetaObjective(objective: string): string {
  const map: Record<string, string> = {
    OUTCOME_AWARENESS: 'AWARENESS',
    OUTCOME_TRAFFIC: 'TRAFFIC',
    OUTCOME_ENGAGEMENT: 'ENGAGEMENT',
    OUTCOME_LEADS: 'LEADS',
    OUTCOME_SALES: 'CONVERSIONS',
    OUTCOME_APP_PROMOTION: 'CONVERSIONS',
    BRAND_AWARENESS: 'AWARENESS',
    REACH: 'AWARENESS',
    LINK_CLICKS: 'TRAFFIC',
    POST_ENGAGEMENT: 'ENGAGEMENT',
    PAGE_LIKES: 'ENGAGEMENT',
    LEAD_GENERATION: 'LEADS',
    CONVERSIONS: 'CONVERSIONS',
    MESSAGES: 'MESSAGES',
  };
  return map[objective] || 'AWARENESS';
}

function mapMetaStatus(status: string): string {
  const map: Record<string, string> = {
    ACTIVE: 'ACTIVE',
    PAUSED: 'PAUSED',
    DELETED: 'COMPLETED',
    ARCHIVED: 'COMPLETED',
  };
  return map[status] || 'DRAFT';
}
