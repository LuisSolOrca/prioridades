import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Webhook from '@/models/Webhook';
import ChannelMessage from '@/models/ChannelMessage';
import { triggerPusherEvent } from '@/lib/pusher-server';

/**
 * POST /api/webhooks/incoming/[secret]
 * Recibe webhooks entrantes y crea mensajes en el canal
 *
 * Body esperado:
 * {
 *   channelId: string (opcional, usa el configurado en el webhook si no se proporciona),
 *   content: string (requerido),
 *   username?: string (opcional, nombre personalizado del bot),
 *   metadata?: object (opcional, datos adicionales)
 * }
 */
export async function POST(
  request: Request,
  { params }: { params: { secret: string } }
) {
  try {
    await connectDB();

    // Buscar webhook por secret token
    const webhook = await Webhook.findOne({
      secret: params.secret,
      type: 'INCOMING',
      isActive: true,
    }).lean();

    if (!webhook) {
      return NextResponse.json(
        { error: 'Webhook no encontrado o inactivo' },
        { status: 404 }
      );
    }

    const body = await request.json();
    const { channelId, content, username, metadata } = body;

    if (!content || content.trim().length === 0) {
      return NextResponse.json(
        { error: 'El contenido es requerido' },
        { status: 400 }
      );
    }

    // Usar el channelId del body o el configurado en el webhook
    const targetChannelId = channelId || webhook.channelId;

    if (!targetChannelId) {
      return NextResponse.json(
        { error: 'Se requiere un channelId' },
        { status: 400 }
      );
    }

    // Crear mensaje en el canal
    const message = await ChannelMessage.create({
      projectId: webhook.projectId,
      channelId: targetChannelId,
      userId: webhook.createdBy, // Usuario que creó el webhook
      content: content.trim(),
      mentions: [],
      priorityMentions: [],
      parentMessageId: null,
      commandType: 'webhook-incoming',
      commandData: {
        webhookId: webhook._id.toString(),
        webhookName: webhook.name,
        username: username || 'Webhook',
        metadata: metadata || {},
      },
      reactions: [],
      replyCount: 0,
      isPinned: false,
      isEdited: false,
      isDeleted: false,
    });

    // Poblar el mensaje
    const populatedMessage = await ChannelMessage.findById(message._id)
      .populate('userId', 'name email')
      .lean();

    // Actualizar lastTriggered del webhook
    await Webhook.findByIdAndUpdate(webhook._id, {
      lastTriggered: new Date(),
    });

    // Triggerar evento de Pusher para tiempo real
    try {
      await triggerPusherEvent(
        `presence-channel-${targetChannelId}`,
        'new-message',
        populatedMessage
      );
    } catch (pusherError) {
      console.error('Error triggering Pusher event:', pusherError);
      // No fallar la creación del mensaje si Pusher falla
    }

    return NextResponse.json({
      success: true,
      message: populatedMessage,
    }, { status: 201 });
  } catch (error) {
    console.error('Error processing incoming webhook:', error);
    return NextResponse.json(
      { error: 'Error procesando webhook' },
      { status: 500 }
    );
  }
}
