import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import connectDB from '@/lib/mongodb';
import ChannelMessage from '@/models/ChannelMessage';
import { triggerPusherEvent } from '@/lib/pusher-server';

/**
 * POST /api/projects/[id]/messages/[messageId]/five-whys
 * Agregar un why o respuesta
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

    const { type, text, whyId } = await request.json();

    if (!type || !text?.trim()) {
      return NextResponse.json(
        { error: 'Datos inválidos' },
        { status: 400 }
      );
    }

    const message = await ChannelMessage.findById(params.messageId);
    if (!message) {
      return NextResponse.json({ error: 'Mensaje no encontrado' }, { status: 404 });
    }

    if (message.commandType !== 'five-whys') {
      return NextResponse.json({ error: 'No es un 5 Whys' }, { status: 400 });
    }

    if (message.commandData.closed) {
      return NextResponse.json({ error: '5 Whys cerrado' }, { status: 400 });
    }

    const userId = (session.user as any).id;
    const userName = (session.user as any).name || 'Usuario';

    if (type === 'why') {
      // Agregar nuevo why
      const newWhy = {
        id: Date.now().toString(),
        question: text.trim(),
        answer: '',
        userId,
        userName
      };
      message.commandData.whys.push(newWhy);
    } else if (type === 'answer' && whyId) {
      // Agregar respuesta a un why
      const why = message.commandData.whys.find((w: any) => w.id === whyId);
      if (!why) {
        return NextResponse.json({ error: 'Why no encontrado' }, { status: 400 });
      }
      why.answer = text.trim();
      why.answeredBy = userId;
      why.answeredByName = userName;
    } else if (type === 'root-cause') {
      // Establecer causa raíz
      message.commandData.rootCause = text.trim();
      message.commandData.rootCauseBy = userId;
      message.commandData.rootCauseByName = userName;
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
    console.error('Error in five-whys add:', error);
    return NextResponse.json({ error: 'Error al agregar' }, { status: 500 });
  }
}

/**
 * PATCH /api/projects/[id]/messages/[messageId]/five-whys
 * Eliminar un why
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

    const { whyId } = await request.json();

    const message = await ChannelMessage.findById(params.messageId);
    if (!message) {
      return NextResponse.json({ error: 'Mensaje no encontrado' }, { status: 404 });
    }

    if (message.commandType !== 'five-whys') {
      return NextResponse.json({ error: 'No es un 5 Whys' }, { status: 400 });
    }

    if (message.commandData.closed) {
      return NextResponse.json({ error: '5 Whys cerrado' }, { status: 400 });
    }

    const userId = (session.user as any).id;
    const whyIndex = message.commandData.whys.findIndex((w: any) => w.id === whyId);

    if (whyIndex === -1) {
      return NextResponse.json({ error: 'Why no encontrado' }, { status: 400 });
    }

    const why = message.commandData.whys[whyIndex];

    // Solo el creador o admin puede eliminar
    if (why.userId !== userId && (session.user as any).role !== 'ADMIN') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    }

    message.commandData.whys.splice(whyIndex, 1);
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
    console.error('Error in five-whys delete:', error);
    return NextResponse.json({ error: 'Error al eliminar' }, { status: 500 });
  }
}

/**
 * DELETE /api/projects/[id]/messages/[messageId]/five-whys
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

    if (message.commandType !== 'five-whys') {
      return NextResponse.json({ error: 'No es un 5 Whys' }, { status: 400 });
    }

    const userId = (session.user as any).id;
    if (message.commandData.createdBy !== userId && (session.user as any).role !== 'ADMIN') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    }

    message.commandData.closed = true;
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
    console.error('Error closing five-whys:', error);
    return NextResponse.json({ error: 'Error al cerrar' }, { status: 500 });
  }
}
