import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import connectDB from '@/lib/mongodb';
import ChannelMessage from '@/models/ChannelMessage';
import { triggerPusherEvent } from '@/lib/pusher-server';
import { notifyDynamicClosed } from '@/lib/dynamicNotifications';

/**
 * POST /api/projects/[id]/messages/[messageId]/customer-journey
 * Agregar item a una etapa
 */
export async function POST(
  request: Request,
  { params }: { params: { id: string; messageId: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    await connectDB();

    const { stageId, type, text, emotionType } = await request.json();

    if (!stageId || !type || !text?.trim()) {
      return NextResponse.json(
        { error: 'Datos inválidos' },
        { status: 400 }
      );
    }

    const validTypes = ['touchpoint', 'emotion', 'painPoint', 'opportunity'];
    if (!validTypes.includes(type)) {
      return NextResponse.json({ error: 'Tipo inválido' }, { status: 400 });
    }

    const message = await ChannelMessage.findById(params.messageId);
    if (!message) {
      return NextResponse.json({ error: 'Mensaje no encontrado' }, { status: 404 });
    }

    if (message.commandType !== 'customer-journey') {
      return NextResponse.json({ error: 'No es un Customer Journey Map' }, { status: 400 });
    }

    if (message.commandData.closed) {
      return NextResponse.json({ error: 'Journey cerrado' }, { status: 400 });
    }

    const userId = (session.user as any).id;
    const userName = (session.user as any).name || 'Usuario';

    const stage = message.commandData.stages.find((s: any) => s.id === stageId);
    if (!stage) {
      return NextResponse.json({ error: 'Etapa no encontrada' }, { status: 400 });
    }

    const itemId = `item-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    const newItem: any = {
      id: itemId,
      text: text.trim(),
      userId,
      userName
    };

    if (type === 'emotion') {
      newItem.type = emotionType || 'neutral';
      stage.emotions.push(newItem);
    } else if (type === 'touchpoint') {
      stage.touchpoints.push(newItem);
    } else if (type === 'painPoint') {
      stage.painPoints.push(newItem);
    } else if (type === 'opportunity') {
      stage.opportunities.push(newItem);
    }

    message.markModified('commandData');
    await message.save();

    const savedMessage = message.toObject();

    (async () => {
      try {
        const populatedMessage = await ChannelMessage.findById(message._id)
          .populate('userId', 'name email')
          .populate('mentions', 'name email')
          .populate('priorityMentions', 'title status completionPercentage userId')
          .populate('reactions.userId', 'name')
          .populate('pinnedBy', 'name')
          .lean();

        await triggerPusherEvent(
          `presence-channel-${message.channelId}`,
          'message-updated',
          populatedMessage
        );
      } catch (pusherError) {
        console.error('Error triggering Pusher event:', pusherError);
      }
    })();

    return NextResponse.json(savedMessage);
  } catch (error) {
    console.error('Error in customer-journey add:', error);
    return NextResponse.json({ error: 'Error al agregar' }, { status: 500 });
  }
}

/**
 * PATCH /api/projects/[id]/messages/[messageId]/customer-journey
 * Actualizar persona o eliminar item
 */
export async function PATCH(
  request: Request,
  { params }: { params: { id: string; messageId: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    await connectDB();

    const body = await request.json();
    const { action, stageId, type, itemId, persona } = body;

    const message = await ChannelMessage.findById(params.messageId);
    if (!message) {
      return NextResponse.json({ error: 'Mensaje no encontrado' }, { status: 404 });
    }

    if (message.commandType !== 'customer-journey') {
      return NextResponse.json({ error: 'No es un Customer Journey Map' }, { status: 400 });
    }

    if (message.commandData.closed) {
      return NextResponse.json({ error: 'Journey cerrado' }, { status: 400 });
    }

    const userId = (session.user as any).id;

    if (action === 'updatePersona') {
      message.commandData.persona = persona || '';
    } else if (action === 'deleteItem') {
      const stage = message.commandData.stages.find((s: any) => s.id === stageId);
      if (!stage) {
        return NextResponse.json({ error: 'Etapa no encontrada' }, { status: 400 });
      }

      let array: any[] = [];
      if (type === 'touchpoints') array = stage.touchpoints;
      else if (type === 'emotions') array = stage.emotions;
      else if (type === 'painPoints') array = stage.painPoints;
      else if (type === 'opportunities') array = stage.opportunities;

      const itemIndex = array.findIndex((i: any) => i.id === itemId);
      if (itemIndex === -1) {
        return NextResponse.json({ error: 'Item no encontrado' }, { status: 400 });
      }

      const item = array[itemIndex];
      if (item.userId !== userId && (session.user as any).role !== 'ADMIN') {
        return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
      }

      array.splice(itemIndex, 1);
    } else {
      return NextResponse.json({ error: 'Acción inválida' }, { status: 400 });
    }

    message.markModified('commandData');
    await message.save();

    const savedMessage = message.toObject();

    (async () => {
      try {
        const populatedMessage = await ChannelMessage.findById(message._id)
          .populate('userId', 'name email')
          .populate('mentions', 'name email')
          .populate('priorityMentions', 'title status completionPercentage userId')
          .populate('reactions.userId', 'name')
          .populate('pinnedBy', 'name')
          .lean();

        await triggerPusherEvent(
          `presence-channel-${message.channelId}`,
          'message-updated',
          populatedMessage
        );
      } catch (pusherError) {
        console.error('Error triggering Pusher event:', pusherError);
      }
    })();

    return NextResponse.json(savedMessage);
  } catch (error) {
    console.error('Error in customer-journey update:', error);
    return NextResponse.json({ error: 'Error al actualizar' }, { status: 500 });
  }
}

/**
 * DELETE /api/projects/[id]/messages/[messageId]/customer-journey
 * Cerrar journey (solo creador)
 */
export async function DELETE(
  request: Request,
  { params }: { params: { id: string; messageId: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    await connectDB();

    const message = await ChannelMessage.findById(params.messageId);
    if (!message) {
      return NextResponse.json({ error: 'Mensaje no encontrado' }, { status: 404 });
    }

    if (message.commandType !== 'customer-journey') {
      return NextResponse.json({ error: 'No es un Customer Journey Map' }, { status: 400 });
    }

    const userId = (session.user as any).id;
    if (message.commandData.createdBy !== userId && (session.user as any).role !== 'ADMIN') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    }

    message.commandData.closed = true;
    message.markModified('commandData');
    await message.save();

    const savedMessage = message.toObject();

    // Notificar a participantes en segundo plano
    notifyDynamicClosed({
      projectId: params.id,
      channelId: message.channelId,
      messageId: params.messageId,
      commandType: 'customer-journey',
      commandData: message.commandData,
      closedByUserId: userId,
      closedByUserName: (session.user as any).name || 'Usuario'
    }).catch(err => console.error('Error notifying dynamic closed:', err));

    (async () => {
      try {
        const populatedMessage = await ChannelMessage.findById(message._id)
          .populate('userId', 'name email')
          .populate('mentions', 'name email')
          .populate('priorityMentions', 'title status completionPercentage userId')
          .populate('reactions.userId', 'name')
          .populate('pinnedBy', 'name')
          .lean();

        await triggerPusherEvent(
          `presence-channel-${message.channelId}`,
          'message-updated',
          populatedMessage
        );
      } catch (pusherError) {
        console.error('Error triggering Pusher event:', pusherError);
      }
    })();

    return NextResponse.json(savedMessage);
  } catch (error) {
    console.error('Error closing customer-journey:', error);
    return NextResponse.json({ error: 'Error al cerrar' }, { status: 500 });
  }
}
