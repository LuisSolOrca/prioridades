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

    const { searchParams } = new URL(request.url);
    const channelId = searchParams.get('channelId');

    // Construir query
    const query: any = {
      projectId: params.id,
      isPinned: true,
      isDeleted: false
    };

    // Filtrar por canal si se proporciona
    if (channelId) {
      query.channelId = channelId;
    }

    // Buscar mensajes anclados
    const messages = await ChannelMessage.find(query)
      .sort({ pinnedAt: -1 }) // Más recientes primero
      .limit(5) // Máximo 5 mensajes anclados
      .populate('userId', 'name email')
      .populate('mentions', 'name email')
      .populate('priorityMentions', 'title status completionPercentage userId')
      .populate('reactions.userId', 'name')
      .populate('pinnedBy', 'name')
      .lean();

    // Manejar usuarios eliminados
    const messagesWithDeletedUsers = messages.map((msg: any) => {
      if (!msg.userId) {
        msg.userId = {
          _id: 'deleted',
          name: 'Usuario Eliminado',
          email: 'deleted@system.local'
        };
      }

      // Manejar reacciones con usuarios eliminados
      if (msg.reactions && msg.reactions.length > 0) {
        msg.reactions = msg.reactions.map((reaction: any) => {
          if (!reaction.userId) {
            reaction.userId = {
              _id: 'deleted',
              name: 'Usuario Eliminado'
            };
          }
          return reaction;
        });
      }

      // Manejar pinnedBy si el usuario fue eliminado
      if (!msg.pinnedBy) {
        msg.pinnedBy = {
          _id: 'deleted',
          name: 'Usuario Eliminado'
        };
      }

      return msg;
    });

    return NextResponse.json({ messages: messagesWithDeletedUsers });
  } catch (error) {
    console.error('Error getting pinned messages:', error);
    return NextResponse.json(
      { error: 'Error obteniendo mensajes anclados' },
      { status: 500 }
    );
  }
}
