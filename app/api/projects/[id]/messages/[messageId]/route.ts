import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import connectDB from '@/lib/mongodb';
import ChannelMessage from '@/models/ChannelMessage';
import Priority from '@/models/Priority';
import { triggerPusherEvent } from '@/lib/pusher-server';

/**
 * PUT /api/projects/[id]/messages/[messageId]
 * Edita un mensaje del canal
 */
export async function PUT(
  request: Request,
  { params }: { params: { id: string; messageId: string } }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    await connectDB();

    const body = await request.json();
    const { content } = body;

    if (!content || content.trim().length === 0) {
      return NextResponse.json(
        { error: 'El contenido del mensaje es requerido' },
        { status: 400 }
      );
    }

    // Buscar el mensaje (verificar que pertenece al proyecto)
    const message = await ChannelMessage.findOne({
      _id: params.messageId,
      projectId: params.id,
      isDeleted: false
    });

    if (!message) {
      return NextResponse.json(
        { error: 'Mensaje no encontrado' },
        { status: 404 }
      );
    }

    // Verificar que el usuario sea el autor o admin
    if (message.userId.toString() !== session.user.id && session.user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'No tienes permiso para editar este mensaje' },
        { status: 403 }
      );
    }

    // Re-detectar menciones de prioridades
    const priorityMentionsIds: string[] = [];
    try {
      // Patrón 1: #P-{ObjectId}
      const idPattern = /#P-([a-f0-9]{24})/gi;
      const idMatches = content.match(idPattern);
      if (idMatches) {
        for (const match of idMatches) {
          const priorityId = match.substring(3);
          const priority = await Priority.findOne({
            _id: priorityId,
            projectId: params.id
          }).lean();
          if (priority && !priorityMentionsIds.includes(priorityId)) {
            priorityMentionsIds.push(priorityId);
          }
        }
      }

      // Patrón 2: #titulo-de-prioridad
      const titlePattern = /#([\w\-áéíóúñÁÉÍÓÚÑ]+(?:\-[\w\-áéíóúñÁÉÍÓÚÑ]+)*)/gi;
      const titleMatches = content.match(titlePattern);
      if (titleMatches) {
        for (const match of titleMatches) {
          if (match.match(/^#P-[a-f0-9]{24}$/i)) continue;

          const searchTitle = match.substring(1).replace(/-/g, ' ');
          const priority = await Priority.findOne({
            projectId: params.id,
            title: { $regex: new RegExp(searchTitle, 'i') }
          }).lean();
          if (priority && !priorityMentionsIds.includes(priority._id.toString())) {
            priorityMentionsIds.push(priority._id.toString());
          }
        }
      }
    } catch (err) {
      console.error('Error detecting priority mentions:', err);
    }

    // Actualizar mensaje
    message.content = content.trim();
    message.priorityMentions = priorityMentionsIds as any;
    message.isEdited = true;
    await message.save();

    const savedMessage = message.toObject();
    const channelId = message.channelId;

    // Pusher en background (no bloqueante)
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
          `presence-channel-${channelId}`,
          'message-updated',
          populatedMessage
        );
      } catch (pusherError) {
        console.error('Error triggering Pusher event:', pusherError);
      }
    })();

    return NextResponse.json(savedMessage);
  } catch (error) {
    console.error('Error updating message:', error);
    return NextResponse.json(
      { error: 'Error actualizando mensaje' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/projects/[id]/messages/[messageId]
 * Elimina (marca como eliminado) un mensaje del canal
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

    // Buscar el mensaje (verificar que pertenece al proyecto)
    const message = await ChannelMessage.findOne({
      _id: params.messageId,
      projectId: params.id
    });

    if (!message) {
      return NextResponse.json(
        { error: 'Mensaje no encontrado' },
        { status: 404 }
      );
    }

    // Verificar que el usuario sea el autor o admin
    if (message.userId.toString() !== session.user.id && session.user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'No tienes permiso para eliminar este mensaje' },
        { status: 403 }
      );
    }

    // Marcar como eliminado en lugar de eliminar físicamente
    message.isDeleted = true;
    message.content = '[Mensaje eliminado]';
    const channelId = message.channelId;
    const messageId = message._id;
    await message.save();

    // Si es una respuesta, decrementar contador en el mensaje padre
    if (message.parentMessageId) {
      await ChannelMessage.findByIdAndUpdate(message.parentMessageId, {
        $inc: { replyCount: -1 }
      });
    }

    // Notificar a otros usuarios que el mensaje fue eliminado
    (async () => {
      try {
        const populatedMessage = await ChannelMessage.findById(messageId)
          .populate('userId', 'name email')
          .lean();

        await triggerPusherEvent(
          `presence-channel-${channelId}`,
          'message-deleted',
          { messageId: messageId.toString(), message: populatedMessage }
        );
      } catch (pusherError) {
        console.error('Error triggering Pusher event:', pusherError);
      }
    })();

    return NextResponse.json({ message: 'Mensaje eliminado correctamente' });
  } catch (error) {
    console.error('Error deleting message:', error);
    return NextResponse.json(
      { error: 'Error eliminando mensaje' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/projects/[id]/messages/[messageId]
 * Actualiza el commandData de un mensaje (para widgets interactivos)
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

    const body = await request.json();
    const { commandData } = body;

    if (!commandData) {
      return NextResponse.json(
        { error: 'commandData es requerido' },
        { status: 400 }
      );
    }

    // Buscar el mensaje (verificar que pertenece al proyecto)
    const message = await ChannelMessage.findOne({
      _id: params.messageId,
      projectId: params.id,
      isDeleted: false
    });

    if (!message) {
      return NextResponse.json(
        { error: 'Mensaje no encontrado' },
        { status: 404 }
      );
    }

    // Actualizar solo commandData
    message.commandData = commandData;
    await message.save();

    const channelId = message.channelId;

    // Pusher en background (no bloqueante)
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
          `presence-channel-${channelId}`,
          'message-updated',
          populatedMessage
        );
      } catch (pusherError) {
        console.error('Error triggering Pusher event:', pusherError);
      }
    })();

    return NextResponse.json({ success: true, message: 'CommandData actualizado' });
  } catch (error) {
    console.error('Error updating commandData:', error);
    return NextResponse.json(
      { error: 'Error actualizando commandData' },
      { status: 500 }
    );
  }
}
