import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import connectDB from '@/lib/mongodb';
import ChannelMessage from '@/models/ChannelMessage';
import { triggerPusherEvent } from '@/lib/pusher-server';

/**
 * POST /api/projects/[id]/messages/[messageId]/retrospective
 * Maneja acciones en una retrospectiva
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

    const body = await request.json();
    const { action, column, text, itemId } = body;

    if (!action) {
      return NextResponse.json(
        { error: 'Acción requerida' },
        { status: 400 }
      );
    }

    // Obtener el mensaje
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

    // Verificar que sea retrospective
    if (message.commandType !== 'retrospective' || !message.commandData) {
      return NextResponse.json(
        { error: 'Este mensaje no es una retrospectiva' },
        { status: 400 }
      );
    }

    // Verificar que no esté cerrada (excepto para close action)
    if (message.commandData.closed && action !== 'close') {
      return NextResponse.json(
        { error: 'Esta retrospectiva está cerrada' },
        { status: 400 }
      );
    }

    // Procesar acción
    switch (action) {
      case 'add':
        // Agregar nuevo item a una columna
        if (!column || !['well', 'improve', 'actions'].includes(column)) {
          return NextResponse.json(
            { error: 'Columna inválida' },
            { status: 400 }
          );
        }

        if (!text || !text.trim()) {
          return NextResponse.json(
            { error: 'Texto requerido' },
            { status: 400 }
          );
        }

        const newItem = {
          id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
          text: text.trim(),
          author: {
            id: session.user.id,
            name: session.user.name || 'Usuario'
          },
          votes: [],
          column
        };

        if (!message.commandData.items) {
          message.commandData.items = [];
        }

        message.commandData.items.push(newItem);
        break;

      case 'vote':
        // Votar/desvotar un item
        if (!itemId) {
          return NextResponse.json(
            { error: 'ID de item requerido' },
            { status: 400 }
          );
        }

        if (!message.commandData.items) {
          return NextResponse.json(
            { error: 'No hay items' },
            { status: 404 }
          );
        }

        const itemIndex = message.commandData.items.findIndex(
          (i: any) => i.id === itemId
        );

        if (itemIndex === -1) {
          return NextResponse.json(
            { error: 'Item no encontrado' },
            { status: 404 }
          );
        }

        const item = message.commandData.items[itemIndex];
        const hasVoted = item.votes && item.votes.includes(session.user.id);

        if (hasVoted) {
          // Quitar voto
          item.votes = item.votes.filter((v: string) => v !== session.user.id);
        } else {
          // Agregar voto
          item.votes = [...(item.votes || []), session.user.id];
        }

        message.commandData.items[itemIndex] = item;
        break;

      case 'close':
        // Cerrar retrospectiva (solo el creador)
        if (message.commandData.createdBy !== session.user.id) {
          return NextResponse.json(
            { error: 'Solo el creador puede cerrar la retrospectiva' },
            { status: 403 }
          );
        }

        message.commandData.closed = true;
        break;

      default:
        return NextResponse.json(
          { error: 'Acción no válida' },
          { status: 400 }
        );
    }

    // Marcar como modificado el campo Mixed
    message.markModified('commandData');
    await message.save();

    const savedCommandData = message.commandData;

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

    return NextResponse.json({
      success: true,
      commandData: savedCommandData
    });
  } catch (error) {
    console.error('Error in retrospective action:', error);
    return NextResponse.json(
      { error: 'Error al procesar la acción' },
      { status: 500 }
    );
  }
}
