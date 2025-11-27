import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import connectDB from '@/lib/mongodb';
import ChannelMessage from '@/models/ChannelMessage';
import { triggerPusherEvent } from '@/lib/pusher-server';
import { notifyDynamicClosed } from '@/lib/dynamicNotifications';

/**
 * POST /api/projects/[id]/messages/[messageId]/storyboard
 * Agregar frame
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

    const { title, description, sketch } = await request.json();

    if (!title?.trim()) {
      return NextResponse.json(
        { error: 'El título es requerido' },
        { status: 400 }
      );
    }

    const message = await ChannelMessage.findById(params.messageId);
    if (!message) {
      return NextResponse.json({ error: 'Mensaje no encontrado' }, { status: 404 });
    }

    if (message.commandType !== 'storyboard') {
      return NextResponse.json({ error: 'No es un Storyboard' }, { status: 400 });
    }

    if (message.commandData.closed) {
      return NextResponse.json({ error: 'Storyboard cerrado' }, { status: 400 });
    }

    const userId = (session.user as any).id;
    const userName = (session.user as any).name || 'Usuario';

    if (!message.commandData.frames) {
      message.commandData.frames = [];
    }

    const frameNumber = message.commandData.frames.length + 1;

    message.commandData.frames.push({
      id: Date.now().toString(),
      number: frameNumber,
      title: title.trim(),
      description: description?.trim() || '',
      sketch: sketch?.trim() || '',
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
    console.error('Error in storyboard add:', error);
    return NextResponse.json({ error: 'Error al agregar' }, { status: 500 });
  }
}

/**
 * PATCH /api/projects/[id]/messages/[messageId]/storyboard
 * Eliminar frame
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

    const { frameId } = await request.json();

    const message = await ChannelMessage.findById(params.messageId);
    if (!message) {
      return NextResponse.json({ error: 'Mensaje no encontrado' }, { status: 404 });
    }

    if (message.commandType !== 'storyboard') {
      return NextResponse.json({ error: 'No es un Storyboard' }, { status: 400 });
    }

    if (message.commandData.closed) {
      return NextResponse.json({ error: 'Storyboard cerrado' }, { status: 400 });
    }

    const userId = (session.user as any).id;
    const frameIndex = message.commandData.frames?.findIndex((f: any) => f.id === frameId);

    if (frameIndex === -1 || frameIndex === undefined) {
      return NextResponse.json({ error: 'Frame no encontrado' }, { status: 400 });
    }

    const frame = message.commandData.frames[frameIndex];
    if (frame.userId !== userId && (session.user as any).role !== 'ADMIN') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    }

    message.commandData.frames.splice(frameIndex, 1);

    // Renumber frames
    message.commandData.frames.forEach((f: any, idx: number) => {
      f.number = idx + 1;
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
    console.error('Error in storyboard delete:', error);
    return NextResponse.json({ error: 'Error al eliminar' }, { status: 500 });
  }
}

/**
 * DELETE /api/projects/[id]/messages/[messageId]/storyboard
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

    if (message.commandType !== 'storyboard') {
      return NextResponse.json({ error: 'No es un Storyboard' }, { status: 400 });
    }

    const userId = (session.user as any).id;
    if (message.commandData.createdBy !== userId && (session.user as any).role !== 'ADMIN') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    }

    message.commandData.closed = true;
    message.markModified('commandData');
    await message.save();

    const savedMessage = message.toObject();

    notifyDynamicClosed({
      projectId: params.id,
      channelId: message.channelId,
      messageId: params.messageId,
      commandType: 'storyboard',
      commandData: message.commandData,
      closedByUserId: userId,
      closedByUserName: (session.user as any).name || 'Usuario'
    }).catch(err => console.error('Error notifying dynamic closed:', err));

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
    console.error('Error closing storyboard:', error);
    return NextResponse.json({ error: 'Error al cerrar' }, { status: 500 });
  }
}
