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
    const { action, currentImage, desiredImage, trigger, resources, entryId } = body;

    const message = await ChannelMessage.findById(params.messageId);
    if (!message) return NextResponse.json({ error: 'No encontrado' }, { status: 404 });
    if (message.commandType !== 'swish-pattern') return NextResponse.json({ error: 'Tipo incorrecto' }, { status: 400 });
    if (message.commandData.closed) return NextResponse.json({ error: 'Cerrado' }, { status: 400 });

    const userId = (session.user as any).id;
    const userName = (session.user as any).name || 'Usuario';

    if (!message.commandData.entries) message.commandData.entries = [];

    if (action === 'add') {
      message.commandData.entries.push({
        id: Date.now().toString(),
        currentImage: currentImage?.trim(),
        desiredImage: desiredImage?.trim(),
        trigger,
        resources,
        repetitions: 0,
        userId,
        userName
      });
    } else if (action === 'increment' && entryId) {
      const entry = message.commandData.entries.find((e: any) => e.id === entryId);
      if (entry && entry.userId === userId) {
        entry.repetitions = (entry.repetitions || 0) + 1;
      }
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
    return NextResponse.json({ error: 'Error' }, { status: 500 });
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
    const { entryId } = await request.json();

    const message = await ChannelMessage.findById(params.messageId);
    if (!message) return NextResponse.json({ error: 'No encontrado' }, { status: 404 });
    if (message.commandData.closed) return NextResponse.json({ error: 'Cerrado' }, { status: 400 });

    const userId = (session.user as any).id;
    const idx = message.commandData.entries?.findIndex((e: any) => e.id === entryId);
    if (idx === -1 || idx === undefined) return NextResponse.json({ error: 'No encontrado' }, { status: 400 });

    if (message.commandData.entries[idx].userId !== userId && (session.user as any).role !== 'ADMIN') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    }

    message.commandData.entries.splice(idx, 1);
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
      commandType: 'swish-pattern', commandData: message.commandData,
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
