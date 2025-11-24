import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import connectDB from '@/lib/mongodb';
import ChannelMessage from '@/models/ChannelMessage';
import { triggerPusherEvent } from '@/lib/pusher-server';
import { trackChannelUsage } from '@/lib/gamification';

/**
 * POST /api/projects/[id]/messages/[messageId]/fist-of-five
 * Maneja acciones en votación Fist of Five
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
    const { action, value } = body;

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

    // Verificar que sea fist-of-five
    if (message.commandType !== 'fist-of-five' || !message.commandData) {
      return NextResponse.json(
        { error: 'Este mensaje no es una votación Fist of Five' },
        { status: 400 }
      );
    }

    // Procesar acción
    switch (action) {
      case 'vote':
        // Verificar que no esté cerrado
        if (message.commandData.closed) {
          return NextResponse.json(
            { error: 'Esta votación está cerrada' },
            { status: 400 }
          );
        }

        // Validar valor (0-5)
        if (typeof value !== 'number' || value < 0 || value > 5) {
          return NextResponse.json(
            { error: 'Valor inválido. Debe ser entre 0 y 5' },
            { status: 400 }
          );
        }

        // Verificar que el usuario no haya votado antes
        const hasVoted = message.commandData.votes.some(
          (v: any) => v.userId === session.user.id
        );

        if (hasVoted) {
          return NextResponse.json(
            { error: 'Ya has votado' },
            { status: 400 }
          );
        }

        // Agregar voto del usuario
        message.commandData.votes.push({
          userId: session.user.id,
          name: session.user.name || 'Usuario',
          value
        });

        // Trackear participación en comando interactivo
        try {
          await trackChannelUsage(session.user.id, 'interactiveCommandParticipation');
        } catch (gamificationError) {
          console.error('Error tracking gamification:', gamificationError);
        }
        break;

      case 'toggle-closed':
        // Cerrar/abrir votación (solo el creador)
        if (message.commandData.createdBy !== session.user.id) {
          return NextResponse.json(
            { error: 'Solo el creador puede cerrar/abrir la votación' },
            { status: 403 }
          );
        }

        message.commandData.closed = !message.commandData.closed;
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
    console.error('Error in fist-of-five action:', error);
    return NextResponse.json(
      { error: 'Error al procesar la acción' },
      { status: 500 }
    );
  }
}
