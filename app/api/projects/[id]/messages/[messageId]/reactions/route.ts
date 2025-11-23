import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import connectDB from '@/lib/mongodb';
import ChannelMessage from '@/models/ChannelMessage';
import { trackChannelUsage } from '@/lib/gamification';

/**
 * POST /api/projects/[id]/messages/[messageId]/reactions
 * Agrega una reacción a un mensaje
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
    const { emoji } = body;

    if (!emoji) {
      return NextResponse.json(
        { error: 'El emoji es requerido' },
        { status: 400 }
      );
    }

    // Buscar el mensaje
    const message = await ChannelMessage.findById(params.messageId);

    if (!message) {
      return NextResponse.json(
        { error: 'Mensaje no encontrado' },
        { status: 404 }
      );
    }

    // Verificar si el usuario ya tiene una reacción con este emoji
    const existingReaction = message.reactions.find(
      (r: any) => r.userId.toString() === session.user.id && r.emoji === emoji
    );

    if (existingReaction) {
      return NextResponse.json(
        { error: 'Ya has reaccionado con este emoji' },
        { status: 400 }
      );
    }

    // Agregar reacción
    message.reactions.push({
      userId: session.user.id as any,
      emoji,
      createdAt: new Date()
    });

    await message.save();

    // Trackear reacción recibida para gamificación (del autor del mensaje, no quien reacciona)
    try {
      if (message.userId.toString() !== session.user.id) {
        await trackChannelUsage(message.userId.toString(), 'reactionReceived');
      }
    } catch (gamificationError) {
      console.error('Error tracking reaction gamification:', gamificationError);
      // No fallar si la gamificación falla
    }

    // Poblar y devolver
    const populatedMessage = await ChannelMessage.findById(message._id)
      .populate('userId', 'name email')
      .populate('reactions.userId', 'name')
      .lean();

    return NextResponse.json(populatedMessage);
  } catch (error) {
    console.error('Error adding reaction:', error);
    return NextResponse.json(
      { error: 'Error agregando reacción' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/projects/[id]/messages/[messageId]/reactions
 * Elimina una reacción de un mensaje
 */
export async function DELETE(
  request: Request,
  { params }: { params: { id: string; messageId: string } }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    await connectDB();

    const { searchParams } = new URL(request.url);
    const emoji = searchParams.get('emoji');

    if (!emoji) {
      return NextResponse.json(
        { error: 'El emoji es requerido' },
        { status: 400 }
      );
    }

    // Buscar el mensaje
    const message = await ChannelMessage.findById(params.messageId);

    if (!message) {
      return NextResponse.json(
        { error: 'Mensaje no encontrado' },
        { status: 404 }
      );
    }

    // Eliminar reacción del usuario con este emoji
    message.reactions = message.reactions.filter(
      (r: any) => !(r.userId.toString() === session.user.id && r.emoji === emoji)
    );

    await message.save();

    // Poblar y devolver
    const populatedMessage = await ChannelMessage.findById(message._id)
      .populate('userId', 'name email')
      .populate('reactions.userId', 'name')
      .lean();

    return NextResponse.json(populatedMessage);
  } catch (error) {
    console.error('Error removing reaction:', error);
    return NextResponse.json(
      { error: 'Error eliminando reacción' },
      { status: 500 }
    );
  }
}
