import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import connectDB from '@/lib/mongodb';
import ChannelMessage from '@/models/ChannelMessage';
import { triggerPusherEvent } from '@/lib/pusher-server';
import { notifyDynamicClosed } from '@/lib/dynamicNotifications';

/**
 * POST /api/projects/[id]/messages/[messageId]/mind-map
 * Agregar nodo al mapa mental
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

    const { parentId, label } = await request.json();

    if (!label?.trim()) {
      return NextResponse.json(
        { error: 'El label es requerido' },
        { status: 400 }
      );
    }

    const message = await ChannelMessage.findById(params.messageId);
    if (!message) {
      return NextResponse.json({ error: 'Mensaje no encontrado' }, { status: 404 });
    }

    if (message.commandType !== 'mind-map') {
      return NextResponse.json({ error: 'No es un mind-map' }, { status: 400 });
    }

    if (message.commandData.closed) {
      return NextResponse.json({ error: 'Mapa mental cerrado' }, { status: 400 });
    }

    const userId = (session.user as any).id;
    const userName = (session.user as any).name || 'Usuario';

    // Crear nuevo nodo
    const newNode = {
      id: `node-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      label: label.trim(),
      parentId: parentId || null,
      userId,
      userName
    };

    message.commandData.nodes.push(newNode);
    message.markModified('commandData');
    await message.save();

    // Retornar éxito inmediatamente después de guardar
    // El populate y Pusher se hacen en segundo plano para mejorar respuesta
    const savedMessage = message.toObject();

    // Trigger Pusher en segundo plano (no bloqueante)
    (async () => {
      try {
        const populatedMessage = await ChannelMessage.findById(message._id)
          .populate('userId', 'name email')
          .populate('mentions', 'name email')
          .populate('priorityMentions', 'title status completionPercentage userId')
          .populate('reactions.userId', 'name')
          .populate('pinnedBy', 'name')
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
  } catch (error: any) {
    console.error('Error in mind-map add:', error?.message || error);
    console.error('Error stack:', error?.stack);
    return NextResponse.json({
      error: 'Error al agregar nodo',
      details: process.env.NODE_ENV === 'development' ? error?.message : undefined
    }, { status: 500 });
  }
}

/**
 * DELETE /api/projects/[id]/messages/[messageId]/mind-map
 * Eliminar nodo y sus hijos
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

    const { nodeId } = await request.json();

    const message = await ChannelMessage.findById(params.messageId);
    if (!message) {
      return NextResponse.json({ error: 'Mensaje no encontrado' }, { status: 404 });
    }

    if (message.commandType !== 'mind-map') {
      return NextResponse.json({ error: 'No es un mind-map' }, { status: 400 });
    }

    if (message.commandData.closed) {
      return NextResponse.json({ error: 'Mapa mental cerrado' }, { status: 400 });
    }

    const userId = (session.user as any).id;

    // Encontrar nodo
    const node = message.commandData.nodes.find((n: any) => n.id === nodeId);
    if (!node) {
      return NextResponse.json({ error: 'Nodo no encontrado' }, { status: 404 });
    }

    // Verificar permisos
    if (node.userId !== userId && (session.user as any).role !== 'ADMIN') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    }

    // Encontrar todos los nodos hijos recursivamente
    const getNodesToDelete = (parentId: string): string[] => {
      const children = message.commandData.nodes.filter((n: any) => n.parentId === parentId);
      let toDelete = [parentId];
      children.forEach((child: any) => {
        toDelete = toDelete.concat(getNodesToDelete(child.id));
      });
      return toDelete;
    };

    const nodesToDelete = getNodesToDelete(nodeId);

    // Eliminar nodos
    message.commandData.nodes = message.commandData.nodes.filter(
      (n: any) => !nodesToDelete.includes(n.id)
    );

    message.markModified('commandData');
    await message.save();

    // Retornar éxito inmediatamente después de guardar
    const savedMessage = message.toObject();

    // Trigger Pusher en segundo plano (no bloqueante)
    (async () => {
      try {
        const populatedMessage = await ChannelMessage.findById(message._id)
          .populate('userId', 'name email')
          .populate('mentions', 'name email')
          .populate('priorityMentions', 'title status completionPercentage userId')
          .populate('reactions.userId', 'name')
          .populate('pinnedBy', 'name')
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
  } catch (error: any) {
    console.error('Error in mind-map delete:', error?.message || error);
    return NextResponse.json({ error: 'Error al eliminar nodo' }, { status: 500 });
  }
}

/**
 * PATCH /api/projects/[id]/messages/[messageId]/mind-map
 * Cerrar mapa mental (solo creador)
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

    const message = await ChannelMessage.findById(params.messageId);
    if (!message) {
      return NextResponse.json({ error: 'Mensaje no encontrado' }, { status: 404 });
    }

    if (message.commandType !== 'mind-map') {
      return NextResponse.json({ error: 'No es un mind-map' }, { status: 400 });
    }

    const userId = (session.user as any).id;
    if (message.commandData.createdBy !== userId && (session.user as any).role !== 'ADMIN') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    }

    message.commandData.closed = true;
    message.markModified('commandData');
    await message.save();

    // Retornar éxito inmediatamente después de guardar
    const savedMessage = message.toObject();

    // Notificar a participantes en segundo plano
    notifyDynamicClosed({
      projectId: params.id,
      channelId: message.channelId,
      messageId: params.messageId,
      commandType: 'mind-map',
      commandData: message.commandData,
      closedByUserId: userId,
      closedByUserName: (session.user as any).name || 'Usuario'
    }).catch(err => console.error('Error notifying dynamic closed:', err));

    // Trigger Pusher en segundo plano (no bloqueante)
    (async () => {
      try {
        const populatedMessage = await ChannelMessage.findById(message._id)
          .populate('userId', 'name email')
          .populate('mentions', 'name email')
          .populate('priorityMentions', 'title status completionPercentage userId')
          .populate('reactions.userId', 'name')
          .populate('pinnedBy', 'name')
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
  } catch (error: any) {
    console.error('Error closing mind-map:', error?.message || error);
    return NextResponse.json({ error: 'Error al cerrar' }, { status: 500 });
  }
}
