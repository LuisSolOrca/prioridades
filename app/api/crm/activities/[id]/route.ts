import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import connectDB from '@/lib/mongodb';
import Activity from '@/models/Activity';
import { hasPermission } from '@/lib/permissions';
import { triggerWorkflowsAsync } from '@/lib/crmWorkflowEngine';
import { triggerWebhooksAsync } from '@/lib/crm/webhookEngine';

export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    if (!hasPermission(session, 'viewCRM')) {
      return NextResponse.json({ error: 'Sin permiso para ver CRM' }, { status: 403 });
    }

    await connectDB();
    const { id } = await params;

    const activity = await Activity.findById(id)
      .populate('clientId', 'name')
      .populate('contactId', 'firstName lastName')
      .populate('dealId', 'title value')
      .populate('createdBy', 'name')
      .populate('assignedTo', 'name')
      .lean();

    if (!activity) {
      return NextResponse.json({ error: 'Actividad no encontrada' }, { status: 404 });
    }

    return NextResponse.json(activity);
  } catch (error: any) {
    console.error('Error fetching activity:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    if (!hasPermission(session, 'viewCRM')) {
      return NextResponse.json({ error: 'Sin permiso para usar CRM' }, { status: 403 });
    }

    await connectDB();
    const { id } = await params;
    const body = await request.json();
    const userId = (session.user as any).id;

    // Obtener actividad actual para comparar cambios
    const currentActivity = await Activity.findById(id);
    if (!currentActivity) {
      return NextResponse.json({ error: 'Actividad no encontrada' }, { status: 404 });
    }
    const wasCompleted = currentActivity.isCompleted;

    // Si se marca como completado, agregar fecha de completado
    if (body.isCompleted && !body.completedAt) {
      body.completedAt = new Date();
    }

    const activity = await Activity.findByIdAndUpdate(
      id,
      { $set: body },
      { new: true, runValidators: true }
    )
      .populate('clientId', 'name')
      .populate('contactId', 'firstName lastName')
      .populate('dealId', 'title value')
      .populate('createdBy', 'name')
      .populate('assignedTo', 'name')
      .lean();

    if (!activity) {
      return NextResponse.json({ error: 'Actividad no encontrada' }, { status: 404 });
    }

    // Si es una tarea y se acaba de completar, disparar task_completed
    if (currentActivity.type === 'task' && !wasCompleted && body.isCompleted) {
      triggerWorkflowsAsync('task_completed', {
        entityType: 'activity',
        entityId: id,
        entityName: activity.title,
        previousData: currentActivity.toObject(),
        newData: activity,
        userId,
      });

      // Webhook task.completed
      triggerWebhooksAsync('task.completed', {
        entityType: 'activity',
        entityId: id,
        entityName: activity.title as string,
        current: activity as Record<string, any>,
        previous: currentActivity.toObject(),
        userId,
        source: 'web',
      });
    }

    return NextResponse.json(activity);
  } catch (error: any) {
    console.error('Error updating activity:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    if (!hasPermission(session, 'viewCRM')) {
      return NextResponse.json({ error: 'Sin permiso para usar CRM' }, { status: 403 });
    }

    await connectDB();
    const { id } = await params;

    const activity = await Activity.findByIdAndDelete(id);

    if (!activity) {
      return NextResponse.json({ error: 'Actividad no encontrada' }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error deleting activity:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
