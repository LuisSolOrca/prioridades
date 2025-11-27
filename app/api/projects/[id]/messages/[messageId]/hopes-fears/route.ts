import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import connectDB from '@/lib/mongodb';
import ChannelMessage from '@/models/ChannelMessage';
import { triggerPusherEvent } from '@/lib/pusher-server';
import { notifyDynamicClosed } from '@/lib/dynamicNotifications';

/**
 * POST /api/projects/[id]/messages/[messageId]/hopes-fears
 * Add item or vote
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
    const { action, type, text, itemId } = body;

    const message = await ChannelMessage.findById(params.messageId);
    if (!message) {
      return NextResponse.json({ error: 'Mensaje no encontrado' }, { status: 404 });
    }

    if (message.commandType !== 'hopes-fears') {
      return NextResponse.json({ error: 'No es un Hopes & Fears' }, { status: 400 });
    }

    if (message.commandData.closed) {
      return NextResponse.json({ error: 'Hopes & Fears cerrado' }, { status: 400 });
    }

    const userId = (session.user as any).id;
    const userName = (session.user as any).name || 'Usuario';

    if (!message.commandData.items) {
      message.commandData.items = [];
    }

    if (action === 'add') {
      if (!['hope', 'fear'].includes(type) || !text?.trim()) {
        return NextResponse.json({ error: 'Datos inválidos' }, { status: 400 });
      }

      message.commandData.items.push({
        id: Date.now().toString(),
        text: text.trim(),
        type,
        userId,
        userName,
        votes: []
      });
    } else if (action === 'vote' && itemId) {
      const item = message.commandData.items.find((i: any) => i.id === itemId);
      if (!item) {
        return NextResponse.json({ error: 'Item no encontrado' }, { status: 400 });
      }

      if (!item.votes) {
        item.votes = [];
      }

      const voteIndex = item.votes.indexOf(userId);
      if (voteIndex === -1) {
        item.votes.push(userId);
      } else {
        item.votes.splice(voteIndex, 1);
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
    console.error('Error in hopes-fears:', error);
    return NextResponse.json({ error: 'Error al procesar' }, { status: 500 });
  }
}

/**
 * PATCH /api/projects/[id]/messages/[messageId]/hopes-fears
 * Delete item
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

    const { itemId } = await request.json();

    const message = await ChannelMessage.findById(params.messageId);
    if (!message) {
      return NextResponse.json({ error: 'Mensaje no encontrado' }, { status: 404 });
    }

    if (message.commandType !== 'hopes-fears') {
      return NextResponse.json({ error: 'No es un Hopes & Fears' }, { status: 400 });
    }

    if (message.commandData.closed) {
      return NextResponse.json({ error: 'Hopes & Fears cerrado' }, { status: 400 });
    }

    const userId = (session.user as any).id;
    const itemIndex = message.commandData.items?.findIndex((i: any) => i.id === itemId);

    if (itemIndex === -1 || itemIndex === undefined) {
      return NextResponse.json({ error: 'Item no encontrado' }, { status: 400 });
    }

    const item = message.commandData.items[itemIndex];
    if (item.userId !== userId && (session.user as any).role !== 'ADMIN') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    }

    message.commandData.items.splice(itemIndex, 1);

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
    console.error('Error in hopes-fears delete:', error);
    return NextResponse.json({ error: 'Error al eliminar' }, { status: 500 });
  }
}

/**
 * DELETE /api/projects/[id]/messages/[messageId]/hopes-fears
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

    if (message.commandType !== 'hopes-fears') {
      return NextResponse.json({ error: 'No es un Hopes & Fears' }, { status: 400 });
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
      commandType: 'hopes-fears',
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
    console.error('Error closing hopes-fears:', error);
    return NextResponse.json({ error: 'Error al cerrar' }, { status: 500 });
  }
}
