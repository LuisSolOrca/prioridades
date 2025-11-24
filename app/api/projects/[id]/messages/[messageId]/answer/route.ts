import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import connectDB from '@/lib/mongodb';
import ChannelMessage from '@/models/ChannelMessage';
import { triggerPusherEvent } from '@/lib/pusher-server';

/**
 * PUT /api/projects/[id]/messages/[messageId]/answer
 * Actualiza la respuesta de una pregunta
 */
export async function PUT(
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
    const { answer, answeredAt } = body;

    if (!answer || answer.trim().length === 0) {
      return NextResponse.json(
        { error: 'La respuesta es requerida' },
        { status: 400 }
      );
    }

    // Buscar el mensaje
    const message = await ChannelMessage.findById(params.messageId);

    if (!message) {
      return NextResponse.json(
        { error: 'Mensaje no encontrado' },
        { status: 404 }
      );
    }

    // Verificar que es una pregunta
    if (message.commandType !== 'question') {
      return NextResponse.json(
        { error: 'Este mensaje no es una pregunta' },
        { status: 400 }
      );
    }

    // Verificar que el usuario puede responder (es el destinatario o admin)
    const canAnswer =
      (session.user as any).id === message.commandData.askedToId ||
      (session.user as any).role === 'ADMIN';

    if (!canAnswer) {
      return NextResponse.json(
        { error: 'No tienes permiso para responder esta pregunta' },
        { status: 403 }
      );
    }

    // Actualizar la respuesta
    message.commandData = {
      ...message.commandData,
      answered: true,
      answer: answer.trim(),
      answeredAt: answeredAt || new Date().toISOString()
    };

    await message.save();

    // Poblar el mensaje actualizado
    const updatedMessage = await ChannelMessage.findById(message._id)
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
        updatedMessage
      );
    } catch (pusherError) {
      console.error('Error triggering Pusher event:', pusherError);
    }

    return NextResponse.json(updatedMessage);
  } catch (error) {
    console.error('Error updating question answer:', error);
    return NextResponse.json(
      { error: 'Error actualizando la respuesta' },
      { status: 500 }
    );
  }
}
