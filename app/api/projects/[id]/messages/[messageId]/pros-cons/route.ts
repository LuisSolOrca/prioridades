import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import connectDB from '@/lib/mongodb';
import ChannelMessage from '@/models/ChannelMessage';
import { triggerPusherEvent } from '@/lib/pusher-server';

/**
 * POST /api/projects/[id]/messages/[messageId]/pros-cons
 * Maneja acciones en una tabla de pros y contras
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
    const { action, type, text } = body;

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

    // Verificar que sea pros-cons
    if (message.commandType !== 'pros-cons' || !message.commandData) {
      return NextResponse.json(
        { error: 'Este mensaje no es una tabla de pros y contras' },
        { status: 400 }
      );
    }

    // Procesar acción
    switch (action) {
      case 'add':
        // Agregar nuevo item a pros o cons
        if (!type || !['pro', 'con'].includes(type)) {
          return NextResponse.json(
            { error: 'Tipo inválido (debe ser "pro" o "con")' },
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
          }
        };

        const column = type === 'pro' ? 'pros' : 'cons';

        if (!message.commandData[column]) {
          message.commandData[column] = [];
        }

        message.commandData[column].push(newItem);
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
    console.error('Error in pros-cons action:', error);
    return NextResponse.json(
      { error: 'Error al procesar la acción' },
      { status: 500 }
    );
  }
}
