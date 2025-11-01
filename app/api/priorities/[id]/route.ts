import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import connectDB from '@/lib/mongodb';
import Priority from '@/models/Priority';
import { notifyStatusChange, notifyPriorityUnblocked, notifyCompletionMilestone, notifyWeekCompleted } from '@/lib/notifications';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    await connectDB();

    const { id } = await params;
    const priority = await Priority.findById(id);

    if (!priority) {
      return NextResponse.json({ error: 'Prioridad no encontrada' }, { status: 404 });
    }

    // Verificar que el usuario solo vea sus propias prioridades (a menos que sea admin)
    if ((session.user as any).role !== 'ADMIN' && priority.userId.toString() !== (session.user as any).id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    }

    return NextResponse.json(priority);
  } catch (error: any) {
    console.error('Error fetching priority:', error);
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

    await connectDB();

    const { id } = await params;
    const priority = await Priority.findById(id);

    if (!priority) {
      return NextResponse.json({ error: 'Prioridad no encontrada' }, { status: 404 });
    }

    // Verificar que el usuario solo edite sus propias prioridades (a menos que sea admin)
    if ((session.user as any).role !== 'ADMIN' && priority.userId.toString() !== (session.user as any).id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    }

    const body = await request.json();

    // Guardar estado anterior para detectar cambios
    const oldStatus = priority.status;
    const oldCompletionPercentage = priority.completionPercentage;

    // Preparar datos para actualizar
    const updateData: any = {
      ...body,
      wasEdited: true,
      lastEditedAt: new Date(),
      updatedAt: new Date()
    };

    // Solo manejar initiativeIds si viene en el body
    if (body.initiativeIds !== undefined || body.initiativeId !== undefined) {
      let initiativeIds = body.initiativeIds || [];
      if (body.initiativeId && initiativeIds.length === 0) {
        initiativeIds = [body.initiativeId];
      }
      updateData.initiativeIds = initiativeIds;
    }

    const updatedPriority = await Priority.findByIdAndUpdate(
      id,
      updateData,
      { new: true, runValidators: true }
    );

    // Notificaciones basadas en cambios
    try {
      // 1. Notificar si el estado cambió
      if (body.status && body.status !== oldStatus) {
        // Notificar desbloqueo
        if (oldStatus === 'BLOQUEADO' && body.status !== 'BLOQUEADO') {
          await notifyPriorityUnblocked(
            priority.userId.toString(),
            priority.title,
            body.status,
            id
          );
        }
        // Notificar cambios a EN_RIESGO o BLOQUEADO
        else {
          await notifyStatusChange(
            priority.userId.toString(),
            priority.title,
            oldStatus,
            body.status,
            id
          );
        }
      }

      // 2. Notificar hitos de % completado (25%, 50%, 75%, 100%)
      if (body.completionPercentage !== undefined && body.completionPercentage !== oldCompletionPercentage) {
        const milestones = [25, 50, 75, 100];
        for (const milestone of milestones) {
          if (oldCompletionPercentage < milestone && body.completionPercentage >= milestone) {
            await notifyCompletionMilestone(
              priority.userId.toString(),
              priority.title,
              milestone,
              id
            );
          }
        }

        // 3. Verificar si completó todas las prioridades de la semana
        if (body.completionPercentage === 100 || body.status === 'COMPLETADO') {
          const allPriorities = await Priority.find({
            userId: priority.userId,
            weekStart: priority.weekStart,
            weekEnd: priority.weekEnd
          });

          const allCompleted = allPriorities.every(p =>
            p._id.toString() === id
              ? (body.completionPercentage === 100 || body.status === 'COMPLETADO')
              : (p.completionPercentage === 100 || p.status === 'COMPLETADO')
          );

          if (allCompleted && allPriorities.length > 0) {
            await notifyWeekCompleted(
              priority.userId.toString(),
              new Date(priority.weekStart),
              new Date(priority.weekEnd)
            );
          }
        }
      }
    } catch (notifyError) {
      console.error('Error sending notifications:', notifyError);
    }

    return NextResponse.json(updatedPriority);
  } catch (error: any) {
    console.error('Error updating priority:', error);
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

    await connectDB();

    const { id } = await params;
    const priority = await Priority.findById(id);

    if (!priority) {
      return NextResponse.json({ error: 'Prioridad no encontrada' }, { status: 404 });
    }

    // Verificar que el usuario solo elimine sus propias prioridades (a menos que sea admin)
    if ((session.user as any).role !== 'ADMIN' && priority.userId.toString() !== (session.user as any).id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    }

    await Priority.findByIdAndDelete(id);

    return NextResponse.json({ message: 'Prioridad eliminada exitosamente' });
  } catch (error: any) {
    console.error('Error deleting priority:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
