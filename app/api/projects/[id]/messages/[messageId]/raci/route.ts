import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import connectDB from '@/lib/mongodb';
import ChannelMessage from '@/models/ChannelMessage';
import { triggerPusherEvent } from '@/lib/pusher-server';
import { notifyDynamicClosed } from '@/lib/dynamicNotifications';

/**
 * POST /api/projects/[id]/messages/[messageId]/raci
 * Agregar rol o tarea
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

    const { action, name } = await request.json();

    if (!action || !name?.trim()) {
      return NextResponse.json(
        { error: 'Datos inválidos' },
        { status: 400 }
      );
    }

    const message = await ChannelMessage.findById(params.messageId);
    if (!message) {
      return NextResponse.json({ error: 'Mensaje no encontrado' }, { status: 404 });
    }

    if (message.commandType !== 'raci') {
      return NextResponse.json({ error: 'No es una matriz RACI' }, { status: 400 });
    }

    if (message.commandData.closed) {
      return NextResponse.json({ error: 'Matriz cerrada' }, { status: 400 });
    }

    const userId = (session.user as any).id;
    const userName = (session.user as any).name || 'Usuario';

    if (action === 'addRole') {
      const roleId = `role-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      message.commandData.roles.push({
        id: roleId,
        name: name.trim(),
        userId,
        userName
      });

      // Agregar la nueva columna a todas las tareas existentes
      for (const task of message.commandData.tasks) {
        if (!task.assignments) task.assignments = {};
        task.assignments[roleId] = null;
      }
    } else if (action === 'addTask') {
      const taskId = `task-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      const assignments: Record<string, null> = {};

      // Inicializar assignments para todos los roles existentes
      for (const role of message.commandData.roles) {
        assignments[role.id] = null;
      }

      message.commandData.tasks.push({
        id: taskId,
        name: name.trim(),
        userId,
        userName,
        assignments
      });
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
    console.error('Error in raci add:', error);
    return NextResponse.json({ error: 'Error al agregar' }, { status: 500 });
  }
}

/**
 * PATCH /api/projects/[id]/messages/[messageId]/raci
 * Actualizar assignment o eliminar rol/tarea
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
    const { action, taskId, roleId, value } = body;

    const message = await ChannelMessage.findById(params.messageId);
    if (!message) {
      return NextResponse.json({ error: 'Mensaje no encontrado' }, { status: 404 });
    }

    if (message.commandType !== 'raci') {
      return NextResponse.json({ error: 'No es una matriz RACI' }, { status: 400 });
    }

    if (message.commandData.closed) {
      return NextResponse.json({ error: 'Matriz cerrada' }, { status: 400 });
    }

    const userId = (session.user as any).id;

    if (action === 'setAssignment') {
      // Actualizar asignación RACI
      const task = message.commandData.tasks.find((t: any) => t.id === taskId);
      if (!task) {
        return NextResponse.json({ error: 'Tarea no encontrada' }, { status: 400 });
      }

      if (!task.assignments) task.assignments = {};
      task.assignments[roleId] = value;
    } else if (action === 'deleteRole') {
      // Solo el creador del rol puede eliminarlo
      const role = message.commandData.roles.find((r: any) => r.id === roleId);
      if (!role) {
        return NextResponse.json({ error: 'Rol no encontrado' }, { status: 400 });
      }

      if (role.userId !== userId && (session.user as any).role !== 'ADMIN') {
        return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
      }

      // Eliminar rol
      message.commandData.roles = message.commandData.roles.filter((r: any) => r.id !== roleId);

      // Eliminar el rol de todos los assignments
      for (const task of message.commandData.tasks) {
        if (task.assignments && task.assignments[roleId] !== undefined) {
          delete task.assignments[roleId];
        }
      }
    } else if (action === 'deleteTask') {
      // Solo el creador de la tarea puede eliminarla
      const task = message.commandData.tasks.find((t: any) => t.id === taskId);
      if (!task) {
        return NextResponse.json({ error: 'Tarea no encontrada' }, { status: 400 });
      }

      if (task.userId !== userId && (session.user as any).role !== 'ADMIN') {
        return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
      }

      message.commandData.tasks = message.commandData.tasks.filter((t: any) => t.id !== taskId);
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
    console.error('Error in raci update:', error);
    return NextResponse.json({ error: 'Error al actualizar' }, { status: 500 });
  }
}

/**
 * DELETE /api/projects/[id]/messages/[messageId]/raci
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

    if (message.commandType !== 'raci') {
      return NextResponse.json({ error: 'No es una matriz RACI' }, { status: 400 });
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
      commandType: 'raci',
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
    console.error('Error closing raci:', error);
    return NextResponse.json({ error: 'Error al cerrar' }, { status: 500 });
  }
}
