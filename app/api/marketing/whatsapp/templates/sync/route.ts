import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import connectDB from '@/lib/mongodb';
import WhatsAppTemplate from '@/models/WhatsAppTemplate';
import MarketingPlatformConfig from '@/models/MarketingPlatformConfig';
import MarketingSyncLog from '@/models/MarketingSyncLog';
import { decryptToken } from '@/lib/marketing/tokenEncryption';

// POST - Sync templates from Meta WhatsApp Business API
export async function POST() {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    await connectDB();

    // Get WhatsApp config
    const config = await MarketingPlatformConfig.findOne({
      platform: 'WHATSAPP',
      isActive: true,
    });

    if (!config || !config.accessToken) {
      return NextResponse.json(
        { error: 'WhatsApp Business no está conectado' },
        { status: 400 }
      );
    }

    const accessToken = decryptToken(config.accessToken);
    const wabaId = config.platformData?.wabaId;

    if (!wabaId) {
      return NextResponse.json(
        { error: 'WhatsApp Business Account ID no configurado' },
        { status: 400 }
      );
    }

    // Create sync log
    const syncLog = await MarketingSyncLog.create({
      platform: 'WHATSAPP',
      platformConfigId: config._id,
      syncType: 'TEMPLATES',
      status: 'IN_PROGRESS',
      startedAt: new Date(),
      triggerType: 'MANUAL',
      triggeredBy: (session.user as any).id,
      recordsProcessed: 0,
      apiCallsMade: 0,
    });

    try {
      // Fetch templates from Meta
      const response = await fetch(
        `https://graph.facebook.com/v18.0/${wabaId}/message_templates?limit=100`,
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
          },
        }
      );

      syncLog.apiCallsMade = 1;

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error?.message || 'Error fetching templates from Meta');
      }

      const data = await response.json();
      const metaTemplates = data.data || [];

      let created = 0;
      let updated = 0;
      let failed = 0;

      // Process each template
      for (const metaTemplate of metaTemplates) {
        try {
          const existingTemplate = await WhatsAppTemplate.findOne({
            $or: [
              { externalTemplateId: metaTemplate.id },
              { name: metaTemplate.name, language: metaTemplate.language },
            ],
          });

          const templateData = {
            name: metaTemplate.name,
            language: metaTemplate.language,
            category: metaTemplate.category,
            status: mapMetaStatus(metaTemplate.status),
            externalTemplateId: metaTemplate.id,
            externalNamespace: metaTemplate.namespace,
            components: metaTemplate.components?.map((comp: any) => ({
              type: comp.type,
              format: comp.format,
              text: comp.text,
              buttons: comp.buttons,
              example: comp.example,
            })) || [],
            rejectionReason: metaTemplate.rejected_reason,
            lastReviewedAt: new Date(),
          };

          if (existingTemplate) {
            await WhatsAppTemplate.findByIdAndUpdate(
              existingTemplate._id,
              { $set: templateData }
            );
            updated++;
          } else {
            await WhatsAppTemplate.create({
              ...templateData,
              createdBy: (session.user as any).id,
            });
            created++;
          }
        } catch (templateError) {
          console.error('Error processing template:', metaTemplate.name, templateError);
          failed++;
        }
      }

      // Update sync log
      syncLog.status = failed > 0 ? 'PARTIAL' : 'SUCCESS';
      syncLog.completedAt = new Date();
      syncLog.recordsProcessed = metaTemplates.length;
      syncLog.recordsCreated = created;
      syncLog.recordsUpdated = updated;
      syncLog.recordsFailed = failed;
      await syncLog.save();

      // Update config last sync
      config.lastSyncAt = new Date();
      await config.save();

      return NextResponse.json({
        success: true,
        message: 'Sincronización completada',
        stats: {
          total: metaTemplates.length,
          created,
          updated,
          failed,
        },
      });
    } catch (apiError: any) {
      // Update sync log with error
      syncLog.status = 'FAILED';
      syncLog.completedAt = new Date();
      (syncLog as any).errors = [{ error: apiError.message, timestamp: new Date() }];
      await syncLog.save();

      throw apiError;
    }
  } catch (error: any) {
    console.error('Error syncing WhatsApp templates:', error);
    return NextResponse.json(
      { error: error.message || 'Error al sincronizar templates' },
      { status: 500 }
    );
  }
}

// Map Meta template status to our status
function mapMetaStatus(metaStatus: string): string {
  const statusMap: Record<string, string> = {
    'APPROVED': 'APPROVED',
    'PENDING': 'PENDING',
    'REJECTED': 'REJECTED',
    'PAUSED': 'PAUSED',
    'DISABLED': 'DISABLED',
    'IN_APPEAL': 'PENDING',
    'PENDING_DELETION': 'DISABLED',
  };
  return statusMap[metaStatus] || 'PENDING';
}
