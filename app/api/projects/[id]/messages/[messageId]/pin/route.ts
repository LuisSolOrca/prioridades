import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import connectDB from '@/lib/mongodb';
import ChannelMessage from '@/models/ChannelMessage';
import Project from '@/models/Project';

/**
 * PUT /api/projects/[id]/messages/[messageId]/pin
 * Ancla un mensaje en el canal
 */
export async function PUT(
  request: Request,
  { params }: { params: { id: string; messageId: string } }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    await connectDB();

    // Verificar que el mensaje existe y pertenece al proyecto
    const message = await ChannelMessage.findOne({
      _id: params.messageId,
      projectId: params.id,
      isDeleted: false
    });

    if (!message) {
      return NextResponse.json({ error: 'Mensaje no encontrado' }, { status: 404 });
    }

    // Verificar que el usuario es el autor del mensaje o admin del proyecto
    const project = await Project.findById(params.id).lean();
    const isAuthor = message.userId.toString() === session.user.id;
    const isAdmin = project && (project as any).createdBy?.toString() === session.user.id;

    if (!isAuthor && !isAdmin) {
      return NextResponse.json(
        { error: 'No tienes permiso para anclar este mensaje' },
        { status: 403 }
      );
    }

    // Verificar límite de mensajes anclados (máximo 5 por proyecto)
    const pinnedCount = await ChannelMessage.countDocuments({
      projectId: params.id,
      isPinned: true,
      isDeleted: false
    });

    if (pinnedCount >= 5) {
      return NextResponse.json(
        { error: 'Máximo 5 mensajes anclados permitidos. Desancla uno primero.' },
        { status: 400 }
      );
    }

    // Anclar el mensaje
    message.isPinned = true;
    message.pinnedAt = new Date();
    message.pinnedBy = session.user.id as any;
    await message.save();

    // Poblar el mensaje actualizado
    const populatedMessage = await ChannelMessage.findById(message._id)
      .populate('userId', 'name email')
      .populate('mentions', 'name email')
      .populate('reactions.userId', 'name')
      .populate('pinnedBy', 'name')
      .lean();

    return NextResponse.json(populatedMessage);
  } catch (error) {
    console.error('Error pinning message:', error);
    return NextResponse.json(
      { error: 'Error anclando mensaje' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/projects/[id]/messages/[messageId]/pin
 * Desancla un mensaje del canal
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

    // Verificar que el mensaje existe
    const message = await ChannelMessage.findOne({
      _id: params.messageId,
      projectId: params.id,
      isDeleted: false
    });

    if (!message) {
      return NextResponse.json({ error: 'Mensaje no encontrado' }, { status: 404 });
    }

    // Verificar permisos
    const project = await Project.findById(params.id).lean();
    const isAuthor = message.userId.toString() === session.user.id;
    const isPinner = message.pinnedBy?.toString() === session.user.id;
    const isAdmin = project && (project as any).createdBy?.toString() === session.user.id;

    if (!isAuthor && !isPinner && !isAdmin) {
      return NextResponse.json(
        { error: 'No tienes permiso para desanclar este mensaje' },
        { status: 403 }
      );
    }

    // Desanclar el mensaje
    message.isPinned = false;
    message.pinnedAt = null as any;
    message.pinnedBy = null as any;
    await message.save();

    // Poblar el mensaje actualizado
    const populatedMessage = await ChannelMessage.findById(message._id)
      .populate('userId', 'name email')
      .populate('mentions', 'name email')
      .populate('reactions.userId', 'name')
      .lean();

    return NextResponse.json(populatedMessage);
  } catch (error) {
    console.error('Error unpinning message:', error);
    return NextResponse.json(
      { error: 'Error desanclando mensaje' },
      { status: 500 }
    );
  }
}
