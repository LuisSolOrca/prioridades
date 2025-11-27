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
    const { action, position, insight, feelings, needs } = body;

    const message = await ChannelMessage.findById(params.messageId);
    if (!message) return NextResponse.json({ error: 'Mensaje no encontrado' }, { status: 404 });
    if (message.commandType !== 'perceptual-positions') return NextResponse.json({ error: 'Tipo incorrecto' }, { status: 400 });
    if (message.commandData.closed) return NextResponse.json({ error: 'Cerrado' }, { status: 400 });

    const userId = (session.user as any).id;
    const userName = (session.user as any).name || 'Usuario';

    if (!message.commandData.perspectives) message.commandData.perspectives = [];

    if (action === 'add') {
      message.commandData.perspectives.push({
        id: Date.now().toString(),
        position,
        insight: insight?.trim(),
        feelings,
        needs,
        userId,
        userName
      });
    }

    message.markModified('commandData');
    await message.save();

    const populatedMessage = await ChannelMessage.findById(message._id)
      .populate('userId', 'name email')
      .populate('mentions', 'name email')
      .populate('reactions.userId', 'name')
      .lean();
    triggerPusherEvent(`presence-channel-${message.channelId}`, 'message-updated', populatedMessage).catch(console.error);

    return NextResponse.json(message.toObject());
  } catch (error) {
    console.error('Error:', error);
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
    const { perspectiveId } = await request.json();

    const message = await ChannelMessage.findById(params.messageId);
    if (!message) return NextResponse.json({ error: 'No encontrado' }, { status: 404 });
    if (message.commandData.closed) return NextResponse.json({ error: 'Cerrado' }, { status: 400 });

    const userId = (session.user as any).id;
    const idx = message.commandData.perspectives?.findIndex((p: any) => p.id === perspectiveId);
    if (idx === -1 || idx === undefined) return NextResponse.json({ error: 'No encontrado' }, { status: 400 });

    if (message.commandData.perspectives[idx].userId !== userId && (session.user as any).role !== 'ADMIN') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    }

    message.commandData.perspectives.splice(idx, 1);
    message.markModified('commandData');
    await message.save();

    const populatedMessage = await ChannelMessage.findById(message._id)
      .populate('userId', 'name email')
      .populate('mentions', 'name email')
      .populate('reactions.userId', 'name')
      .lean();
    triggerPusherEvent(`presence-channel-${message.channelId}`, 'message-updated', populatedMessage).catch(console.error);

    return NextResponse.json(message.toObject());
  } catch (error) {
    console.error('Error:', error);
    return NextResponse.json({ error: 'Error' }, { status: 500 });
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
    if (!message) return NextResponse.json({ error: 'No encontrado' }, { status: 404 });

    const userId = (session.user as any).id;
    if (message.commandData.createdBy !== userId && (session.user as any).role !== 'ADMIN') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    }

    message.commandData.closed = true;
    message.markModified('commandData');
    await message.save();

    notifyDynamicClosed({
      projectId: params.id, channelId: message.channelId, messageId: params.messageId,
      commandType: 'perceptual-positions', commandData: message.commandData,
      closedByUserId: userId, closedByUserName: (session.user as any).name || 'Usuario'
    }).catch(console.error);

    const populatedMessage = await ChannelMessage.findById(message._id)
      .populate('userId', 'name email')
      .populate('mentions', 'name email')
      .populate('reactions.userId', 'name')
      .lean();
    triggerPusherEvent(`presence-channel-${message.channelId}`, 'message-updated', populatedMessage).catch(console.error);

    return NextResponse.json(message.toObject());
  } catch (error) {
    console.error('Error:', error);
    return NextResponse.json({ error: 'Error' }, { status: 500 });
  }
}
