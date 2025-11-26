import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import connectDB from '@/lib/mongodb';
import ChannelMessage from '@/models/ChannelMessage';
import { triggerPusherEvent } from '@/lib/pusher-server';
import { notifyDynamicClosed } from '@/lib/dynamicNotifications';

/**
 * POST /api/projects/[id]/messages/[messageId]/ranking
 * Maneja acciones en ranking colaborativo
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
    const { action, ranking } = body;

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

    // Verificar que sea ranking
    if (message.commandType !== 'ranking' || !message.commandData) {
      return NextResponse.json(
        { error: 'Este mensaje no es un ranking' },
        { status: 400 }
      );
    }

    // Verificar que no esté cerrado (excepto para close action)
    if (message.commandData.closed && action !== 'close') {
      return NextResponse.json(
        { error: 'Este ranking está cerrado' },
        { status: 400 }
      );
    }

    // Procesar acción
    switch (action) {
      case 'submit':
        // Enviar ranking del usuario
        if (!ranking || !Array.isArray(ranking)) {
          return NextResponse.json(
            { error: 'Ranking inválido' },
            { status: 400 }
          );
        }

        // Verificar que el usuario no haya enviado un ranking antes
        const hasRanked = message.commandData.rankings.some(
          (r: any) => r.userId === session.user.id
        );

        if (hasRanked) {
          return NextResponse.json(
            { error: 'Ya has enviado tu ranking' },
            { status: 400 }
          );
        }

        // Agregar ranking del usuario
        if (!message.commandData.rankings) {
          message.commandData.rankings = [];
        }

        message.commandData.rankings.push({
          userId: session.user.id,
          name: session.user.name || 'Usuario',
          ranking
        });
        break;

      case 'close':
        // Cerrar ranking (solo el creador)
        if (message.commandData.createdBy !== session.user.id) {
          return NextResponse.json(
            { error: 'Solo el creador puede cerrar el ranking' },
            { status: 403 }
          );
        }

        message.commandData.closed = true;

        // Notificar a participantes en segundo plano
        notifyDynamicClosed({
          projectId: params.id,
          channelId: message.channelId,
          messageId: params.messageId,
          commandType: 'ranking',
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
    console.error('Error in ranking action:', error);
    return NextResponse.json(
      { error: 'Error al procesar la acción' },
      { status: 500 }
    );
  }
}
