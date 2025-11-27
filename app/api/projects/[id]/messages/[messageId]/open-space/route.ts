import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import connectDB from '@/lib/mongodb';
import ChannelMessage from '@/models/ChannelMessage';
import { triggerPusherEvent } from '@/lib/pusher-server';
import { notifyDynamicClosed } from '@/lib/dynamicNotifications';

/**
 * POST /api/projects/[id]/messages/[messageId]/open-space
 * Create session or toggle attendance
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

    const body = await request.json();
    const { action, topic, location, time, sessionId } = body;

    const message = await ChannelMessage.findById(params.messageId);
    if (!message) {
      return NextResponse.json({ error: 'Mensaje no encontrado' }, { status: 404 });
    }

    if (message.commandType !== 'open-space') {
      return NextResponse.json({ error: 'No es un Open Space' }, { status: 400 });
    }

    if (message.commandData.closed) {
      return NextResponse.json({ error: 'Open Space cerrado' }, { status: 400 });
    }

    const userId = (session.user as any).id;
    const userName = (session.user as any).name || 'Usuario';

    if (!message.commandData.sessions) {
      message.commandData.sessions = [];
    }

    if (action === 'create') {
      if (!topic?.trim()) {
        return NextResponse.json({ error: 'El tema es requerido' }, { status: 400 });
      }

      message.commandData.sessions.push({
        id: Date.now().toString(),
        topic: topic.trim(),
        facilitator: userName,
        facilitatorId: userId,
        location: location || null,
        time: time || null,
        attendees: []
      });
    } else if (action === 'toggle-attendance' && sessionId) {
      const sess = message.commandData.sessions.find((s: any) => s.id === sessionId);
      if (!sess) {
        return NextResponse.json({ error: 'Sesión no encontrada' }, { status: 400 });
      }

      if (!sess.attendees) {
        sess.attendees = [];
      }

      const attendeeIndex = sess.attendees.findIndex((a: any) => a.id === userId);
      if (attendeeIndex === -1) {
        sess.attendees.push({ id: userId, name: userName });
      } else {
        sess.attendees.splice(attendeeIndex, 1);
      }
    }

    message.markModified('commandData');
    await message.save();

    const savedMessage = message.toObject();

    (async () => {
      try {
        const populatedMessage = await ChannelMessage.findById(message._id)
          .populate('userId', 'name email')
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
    console.error('Error in open-space:', error);
    return NextResponse.json({ error: 'Error al procesar' }, { status: 500 });
  }
}

/**
 * PATCH /api/projects/[id]/messages/[messageId]/open-space
 * Delete session (only facilitator)
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

    const { sessionId } = await request.json();

    const message = await ChannelMessage.findById(params.messageId);
    if (!message) {
      return NextResponse.json({ error: 'Mensaje no encontrado' }, { status: 404 });
    }

    if (message.commandType !== 'open-space') {
      return NextResponse.json({ error: 'No es un Open Space' }, { status: 400 });
    }

    if (message.commandData.closed) {
      return NextResponse.json({ error: 'Open Space cerrado' }, { status: 400 });
    }

    const userId = (session.user as any).id;
    const sessIndex = message.commandData.sessions?.findIndex((s: any) => s.id === sessionId);

    if (sessIndex === -1 || sessIndex === undefined) {
      return NextResponse.json({ error: 'Sesión no encontrada' }, { status: 400 });
    }

    const sess = message.commandData.sessions[sessIndex];
    if (sess.facilitatorId !== userId && (session.user as any).role !== 'ADMIN') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    }

    message.commandData.sessions.splice(sessIndex, 1);

    message.markModified('commandData');
    await message.save();

    const savedMessage = message.toObject();

    (async () => {
      try {
        const populatedMessage = await ChannelMessage.findById(message._id)
          .populate('userId', 'name email')
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
    console.error('Error in open-space delete:', error);
    return NextResponse.json({ error: 'Error al eliminar' }, { status: 500 });
  }
}

/**
 * DELETE /api/projects/[id]/messages/[messageId]/open-space
 * Close (only creator)
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

    if (message.commandType !== 'open-space') {
      return NextResponse.json({ error: 'No es un Open Space' }, { status: 400 });
    }

    const userId = (session.user as any).id;
    if (message.commandData.createdBy !== userId && (session.user as any).role !== 'ADMIN') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    }

    message.commandData.closed = true;
    message.markModified('commandData');
    await message.save();

    const savedMessage = message.toObject();

    notifyDynamicClosed({
      projectId: params.id,
      channelId: message.channelId,
      messageId: params.messageId,
      commandType: 'open-space',
      commandData: message.commandData,
      closedByUserId: userId,
      closedByUserName: (session.user as any).name || 'Usuario'
    }).catch(err => console.error('Error notifying dynamic closed:', err));

    (async () => {
      try {
        const populatedMessage = await ChannelMessage.findById(message._id)
          .populate('userId', 'name email')
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
    console.error('Error closing open-space:', error);
    return NextResponse.json({ error: 'Error al cerrar' }, { status: 500 });
  }
}
