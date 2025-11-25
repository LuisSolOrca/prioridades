import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import connectDB from '@/lib/mongodb';
import ChannelMessage from '@/models/ChannelMessage';
import { triggerPusherEvent } from '@/lib/pusher-server';

/**
 * POST /api/projects/[id]/messages/[messageId]/pomodoro
 * Controlar timer (start, pause, reset)
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

    const { action } = await request.json();

    if (!['start', 'pause', 'reset'].includes(action)) {
      return NextResponse.json({ error: 'Acción no válida' }, { status: 400 });
    }

    const message = await ChannelMessage.findById(params.messageId);
    if (!message) {
      return NextResponse.json({ error: 'Mensaje no encontrado' }, { status: 404 });
    }

    if (message.commandType !== 'pomodoro') {
      return NextResponse.json({ error: 'No es un pomodoro' }, { status: 400 });
    }

    if (message.commandData.closed) {
      return NextResponse.json({ error: 'Pomodoro cerrado' }, { status: 400 });
    }

    const workMinutes = message.commandData.workMinutes || 25;
    const breakMinutes = message.commandData.breakMinutes || 5;

    if (action === 'start') {
      // Start or resume timer
      message.commandData.isRunning = true;
      message.commandData.isPaused = false;

      // If starting fresh (timeRemaining is 0 or not set)
      if (!message.commandData.timeRemaining || message.commandData.timeRemaining === 0) {
        message.commandData.timeRemaining = message.commandData.isBreak
          ? breakMinutes * 60
          : workMinutes * 60;
      }
    } else if (action === 'pause') {
      // Pause timer
      message.commandData.isPaused = true;
    } else if (action === 'reset') {
      // Reset to work session
      message.commandData.isRunning = false;
      message.commandData.isPaused = false;
      message.commandData.isBreak = false;
      message.commandData.timeRemaining = workMinutes * 60;
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
    console.error('Error in pomodoro control:', error);
    return NextResponse.json({ error: 'Error al controlar timer' }, { status: 500 });
  }
}

/**
 * DELETE /api/projects/[id]/messages/[messageId]/pomodoro
 * Cerrar pomodoro
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

    if (message.commandType !== 'pomodoro') {
      return NextResponse.json({ error: 'No es un pomodoro' }, { status: 400 });
    }

    const userId = (session.user as any).id;
    if (message.commandData.createdBy !== userId && (session.user as any).role !== 'ADMIN') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    }

    message.commandData.closed = true;
    message.commandData.isRunning = false;
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
    console.error('Error closing pomodoro:', error);
    return NextResponse.json({ error: 'Error al cerrar' }, { status: 500 });
  }
}
