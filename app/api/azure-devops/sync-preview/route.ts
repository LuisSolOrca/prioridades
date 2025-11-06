import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import connectDB from '@/lib/mongodb';
import AzureDevOpsConfig from '@/models/AzureDevOpsConfig';
import AzureDevOpsWorkItem from '@/models/AzureDevOpsWorkItem';
import Priority from '@/models/Priority';
import { AzureDevOpsClient, mapAzureDevOpsStateToAppState } from '@/lib/azureDevOps';

/**
 * GET - Obtiene preview de sincronización con cambios detectados
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

    // Obtener todos los vínculos del usuario
    const workItemLinks = await AzureDevOpsWorkItem.find({
      userId: (session.user as any).id
    });

    const syncItems = [];
    const unlinkedPriorities = [];

    // Analizar cada vínculo
    for (const link of workItemLinks) {
      try {
        // Obtener prioridad local
        const priority = await Priority.findById(link.priorityId).lean();

        if (!priority) {
          continue;
        }

        // Obtener work item de Azure DevOps
        const workItem = await client.getWorkItem(link.workItemId);
        const currentAdoState = workItem.fields['System.State'];

        // Obtener child tasks actuales de Azure DevOps
        const childTasks = await client.getChildTasks(link.workItemId);

        // Detectar cambios
        const changes: any = {
          hasChanges: false,
          stateChanged: false,
          checklistChanged: false,
          details: []
        };

        // Comparar estado
        const mappedAdoState = mapAzureDevOpsStateToAppState(
          currentAdoState,
          config.stateMapping
        );

        if (mappedAdoState !== priority.status) {
          changes.hasChanges = true;
          changes.stateChanged = true;
          changes.details.push({
            type: 'estado',
            local: priority.status,
            remoto: currentAdoState,
            remotoMapped: mappedAdoState
          });
        }

        // Comparar checklist vs child tasks
        const localChecklistCount = priority.checklist?.length || 0;
        const remoteTasksCount = childTasks.length;

        if (localChecklistCount > 0 && childTasks.length > 0) {
          // Verificar tareas completadas localmente que no estén cerradas en Azure DevOps (para sync hacia ADO)
          const completedLocally = priority.checklist.filter((item: any) => item.completed);
          const completedLocallyIds = new Set(completedLocally.map((item: any) => item.text));

          for (const task of childTasks) {
            const taskTitle = task.fields['System.Title'];
            const taskIsClosed = task.fields['System.State'] === 'Done' ||
                                task.fields['System.State'] === 'Closed';

            if (completedLocallyIds.has(taskTitle) && !taskIsClosed) {
              changes.hasChanges = true;
              changes.checklistChanged = true;
              changes.details.push({
                type: 'tarea_completada_local',
                direction: 'to-ado',
                taskId: task.id,
                taskTitle: taskTitle,
                localStatus: 'completada',
                remoteStatus: task.fields['System.State']
              });
            }
          }

          // Verificar tareas completadas en Azure DevOps que no estén completadas localmente (para sync desde ADO)
          const localChecklistMap = new Map(
            priority.checklist.map((item: any) => [item.text, item.completed])
          );

          for (const task of childTasks) {
            const taskTitle = task.fields['System.Title'];
            const taskIsClosed = task.fields['System.State'] === 'Done' ||
                                task.fields['System.State'] === 'Closed';
            const isCompletedLocally = localChecklistMap.get(taskTitle) === true;

            if (taskIsClosed && !isCompletedLocally && localChecklistMap.has(taskTitle)) {
              changes.hasChanges = true;
              changes.checklistChanged = true;
              changes.details.push({
                type: 'tarea_completada_remota',
                direction: 'from-ado',
                taskId: task.id,
                taskTitle: taskTitle,
                localStatus: 'pendiente',
                remoteStatus: task.fields['System.State']
              });
            }
          }
        }

        syncItems.push({
          workItemId: link.workItemId,
          workItemType: workItem.fields['System.WorkItemType'],
          priorityId: priority._id.toString(),
          title: priority.title,
          localStatus: priority.status,
          remoteStatus: currentAdoState,
          remoteStatusMapped: mappedAdoState,
          checklistCount: localChecklistCount,
          remoteTasksCount: remoteTasksCount,
          changes: changes,
          childTasks: childTasks.map(task => ({
            id: task.id,
            title: task.fields['System.Title'],
            state: task.fields['System.State'],
            localCompleted: priority.checklist?.find((item: any) =>
              item.text === task.fields['System.Title']
            )?.completed || false
          }))
        });

      } catch (error) {
        console.error(`Error analizando work item ${link.workItemId}:`, error);
        syncItems.push({
          workItemId: link.workItemId,
          error: error instanceof Error ? error.message : 'Error desconocido'
        });
      }
    }

    // Obtener prioridades no vinculadas para mostrar en preview
    const allPriorities = await Priority.find({
      userId: (session.user as any).id,
      status: { $nin: ['COMPLETADO', 'REPROGRAMADO'] }
    }).lean();

    const linkedPriorityIds = workItemLinks.map(link => link.priorityId.toString());

    const unlinkedPrioritiesList = allPriorities.filter(
      priority => !linkedPriorityIds.includes(priority._id.toString())
    );

    // Mapear prioridades no vinculadas para el preview
    for (const priority of unlinkedPrioritiesList) {
      unlinkedPriorities.push({
        priorityId: priority._id.toString(),
        title: priority.title,
        description: priority.description,
        status: priority.status,
        checklistCount: priority.checklist?.length || 0,
        checklistItems: priority.checklist?.map((item: any) => ({
          text: item.text,
          completed: item.completed
        })) || [],
        evidenceLinksCount: priority.evidenceLinks?.length || 0,
        evidenceLinks: priority.evidenceLinks?.map((link: any) => ({
          title: link.title,
          url: link.url
        })) || [],
        willBeCreated: true
      });
    }

    return NextResponse.json({
      success: true,
      totalItems: syncItems.length,
      itemsWithChanges: syncItems.filter(item => item.changes?.hasChanges).length,
      unlinkedCount: unlinkedPriorities.length,
      items: syncItems,
      unlinkedPriorities: unlinkedPriorities
    });

  } catch (error) {
    console.error('Error obteniendo preview de sincronización:', error);
    return NextResponse.json(
      { error: 'Error al obtener preview de sincronización' },
      { status: 500 }
    );
  }
}
