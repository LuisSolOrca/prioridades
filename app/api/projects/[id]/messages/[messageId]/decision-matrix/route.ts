import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import connectDB from '@/lib/mongodb';
import ChannelMessage from '@/models/ChannelMessage';
import { triggerPusherEvent } from '@/lib/pusher-server';

/**
 * POST /api/projects/[id]/messages/[messageId]/decision-matrix
 * Puntuar una celda de la matriz
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

    const { optionIndex, criteriaIndex, score } = await request.json();

    if (
      typeof optionIndex !== 'number' ||
      typeof criteriaIndex !== 'number' ||
      typeof score !== 'number' ||
      score < 1 ||
      score > 5
    ) {
      return NextResponse.json(
        { error: 'Datos inválidos' },
        { status: 400 }
      );
    }

    const message = await ChannelMessage.findById(params.messageId);
    if (!message) {
      return NextResponse.json({ error: 'Mensaje no encontrado' }, { status: 404 });
    }

    if (message.commandType !== 'decision-matrix') {
      return NextResponse.json({ error: 'No es una matriz de decisión' }, { status: 400 });
    }

    if (message.commandData.closed) {
      return NextResponse.json({ error: 'Matriz cerrada' }, { status: 400 });
    }

    const userId = (session.user as any).id;
    const userName = (session.user as any).name || 'Usuario';

    // Encontrar o crear la celda
    let cell = message.commandData.cells.find(
      (c: any) => c.optionIndex === optionIndex && c.criteriaIndex === criteriaIndex
    );

    if (!cell) {
      cell = {
        optionIndex,
        criteriaIndex,
        scores: []
      };
      message.commandData.cells.push(cell);
    }

    // Verificar que el usuario no haya puntuado ya esta celda
    const existingScore = cell.scores.find((s: any) => s.userId === userId);
    if (existingScore) {
      return NextResponse.json({ error: 'Ya puntuaste esta celda' }, { status: 400 });
    }

    // Agregar puntuación
    cell.scores.push({ userId, userName, score });

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
    console.error('Error in decision-matrix score:', error);
    return NextResponse.json({ error: 'Error al puntuar' }, { status: 500 });
  }
}

/**
 * DELETE /api/projects/[id]/messages/[messageId]/decision-matrix
 * Cerrar matriz (solo creador)
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

    if (message.commandType !== 'decision-matrix') {
      return NextResponse.json({ error: 'No es una matriz de decisión' }, { status: 400 });
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
    console.error('Error closing decision-matrix:', error);
    return NextResponse.json({ error: 'Error al cerrar' }, { status: 500 });
  }
}
