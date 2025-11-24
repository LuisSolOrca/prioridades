import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import connectDB from '@/lib/mongodb';
import ChannelMessage from '@/models/ChannelMessage';
import { triggerPusherEvent } from '@/lib/pusher-server';

/**
 * POST /api/projects/[id]/messages/[messageId]/dot-voting
 * Votar en dot voting (agregar puntos a una opción)
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

    const { optionIndex, dots } = await request.json();

    if (typeof optionIndex !== 'number' || typeof dots !== 'number' || dots <= 0) {
      return NextResponse.json(
        { error: 'Datos inválidos' },
        { status: 400 }
      );
    }

    const message = await ChannelMessage.findById(params.messageId);
    if (!message) {
      return NextResponse.json({ error: 'Mensaje no encontrado' }, { status: 404 });
    }

    if (message.commandType !== 'dot-voting') {
      return NextResponse.json({ error: 'No es un dot-voting' }, { status: 400 });
    }

    if (message.commandData.closed) {
      return NextResponse.json({ error: 'Votación cerrada' }, { status: 400 });
    }

    const userId = (session.user as any).id;
    const { options, totalDotsPerUser } = message.commandData;

    // Verificar que el índice de opción es válido
    if (optionIndex < 0 || optionIndex >= options.length) {
      return NextResponse.json({ error: 'Opción inválida' }, { status: 400 });
    }

    // Calcular puntos ya usados por el usuario
    const usedDots = options.reduce((sum: number, opt: any) => {
      const userDot = opt.dots.find((d: any) => d.userId === userId);
      return sum + (userDot?.count || 0);
    }, 0);

    // Verificar que no excede el límite
    if (usedDots + dots > totalDotsPerUser) {
      return NextResponse.json(
        { error: 'Excede el límite de puntos disponibles' },
        { status: 400 }
      );
    }

    // Agregar/actualizar puntos del usuario en la opción
    const option = options[optionIndex];
    const existingDot = option.dots.find((d: any) => d.userId === userId);

    if (existingDot) {
      existingDot.count += dots;
    } else {
      option.dots.push({ userId, count: dots });
    }

    message.commandData.options = options;
    message.markModified('commandData');
    await message.save();

    // Poblar mensaje
    const populatedMessage = await ChannelMessage.findById(message._id)
      .populate('userId', 'name email')
      .populate('mentions', 'name email')
      .populate('priorityMentions', 'title status completionPercentage userId')
      .populate('reactions.userId', 'name')
      .populate('pinnedBy', 'name')
      .lean();

    // Pusher event
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
    console.error('Error in dot-voting:', error);
    return NextResponse.json({ error: 'Error al votar' }, { status: 500 });
  }
}

/**
 * DELETE /api/projects/[id]/messages/[messageId]/dot-voting
 * Cerrar votación (solo creador)
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

    if (message.commandType !== 'dot-voting') {
      return NextResponse.json({ error: 'No es un dot-voting' }, { status: 400 });
    }

    const userId = (session.user as any).id;
    if (message.commandData.createdBy !== userId && (session.user as any).role !== 'ADMIN') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    }

    message.commandData.closed = true;
    message.markModified('commandData');
    await message.save();

    // Poblar mensaje
    const populatedMessage = await ChannelMessage.findById(message._id)
      .populate('userId', 'name email')
      .populate('mentions', 'name email')
      .populate('priorityMentions', 'title status completionPercentage userId')
      .populate('reactions.userId', 'name')
      .populate('pinnedBy', 'name')
      .lean();

    // Pusher event
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
    console.error('Error closing dot-voting:', error);
    return NextResponse.json({ error: 'Error al cerrar' }, { status: 500 });
  }
}
