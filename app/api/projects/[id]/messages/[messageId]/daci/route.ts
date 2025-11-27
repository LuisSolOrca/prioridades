import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import connectDB from '@/lib/mongodb';
import ChannelMessage from '@/models/ChannelMessage';
import { triggerPusherEvent } from '@/lib/pusher-server';
import { notifyDynamicClosed } from '@/lib/dynamicNotifications';

/**
 * POST /api/projects/[id]/messages/[messageId]/daci
 * Assign role or approve/reject
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
    const { action, role } = body;

    const message = await ChannelMessage.findById(params.messageId);
    if (!message) {
      return NextResponse.json({ error: 'Mensaje no encontrado' }, { status: 404 });
    }

    if (message.commandType !== 'daci') {
      return NextResponse.json({ error: 'No es un DACI' }, { status: 400 });
    }

    if (message.commandData.closed) {
      return NextResponse.json({ error: 'DACI cerrado' }, { status: 400 });
    }

    const userId = (session.user as any).id;
    const userName = (session.user as any).name || 'Usuario';

    if (!message.commandData.roles) {
      message.commandData.roles = [];
    }

    if (action === 'assign') {
      const validRoles = ['driver', 'approver', 'contributor', 'informed'];
      if (!validRoles.includes(role)) {
        return NextResponse.json({ error: 'Rol inválido' }, { status: 400 });
      }

      // Check if user already has a role
      const existingRole = message.commandData.roles.find((r: any) => r.userId === userId);
      if (existingRole) {
        return NextResponse.json({ error: 'Ya tienes un rol asignado' }, { status: 400 });
      }

      message.commandData.roles.push({
        id: Date.now().toString(),
        userId,
        userName,
        role
      });
    } else if (action === 'approve' || action === 'reject') {
      // Check if user is approver
      const isApprover = message.commandData.roles.some(
        (r: any) => r.role === 'approver' && r.userId === userId
      );

      // If requesting approval (from driver/creator)
      if (message.commandData.status === 'draft') {
        if (message.commandData.createdBy !== userId) {
          return NextResponse.json({ error: 'Solo el creador puede solicitar aprobación' }, { status: 403 });
        }
        message.commandData.status = 'pending';
      } else if (message.commandData.status === 'pending') {
        // Approver making decision
        if (!isApprover) {
          return NextResponse.json({ error: 'Solo el Approver puede aprobar/rechazar' }, { status: 403 });
        }
        message.commandData.status = action === 'approve' ? 'approved' : 'rejected';
      }
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
    console.error('Error in daci:', error);
    return NextResponse.json({ error: 'Error al procesar' }, { status: 500 });
  }
}

/**
 * PATCH /api/projects/[id]/messages/[messageId]/daci
 * Remove role
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

    const { roleId } = await request.json();

    const message = await ChannelMessage.findById(params.messageId);
    if (!message) {
      return NextResponse.json({ error: 'Mensaje no encontrado' }, { status: 404 });
    }

    if (message.commandType !== 'daci') {
      return NextResponse.json({ error: 'No es un DACI' }, { status: 400 });
    }

    if (message.commandData.closed) {
      return NextResponse.json({ error: 'DACI cerrado' }, { status: 400 });
    }

    const userId = (session.user as any).id;
    const roleIndex = message.commandData.roles?.findIndex((r: any) => r.id === roleId);

    if (roleIndex === -1 || roleIndex === undefined) {
      return NextResponse.json({ error: 'Rol no encontrado' }, { status: 400 });
    }

    const role = message.commandData.roles[roleIndex];
    if (role.userId !== userId && (session.user as any).role !== 'ADMIN') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    }

    message.commandData.roles.splice(roleIndex, 1);

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
    console.error('Error in daci remove:', error);
    return NextResponse.json({ error: 'Error al eliminar' }, { status: 500 });
  }
}

/**
 * DELETE /api/projects/[id]/messages/[messageId]/daci
 * Close (only creator)
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

    if (message.commandType !== 'daci') {
      return NextResponse.json({ error: 'No es un DACI' }, { status: 400 });
    }

    const userId = (session.user as any).id;
    if (message.commandData.createdBy !== userId && (session.user as any).role !== 'ADMIN') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    }

    message.commandData.closed = true;
    message.markModified('commandData');
    await message.save();

    const savedMessage = message.toObject();

    notifyDynamicClosed({
      projectId: params.id,
      channelId: message.channelId,
      messageId: params.messageId,
      commandType: 'daci',
      commandData: message.commandData,
      closedByUserId: userId,
      closedByUserName: (session.user as any).name || 'Usuario'
    }).catch(err => console.error('Error notifying dynamic closed:', err));

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
    console.error('Error closing daci:', error);
    return NextResponse.json({ error: 'Error al cerrar' }, { status: 500 });
  }
}
