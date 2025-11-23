import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import connectDB from '@/lib/mongodb';
import Priority from '@/models/Priority';
import AzureDevOpsWorkItem from '@/models/AzureDevOpsWorkItem';
import { awardBadge } from '@/lib/gamification';
import { executeWorkflowsForPriority } from '@/lib/workflows';
import { DIRECCION_GENERAL_USER_ID } from '@/lib/direccionGeneralFilter';
import { logPriorityCreated, logTaskCreated } from '@/lib/projectActivity';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    await connectDB();

    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const weekStart = searchParams.get('weekStart');
    const weekEnd = searchParams.get('weekEnd');
    const forDashboard = searchParams.get('forDashboard'); // Nuevo parámetro para indicar que es para el dashboard

    const currentUserId = (session.user as any).id;

    let query: any = {};

    // Si es para el dashboard, mostrar todas las prioridades (ambos roles pueden ver el dashboard completo)
    // Si no es para el dashboard, aplicar filtros según el rol
    if (forDashboard !== 'true') {
      // Si es usuario normal, solo ver sus prioridades
      if ((session.user as any).role !== 'ADMIN' && !userId) {
        query.userId = (session.user as any).id;
      } else if (userId) {
        query.userId = userId;
      }
    } else if (userId) {
      // Incluso para dashboard, respetar el filtro de userId si se especifica
      query.userId = userId;
    }

    // Filtrar por semana exacta
    // Usamos solo weekStart porque cada prioridad pertenece a una semana específica
    if (weekStart) {
      const weekStartDate = new Date(weekStart);
      // Crear rango de 1 día para comparación (mismo día, cualquier hora)
      const nextDay = new Date(weekStartDate);
      nextDay.setDate(nextDay.getDate() + 1);

      query.weekStart = {
        $gte: weekStartDate,
        $lt: nextDay
      };
    }

    // Filtro de Dirección General: ocultar prioridades de Francisco Puente
    // SOLO él puede verlas, ni siquiera los admins
    if (currentUserId !== DIRECCION_GENERAL_USER_ID) {
      // Si ya hay un filtro de userId específico, verificar que no sea Francisco Puente
      if (query.userId) {
        // Si el userId del query es diferente de Francisco Puente, no hacer nada
        // Si el userId del query ES Francisco Puente, no devolver nada
        if (query.userId === DIRECCION_GENERAL_USER_ID) {
          query._id = { $exists: false }; // Forzar resultado vacío
        }
      } else {
        // Si no hay filtro de userId, excluir a Francisco Puente
        query.userId = { $ne: DIRECCION_GENERAL_USER_ID };
      }
    }

    const priorities = await Priority.find(query)
      .populate('userId', 'name email')
      .sort({ weekStart: -1, createdAt: -1 })
      .lean();

    // Obtener información de Azure DevOps para las prioridades
    const priorityIds = priorities.map(p => p._id);
    const azureDevOpsLinks = await AzureDevOpsWorkItem.find({
      priorityId: { $in: priorityIds }
    }).lean();

    // Crear un mapa para acceso rápido
    const azureDevOpsMap = new Map(
      azureDevOpsLinks.map(link => [link.priorityId.toString(), link])
    );

    // Agregar información de Azure DevOps a cada prioridad
    const prioritiesWithAzureDevOps = priorities.map(priority => ({
      ...priority,
      azureDevOps: azureDevOpsMap.get(priority._id.toString()) ? {
        workItemId: azureDevOpsMap.get(priority._id.toString())!.workItemId,
        workItemType: azureDevOpsMap.get(priority._id.toString())!.workItemType,
        organization: azureDevOpsMap.get(priority._id.toString())!.organization,
        project: azureDevOpsMap.get(priority._id.toString())!.project,
        lastSyncDate: azureDevOpsMap.get(priority._id.toString())!.lastSyncDate
      } : null
    }));

    return NextResponse.json(prioritiesWithAzureDevOps);
  } catch (error: any) {
    console.error('Error fetching priorities:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    await connectDB();

    const body = await request.json();

    // Validar que el usuario solo cree sus propias prioridades (a menos que sea admin)
    if ((session.user as any).role !== 'ADMIN' && body.userId !== (session.user as any).id) {
      return NextResponse.json({ error: 'No puedes crear prioridades para otros usuarios' }, { status: 403 });
    }

    // Validar límite de 10 prioridades por semana
    const existingPriorities = await Priority.countDocuments({
      userId: body.userId,
      weekStart: body.weekStart
    });

    if (existingPriorities >= 10) {
      return NextResponse.json({
        error: 'Has alcanzado el límite de 10 prioridades por semana. Para agregar una nueva, elimina alguna existente.'
      }, { status: 400 });
    }

    // Compatibilidad: convertir initiativeId a initiativeIds si existe
    let initiativeIds = body.initiativeIds || [];
    if (body.initiativeId && initiativeIds.length === 0) {
      initiativeIds = [body.initiativeId];
    }

    const priority = await Priority.create({
      ...body,
      initiativeIds,
      wasEdited: false,
      isCarriedOver: false,
      createdAt: new Date(),
      updatedAt: new Date()
    });

    // Otorgar badge de FIRST_TASK si es la primera tarea del usuario
    if (body.checklist && Array.isArray(body.checklist) && body.checklist.length > 0) {
      try {
        // Badge FIRST_TASK removido - ya no existe en el nuevo sistema de badges
        // El badge PRIMERA_VICTORIA se otorga automáticamente cuando se completa la primera prioridad
      } catch (badgeError) {
        console.error('[BADGE] Error checking for badges:', badgeError);
      }
    }

    // Log activity: priority created (solo si tiene projectId)
    if (priority.projectId) {
      try {
        await logPriorityCreated(
          priority.projectId,
          priority.userId,
          priority._id,
          priority.title
        );
      } catch (activityError) {
        console.error('Error logging priority creation activity:', activityError);
      }

      // Log activities for initial tasks in checklist
      if (body.checklist && Array.isArray(body.checklist) && body.checklist.length > 0) {
        try {
          for (const task of body.checklist) {
            await logTaskCreated(
              priority.projectId,
              priority.userId,
              task._id,
              task.text,
              priority._id,
              priority.title
            );
          }
        } catch (activityError) {
          console.error('Error logging task creation activities:', activityError);
        }
      }
    }

    // Ejecutar workflows basados en evento de creación
    try {
      await executeWorkflowsForPriority(
        priority._id.toString(),
        'priority_created'
      );
    } catch (workflowError) {
      console.error('Error ejecutando workflows:', workflowError);
    }

    return NextResponse.json(priority, { status: 201 });
  } catch (error: any) {
    console.error('Error creating priority:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
