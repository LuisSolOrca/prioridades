import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import connectDB from '@/lib/mongodb';
import ChannelMessage from '@/models/ChannelMessage';
import { triggerPusherEvent } from '@/lib/pusher-server';
import { trackChannelUsage } from '@/lib/gamification';

/**
 * POST /api/projects/[id]/messages/[messageId]/estimation
 * Maneja acciones en una sesión de Planning Poker
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
    const { action, value, finalEstimate } = body;

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

    // Verificar que sea estimation poker
    if (message.commandType !== 'estimation-poker' || !message.commandData) {
      return NextResponse.json(
        { error: 'Este mensaje no es una sesión de estimation poker' },
        { status: 400 }
      );
    }

    // Verificar que no esté cerrado (excepto para close action)
    if (message.commandData.closed && action !== 'close') {
      return NextResponse.json(
        { error: 'Esta sesión está cerrada' },
        { status: 400 }
      );
    }

    // Procesar acción
    switch (action) {
      case 'estimate':
        // Agregar o actualizar estimación
        if (!value) {
          return NextResponse.json(
            { error: 'Valor de estimación requerido' },
            { status: 400 }
          );
        }

        const existingIndex = message.commandData.estimates.findIndex(
          (e: any) => e.userId === session.user.id
        );

        if (existingIndex >= 0) {
          // Actualizar estimación existente
          message.commandData.estimates[existingIndex] = {
            userId: session.user.id,
            name: session.user.name || 'Usuario',
            value,
            revealed: message.commandData.revealed || false
          };
        } else {
          // Agregar nueva estimación
          message.commandData.estimates.push({
            userId: session.user.id,
            name: session.user.name || 'Usuario',
            value,
            revealed: message.commandData.revealed || false
          });

          // Trackear participación en comando interactivo (solo si es nueva)
          try {
            await trackChannelUsage(session.user.id, 'interactiveCommandParticipation');
          } catch (gamificationError) {
            console.error('Error tracking gamification:', gamificationError);
          }
        }
        break;

      case 'reveal':
        // Revelar todas las cartas (solo el creador)
        if (message.commandData.createdBy !== session.user.id) {
          return NextResponse.json(
            { error: 'Solo el creador puede revelar las cartas' },
            { status: 403 }
          );
        }

        message.commandData.revealed = true;
        message.commandData.estimates = message.commandData.estimates.map((e: any) => ({
          ...e,
          revealed: true
        }));
        break;

      case 'finalize':
        // Establecer estimación final (solo el creador)
        if (message.commandData.createdBy !== session.user.id) {
          return NextResponse.json(
            { error: 'Solo el creador puede finalizar la estimación' },
            { status: 403 }
          );
        }

        if (!finalEstimate) {
          return NextResponse.json(
            { error: 'Estimación final requerida' },
            { status: 400 }
          );
        }

        message.commandData.finalEstimate = finalEstimate;
        message.commandData.closed = true;
        break;

      case 'reset':
        // Reiniciar votación (solo el creador)
        if (message.commandData.createdBy !== session.user.id) {
          return NextResponse.json(
            { error: 'Solo el creador puede reiniciar la votación' },
            { status: 403 }
          );
        }

        message.commandData.estimates = [];
        message.commandData.revealed = false;
        message.commandData.finalEstimate = null;
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
    console.error('Error in estimation action:', error);
    return NextResponse.json(
      { error: 'Error al procesar la acción' },
      { status: 500 }
    );
  }
}
