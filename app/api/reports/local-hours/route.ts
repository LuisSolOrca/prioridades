import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import connectDB from '@/lib/mongodb';
import Priority from '@/models/Priority';
import AzureDevOpsWorkItem from '@/models/AzureDevOpsWorkItem';

/**
 * GET - Genera reporte de horas trabajadas en prioridades locales (no vinculadas a Azure DevOps)
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    await connectDB();

    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    // Construir query base
    let query: any = {};

    // Si es admin y se especifica userId, filtrar por ese usuario
    // Si no es admin, solo ver sus propias prioridades
    if ((session.user as any).role === 'ADMIN' && userId) {
      query.userId = userId;
    } else {
      query.userId = (session.user as any).id;
    }

    // Filtrar por rango de fechas si se especifica
    if (startDate && endDate) {
      query.weekStart = {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      };
    }

    // Obtener todas las prioridades del usuario en el rango
    const priorities = await Priority.find(query)
      .populate('userId', 'name email')
      .populate('initiativeIds', 'name color')
      .sort({ weekStart: -1 })
      .lean();

    // Obtener todos los vínculos de Azure DevOps para este usuario
    const azureLinks = await AzureDevOpsWorkItem.find({
      userId: query.userId
    }).lean();

    // Crear set de IDs de prioridades vinculadas a Azure DevOps
    const linkedPriorityIds = new Set(
      azureLinks.map(link => link.priorityId.toString())
    );

    // Filtrar solo prioridades NO vinculadas a Azure DevOps
    const localPriorities = priorities.filter(
      priority => !linkedPriorityIds.has(priority._id.toString())
    );

    // Procesar datos para el reporte
    const reportData = [];
    let totalHours = 0;

    for (const priority of localPriorities) {
      if (!priority.checklist || priority.checklist.length === 0) {
        continue;
      }

      const tasks = [];
      let priorityTotalHours = 0;

      for (const item of priority.checklist) {
        if (item.completed && item.completedHours && item.completedHours > 0) {
          tasks.push({
            text: item.text,
            hours: item.completedHours
          });
          priorityTotalHours += item.completedHours;
          totalHours += item.completedHours;
        }
      }

      // Solo incluir prioridades que tengan tareas con horas
      if (tasks.length > 0) {
        reportData.push({
          priorityId: priority._id,
          title: priority.title,
          weekStart: priority.weekStart,
          weekEnd: priority.weekEnd,
          status: priority.status,
          initiatives: priority.initiativeIds,
          tasks,
          totalHours: priorityTotalHours
        });
      }
    }

    return NextResponse.json({
      success: true,
      user: {
        id: query.userId,
        name: (session.user as any).name,
        email: (session.user as any).email
      },
      dateRange: {
        start: startDate,
        end: endDate
      },
      summary: {
        totalPriorities: reportData.length,
        totalTasks: reportData.reduce((sum, p) => sum + p.tasks.length, 0),
        totalHours
      },
      priorities: reportData
    });

  } catch (error) {
    console.error('Error generando reporte de horas locales:', error);
    return NextResponse.json(
      { error: 'Error al generar reporte de horas' },
      { status: 500 }
    );
  }
}
