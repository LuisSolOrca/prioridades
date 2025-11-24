import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import connectDB from '@/lib/mongodb';
import ChannelMessage from '@/models/ChannelMessage';
import { triggerPusherEvent } from '@/lib/pusher-server';
import { trackChannelUsage } from '@/lib/gamification';

/**
 * POST /api/projects/[id]/messages/[messageId]/vote-points
 * Maneja acciones en votación por puntos
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
    const { action, votes } = body;

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

    // Verificar que sea vote-points
    if (message.commandType !== 'vote-points' || !message.commandData) {
      return NextResponse.json(
        { error: 'Este mensaje no es una votación por puntos' },
        { status: 400 }
      );
    }

    // Verificar que no esté cerrado
    if (message.commandData.closed) {
      return NextResponse.json(
        { error: 'Esta votación está cerrada' },
        { status: 400 }
      );
    }

    // Procesar acción
    switch (action) {
      case 'vote':
        // Enviar votos (solo si no ha votado antes)
        if (!votes || typeof votes !== 'object') {
          return NextResponse.json(
            { error: 'Votos inválidos' },
            { status: 400 }
          );
        }

        // Verificar que el usuario no haya votado antes
        const hasVoted = message.commandData.userVotes.some(
          (v: any) => v.userId === session.user.id
        );

        if (hasVoted) {
          return NextResponse.json(
            { error: 'Ya has votado' },
            { status: 400 }
          );
        }

        // Verificar que los puntos no excedan el total
        const totalPoints = Object.values(votes).reduce((sum: number, p: any) => sum + p, 0);
        if (totalPoints > message.commandData.totalPoints) {
          return NextResponse.json(
            { error: 'Has excedido el total de puntos disponibles' },
            { status: 400 }
          );
        }

        // Agregar voto del usuario
        message.commandData.userVotes.push({
          userId: session.user.id,
          name: session.user.name || 'Usuario',
          votes
        });

        // Actualizar totales por opción
        Object.entries(votes).forEach(([optionIndex, points]) => {
          const idx = parseInt(optionIndex);
          if (message.commandData.options[idx]) {
            message.commandData.options[idx].points += points as number;
          }
        });

        // Trackear participación en comando interactivo
        try {
          await trackChannelUsage(session.user.id, 'interactiveCommandParticipation');
        } catch (gamificationError) {
          console.error('Error tracking gamification:', gamificationError);
        }
        break;

      case 'close':
        // Cerrar votación (solo el creador)
        if (message.commandData.createdBy !== session.user.id) {
          return NextResponse.json(
            { error: 'Solo el creador puede cerrar la votación' },
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

    
    // Poblar el mensaje para enviarlo completo
    const populatedMessage = await ChannelMessage.findById(message._id)
      .populate('userId', 'name email')
      .populate('mentions', 'name email')
      .populate('priorityMentions', 'title status completionPercentage userId')
      .populate('reactions.userId', 'name')
      .populate('pinnedBy', 'name')
      .lean();

    // Emitir evento de Pusher para actualización en tiempo real
    try {
      await triggerPusherEvent(
        `presence-channel-${message.channelId}`,
        'message-updated',
        populatedMessage
      );
    } catch (pusherError) {
      console.error('Error triggering Pusher event:', pusherError);
    }


    return NextResponse.json({
      success: true,
      commandData: message.commandData
    });
  } catch (error) {
    console.error('Error in vote-points action:', error);
    return NextResponse.json(
      { error: 'Error al procesar la acción' },
      { status: 500 }
    );
  }
}
