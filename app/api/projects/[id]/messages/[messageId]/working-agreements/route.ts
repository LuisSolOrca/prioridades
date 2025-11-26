import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import connectDB from '@/lib/mongodb';
import ChannelMessage from '@/models/ChannelMessage';
import { triggerPusherEvent } from '@/lib/pusher-server';
import { notifyDynamicClosed } from '@/lib/dynamicNotifications';

/**
 * POST /api/projects/[id]/messages/[messageId]/working-agreements
 * Agregar acuerdo a una categoría
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

    const { categoryId, text } = await request.json();

    if (!categoryId || !text?.trim()) {
      return NextResponse.json(
        { error: 'Datos inválidos' },
        { status: 400 }
      );
    }

    const message = await ChannelMessage.findById(params.messageId);
    if (!message) {
      return NextResponse.json({ error: 'Mensaje no encontrado' }, { status: 404 });
    }

    if (message.commandType !== 'working-agreements') {
      return NextResponse.json({ error: 'No es Working Agreements' }, { status: 400 });
    }

    if (message.commandData.closed) {
      return NextResponse.json({ error: 'Acuerdos cerrados' }, { status: 400 });
    }

    const userId = (session.user as any).id;
    const userName = (session.user as any).name || 'Usuario';

    const category = message.commandData.categories.find((c: any) => c.id === categoryId);
    if (!category) {
      return NextResponse.json({ error: 'Categoría no encontrada' }, { status: 400 });
    }

    const agreementId = `agreement-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    category.agreements.push({
      id: agreementId,
      text: text.trim(),
      userId,
      userName,
      approvals: []
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
    console.error('Error in working-agreements add:', error);
    return NextResponse.json({ error: 'Error al agregar' }, { status: 500 });
  }
}

/**
 * PATCH /api/projects/[id]/messages/[messageId]/working-agreements
 * Aprobar o eliminar acuerdo
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
    const { action, categoryId, agreementId } = body;

    const message = await ChannelMessage.findById(params.messageId);
    if (!message) {
      return NextResponse.json({ error: 'Mensaje no encontrado' }, { status: 404 });
    }

    if (message.commandType !== 'working-agreements') {
      return NextResponse.json({ error: 'No es Working Agreements' }, { status: 400 });
    }

    if (message.commandData.closed) {
      return NextResponse.json({ error: 'Acuerdos cerrados' }, { status: 400 });
    }

    const userId = (session.user as any).id;
    const userName = (session.user as any).name || 'Usuario';

    const category = message.commandData.categories.find((c: any) => c.id === categoryId);
    if (!category) {
      return NextResponse.json({ error: 'Categoría no encontrada' }, { status: 400 });
    }

    const agreementIndex = category.agreements.findIndex((a: any) => a.id === agreementId);
    if (agreementIndex === -1) {
      return NextResponse.json({ error: 'Acuerdo no encontrado' }, { status: 400 });
    }

    const agreement = category.agreements[agreementIndex];

    if (action === 'approve') {
      // Toggle approval
      if (!agreement.approvals) agreement.approvals = [];

      const approvalIndex = agreement.approvals.findIndex((a: any) => a.oderId === userId);
      if (approvalIndex === -1) {
        // Agregar aprobación
        agreement.approvals.push({ oderId: userId, oderName: userName });
      } else {
        // Quitar aprobación
        agreement.approvals.splice(approvalIndex, 1);
      }
    } else if (action === 'delete') {
      if (agreement.userId !== userId && (session.user as any).role !== 'ADMIN') {
        return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
      }
      category.agreements.splice(agreementIndex, 1);
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
    console.error('Error in working-agreements update:', error);
    return NextResponse.json({ error: 'Error al actualizar' }, { status: 500 });
  }
}

/**
 * DELETE /api/projects/[id]/messages/[messageId]/working-agreements
 * Cerrar acuerdos (solo creador)
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

    if (message.commandType !== 'working-agreements') {
      return NextResponse.json({ error: 'No es Working Agreements' }, { status: 400 });
    }

    const userId = (session.user as any).id;
    if (message.commandData.createdBy !== userId && (session.user as any).role !== 'ADMIN') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    }

    message.commandData.closed = true;
    message.markModified('commandData');
    await message.save();

    const savedMessage = message.toObject();

    // Notificar a participantes en segundo plano
    notifyDynamicClosed({
      projectId: params.id,
      channelId: message.channelId,
      messageId: params.messageId,
      commandType: 'working-agreements',
      commandData: message.commandData,
      closedByUserId: userId,
      closedByUserName: (session.user as any).name || 'Usuario'
    }).catch(err => console.error('Error notifying dynamic closed:', err));

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
    console.error('Error closing working-agreements:', error);
    return NextResponse.json({ error: 'Error al cerrar' }, { status: 500 });
  }
}
