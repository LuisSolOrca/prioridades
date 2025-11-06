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

    await connectDB();

    const { searchParams } = new URL(request.url);
    const priorityIds = searchParams.get('priorityIds')?.split(',') || [];

    // Obtener vínculos de Azure DevOps para las prioridades solicitadas (de TODOS los usuarios)
    const query: any = {};
    if (priorityIds.length > 0) {
      query.priorityId = { $in: priorityIds };
    }

    const workItemLinks = await AzureDevOpsWorkItem.find(query);

    // Obtener todas las configuraciones de Azure DevOps activas
    const allConfigs = await AzureDevOpsConfig.find({ isActive: true });

    // Crear un mapa de configuraciones por userId para acceso rápido
    const configsByUserId = new Map(
      allConfigs.map(config => [config.userId.toString(), config])
    );

    const enrichedData = [];

    for (const link of workItemLinks) {
      try {
        // Obtener prioridad
        const priority = await Priority.findById(link.priorityId).lean();
        if (!priority) continue;

        // Obtener la configuración del usuario dueño de esta prioridad
        const userConfig = configsByUserId.get(link.userId.toString());

        if (!userConfig) {
          console.log(`No config found for user ${link.userId}, skipping work item ${link.workItemId}`);
          continue;
        }

        // Crear cliente de Azure DevOps con la configuración del usuario
        const client = new AzureDevOpsClient({
          organization: userConfig.organization,
          project: userConfig.project,
          personalAccessToken: userConfig.personalAccessToken
        });

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
