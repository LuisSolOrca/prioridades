import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import connectDB from '@/lib/mongodb';
import ChannelMessage from '@/models/ChannelMessage';
import { triggerPusherEvent } from '@/lib/pusher-server';

/**
 * POST /api/projects/[id]/messages/[messageId]/brainwriting
 * Unirse, iniciar ronda, o agregar ideas
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
    const { action, ideas, round } = body;

    const message = await ChannelMessage.findById(params.messageId);
    if (!message) {
      return NextResponse.json({ error: 'Mensaje no encontrado' }, { status: 404 });
    }

    if (message.commandType !== 'brainwriting') {
      return NextResponse.json({ error: 'No es Brainwriting' }, { status: 400 });
    }

    if (message.commandData.closed) {
      return NextResponse.json({ error: 'Brainwriting cerrado' }, { status: 400 });
    }

    const userId = (session.user as any).id;
    const userName = (session.user as any).name || 'Usuario';

    if (action === 'join') {
      // Verificar que no esté ya unido y no haya más de 6 participantes
      if (!message.commandData.participants) {
        message.commandData.participants = [];
      }

      const alreadyJoined = message.commandData.participants.some((p: any) => p.oderId === userId);
      if (alreadyJoined) {
        return NextResponse.json({ error: 'Ya estás unido' }, { status: 400 });
      }

      if (message.commandData.participants.length >= 6) {
        return NextResponse.json({ error: 'Máximo 6 participantes' }, { status: 400 });
      }

      message.commandData.participants.push({ oderId: userId, oderName: userName });

    } else if (action === 'startRound') {
      // Solo el creador puede iniciar rondas
      if (message.commandData.createdBy !== userId) {
        return NextResponse.json({ error: 'Solo el creador puede iniciar rondas' }, { status: 403 });
      }

      if (!message.commandData.rounds) {
        message.commandData.rounds = [];
      }

      const nextRound = message.commandData.currentRound + 1;
      if (nextRound > 6) {
        return NextResponse.json({ error: 'Máximo 6 rondas' }, { status: 400 });
      }

      message.commandData.rounds.push({
        round: nextRound,
        startedAt: new Date().toISOString()
      });
      message.commandData.currentRound = nextRound;

    } else if (action === 'submitIdeas') {
      // Verificar que el usuario esté unido
      const isParticipant = message.commandData.participants?.some((p: any) => p.oderId === userId);
      if (!isParticipant) {
        return NextResponse.json({ error: 'Debes unirte primero' }, { status: 400 });
      }

      if (!ideas || !Array.isArray(ideas) || ideas.length === 0) {
        return NextResponse.json({ error: 'No hay ideas' }, { status: 400 });
      }

      if (!message.commandData.ideas) {
        message.commandData.ideas = [];
      }

      // Verificar que no haya enviado más de 3 ideas en esta ronda
      const userIdeasThisRound = message.commandData.ideas.filter(
        (i: any) => i.userId === userId && i.round === round
      );

      if (userIdeasThisRound.length >= message.commandData.ideasPerRound) {
        return NextResponse.json({ error: 'Ya enviaste tus ideas para esta ronda' }, { status: 400 });
      }

      const remainingSlots = message.commandData.ideasPerRound - userIdeasThisRound.length;
      const ideasToAdd = ideas.slice(0, remainingSlots);

      for (const ideaText of ideasToAdd) {
        if (ideaText?.trim()) {
          const ideaId = `idea-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
          message.commandData.ideas.push({
            id: ideaId,
            text: ideaText.trim(),
            userId,
            userName,
            round
          });
        }
      }

    } else {
      return NextResponse.json({ error: 'Acción inválida' }, { status: 400 });
    }

    message.markModified('commandData');
    await message.save();

    const savedMessage = message.toObject();

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

    return NextResponse.json(savedMessage);
  } catch (error) {
    console.error('Error in brainwriting:', error);
    return NextResponse.json({ error: 'Error en brainwriting' }, { status: 500 });
  }
}

/**
 * DELETE /api/projects/[id]/messages/[messageId]/brainwriting
 * Cerrar brainwriting (solo creador)
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

    const message = await ChannelMessage.findById(params.messageId);
    if (!message) {
      return NextResponse.json({ error: 'Mensaje no encontrado' }, { status: 404 });
    }

    if (message.commandType !== 'brainwriting') {
      return NextResponse.json({ error: 'No es Brainwriting' }, { status: 400 });
    }

    const userId = (session.user as any).id;
    if (message.commandData.createdBy !== userId && (session.user as any).role !== 'ADMIN') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    }

    message.commandData.closed = true;
    message.markModified('commandData');
    await message.save();

    const savedMessage = message.toObject();

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

    return NextResponse.json(savedMessage);
  } catch (error) {
    console.error('Error closing brainwriting:', error);
    return NextResponse.json({ error: 'Error al cerrar' }, { status: 500 });
  }
}
