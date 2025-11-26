import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import connectDB from '@/lib/mongodb';
import ChannelMessage from '@/models/ChannelMessage';
import { triggerPusherEvent } from '@/lib/pusher-server';
import { notifyDynamicClosed } from '@/lib/dynamicNotifications';

const populate = (m: any) => m.populate('userId', 'name email').populate('mentions', 'name email').populate('priorityMentions', 'title status completionPercentage userId').populate('reactions.userId', 'name').populate('pinnedBy', 'name').lean();

export async function POST(request: Request, { params }: { params: { id: string; messageId: string } }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    await connectDB();
    const { title, date } = await request.json();
    if (!title?.trim() || !date) return NextResponse.json({ error: 'Faltan datos' }, { status: 400 });
    const message = await ChannelMessage.findById(params.messageId);
    if (!message || message.commandType !== 'roadmap') return NextResponse.json({ error: 'No encontrado' }, { status: 404 });
    if (message.commandData.closed) return NextResponse.json({ error: 'Cerrado' }, { status: 400 });
    message.commandData.milestones.push({ title: title.trim(), date, status: 'pending' });
    message.markModified('commandData');
    await message.save();
    const populated = await populate(ChannelMessage.findById(message._id));
    try { await triggerPusherEvent(`presence-channel-${message.channelId}`, 'message-updated', populated); } catch (e) { console.error(e); }
    return NextResponse.json(populated);
  } catch (error) {
    return NextResponse.json({ error: 'Error' }, { status: 500 });
  }
}

export async function PATCH(request: Request, { params }: { params: { id: string; messageId: string } }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    await connectDB();
    const { milestoneIndex, status } = await request.json();
    const message = await ChannelMessage.findById(params.messageId);
    if (!message || message.commandType !== 'roadmap' || message.commandData.closed) return NextResponse.json({ error: 'Error' }, { status: 400 });
    message.commandData.milestones[milestoneIndex].status = status;
    message.markModified('commandData');
    await message.save();
    const populated = await populate(ChannelMessage.findById(message._id));
    try { await triggerPusherEvent(`presence-channel-${message.channelId}`, 'message-updated', populated); } catch (e) { console.error(e); }
    return NextResponse.json(populated);
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
    if (!message || message.commandType !== 'roadmap') return NextResponse.json({ error: 'Error' }, { status: 404 });
    const userId = (session.user as any).id;
    if (message.commandData.createdBy !== userId && (session.user as any).role !== 'ADMIN') return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    message.commandData.closed = true;
    message.markModified('commandData');
    await message.save();
    notifyDynamicClosed({ projectId: params.id, channelId: message.channelId, messageId: params.messageId, commandType: 'roadmap', commandData: message.commandData, closedByUserId: userId, closedByUserName: (session.user as any).name || 'Usuario' }).catch(err => console.error('Error notifying dynamic closed:', err));
    const populated = await populate(ChannelMessage.findById(message._id));
    try { await triggerPusherEvent(`presence-channel-${message.channelId}`, 'message-updated', populated); } catch (e) { console.error(e); }
    return NextResponse.json(populated);
  } catch (error) {
    return NextResponse.json({ error: 'Error' }, { status: 500 });
  }
}
