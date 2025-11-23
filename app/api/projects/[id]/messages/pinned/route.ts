import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import connectDB from '@/lib/mongodb';
import ChannelMessage from '@/models/ChannelMessage';
import Priority from '@/models/Priority';
import User from '@/models/User';

/**
 * GET /api/projects/[id]/messages/pinned
 * Obtiene los mensajes anclados del proyecto
 */
export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    await connectDB();

    // Buscar mensajes anclados
    const messages = await ChannelMessage.find({
      projectId: params.id,
      isPinned: true,
      isDeleted: false
    })
      .sort({ pinnedAt: -1 }) // Más recientes primero
      .limit(5) // Máximo 5 mensajes anclados
      .populate('userId', 'name email')
      .populate('mentions', 'name email')
      .populate('priorityMentions', 'title status completionPercentage userId')
      .populate('reactions.userId', 'name')
      .populate('pinnedBy', 'name')
      .lean();

    return NextResponse.json({ messages });
  } catch (error) {
    console.error('Error getting pinned messages:', error);
    return NextResponse.json(
      { error: 'Error obteniendo mensajes anclados' },
      { status: 500 }
    );
  }
}
