import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import connectDB from '@/lib/mongodb';
import WhatsAppTemplate from '@/models/WhatsAppTemplate';
import MarketingPlatformConfig from '@/models/MarketingPlatformConfig';
import MarketingCampaign from '@/models/MarketingCampaign';
import { decryptToken } from '@/lib/marketing/tokenEncryption';

interface BroadcastRecipient {
  phone: string;
  name?: string;
  variables?: Record<string, string>;
}

interface BroadcastRequest {
  templateId: string;
  recipients: BroadcastRecipient[];
  campaignName?: string;
  scheduledAt?: string;
}

// POST - Send broadcast message via WhatsApp
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    await connectDB();

    const body: BroadcastRequest = await request.json();
    const { templateId, recipients, campaignName, scheduledAt } = body;

    // Validate required fields
    if (!templateId || !recipients || recipients.length === 0) {
      return NextResponse.json(
        { error: 'Se requiere templateId y al menos un destinatario' },
        { status: 400 }
      );
    }

    // Validate recipients limit (Meta allows 256 per API call)
    if (recipients.length > 1000) {
      return NextResponse.json(
        { error: 'Máximo 1000 destinatarios por broadcast' },
        { status: 400 }
      );
    }

    // Get template
    const template = await WhatsAppTemplate.findById(templateId);
    if (!template) {
      return NextResponse.json(
        { error: 'Template no encontrado' },
        { status: 404 }
      );
    }

    if (template.status !== 'APPROVED') {
      return NextResponse.json(
        { error: 'El template debe estar aprobado para enviar mensajes' },
        { status: 400 }
      );
    }

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
    const phoneNumberId = config.platformData?.phoneNumberId;

    if (!phoneNumberId) {
      return NextResponse.json(
        { error: 'Número de teléfono de WhatsApp no configurado' },
        { status: 400 }
      );
    }

    // Create campaign for tracking
    const campaign = await MarketingCampaign.create({
      name: campaignName || `Broadcast - ${template.name} - ${new Date().toISOString()}`,
      platform: 'WHATSAPP',
      objective: 'MESSAGES',
      status: scheduledAt ? 'PENDING_REVIEW' : 'ACTIVE',
      budgetType: 'LIFETIME',
      budget: 0,
      currency: 'MXN',
      spentAmount: 0,
      startDate: scheduledAt ? new Date(scheduledAt) : new Date(),
      createdBy: (session.user as any).id,
      ownerId: (session.user as any).id,
      tags: ['broadcast', 'whatsapp'],
      notes: `Template: ${template.name}, Recipients: ${recipients.length}`,
    });

    // If scheduled, return campaign info
    if (scheduledAt) {
      return NextResponse.json({
        success: true,
        message: 'Broadcast programado exitosamente',
        campaign: {
          id: campaign._id,
          scheduledAt,
          recipients: recipients.length,
        },
      });
    }

    // Send messages
    const results = {
      sent: 0,
      failed: 0,
      errors: [] as { phone: string; error: string }[],
    };

    // Process in batches of 50 to avoid rate limits
    const batchSize = 50;
    const batches = Math.ceil(recipients.length / batchSize);

    for (let i = 0; i < batches; i++) {
      const batch = recipients.slice(i * batchSize, (i + 1) * batchSize);

      // Process batch in parallel
      const batchPromises = batch.map(async (recipient) => {
        try {
          const response = await sendTemplateMessage(
            phoneNumberId,
            accessToken,
            recipient.phone,
            template.name,
            template.language,
            template.components,
            recipient.variables
          );

          if (response.success) {
            results.sent++;
          } else {
            results.failed++;
            results.errors.push({
              phone: recipient.phone,
              error: response.error || 'Unknown error',
            });
          }
        } catch (error: any) {
          results.failed++;
          results.errors.push({
            phone: recipient.phone,
            error: error.message,
          });
        }
      });

      await Promise.all(batchPromises);

      // Small delay between batches to respect rate limits
      if (i < batches - 1) {
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }
    }

    // Update template stats
    await WhatsAppTemplate.findByIdAndUpdate(templateId, {
      $inc: { messagesSent: results.sent },
      $set: { lastUsedAt: new Date() },
    });

    // Update campaign metrics
    await MarketingCampaign.findByIdAndUpdate(campaign._id, {
      $set: {
        status: 'COMPLETED',
        'metrics.messagesDelivered': results.sent,
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Broadcast enviado',
      campaign: {
        id: campaign._id,
        name: campaign.name,
      },
      results: {
        total: recipients.length,
        sent: results.sent,
        failed: results.failed,
        errors: results.errors.slice(0, 10), // Return only first 10 errors
      },
    });
  } catch (error: any) {
    console.error('Error sending WhatsApp broadcast:', error);
    return NextResponse.json(
      { error: error.message || 'Error al enviar broadcast' },
      { status: 500 }
    );
  }
}

// Helper function to send a template message
async function sendTemplateMessage(
  phoneNumberId: string,
  accessToken: string,
  recipientPhone: string,
  templateName: string,
  templateLanguage: string,
  components: any[],
  variables?: Record<string, string>
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  try {
    // Format phone number (remove non-digits, ensure country code)
    const formattedPhone = recipientPhone.replace(/\D/g, '');

    // Build template message
    const messageBody: any = {
      messaging_product: 'whatsapp',
      to: formattedPhone,
      type: 'template',
      template: {
        name: templateName,
        language: {
          code: templateLanguage,
        },
      },
    };

    // Add components with variables if provided
    if (variables && Object.keys(variables).length > 0) {
      const templateComponents: any[] = [];

      // Process header variables
      const headerComp = components.find((c) => c.type === 'HEADER');
      if (headerComp && variables.header) {
        templateComponents.push({
          type: 'header',
          parameters: [
            {
              type: headerComp.format?.toLowerCase() || 'text',
              text: variables.header,
            },
          ],
        });
      }

      // Process body variables
      const bodyComp = components.find((c) => c.type === 'BODY');
      if (bodyComp) {
        const bodyParams = Object.entries(variables)
          .filter(([key]) => key.startsWith('body_'))
          .sort(([a], [b]) => a.localeCompare(b))
          .map(([, value]) => ({
            type: 'text',
            text: value,
          }));

        if (bodyParams.length > 0) {
          templateComponents.push({
            type: 'body',
            parameters: bodyParams,
          });
        }
      }

      if (templateComponents.length > 0) {
        messageBody.template.components = templateComponents;
      }
    }

    const response = await fetch(
      `https://graph.facebook.com/v18.0/${phoneNumberId}/messages`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(messageBody),
      }
    );

    const data = await response.json();

    if (response.ok && data.messages?.[0]?.id) {
      return {
        success: true,
        messageId: data.messages[0].id,
      };
    }

    return {
      success: false,
      error: data.error?.message || 'Failed to send message',
    };
  } catch (error: any) {
    return {
      success: false,
      error: error.message,
    };
  }
}
