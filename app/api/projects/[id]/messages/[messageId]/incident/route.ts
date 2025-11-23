import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import connectDB from '@/lib/mongodb';
import ChannelMessage from '@/models/ChannelMessage';

/**
 * POST /api/projects/[id]/messages/[messageId]/incident
 * Maneja acciones en un incident
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
    const { action, text } = body;

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

    // Verificar que sea incident
    if (message.commandType !== 'incident' || !message.commandData) {
      return NextResponse.json(
        { error: 'Este mensaje no es un incident' },
        { status: 400 }
      );
    }

    // Verificar que no esté resuelto (excepto para resolve action)
    if (message.commandData.resolved && action !== 'resolve') {
      return NextResponse.json(
        { error: 'Este incidente está resuelto' },
        { status: 400 }
      );
    }

    // Procesar acción
    switch (action) {
      case 'add-event':
        // Agregar evento al timeline
        if (!text || !text.trim()) {
          return NextResponse.json(
            { error: 'Texto del evento requerido' },
            { status: 400 }
          );
        }

        const newEvent = {
          id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
          text: text.trim(),
          author: {
            id: session.user.id,
            name: session.user.name || 'Usuario'
          },
          timestamp: new Date()
        };

        if (!message.commandData.timeline) {
          message.commandData.timeline = [];
        }

        message.commandData.timeline.push(newEvent);
        break;

      case 'resolve':
        // Marcar como resuelto (solo el creador)
        if (message.commandData.createdBy !== session.user.id) {
          return NextResponse.json(
            { error: 'Solo el creador puede resolver el incidente' },
            { status: 403 }
          );
        }

        message.commandData.resolved = true;
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

    return NextResponse.json({
      success: true,
      commandData: message.commandData
    });
  } catch (error) {
    console.error('Error in incident action:', error);
    return NextResponse.json(
      { error: 'Error al procesar la acción' },
      { status: 500 }
    );
  }
}
