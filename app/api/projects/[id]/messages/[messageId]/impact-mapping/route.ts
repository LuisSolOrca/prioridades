import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import connectDB from '@/lib/mongodb';
import ChannelMessage from '@/models/ChannelMessage';
import { triggerPusherEvent } from '@/lib/pusher-server';
import { notifyDynamicClosed } from '@/lib/dynamicNotifications';

/**
 * POST /api/projects/[id]/messages/[messageId]/impact-mapping
 * Add node
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

    const { text, level, parentId } = await request.json();

    if (!text?.trim() || !['actor', 'impact', 'deliverable'].includes(level)) {
      return NextResponse.json({ error: 'Datos inválidos' }, { status: 400 });
    }

    const message = await ChannelMessage.findById(params.messageId);
    if (!message) {
      return NextResponse.json({ error: 'Mensaje no encontrado' }, { status: 404 });
    }

    if (message.commandType !== 'impact-mapping') {
      return NextResponse.json({ error: 'No es un Impact Mapping' }, { status: 400 });
    }

    if (message.commandData.closed) {
      return NextResponse.json({ error: 'Impact Mapping cerrado' }, { status: 400 });
    }

    const userId = (session.user as any).id;
    const userName = (session.user as any).name || 'Usuario';

    if (!message.commandData.nodes) {
      message.commandData.nodes = [];
    }

    // Validate parent exists for impacts and deliverables
    if (level === 'impact' && parentId) {
      const parent = message.commandData.nodes.find((n: any) => n.id === parentId && n.level === 'actor');
      if (!parent) {
        return NextResponse.json({ error: 'Actor no encontrado' }, { status: 400 });
      }
    } else if (level === 'deliverable' && parentId) {
      const parent = message.commandData.nodes.find((n: any) => n.id === parentId && n.level === 'impact');
      if (!parent) {
        return NextResponse.json({ error: 'Impacto no encontrado' }, { status: 400 });
      }
    }

    message.commandData.nodes.push({
      id: Date.now().toString(),
      text: text.trim(),
      level,
      parentId: parentId || null,
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
    console.error('Error in impact-mapping add:', error);
    return NextResponse.json({ error: 'Error al agregar' }, { status: 500 });
  }
}

/**
 * PATCH /api/projects/[id]/messages/[messageId]/impact-mapping
 * Delete node (and children)
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

    const { nodeId } = await request.json();

    const message = await ChannelMessage.findById(params.messageId);
    if (!message) {
      return NextResponse.json({ error: 'Mensaje no encontrado' }, { status: 404 });
    }

    if (message.commandType !== 'impact-mapping') {
      return NextResponse.json({ error: 'No es un Impact Mapping' }, { status: 400 });
    }

    if (message.commandData.closed) {
      return NextResponse.json({ error: 'Impact Mapping cerrado' }, { status: 400 });
    }

    const userId = (session.user as any).id;
    const node = message.commandData.nodes?.find((n: any) => n.id === nodeId);

    if (!node) {
      return NextResponse.json({ error: 'Nodo no encontrado' }, { status: 400 });
    }

    if (node.userId !== userId && (session.user as any).role !== 'ADMIN') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    }

    // Delete node and all descendants
    const idsToDelete = new Set<string>([nodeId]);
    let changed = true;
    while (changed) {
      changed = false;
      for (const n of message.commandData.nodes) {
        if (n.parentId && idsToDelete.has(n.parentId) && !idsToDelete.has(n.id)) {
          idsToDelete.add(n.id);
          changed = true;
        }
      }
    }

    message.commandData.nodes = message.commandData.nodes.filter(
      (n: any) => !idsToDelete.has(n.id)
    );

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
    console.error('Error in impact-mapping delete:', error);
    return NextResponse.json({ error: 'Error al eliminar' }, { status: 500 });
  }
}

/**
 * DELETE /api/projects/[id]/messages/[messageId]/impact-mapping
 * Close (only creator)
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

    if (message.commandType !== 'impact-mapping') {
      return NextResponse.json({ error: 'No es un Impact Mapping' }, { status: 400 });
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
      commandType: 'impact-mapping',
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
    console.error('Error closing impact-mapping:', error);
    return NextResponse.json({ error: 'Error al cerrar' }, { status: 500 });
  }
}
