import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import connectDB from '@/lib/mongodb';
import ChannelMessage from '@/models/ChannelMessage';
import { triggerPusherEvent } from '@/lib/pusher-server';

/**
 * POST /api/projects/[id]/messages/[messageId]/rice
 * Agregar item RICE
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

    const { title, reach, impact, confidence, effort } = await request.json();

    if (!title?.trim()) {
      return NextResponse.json(
        { error: 'El título es requerido' },
        { status: 400 }
      );
    }

    // Validaciones
    if (reach === undefined || impact === undefined || confidence === undefined || effort === undefined) {
      return NextResponse.json(
        { error: 'Todos los valores RICE son requeridos' },
        { status: 400 }
      );
    }

    const message = await ChannelMessage.findById(params.messageId);
    if (!message) {
      return NextResponse.json({ error: 'Mensaje no encontrado' }, { status: 404 });
    }

    if (message.commandType !== 'rice') {
      return NextResponse.json({ error: 'No es una priorización RICE' }, { status: 400 });
    }

    if (message.commandData.closed) {
      return NextResponse.json({ error: 'RICE cerrado' }, { status: 400 });
    }

    const userId = (session.user as any).id;
    const userName = (session.user as any).name || 'Usuario';

    const itemId = `rice-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    // Calcular score RICE: (Reach × Impact × Confidence) ÷ Effort
    const score = effort > 0 ? (reach * impact * confidence) / effort : 0;

    message.commandData.items.push({
      id: itemId,
      title: title.trim(),
      reach,
      impact,
      confidence,
      effort,
      score: Math.round(score * 100) / 100,
      userId,
      userName
    });

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
    console.error('Error in rice add:', error);
    return NextResponse.json({ error: 'Error al agregar' }, { status: 500 });
  }
}

/**
 * PATCH /api/projects/[id]/messages/[messageId]/rice
 * Actualizar o eliminar item
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
    const { action, itemId, reach, impact, confidence, effort } = body;

    const message = await ChannelMessage.findById(params.messageId);
    if (!message) {
      return NextResponse.json({ error: 'Mensaje no encontrado' }, { status: 404 });
    }

    if (message.commandType !== 'rice') {
      return NextResponse.json({ error: 'No es una priorización RICE' }, { status: 400 });
    }

    if (message.commandData.closed) {
      return NextResponse.json({ error: 'RICE cerrado' }, { status: 400 });
    }

    const userId = (session.user as any).id;
    const itemIndex = message.commandData.items.findIndex((i: any) => i.id === itemId);

    if (itemIndex === -1) {
      return NextResponse.json({ error: 'Item no encontrado' }, { status: 400 });
    }

    const item = message.commandData.items[itemIndex];

    if (action === 'delete') {
      if (item.userId !== userId && (session.user as any).role !== 'ADMIN') {
        return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
      }
      message.commandData.items.splice(itemIndex, 1);
    } else if (action === 'update') {
      if (reach !== undefined) item.reach = reach;
      if (impact !== undefined) item.impact = impact;
      if (confidence !== undefined) item.confidence = confidence;
      if (effort !== undefined) item.effort = effort;

      // Recalcular score
      const newEffort = item.effort || 1;
      const newScore = (item.reach * item.impact * item.confidence) / newEffort;
      item.score = Math.round(newScore * 100) / 100;
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
    console.error('Error in rice update:', error);
    return NextResponse.json({ error: 'Error al actualizar' }, { status: 500 });
  }
}

/**
 * DELETE /api/projects/[id]/messages/[messageId]/rice
 * Cerrar RICE (solo creador)
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

    if (message.commandType !== 'rice') {
      return NextResponse.json({ error: 'No es una priorización RICE' }, { status: 400 });
    }

    const userId = (session.user as any).id;
    if (message.commandData.createdBy !== userId && (session.user as any).role !== 'ADMIN') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    }

    message.commandData.closed = true;
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
    console.error('Error closing rice:', error);
    return NextResponse.json({ error: 'Error al cerrar' }, { status: 500 });
  }
}
