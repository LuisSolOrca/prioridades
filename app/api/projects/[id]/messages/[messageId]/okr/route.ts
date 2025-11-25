import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import connectDB from '@/lib/mongodb';
import ChannelMessage from '@/models/ChannelMessage';
import { triggerPusherEvent } from '@/lib/pusher-server';

const populate = (m: any) => m.populate('userId', 'name email').populate('mentions', 'name email').populate('priorityMentions', 'title status completionPercentage userId').populate('reactions.userId', 'name').populate('pinnedBy', 'name').lean();

export async function POST(request: Request, { params }: { params: { id: string; messageId: string } }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    await connectDB();
    const { action, objectiveTitle, objectiveIndex, keyResultDescription } = await request.json();
    const message = await ChannelMessage.findById(params.messageId);
    if (!message || message.commandType !== 'okr') return NextResponse.json({ error: 'No encontrado' }, { status: 404 });
    if (message.commandData.closed) return NextResponse.json({ error: 'Cerrado' }, { status: 400 });

    if (action === 'add-objective') {
      if (!objectiveTitle?.trim()) return NextResponse.json({ error: 'Faltan datos' }, { status: 400 });
      message.commandData.objectives.push({ title: objectiveTitle.trim(), keyResults: [] });
    } else if (action === 'add-kr') {
      if (!keyResultDescription?.trim() || objectiveIndex === undefined) return NextResponse.json({ error: 'Faltan datos' }, { status: 400 });
      message.commandData.objectives[objectiveIndex].keyResults.push({ description: keyResultDescription.trim(), progress: 0 });
    }

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
    const { objectiveIndex, krIndex, progress } = await request.json();
    const message = await ChannelMessage.findById(params.messageId);
    if (!message || message.commandType !== 'okr' || message.commandData.closed) return NextResponse.json({ error: 'Error' }, { status: 400 });
    message.commandData.objectives[objectiveIndex].keyResults[krIndex].progress = progress;
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
    if (!message || message.commandType !== 'okr') return NextResponse.json({ error: 'Error' }, { status: 404 });
    const userId = (session.user as any).id;
    if (message.commandData.createdBy !== userId && (session.user as any).role !== 'ADMIN') return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
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
