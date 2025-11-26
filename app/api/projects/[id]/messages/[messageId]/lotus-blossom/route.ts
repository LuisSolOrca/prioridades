import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import connectDB from '@/lib/mongodb';
import ChannelMessage from '@/models/ChannelMessage';
import { triggerPusherEvent } from '@/lib/pusher-server';

/**
 * POST /api/projects/[id]/messages/[messageId]/lotus-blossom
 * Agregar item a un pétalo
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

    const { petalId, text } = await request.json();

    if (!petalId || !text?.trim()) {
      return NextResponse.json(
        { error: 'Datos inválidos' },
        { status: 400 }
      );
    }

    const message = await ChannelMessage.findById(params.messageId);
    if (!message) {
      return NextResponse.json({ error: 'Mensaje no encontrado' }, { status: 404 });
    }

    if (message.commandType !== 'lotus-blossom') {
      return NextResponse.json({ error: 'No es un Lotus Blossom' }, { status: 400 });
    }

    if (message.commandData.closed) {
      return NextResponse.json({ error: 'Lotus Blossom cerrado' }, { status: 400 });
    }

    const userId = (session.user as any).id;
    const userName = (session.user as any).name || 'Usuario';

    // Encontrar pétalo y agregar item
    const petal = message.commandData.petals.find((p: any) => p.id === petalId);
    if (!petal) {
      return NextResponse.json({ error: 'Pétalo no encontrado' }, { status: 400 });
    }

    petal.items.push({
      text: text.trim(),
      userId,
      userName
    });

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
    console.error('Error in lotus-blossom add:', error);
    return NextResponse.json({ error: 'Error al agregar' }, { status: 500 });
  }
}

/**
 * PATCH /api/projects/[id]/messages/[messageId]/lotus-blossom
 * Eliminar item de un pétalo
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

    const { petalId, itemIndex } = await request.json();

    const message = await ChannelMessage.findById(params.messageId);
    if (!message) {
      return NextResponse.json({ error: 'Mensaje no encontrado' }, { status: 404 });
    }

    if (message.commandType !== 'lotus-blossom') {
      return NextResponse.json({ error: 'No es un Lotus Blossom' }, { status: 400 });
    }

    if (message.commandData.closed) {
      return NextResponse.json({ error: 'Lotus Blossom cerrado' }, { status: 400 });
    }

    const userId = (session.user as any).id;
    const petal = message.commandData.petals.find((p: any) => p.id === petalId);
    if (!petal) {
      return NextResponse.json({ error: 'Pétalo no encontrado' }, { status: 400 });
    }

    const item = petal.items[itemIndex];
    if (!item) {
      return NextResponse.json({ error: 'Item no encontrado' }, { status: 400 });
    }

    // Solo el creador o admin puede eliminar
    if (item.userId !== userId && (session.user as any).role !== 'ADMIN') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    }

    petal.items.splice(itemIndex, 1);
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
    console.error('Error in lotus-blossom delete:', error);
    return NextResponse.json({ error: 'Error al eliminar' }, { status: 500 });
  }
}

/**
 * DELETE /api/projects/[id]/messages/[messageId]/lotus-blossom
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

    if (message.commandType !== 'lotus-blossom') {
      return NextResponse.json({ error: 'No es un Lotus Blossom' }, { status: 400 });
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
    console.error('Error closing lotus-blossom:', error);
    return NextResponse.json({ error: 'Error al cerrar' }, { status: 500 });
  }
}
