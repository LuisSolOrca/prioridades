import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import connectDB from '@/lib/mongodb';
import ChannelMessage from '@/models/ChannelMessage';
import { triggerPusherEvent } from '@/lib/pusher-server';

/**
 * POST /api/projects/[id]/messages/[messageId]/checklist
 * Maneja acciones en un checklist
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
    const { action, itemId, text } = body;

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

    // Verificar que sea checklist
    if (message.commandType !== 'checklist' || !message.commandData) {
      return NextResponse.json(
        { error: 'Este mensaje no es un checklist' },
        { status: 400 }
      );
    }

    // Procesar acción
    switch (action) {
      case 'toggle':
        // Marcar/desmarcar item
        if (!itemId) {
          return NextResponse.json(
            { error: 'ID de item requerido' },
            { status: 400 }
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
        item.checked = !item.checked;

        if (item.checked) {
          item.checkedBy = {
            id: session.user.id,
            name: session.user.name || 'Usuario'
          };
        } else {
          item.checkedBy = undefined;
        }

        message.commandData.items[itemIndex] = item;
        break;

      case 'add':
        // Agregar nuevo item
        if (!text || !text.trim()) {
          return NextResponse.json(
            { error: 'Texto del item requerido' },
            { status: 400 }
          );
        }

        const newItem = {
          id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
          text: text.trim(),
          checked: false
        };

        if (!message.commandData.items) {
          message.commandData.items = [];
        }

        message.commandData.items.push(newItem);
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
    console.error('Error in checklist action:', error);
    return NextResponse.json(
      { error: 'Error al procesar la acción' },
      { status: 500 }
    );
  }
}
