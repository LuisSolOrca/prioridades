import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import connectDB from '@/lib/mongodb';
import ChannelMessage from '@/models/ChannelMessage';
import { triggerPusherEvent } from '@/lib/pusher-server';
import { notifyDynamicClosed } from '@/lib/dynamicNotifications';

/**
 * POST /api/projects/[id]/messages/[messageId]/brainstorm
 * Maneja acciones en una sesión de brainstorming
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
    const { action, text, ideaId } = body;

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

    // Verificar que sea un brainstorm
    if (message.commandType !== 'brainstorm' || !message.commandData) {
      return NextResponse.json(
        { error: 'Este mensaje no es una sesión de brainstorming' },
        { status: 400 }
      );
    }

    // Verificar que el brainstorm no esté cerrado (excepto para close action)
    if (message.commandData.closed && action !== 'close') {
      return NextResponse.json(
        { error: 'Esta sesión está cerrada' },
        { status: 400 }
      );
    }

    // Procesar acción
    switch (action) {
      case 'add':
        // Agregar nueva idea
        if (!text || !text.trim()) {
          return NextResponse.json(
            { error: 'Texto de idea requerido' },
            { status: 400 }
          );
        }

        const newIdea = {
          id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
          text: text.trim(),
          author: {
            id: session.user.id,
            name: session.user.name || 'Usuario'
          },
          votes: [],
          createdAt: new Date()
        };

        message.commandData.ideas = [
          ...(message.commandData.ideas || []),
          newIdea
        ];
        break;

      case 'vote':
        // Votar/desvotar una idea
        if (!ideaId) {
          return NextResponse.json(
            { error: 'ID de idea requerido' },
            { status: 400 }
          );
        }

        const ideaIndex = message.commandData.ideas.findIndex(
          (i: any) => i.id === ideaId
        );

        if (ideaIndex === -1) {
          return NextResponse.json(
            { error: 'Idea no encontrada' },
            { status: 404 }
          );
        }

        const idea = message.commandData.ideas[ideaIndex];
        const hasVoted = idea.votes && idea.votes.includes(session.user.id);

        if (hasVoted) {
          // Quitar voto
          idea.votes = idea.votes.filter((v: string) => v !== session.user.id);
        } else {
          // Agregar voto
          idea.votes = [...(idea.votes || []), session.user.id];
        }

        message.commandData.ideas[ideaIndex] = idea;
        break;

      case 'close':
        // Cerrar sesión (solo el creador)
        if (message.commandData.createdBy !== session.user.id) {
          return NextResponse.json(
            { error: 'Solo el creador puede cerrar la sesión' },
            { status: 403 }
          );
        }

        message.commandData.closed = true;

        // Notificar a participantes en segundo plano
        notifyDynamicClosed({
          projectId: params.id,
          channelId: message.channelId,
          messageId: params.messageId,
          commandType: 'brainstorm',
          commandData: message.commandData,
          closedByUserId: session.user.id,
          closedByUserName: session.user.name || 'Usuario'
        }).catch(err => console.error('Error notifying dynamic closed:', err));
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

    // Retornar éxito inmediatamente después de guardar
    const savedCommandData = message.commandData;

    // Pusher en segundo plano (no bloqueante)
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
    console.error('Error in brainstorm action:', error);
    return NextResponse.json(
      { error: 'Error al procesar la acción' },
      { status: 500 }
    );
  }
}
