import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import connectDB from '@/lib/mongodb';
import ChannelMessage from '@/models/ChannelMessage';
import { triggerPusherEvent } from '@/lib/pusher-server';
import { notifyDynamicClosed } from '@/lib/dynamicNotifications';

/**
 * POST /api/projects/[id]/messages/[messageId]/mood
 * Maneja acciones en mood check-in
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
    const { action, mood } = body;

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

    // Verificar que sea mood
    if (message.commandType !== 'mood' || !message.commandData) {
      return NextResponse.json(
        { error: 'Este mensaje no es un mood check-in' },
        { status: 400 }
      );
    }

    // Verificar que no esté cerrado (excepto para close action)
    if (message.commandData.closed && action !== 'close') {
      return NextResponse.json(
        { error: 'Este check-in está cerrado' },
        { status: 400 }
      );
    }

    // Procesar acción
    switch (action) {
      case 'select':
        // Seleccionar o cambiar mood
        if (!mood) {
          return NextResponse.json(
            { error: 'Mood requerido' },
            { status: 400 }
          );
        }

        if (!message.commandData.moods) {
          message.commandData.moods = [];
        }

        const existingIndex = message.commandData.moods.findIndex(
          (m: any) => m.userId === session.user.id
        );

        if (existingIndex >= 0) {
          // Actualizar mood existente
          message.commandData.moods[existingIndex] = {
            userId: session.user.id,
            name: session.user.name || 'Usuario',
            mood
          };
        } else {
          // Agregar nuevo mood
          message.commandData.moods.push({
            userId: session.user.id,
            name: session.user.name || 'Usuario',
            mood
          });
        }
        break;

      case 'close':
        // Cerrar check-in (solo el creador)
        if (message.commandData.createdBy !== session.user.id) {
          return NextResponse.json(
            { error: 'Solo el creador puede cerrar el check-in' },
            { status: 403 }
          );
        }

        message.commandData.closed = true;

        // Notificar a participantes en segundo plano
        notifyDynamicClosed({
          projectId: params.id,
          channelId: message.channelId,
          messageId: params.messageId,
          commandType: 'mood',
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
    console.error('Error in mood action:', error);
    return NextResponse.json(
      { error: 'Error al procesar la acción' },
      { status: 500 }
    );
  }
}
