import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import connectDB from '@/lib/mongodb';
import ChannelMessage from '@/models/ChannelMessage';
import { triggerPusherEvent } from '@/lib/pusher-server';

/**
 * POST /api/projects/[id]/messages/[messageId]/opportunity-tree
 * Agregar oportunidad o solución
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

    const { type, text, opportunityId } = await request.json();

    if (!type || !text?.trim()) {
      return NextResponse.json(
        { error: 'Datos inválidos' },
        { status: 400 }
      );
    }

    const message = await ChannelMessage.findById(params.messageId);
    if (!message) {
      return NextResponse.json({ error: 'Mensaje no encontrado' }, { status: 404 });
    }

    if (message.commandType !== 'opportunity-tree') {
      return NextResponse.json({ error: 'No es un Árbol de Oportunidades' }, { status: 400 });
    }

    if (message.commandData.closed) {
      return NextResponse.json({ error: 'Árbol cerrado' }, { status: 400 });
    }

    const userId = (session.user as any).id;
    const userName = (session.user as any).name || 'Usuario';

    if (type === 'opportunity') {
      // Agregar nueva oportunidad
      const newOpportunity = {
        id: Date.now().toString(),
        text: text.trim(),
        userId,
        userName,
        children: []
      };
      message.commandData.opportunities.push(newOpportunity);
    } else if (type === 'solution' && opportunityId) {
      // Agregar solución a una oportunidad
      const opportunity = message.commandData.opportunities.find((o: any) => o.id === opportunityId);
      if (!opportunity) {
        return NextResponse.json({ error: 'Oportunidad no encontrada' }, { status: 400 });
      }

      if (!opportunity.children) {
        opportunity.children = [];
      }

      opportunity.children.push({
        id: Date.now().toString(),
        text: text.trim(),
        userId,
        userName
      });
    }

    message.markModified('commandData');
    await message.save();

    const savedMessage = message.toObject();

    (async () => {
      try {
        const populatedMessage = await ChannelMessage.findById(message._id)
          .populate('userId', 'name email')
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
    console.error('Error in opportunity-tree add:', error);
    return NextResponse.json({ error: 'Error al agregar' }, { status: 500 });
  }
}

/**
 * PATCH /api/projects/[id]/messages/[messageId]/opportunity-tree
 * Eliminar oportunidad o solución
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

    const { type, opportunityId, solutionId } = await request.json();

    const message = await ChannelMessage.findById(params.messageId);
    if (!message) {
      return NextResponse.json({ error: 'Mensaje no encontrado' }, { status: 404 });
    }

    if (message.commandType !== 'opportunity-tree') {
      return NextResponse.json({ error: 'No es un Árbol de Oportunidades' }, { status: 400 });
    }

    if (message.commandData.closed) {
      return NextResponse.json({ error: 'Árbol cerrado' }, { status: 400 });
    }

    const userId = (session.user as any).id;

    if (type === 'opportunity') {
      const oppIndex = message.commandData.opportunities.findIndex((o: any) => o.id === opportunityId);
      if (oppIndex === -1) {
        return NextResponse.json({ error: 'Oportunidad no encontrada' }, { status: 400 });
      }

      const opp = message.commandData.opportunities[oppIndex];
      if (opp.userId !== userId && (session.user as any).role !== 'ADMIN') {
        return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
      }

      message.commandData.opportunities.splice(oppIndex, 1);
    } else if (type === 'solution') {
      const opportunity = message.commandData.opportunities.find((o: any) => o.id === opportunityId);
      if (!opportunity) {
        return NextResponse.json({ error: 'Oportunidad no encontrada' }, { status: 400 });
      }

      const solIndex = opportunity.children?.findIndex((s: any) => s.id === solutionId);
      if (solIndex === -1 || solIndex === undefined) {
        return NextResponse.json({ error: 'Solución no encontrada' }, { status: 400 });
      }

      const sol = opportunity.children[solIndex];
      if (sol.userId !== userId && (session.user as any).role !== 'ADMIN') {
        return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
      }

      opportunity.children.splice(solIndex, 1);
    }

    message.markModified('commandData');
    await message.save();

    const savedMessage = message.toObject();

    (async () => {
      try {
        const populatedMessage = await ChannelMessage.findById(message._id)
          .populate('userId', 'name email')
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
    console.error('Error in opportunity-tree delete:', error);
    return NextResponse.json({ error: 'Error al eliminar' }, { status: 500 });
  }
}

/**
 * DELETE /api/projects/[id]/messages/[messageId]/opportunity-tree
 * Cerrar (solo creador)
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

    if (message.commandType !== 'opportunity-tree') {
      return NextResponse.json({ error: 'No es un Árbol de Oportunidades' }, { status: 400 });
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
    console.error('Error closing opportunity-tree:', error);
    return NextResponse.json({ error: 'Error al cerrar' }, { status: 500 });
  }
}
