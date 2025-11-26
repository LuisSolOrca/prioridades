import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import connectDB from '@/lib/mongodb';
import ChannelMessage from '@/models/ChannelMessage';
import { triggerPusherEvent } from '@/lib/pusher-server';

/**
 * POST /api/projects/[id]/messages/[messageId]/lean-coffee
 * Agregar tema, votar o eliminar
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

    const { action, text, topicId } = await request.json();

    const message = await ChannelMessage.findById(params.messageId);
    if (!message) {
      return NextResponse.json({ error: 'Mensaje no encontrado' }, { status: 404 });
    }

    if (message.commandType !== 'lean-coffee') {
      return NextResponse.json({ error: 'No es un Lean Coffee' }, { status: 400 });
    }

    if (message.commandData.closed) {
      return NextResponse.json({ error: 'Lean Coffee cerrado' }, { status: 400 });
    }

    const userId = (session.user as any).id;
    const userName = (session.user as any).name || 'Usuario';

    if (action === 'add') {
      if (!text?.trim()) {
        return NextResponse.json({ error: 'Texto requerido' }, { status: 400 });
      }

      const newTopic = {
        id: Date.now().toString(),
        text: text.trim(),
        userId,
        userName,
        votes: [],
        status: 'pending'
      };
      message.commandData.topics.push(newTopic);
    } else if (action === 'vote') {
      const topic = message.commandData.topics.find((t: any) => t.id === topicId);
      if (!topic) {
        return NextResponse.json({ error: 'Tema no encontrado' }, { status: 400 });
      }

      const voteIndex = topic.votes.indexOf(userId);
      if (voteIndex === -1) {
        topic.votes.push(userId);
      } else {
        topic.votes.splice(voteIndex, 1);
      }
    } else if (action === 'delete') {
      const topicIndex = message.commandData.topics.findIndex((t: any) => t.id === topicId);
      if (topicIndex === -1) {
        return NextResponse.json({ error: 'Tema no encontrado' }, { status: 400 });
      }

      const topic = message.commandData.topics[topicIndex];
      if (topic.userId !== userId && (session.user as any).role !== 'ADMIN') {
        return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
      }

      message.commandData.topics.splice(topicIndex, 1);
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
    console.error('Error in lean-coffee POST:', error);
    return NextResponse.json({ error: 'Error' }, { status: 500 });
  }
}

/**
 * PATCH /api/projects/[id]/messages/[messageId]/lean-coffee
 * Iniciar o finalizar discusión de tema
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

    const { action, topicId } = await request.json();

    const message = await ChannelMessage.findById(params.messageId);
    if (!message) {
      return NextResponse.json({ error: 'Mensaje no encontrado' }, { status: 404 });
    }

    if (message.commandType !== 'lean-coffee') {
      return NextResponse.json({ error: 'No es un Lean Coffee' }, { status: 400 });
    }

    if (message.commandData.closed) {
      return NextResponse.json({ error: 'Lean Coffee cerrado' }, { status: 400 });
    }

    const topic = message.commandData.topics.find((t: any) => t.id === topicId);
    if (!topic) {
      return NextResponse.json({ error: 'Tema no encontrado' }, { status: 400 });
    }

    if (action === 'start') {
      // Finalizar cualquier tema en discusión
      message.commandData.topics.forEach((t: any) => {
        if (t.status === 'discussing') {
          t.status = 'discussed';
        }
      });
      topic.status = 'discussing';
      message.commandData.currentTopic = topicId;
    } else if (action === 'finish') {
      topic.status = 'discussed';
      message.commandData.currentTopic = null;
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
    console.error('Error in lean-coffee PATCH:', error);
    return NextResponse.json({ error: 'Error' }, { status: 500 });
  }
}

/**
 * DELETE /api/projects/[id]/messages/[messageId]/lean-coffee
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

    if (message.commandType !== 'lean-coffee') {
      return NextResponse.json({ error: 'No es un Lean Coffee' }, { status: 400 });
    }

    const userId = (session.user as any).id;
    if (message.commandData.createdBy !== userId && (session.user as any).role !== 'ADMIN') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    }

    message.commandData.closed = true;
    message.commandData.currentTopic = null;
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
    console.error('Error closing lean-coffee:', error);
    return NextResponse.json({ error: 'Error al cerrar' }, { status: 500 });
  }
}
