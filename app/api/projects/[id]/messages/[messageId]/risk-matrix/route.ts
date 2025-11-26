import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import connectDB from '@/lib/mongodb';
import ChannelMessage from '@/models/ChannelMessage';
import { triggerPusherEvent } from '@/lib/pusher-server';

/**
 * POST /api/projects/[id]/messages/[messageId]/risk-matrix
 * Agregar riesgo a la matriz
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

    const { title, description, probability, impact, mitigation } = await request.json();

    if (!title?.trim() || probability === undefined || impact === undefined) {
      return NextResponse.json(
        { error: 'Datos inválidos' },
        { status: 400 }
      );
    }

    if (probability < 1 || probability > 5 || impact < 1 || impact > 5) {
      return NextResponse.json(
        { error: 'Probabilidad e impacto deben estar entre 1 y 5' },
        { status: 400 }
      );
    }

    const message = await ChannelMessage.findById(params.messageId);
    if (!message) {
      return NextResponse.json({ error: 'Mensaje no encontrado' }, { status: 404 });
    }

    if (message.commandType !== 'risk-matrix') {
      return NextResponse.json({ error: 'No es una Matriz de Riesgos' }, { status: 400 });
    }

    if (message.commandData.closed) {
      return NextResponse.json({ error: 'Matriz cerrada' }, { status: 400 });
    }

    const userId = (session.user as any).id;
    const userName = (session.user as any).name || 'Usuario';

    const riskId = `risk-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    message.commandData.risks.push({
      id: riskId,
      title: title.trim(),
      description: description?.trim() || '',
      probability,
      impact,
      score: probability * impact,
      mitigation: mitigation?.trim() || '',
      userId,
      userName
    });

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
    console.error('Error in risk-matrix add:', error);
    return NextResponse.json({ error: 'Error al agregar' }, { status: 500 });
  }
}

/**
 * PATCH /api/projects/[id]/messages/[messageId]/risk-matrix
 * Actualizar o eliminar riesgo
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

    const body = await request.json();
    const { action, riskId, probability, impact, mitigation } = body;

    const message = await ChannelMessage.findById(params.messageId);
    if (!message) {
      return NextResponse.json({ error: 'Mensaje no encontrado' }, { status: 404 });
    }

    if (message.commandType !== 'risk-matrix') {
      return NextResponse.json({ error: 'No es una Matriz de Riesgos' }, { status: 400 });
    }

    if (message.commandData.closed) {
      return NextResponse.json({ error: 'Matriz cerrada' }, { status: 400 });
    }

    const userId = (session.user as any).id;
    const riskIndex = message.commandData.risks.findIndex((r: any) => r.id === riskId);

    if (riskIndex === -1) {
      return NextResponse.json({ error: 'Riesgo no encontrado' }, { status: 400 });
    }

    const risk = message.commandData.risks[riskIndex];

    if (action === 'delete') {
      if (risk.userId !== userId && (session.user as any).role !== 'ADMIN') {
        return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
      }
      message.commandData.risks.splice(riskIndex, 1);
    } else if (action === 'update') {
      if (probability !== undefined) {
        risk.probability = probability;
      }
      if (impact !== undefined) {
        risk.impact = impact;
      }
      risk.score = risk.probability * risk.impact;
      if (mitigation !== undefined) {
        risk.mitigation = mitigation;
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
    console.error('Error in risk-matrix update:', error);
    return NextResponse.json({ error: 'Error al actualizar' }, { status: 500 });
  }
}

/**
 * DELETE /api/projects/[id]/messages/[messageId]/risk-matrix
 * Cerrar matriz (solo creador)
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

    if (message.commandType !== 'risk-matrix') {
      return NextResponse.json({ error: 'No es una Matriz de Riesgos' }, { status: 400 });
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
    console.error('Error closing risk-matrix:', error);
    return NextResponse.json({ error: 'Error al cerrar' }, { status: 500 });
  }
}
