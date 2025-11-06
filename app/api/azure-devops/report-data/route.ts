import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import connectDB from '@/lib/mongodb';
import AzureDevOpsConfig from '@/models/AzureDevOpsConfig';
import AzureDevOpsWorkItem from '@/models/AzureDevOpsWorkItem';
import Priority from '@/models/Priority';
import { AzureDevOpsClient } from '@/lib/azureDevOps';

/**
 * GET - Obtiene datos enriquecidos de prioridades sincronizadas con Azure DevOps para reportes
 * Incluye las horas trabajadas de cada tarea
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    // Verificar que el usuario sea del área Tecnología
    if ((session.user as any).area !== 'Tecnología') {
      return NextResponse.json(
        { error: 'Solo usuarios del área Tecnología pueden acceder a Azure DevOps' },
        { status: 403 }
      );
    }

    await connectDB();

    const { searchParams } = new URL(request.url);
    const priorityIds = searchParams.get('priorityIds')?.split(',') || [];

    // Obtener configuración del usuario
    const config = await AzureDevOpsConfig.findOne({
      userId: (session.user as any).id,
      isActive: true
    });

    if (!config) {
      return NextResponse.json(
        { error: 'No hay configuración de Azure DevOps' },
        { status: 404 }
      );
    }

    // Crear cliente de Azure DevOps
    const client = new AzureDevOpsClient({
      organization: config.organization,
      project: config.project,
      personalAccessToken: config.personalAccessToken
    });

    // Obtener vínculos de Azure DevOps para las prioridades solicitadas
    const query: any = { userId: (session.user as any).id };
    if (priorityIds.length > 0) {
      query.priorityId = { $in: priorityIds };
    }

    const workItemLinks = await AzureDevOpsWorkItem.find(query);

    const enrichedData = [];

    for (const link of workItemLinks) {
      try {
        // Obtener prioridad
        const priority = await Priority.findById(link.priorityId).lean();
        if (!priority) continue;

        // Obtener child tasks desde Azure DevOps
        const childTasks = await client.getChildTasks(link.workItemId);

        // Enriquecer cada tarea con sus datos de la prioridad local
        const tasksWithHours = childTasks.map(task => {
          const taskTitle = task.fields['System.Title'];
          const taskState = task.fields['System.State'];
          const completedWork = (task.fields as any)['Microsoft.VSTS.Scheduling.CompletedWork'] || 0;

          // Buscar la tarea correspondiente en el checklist local
          const localTask = priority.checklist?.find((item: any) => item.text === taskTitle);

          return {
            id: task.id,
            title: taskTitle,
            state: taskState,
            completedWork: completedWork,
            isCompleted: taskState === 'Done' || taskState === 'Closed',
            localCompleted: localTask?.completed || false
          };
        });

        enrichedData.push({
          priorityId: priority._id,
          workItemId: link.workItemId,
          workItemType: link.workItemType,
          tasks: tasksWithHours
        });
      } catch (error) {
        console.error(`Error enriching data for priority ${link.priorityId}:`, error);
      }
    }

    return NextResponse.json({
      success: true,
      data: enrichedData
    });
  } catch (error) {
    console.error('Error obtaining Azure DevOps report data:', error);
    return NextResponse.json(
      { error: 'Error al obtener datos del reporte' },
      { status: 500 }
    );
  }
}
