import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import connectDB from '@/lib/mongodb';
import ChannelMessage from '@/models/ChannelMessage';
import { triggerPusherEvent } from '@/lib/pusher-server';

const populate = (m: any) => m.populate('userId', 'name email').populate('mentions', 'name email').populate('priorityMentions', 'title status completionPercentage userId').populate('reactions.userId', 'name').populate('pinnedBy', 'name').lean();

export async function POST(req: Request, { params }: { params: { id: string; messageId: string } }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    await connectDB();
    const { userName, hoursPerDay } = await req.json();
    if (!userName?.trim()) return NextResponse.json({ error: 'Faltan datos' }, { status: 400 });
    const message = await ChannelMessage.findById(params.messageId);
    if (!message || message.commandType !== 'capacity' || message.commandData.closed) return NextResponse.json({ error: 'Error' }, { status: 400 });
    message.commandData.members.push({ userName: userName.trim(), hoursPerDay });
    message.markModified('commandData');
    await message.save();
    const populated = await populate(ChannelMessage.findById(message._id));
    try { await triggerPusherEvent(`presence-channel-${message.channelId}`, 'message-updated', populated); } catch (e) { console.error(e); }
    return NextResponse.json(populated);
  } catch (error) {
    return NextResponse.json({ error: 'Error' }, { status: 500 });
  }
}

export async function DELETE(req: Request, { params }: { params: { id: string; messageId: string } }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    await connectDB();
    const message = await ChannelMessage.findById(params.messageId);
    if (!message || message.commandType !== 'capacity') return NextResponse.json({ error: 'Error' }, { status: 404 });
    if (message.commandData.createdBy !== (session.user as any).id && (session.user as any).role !== 'ADMIN') return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    message.commandData.closed = true;
    message.markModified('commandData');
    await message.save();
    const populated = await populate(ChannelMessage.findById(message._id));
    try { await triggerPusherEvent(`presence-channel-${message.channelId}`, 'message-updated', populated); } catch (e) { console.error(e); }
    return NextResponse.json(populated);
  } catch (error) {
    return NextResponse.json({ error: 'Error' }, { status: 500 });
  }
}
