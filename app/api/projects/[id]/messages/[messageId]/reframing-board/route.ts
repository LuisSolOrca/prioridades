import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import connectDB from '@/lib/mongodb';
import ChannelMessage from '@/models/ChannelMessage';
import { triggerPusherEvent } from '@/lib/pusher-server';
import { notifyDynamicClosed } from '@/lib/dynamicNotifications';

export async function POST(
  request: Request,
  { params }: { params: { id: string; messageId: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

    await connectDB();
    const body = await request.json();
    const { action, originalView, reframedView, type, reframeId } = body;

    const message = await ChannelMessage.findById(params.messageId);
    if (!message) return NextResponse.json({ error: 'Mensaje no encontrado' }, { status: 404 });
    if (message.commandType !== 'reframing-board') return NextResponse.json({ error: 'No es un Reframing Board' }, { status: 400 });
    if (message.commandData.closed) return NextResponse.json({ error: 'Reframing Board cerrado' }, { status: 400 });

    const userId = (session.user as any).id;
    const userName = (session.user as any).name || 'Usuario';

    if (!message.commandData.reframes) message.commandData.reframes = [];

    if (action === 'add') {
      message.commandData.reframes.push({
        id: Date.now().toString(),
        originalView: originalView?.trim(),
        reframedView: reframedView?.trim(),
        type,
        userId,
        userName,
        votes: []
      });
    } else if (action === 'vote' && reframeId) {
      const reframe = message.commandData.reframes.find((r: any) => r.id === reframeId);
      if (reframe) {
        if (!reframe.votes) reframe.votes = [];
        const voteIdx = reframe.votes.indexOf(userId);
        if (voteIdx === -1) reframe.votes.push(userId);
        else reframe.votes.splice(voteIdx, 1);
      }
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
    console.error('Error in reframing-board:', error);
    return NextResponse.json({ error: 'Error al procesar' }, { status: 500 });
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: { id: string; messageId: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

    await connectDB();
    const { reframeId } = await request.json();

    const message = await ChannelMessage.findById(params.messageId);
    if (!message) return NextResponse.json({ error: 'Mensaje no encontrado' }, { status: 404 });
    if (message.commandData.closed) return NextResponse.json({ error: 'Cerrado' }, { status: 400 });

    const userId = (session.user as any).id;
    const idx = message.commandData.reframes?.findIndex((r: any) => r.id === reframeId);
    if (idx === -1 || idx === undefined) return NextResponse.json({ error: 'No encontrado' }, { status: 400 });

    const reframe = message.commandData.reframes[idx];
    if (reframe.userId !== userId && (session.user as any).role !== 'ADMIN') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    }

    message.commandData.reframes.splice(idx, 1);
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
    console.error('Error:', error);
    return NextResponse.json({ error: 'Error al eliminar' }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: { id: string; messageId: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

    await connectDB();
    const message = await ChannelMessage.findById(params.messageId);
    if (!message) return NextResponse.json({ error: 'Mensaje no encontrado' }, { status: 404 });

    const userId = (session.user as any).id;
    if (message.commandData.createdBy !== userId && (session.user as any).role !== 'ADMIN') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    }

    message.commandData.closed = true;
    message.markModified('commandData');
    await message.save();

    const savedMessage = message.toObject();

    notifyDynamicClosed({
      projectId: params.id, channelId: message.channelId, messageId: params.messageId,
      commandType: 'reframing-board', commandData: message.commandData,
      closedByUserId: userId, closedByUserName: (session.user as any).name || 'Usuario'
    }).catch(console.error);

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
    console.error('Error:', error);
    return NextResponse.json({ error: 'Error al cerrar' }, { status: 500 });
  }
}
