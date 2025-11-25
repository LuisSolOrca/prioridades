import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import connectDB from '@/lib/mongodb';
import ChannelMessage from '@/models/ChannelMessage';
import { triggerPusherEvent } from '@/lib/pusher-server';

/**
 * POST /api/projects/[id]/messages/[messageId]/action-items
 * Agregar action item
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

    const { description, assignedTo, dueDate } = await request.json();

    if (!description?.trim() || !assignedTo?.trim() || !dueDate?.trim()) {
      return NextResponse.json(
        { error: 'Descripción, responsable y fecha son requeridos' },
        { status: 400 }
      );
    }

    const message = await ChannelMessage.findById(params.messageId);
    if (!message) {
      return NextResponse.json({ error: 'Mensaje no encontrado' }, { status: 404 });
    }

    if (message.commandType !== 'action-items') {
      return NextResponse.json({ error: 'No es un action items' }, { status: 400 });
    }

    if (message.commandData.closed) {
      return NextResponse.json({ error: 'Action items cerrado' }, { status: 400 });
    }

    const userId = (session.user as any).id;
    const userName = (session.user as any).name || 'Usuario';

    message.commandData.items.push({
      description: description.trim(),
      assignedTo: assignedTo.trim(),
      assignedToName: assignedTo.trim(),
      dueDate: dueDate.trim(),
      completed: false,
      createdBy: userId,
      createdByName: userName
    });

    message.markModified('commandData');
    await message.save();

    const populatedMessage = await ChannelMessage.findById(message._id)
      .populate('userId', 'name email')
      .populate('mentions', 'name email')
      .populate('priorityMentions', 'title status completionPercentage userId')
      .populate('reactions.userId', 'name')
      .populate('pinnedBy', 'name')
      .lean();

    try {
      await triggerPusherEvent(
        `presence-channel-${message.channelId}`,
        'message-updated',
        populatedMessage
      );
    } catch (pusherError) {
      console.error('Error triggering Pusher event:', pusherError);
    }

    return NextResponse.json(populatedMessage);
  } catch (error) {
    console.error('Error in action-items add:', error);
    return NextResponse.json({ error: 'Error al agregar item' }, { status: 500 });
  }
}

/**
 * PATCH /api/projects/[id]/messages/[messageId]/action-items
 * Toggle completado o eliminar item
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

    const { itemIndex, action } = await request.json();

    const message = await ChannelMessage.findById(params.messageId);
    if (!message) {
      return NextResponse.json({ error: 'Mensaje no encontrado' }, { status: 404 });
    }

    if (message.commandType !== 'action-items') {
      return NextResponse.json({ error: 'No es un action items' }, { status: 400 });
    }

    if (message.commandData.closed) {
      return NextResponse.json({ error: 'Action items cerrado' }, { status: 400 });
    }

    const userId = (session.user as any).id;
    const item = message.commandData.items[itemIndex];

    if (!item) {
      return NextResponse.json({ error: 'Item no encontrado' }, { status: 404 });
    }

    if (action === 'toggle') {
      // Cualquiera puede marcar como completado
      item.completed = !item.completed;
      if (item.completed) {
        item.completedAt = new Date().toISOString();
      } else {
        delete item.completedAt;
      }
    } else if (action === 'delete') {
      // Solo el creador del item o admin puede eliminarlo
      if (item.createdBy !== userId && (session.user as any).role !== 'ADMIN') {
        return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
      }
      message.commandData.items.splice(itemIndex, 1);
    } else {
      return NextResponse.json({ error: 'Acción no válida' }, { status: 400 });
    }

    message.markModified('commandData');
    await message.save();

    const populatedMessage = await ChannelMessage.findById(message._id)
      .populate('userId', 'name email')
      .populate('mentions', 'name email')
      .populate('priorityMentions', 'title status completionPercentage userId')
      .populate('reactions.userId', 'name')
      .populate('pinnedBy', 'name')
      .lean();

    try {
      await triggerPusherEvent(
        `presence-channel-${message.channelId}`,
        'message-updated',
        populatedMessage
      );
    } catch (pusherError) {
      console.error('Error triggering Pusher event:', pusherError);
    }

    return NextResponse.json(populatedMessage);
  } catch (error) {
    console.error('Error in action-items update:', error);
    return NextResponse.json({ error: 'Error al actualizar item' }, { status: 500 });
  }
}

/**
 * DELETE /api/projects/[id]/messages/[messageId]/action-items
 * Cerrar action items
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

    if (message.commandType !== 'action-items') {
      return NextResponse.json({ error: 'No es un action items' }, { status: 400 });
    }

    const userId = (session.user as any).id;
    if (message.commandData.createdBy !== userId && (session.user as any).role !== 'ADMIN') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    }

    message.commandData.closed = true;
    message.markModified('commandData');
    await message.save();

    const populatedMessage = await ChannelMessage.findById(message._id)
      .populate('userId', 'name email')
      .populate('mentions', 'name email')
      .populate('priorityMentions', 'title status completionPercentage userId')
      .populate('reactions.userId', 'name')
      .populate('pinnedBy', 'name')
      .lean();

    try {
      await triggerPusherEvent(
        `presence-channel-${message.channelId}`,
        'message-updated',
        populatedMessage
      );
    } catch (pusherError) {
      console.error('Error triggering Pusher event:', pusherError);
    }

    return NextResponse.json(populatedMessage);
  } catch (error) {
    console.error('Error closing action-items:', error);
    return NextResponse.json({ error: 'Error al cerrar' }, { status: 500 });
  }
}
