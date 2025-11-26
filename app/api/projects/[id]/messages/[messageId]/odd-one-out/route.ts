import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import connectDB from '@/lib/mongodb';
import ChannelMessage from '@/models/ChannelMessage';
import { triggerPusherEvent } from '@/lib/pusher-server';
import { notifyDynamicClosed } from '@/lib/dynamicNotifications';

interface Vote {
  visibleUserId: string;
  userName: string;
  choice: 1 | 2;
}

interface Round {
  roundNumber: number;
  votes: Vote[];
  result?: 'no-winner' | 'winner';
  winnerId?: string;
  winnerName?: string;
}

/**
 * Determines if there's an odd one out
 * Returns the winner if exactly one person has a different vote than all others
 */
function findOddOneOut(votes: Vote[]): { winnerId: string; winnerName: string } | null {
  if (votes.length < 2) return null;

  const onesVotes = votes.filter(v => v.choice === 1);
  const twosVotes = votes.filter(v => v.choice === 2);

  // If exactly one person voted differently
  if (onesVotes.length === 1 && twosVotes.length > 1) {
    return { winnerId: onesVotes[0].visibleUserId, winnerName: onesVotes[0].userName };
  }
  if (twosVotes.length === 1 && onesVotes.length > 1) {
    return { winnerId: twosVotes[0].visibleUserId, winnerName: twosVotes[0].userName };
  }

  return null; // No odd one out (tie or all same)
}

/**
 * POST /api/projects/[id]/messages/[messageId]/odd-one-out
 * Submit a vote
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

    const { choice } = await request.json();

    if (![1, 2].includes(choice)) {
      return NextResponse.json(
        { error: 'Elección inválida. Debe ser 1 o 2' },
        { status: 400 }
      );
    }

    const message = await ChannelMessage.findById(params.messageId);
    if (!message) {
      return NextResponse.json({ error: 'Mensaje no encontrado' }, { status: 404 });
    }

    if (message.commandType !== 'odd-one-out') {
      return NextResponse.json({ error: 'No es un juego de disparejo' }, { status: 400 });
    }

    if (message.commandData.closed) {
      return NextResponse.json({ error: 'Juego cerrado' }, { status: 400 });
    }

    if (message.commandData.winner) {
      return NextResponse.json({ error: 'Ya hay un ganador' }, { status: 400 });
    }

    const oderId = (session.user as any).id;
    const userName = (session.user as any).name || 'Usuario';

    // Initialize rounds if needed
    if (!message.commandData.rounds || message.commandData.rounds.length === 0) {
      message.commandData.rounds = [{ roundNumber: 1, votes: [] }];
      message.commandData.currentRound = 1;
    }

    // Get current round
    const currentRoundIndex = message.commandData.rounds.findIndex(
      (r: Round) => r.roundNumber === message.commandData.currentRound
    );

    if (currentRoundIndex === -1) {
      return NextResponse.json({ error: 'Ronda no encontrada' }, { status: 400 });
    }

    const currentRound = message.commandData.rounds[currentRoundIndex];

    // Check if round already has a result
    if (currentRound.result) {
      return NextResponse.json({ error: 'La ronda ya terminó' }, { status: 400 });
    }

    // Check if user already voted in this round
    const existingVoteIndex = currentRound.votes.findIndex(
      (v: Vote) => v.visibleUserId === oderId
    );

    if (existingVoteIndex !== -1) {
      // Update existing vote
      currentRound.votes[existingVoteIndex].choice = choice;
    } else {
      // Add new vote
      currentRound.votes.push({
        visibleUserId: oderId,
        userName,
        choice
      });
    }

    message.markModified('commandData');
    await message.save();

    const savedMessage = message.toObject();

    // Trigger Pusher event
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
    console.error('Error in odd-one-out vote:', error);
    return NextResponse.json({ error: 'Error al votar' }, { status: 500 });
  }
}

/**
 * PATCH /api/projects/[id]/messages/[messageId]/odd-one-out
 * Check result or start new round
 */
export async function PATCH(
  request: Request,
  { params }: { params: { id: string; messageId: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    await connectDB();

    const { action } = await request.json();

    const message = await ChannelMessage.findById(params.messageId);
    if (!message) {
      return NextResponse.json({ error: 'Mensaje no encontrado' }, { status: 404 });
    }

    if (message.commandType !== 'odd-one-out') {
      return NextResponse.json({ error: 'No es un juego de disparejo' }, { status: 400 });
    }

    if (message.commandData.closed) {
      return NextResponse.json({ error: 'Juego cerrado' }, { status: 400 });
    }

    const userId = (session.user as any).id;

    if (action === 'check-result') {
      // Only creator can check result
      if (message.commandData.createdBy !== userId && (session.user as any).role !== 'ADMIN') {
        return NextResponse.json({ error: 'Solo el creador puede verificar el resultado' }, { status: 403 });
      }

      const currentRoundIndex = message.commandData.rounds.findIndex(
        (r: Round) => r.roundNumber === message.commandData.currentRound
      );

      if (currentRoundIndex === -1) {
        return NextResponse.json({ error: 'Ronda no encontrada' }, { status: 400 });
      }

      const currentRound = message.commandData.rounds[currentRoundIndex];

      if (currentRound.votes.length < 2) {
        return NextResponse.json({ error: 'Se necesitan al menos 2 participantes' }, { status: 400 });
      }

      // Find odd one out
      const oddOneOut = findOddOneOut(currentRound.votes);

      if (oddOneOut) {
        currentRound.result = 'winner';
        currentRound.winnerId = oddOneOut.winnerId;
        currentRound.winnerName = oddOneOut.winnerName;
        message.commandData.winner = {
          oderId: oddOneOut.winnerId,
          userName: oddOneOut.winnerName
        };
      } else {
        currentRound.result = 'no-winner';
      }

    } else if (action === 'new-round') {
      // Start a new round
      const newRoundNumber = message.commandData.currentRound + 1;
      message.commandData.rounds.push({
        roundNumber: newRoundNumber,
        votes: []
      });
      message.commandData.currentRound = newRoundNumber;

    } else {
      return NextResponse.json({ error: 'Acción inválida' }, { status: 400 });
    }

    message.markModified('commandData');
    await message.save();

    const savedMessage = message.toObject();

    // Trigger Pusher event
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
    console.error('Error in odd-one-out action:', error);
    return NextResponse.json({ error: 'Error en la acción' }, { status: 500 });
  }
}

/**
 * DELETE /api/projects/[id]/messages/[messageId]/odd-one-out
 * Close the game (only creator)
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

    if (message.commandType !== 'odd-one-out') {
      return NextResponse.json({ error: 'No es un juego de disparejo' }, { status: 400 });
    }

    const userId = (session.user as any).id;
    if (message.commandData.createdBy !== userId && (session.user as any).role !== 'ADMIN') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    }

    message.commandData.closed = true;
    message.markModified('commandData');
    await message.save();

    const savedMessage = message.toObject();

    // Notify participants
    notifyDynamicClosed({
      projectId: params.id,
      channelId: message.channelId,
      messageId: params.messageId,
      commandType: 'odd-one-out',
      commandData: message.commandData,
      closedByUserId: userId,
      closedByUserName: (session.user as any).name || 'Usuario'
    }).catch(err => console.error('Error notifying dynamic closed:', err));

    // Trigger Pusher event
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
    console.error('Error closing odd-one-out:', error);
    return NextResponse.json({ error: 'Error al cerrar' }, { status: 500 });
  }
}
