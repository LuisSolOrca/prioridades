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

    console.log(`📊 [Report Data] Obteniendo datos para ${priorityIds.length} prioridades`);

    // Obtener vínculos de Azure DevOps para las prioridades solicitadas (de TODOS los usuarios)
    const query: any = {};
    if (priorityIds.length > 0) {
      query.priorityId = { $in: priorityIds };
    }

    const workItemLinks = await AzureDevOpsWorkItem.find(query);
    console.log(`📊 [Report Data] Encontrados ${workItemLinks.length} vínculos de work items`);

    // Obtener todas las configuraciones de Azure DevOps activas
    const allConfigs = await AzureDevOpsConfig.find({ isActive: true });
    console.log(`📊 [Report Data] Encontradas ${allConfigs.length} configuraciones activas de Azure DevOps`);

    // Crear un mapa de configuraciones por userId para acceso rápido
    const configsByUserId = new Map(
      allConfigs
        .filter(config => config.userId) // Filtrar configs sin userId
        .map(config => [config.userId.toString(), config])
    );

    const enrichedData = [];

    for (const link of workItemLinks) {
      try {
        console.log(`🔍 [Report Data] Procesando work item ${link.workItemId} del usuario ${link.userId}`);

        // Obtener prioridad
        const priority = await Priority.findById(link.priorityId).lean();
        if (!priority) {
          console.log(`⚠️ [Report Data] Prioridad ${link.priorityId} no encontrada`);
          continue;
        }

        // Obtener la configuración del usuario dueño de esta prioridad
        const userConfig = configsByUserId.get(link.userId.toString());

        if (!userConfig) {
          console.log(`❌ [Report Data] No hay configuración para usuario ${link.userId}, saltando work item ${link.workItemId}`);
          continue;
        }

        console.log(`✅ [Report Data] Configuración encontrada para usuario ${link.userId}`);

        // Crear cliente de Azure DevOps con la configuración del usuario
        const client = new AzureDevOpsClient({
          organization: userConfig.organization,
          project: userConfig.project,
          personalAccessToken: userConfig.personalAccessToken
        });

        // Obtener child tasks desde Azure DevOps
        const childTasks = await client.getChildTasks(link.workItemId);
        console.log(`📋 [Report Data] Encontradas ${childTasks.length} child tasks para WI ${link.workItemId}`);

        // Enriquecer cada tarea con sus datos de la prioridad local
        const tasksWithHours = childTasks.map(task => {
          const taskTitle = task.fields['System.Title'];
          const taskState = task.fields['System.State'];
          const completedWork = (task.fields as any)['Microsoft.VSTS.Scheduling.CompletedWork'] || 0;

          console.log(`⏱️ [Report Data] Tarea "${taskTitle}": ${completedWork} horas (Estado: ${taskState})`);

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
          clientId: priority.clientId,
          tasks: tasksWithHours
        });

        console.log(`✅ [Report Data] Datos enriquecidos agregados para WI ${link.workItemId}`);
      } catch (error) {
        console.error(`❌ [Report Data] Error enriqueciendo datos para prioridad ${link.priorityId}:`, error);
      }
    }

    console.log(`📊 [Report Data] Total de datos enriquecidos: ${enrichedData.length}`);
    console.log(`📊 [Report Data] Total de tareas con horas: ${enrichedData.reduce((sum, item) => sum + item.tasks.length, 0)}`);


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
