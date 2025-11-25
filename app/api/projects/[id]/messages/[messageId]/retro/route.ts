import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import connectDB from '@/lib/mongodb';
import ChannelMessage from '@/models/ChannelMessage';
import { triggerPusherEvent } from '@/lib/pusher-server';

const RETRO_TYPES = ['rose-bud-thorn', 'sailboat', 'start-stop-continue', 'swot', 'six-hats'];

/**
 * POST /api/projects/[id]/messages/[messageId]/retro
 * Agregar item a una sección
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

    const { sectionId, text } = await request.json();

    if (!sectionId || !text?.trim()) {
      return NextResponse.json(
        { error: 'Datos inválidos' },
        { status: 400 }
      );
    }

    const message = await ChannelMessage.findById(params.messageId);
    if (!message) {
      return NextResponse.json({ error: 'Mensaje no encontrado' }, { status: 404 });
    }

    if (!RETRO_TYPES.includes(message.commandType)) {
      return NextResponse.json({ error: 'No es una retrospectiva' }, { status: 400 });
    }

    if (message.commandData.closed) {
      return NextResponse.json({ error: 'Retrospectiva cerrada' }, { status: 400 });
    }

    const userId = (session.user as any).id;
    const userName = (session.user as any).name || 'Usuario';

    // Encontrar sección y agregar item
    const section = message.commandData.sections.find((s: any) => s.id === sectionId);
    if (!section) {
      return NextResponse.json({ error: 'Sección no encontrada' }, { status: 400 });
    }

    section.items.push({
      text: text.trim(),
      userId,
      userName
    });

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
    console.error('Error in retro add:', error);
    return NextResponse.json({ error: 'Error al agregar' }, { status: 500 });
  }
}

/**
 * PATCH /api/projects/[id]/messages/[messageId]/retro
 * Eliminar item de una sección
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

    const { sectionId, itemIndex } = await request.json();

    const message = await ChannelMessage.findById(params.messageId);
    if (!message) {
      return NextResponse.json({ error: 'Mensaje no encontrado' }, { status: 404 });
    }

    if (!RETRO_TYPES.includes(message.commandType)) {
      return NextResponse.json({ error: 'No es una retrospectiva' }, { status: 400 });
    }

    if (message.commandData.closed) {
      return NextResponse.json({ error: 'Retrospectiva cerrada' }, { status: 400 });
    }

    const userId = (session.user as any).id;
    const section = message.commandData.sections.find((s: any) => s.id === sectionId);
    if (!section) {
      return NextResponse.json({ error: 'Sección no encontrada' }, { status: 400 });
    }

    const item = section.items[itemIndex];
    if (!item) {
      return NextResponse.json({ error: 'Item no encontrado' }, { status: 400 });
    }

    // Solo el creador o admin puede eliminar
    if (item.userId !== userId && (session.user as any).role !== 'ADMIN') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    }

    section.items.splice(itemIndex, 1);
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
    console.error('Error in retro delete:', error);
    return NextResponse.json({ error: 'Error al eliminar' }, { status: 500 });
  }
}

/**
 * DELETE /api/projects/[id]/messages/[messageId]/retro
 * Cerrar retrospectiva (solo creador)
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

    if (!RETRO_TYPES.includes(message.commandType)) {
      return NextResponse.json({ error: 'No es una retrospectiva' }, { status: 400 });
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
    console.error('Error closing retro:', error);
    return NextResponse.json({ error: 'Error al cerrar' }, { status: 500 });
  }
}
