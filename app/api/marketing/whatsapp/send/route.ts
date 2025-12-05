import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import connectDB from '@/lib/mongodb';
import WhatsAppTemplate from '@/models/WhatsAppTemplate';
import Contact from '@/models/Contact';
import {
  sendTextMessage,
  sendTemplateMessage,
  sendMediaMessage,
  sendInteractiveMessage,
  sendBulkTemplateMessages,
  isWhatsAppConfigured,
  formatPhoneNumber,
} from '@/lib/whatsapp';

// POST - Send WhatsApp message
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const user = session.user as any;
    if (!user.permissions?.canManageWhatsApp && user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Sin permisos' }, { status: 403 });
    }

    if (!isWhatsAppConfigured()) {
      return NextResponse.json(
        { error: 'WhatsApp Business API no está configurado' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { type, to, templateId, message, contactIds, parameters, mediaUrl, mediaType, buttons } = body;

    await connectDB();

    // Single message
    if (to) {
      let result;

      switch (type) {
        case 'text':
          if (!message) {
            return NextResponse.json({ error: 'Mensaje requerido' }, { status: 400 });
          }
          result = await sendTextMessage({ to, message });
          break;

        case 'template':
          if (!templateId) {
            return NextResponse.json({ error: 'Template requerido' }, { status: 400 });
          }

          const template = await WhatsAppTemplate.findById(templateId);
          if (!template) {
            return NextResponse.json({ error: 'Template no encontrado' }, { status: 404 });
          }

          // Build components from parameters
          const components = parameters && parameters.length > 0
            ? [{
                type: 'body' as const,
                parameters: parameters.map((p: string) => ({
                  type: 'text' as const,
                  text: p,
                })),
              }]
            : undefined;

          result = await sendTemplateMessage({
            to,
            templateName: template.name,
            languageCode: template.language || 'es_MX',
            components,
          });

          // Update template usage
          if (result.success) {
            await WhatsAppTemplate.findByIdAndUpdate(templateId, {
              $inc: { usageCount: 1 },
              lastUsedAt: new Date(),
            });
          }
          break;

        case 'media':
          if (!mediaUrl || !mediaType) {
            return NextResponse.json({ error: 'URL y tipo de media requeridos' }, { status: 400 });
          }
          result = await sendMediaMessage(to, mediaType, mediaUrl, message);
          break;

        case 'interactive':
          if (!message || !buttons || buttons.length === 0) {
            return NextResponse.json({ error: 'Mensaje y botones requeridos' }, { status: 400 });
          }
          result = await sendInteractiveMessage(to, message, buttons);
          break;

        default:
          return NextResponse.json({ error: 'Tipo de mensaje no válido' }, { status: 400 });
      }

      if (!result.success) {
        return NextResponse.json({ error: result.error }, { status: 400 });
      }

      return NextResponse.json({
        success: true,
        messageId: result.messageId,
        to: formatPhoneNumber(to),
      });
    }

    // Bulk message to contacts
    if (contactIds && contactIds.length > 0) {
      if (type !== 'template' || !templateId) {
        return NextResponse.json(
          { error: 'Envío masivo solo soportado con templates' },
          { status: 400 }
        );
      }

      const template = await WhatsAppTemplate.findById(templateId);
      if (!template) {
        return NextResponse.json({ error: 'Template no encontrado' }, { status: 404 });
      }

      // Get contacts
      const contacts = await Contact.find({
        _id: { $in: contactIds },
        phone: { $exists: true, $ne: '' },
        isActive: true,
      }).lean();

      if (contacts.length === 0) {
        return NextResponse.json(
          { error: 'No hay contactos con teléfono válido' },
          { status: 400 }
        );
      }

      // Prepare recipients with personalized parameters
      const recipients = contacts.map((contact) => {
        let personalizedParams = parameters || [];

        // Replace placeholders in parameters
        if (personalizedParams.length > 0) {
          personalizedParams = personalizedParams.map((p: string) => {
            return p
              .replace(/\{\{firstName\}\}/g, contact.firstName || '')
              .replace(/\{\{lastName\}\}/g, contact.lastName || '')
              .replace(/\{\{fullName\}\}/g, `${contact.firstName || ''} ${contact.lastName || ''}`.trim())
              .replace(/\{\{phone\}\}/g, contact.phone || '')
              .replace(/\{\{email\}\}/g, contact.email || '');
          });
        }

        return {
          phone: contact.phone!,
          parameters: personalizedParams,
        };
      });

      // Send bulk messages
      const result = await sendBulkTemplateMessages(
        recipients,
        template.name,
        template.language || 'es_MX'
      );

      // Update template usage
      await WhatsAppTemplate.findByIdAndUpdate(templateId, {
        $inc: { usageCount: result.successful },
        lastUsedAt: new Date(),
      });

      return NextResponse.json({
        success: true,
        total: result.total,
        sent: result.successful,
        failed: result.failed,
        results: result.results.map((r) => ({
          phone: r.phone,
          success: r.success,
          error: r.error,
        })),
      });
    }

    return NextResponse.json(
      { error: 'Destinatario requerido (to o contactIds)' },
      { status: 400 }
    );
  } catch (error: any) {
    console.error('Error sending WhatsApp message:', error);
    return NextResponse.json(
      { error: error.message || 'Error al enviar mensaje' },
      { status: 500 }
    );
  }
}
