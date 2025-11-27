import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import connectDB from '@/lib/mongodb';
import ChannelMessage from '@/models/ChannelMessage';
import { triggerPusherEvent } from '@/lib/pusher-server';
import { notifyDynamicClosed } from '@/lib/dynamicNotifications';

/**
 * POST /api/projects/[id]/messages/[messageId]/lightning-demos
 * Agregar demo o votar
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
    const { action, title, source, url, insight, demoId } = body;

    const message = await ChannelMessage.findById(params.messageId);
    if (!message) {
      return NextResponse.json({ error: 'Mensaje no encontrado' }, { status: 404 });
    }

    if (message.commandType !== 'lightning-demos') {
      return NextResponse.json({ error: 'No es un Lightning Demos' }, { status: 400 });
    }

    if (message.commandData.closed) {
      return NextResponse.json({ error: 'Lightning Demos cerrado' }, { status: 400 });
    }

    const userId = (session.user as any).id;
    const userName = (session.user as any).name || 'Usuario';

    if (!message.commandData.demos) {
      message.commandData.demos = [];
    }

    if (action === 'add') {
      if (!title?.trim() || !source?.trim()) {
        return NextResponse.json({ error: 'Título y fuente son requeridos' }, { status: 400 });
      }

      message.commandData.demos.push({
        id: Date.now().toString(),
        title: title.trim(),
        source: source.trim(),
        url: url || null,
        insight: insight?.trim() || '',
        userId,
        userName,
        votes: []
      });
    } else if (action === 'vote' && demoId) {
      const demo = message.commandData.demos.find((d: any) => d.id === demoId);
      if (!demo) {
        return NextResponse.json({ error: 'Demo no encontrado' }, { status: 400 });
      }

      if (!demo.votes) {
        demo.votes = [];
      }

      const voteIndex = demo.votes.indexOf(userId);
      if (voteIndex === -1) {
        demo.votes.push(userId);
      } else {
        demo.votes.splice(voteIndex, 1);
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
    console.error('Error in lightning-demos:', error);
    return NextResponse.json({ error: 'Error al procesar' }, { status: 500 });
  }
}

/**
 * PATCH /api/projects/[id]/messages/[messageId]/lightning-demos
 * Eliminar demo
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

    const { demoId } = await request.json();

    const message = await ChannelMessage.findById(params.messageId);
    if (!message) {
      return NextResponse.json({ error: 'Mensaje no encontrado' }, { status: 404 });
    }

    if (message.commandType !== 'lightning-demos') {
      return NextResponse.json({ error: 'No es un Lightning Demos' }, { status: 400 });
    }

    if (message.commandData.closed) {
      return NextResponse.json({ error: 'Lightning Demos cerrado' }, { status: 400 });
    }

    const userId = (session.user as any).id;
    const demoIndex = message.commandData.demos?.findIndex((d: any) => d.id === demoId);

    if (demoIndex === -1 || demoIndex === undefined) {
      return NextResponse.json({ error: 'Demo no encontrado' }, { status: 400 });
    }

    const demo = message.commandData.demos[demoIndex];
    if (demo.userId !== userId && (session.user as any).role !== 'ADMIN') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    }

    message.commandData.demos.splice(demoIndex, 1);

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
    console.error('Error in lightning-demos delete:', error);
    return NextResponse.json({ error: 'Error al eliminar' }, { status: 500 });
  }
}

/**
 * DELETE /api/projects/[id]/messages/[messageId]/lightning-demos
 * Cerrar (solo creador)
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

    if (message.commandType !== 'lightning-demos') {
      return NextResponse.json({ error: 'No es un Lightning Demos' }, { status: 400 });
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
      commandType: 'lightning-demos',
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
    console.error('Error closing lightning-demos:', error);
    return NextResponse.json({ error: 'Error al cerrar' }, { status: 500 });
  }
}
