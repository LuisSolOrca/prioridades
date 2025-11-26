import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import connectDB from '@/lib/mongodb';
import ChannelMessage from '@/models/ChannelMessage';
import { triggerPusherEvent } from '@/lib/pusher-server';
import { notifyDynamicClosed } from '@/lib/dynamicNotifications';

/**
 * POST /api/projects/[id]/messages/[messageId]/vote
 * Vota en una encuesta (poll)
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

    const { optionIndex } = await request.json();

    if (typeof optionIndex !== 'number') {
      return NextResponse.json(
        { error: 'Índice de opción requerido' },
        { status: 400 }
      );
    }

    // Obtener el mensaje
    const message = await ChannelMessage.findOne({
      _id: params.messageId,
      projectId: params.id,
      isDeleted: false
    });

    if (!message) {
      return NextResponse.json(
        { error: 'Mensaje no encontrado' },
        { status: 404 }
      );
    }

    // Verificar que sea un poll
    if (message.commandType !== 'poll' || !message.commandData) {
      return NextResponse.json(
        { error: 'Este mensaje no es una encuesta' },
        { status: 400 }
      );
    }

    // Verificar que el poll no esté cerrado
    if (message.commandData.closed) {
      return NextResponse.json(
        { error: 'Esta encuesta está cerrada' },
        { status: 400 }
      );
    }

    // Verificar que la opción existe
    if (
      !message.commandData.options ||
      optionIndex < 0 ||
      optionIndex >= message.commandData.options.length
    ) {
      return NextResponse.json(
        { error: 'Opción inválida' },
        { status: 400 }
      );
    }

    // Verificar si el usuario ya votó
    const hasVoted = message.commandData.options.some((opt: any) =>
      opt.votes && opt.votes.includes(session.user.id)
    );

    if (hasVoted) {
      return NextResponse.json(
        { error: 'Ya has votado en esta encuesta' },
        { status: 400 }
      );
    }

    // Agregar voto
    message.commandData.options[optionIndex].votes = [
      ...(message.commandData.options[optionIndex].votes || []),
      session.user.id
    ];

    // Marcar como modificado el campo Mixed
    message.markModified('commandData');
    await message.save();

    // Poblar el mensaje para enviarlo completo
    const populatedMessage = await ChannelMessage.findById(message._id)
      .populate('userId', 'name email')
      .populate('mentions', 'name email')
      .populate('priorityMentions', 'title status completionPercentage userId')
      .populate('reactions.userId', 'name')
      .populate('pinnedBy', 'name')
      .lean();

    // Emitir evento de Pusher para actualización en tiempo real
    try {
      await triggerPusherEvent(
        `presence-channel-${message.channelId}`,
        'message-updated',
        populatedMessage
      );
    } catch (pusherError) {
      console.error('Error triggering Pusher event:', pusherError);
    }

    return NextResponse.json({
      success: true,
      commandData: message.commandData
    });
  } catch (error) {
    console.error('Error voting in poll:', error);
    return NextResponse.json(
      { error: 'Error al votar en la encuesta' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/projects/[id]/messages/[messageId]/vote
 * Cerrar una encuesta (solo el creador)
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

    // Obtener el mensaje
    const message = await ChannelMessage.findOne({
      _id: params.messageId,
      projectId: params.id,
      isDeleted: false
    });

    if (!message) {
      return NextResponse.json(
        { error: 'Mensaje no encontrado' },
        { status: 404 }
      );
    }

    // Verificar que sea un poll
    if (message.commandType !== 'poll' || !message.commandData) {
      return NextResponse.json(
        { error: 'Este mensaje no es una encuesta' },
        { status: 400 }
      );
    }

    // Verificar que sea el creador
    if (message.commandData.createdBy !== session.user.id) {
      return NextResponse.json(
        { error: 'Solo el creador puede cerrar la encuesta' },
        { status: 403 }
      );
    }

    // Cerrar encuesta
    message.commandData.closed = true;
    message.markModified('commandData');
    await message.save();

    // Notificar a participantes en segundo plano
    notifyDynamicClosed({
      projectId: params.id,
      channelId: message.channelId,
      messageId: params.messageId,
      commandType: message.commandType || 'poll',
      commandData: message.commandData,
      closedByUserId: session.user.id,
      closedByUserName: session.user.name || 'Usuario'
    }).catch(err => console.error('Error notifying dynamic closed:', err));

    // Poblar el mensaje para enviarlo completo
    const populatedMessage = await ChannelMessage.findById(message._id)
      .populate('userId', 'name email')
      .populate('mentions', 'name email')
      .populate('priorityMentions', 'title status completionPercentage userId')
      .populate('reactions.userId', 'name')
      .populate('pinnedBy', 'name')
      .lean();

    // Emitir evento de Pusher para actualización en tiempo real
    try {
      await triggerPusherEvent(
        `presence-channel-${message.channelId}`,
        'message-updated',
        populatedMessage
      );
    } catch (pusherError) {
      console.error('Error triggering Pusher event:', pusherError);
    }

    return NextResponse.json({
      success: true,
      commandData: message.commandData
    });
  } catch (error) {
    console.error('Error closing poll:', error);
    return NextResponse.json(
      { error: 'Error al cerrar la encuesta' },
      { status: 500 }
    );
  }
}
