import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import connectDB from '@/lib/mongodb';
import ChannelMessage from '@/models/ChannelMessage';
import { triggerPusherEvent } from '@/lib/pusher-server';

export async function POST(request: Request, { params }: { params: { id: string; messageId: string } }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    await connectDB();
    const { topic, timeMinutes, speaker } = await request.json();
    if (!topic?.trim() || !speaker?.trim()) return NextResponse.json({ error: 'Faltan datos' }, { status: 400 });
    const message = await ChannelMessage.findById(params.messageId);
    if (!message || message.commandType !== 'agenda') return NextResponse.json({ error: 'No encontrado' }, { status: 404 });
    if (message.commandData.closed) return NextResponse.json({ error: 'Cerrado' }, { status: 400 });
    message.commandData.items.push({ topic: topic.trim(), timeMinutes, speaker: speaker.trim(), completed: false });
    message.markModified('commandData');
    await message.save();
    const saved = message.toObject();
    (async () => { try { const populated = await ChannelMessage.findById(message._id).populate('userId', 'name email').populate('mentions', 'name email').populate('priorityMentions', 'title status completionPercentage userId').populate('reactions.userId', 'name').populate('pinnedBy', 'name').lean(); await triggerPusherEvent(`presence-channel-${message.channelId}`, 'message-updated', populated); } catch (e) { console.error(e); } })();
    return NextResponse.json(saved);
  } catch (error) {
    return NextResponse.json({ error: 'Error' }, { status: 500 });
  }
}

export async function PATCH(request: Request, { params }: { params: { id: string; messageId: string } }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    await connectDB();
    const { itemIndex, action } = await request.json();
    const message = await ChannelMessage.findById(params.messageId);
    if (!message || message.commandType !== 'agenda' || message.commandData.closed) return NextResponse.json({ error: 'Error' }, { status: 400 });
    if (action === 'toggle') message.commandData.items[itemIndex].completed = !message.commandData.items[itemIndex].completed;
    message.markModified('commandData');
    await message.save();
    const saved = message.toObject();
    (async () => { try { const populated = await ChannelMessage.findById(message._id).populate('userId', 'name email').populate('mentions', 'name email').populate('priorityMentions', 'title status completionPercentage userId').populate('reactions.userId', 'name').populate('pinnedBy', 'name').lean(); await triggerPusherEvent(`presence-channel-${message.channelId}`, 'message-updated', populated); } catch (e) { console.error(e); } })();
    return NextResponse.json(saved);
  } catch (error) {
    return NextResponse.json({ error: 'Error' }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: { params: { id: string; messageId: string } }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    await connectDB();
    const message = await ChannelMessage.findById(params.messageId);
    if (!message || message.commandType !== 'agenda') return NextResponse.json({ error: 'Error' }, { status: 404 });
    const userId = (session.user as any).id;
    if (message.commandData.createdBy !== userId && (session.user as any).role !== 'ADMIN') return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    message.commandData.closed = true;
    message.markModified('commandData');
    await message.save();
    const saved = message.toObject();
    (async () => { try { const populated = await ChannelMessage.findById(message._id).populate('userId', 'name email').populate('mentions', 'name email').populate('priorityMentions', 'title status completionPercentage userId').populate('reactions.userId', 'name').populate('pinnedBy', 'name').lean(); await triggerPusherEvent(`presence-channel-${message.channelId}`, 'message-updated', populated); } catch (e) { console.error(e); } })();
    return NextResponse.json(saved);
  } catch (error) {
    return NextResponse.json({ error: 'Error' }, { status: 500 });
  }
}
