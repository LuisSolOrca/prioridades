import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import connectDB from '@/lib/mongodb';
import AzureDevOpsConfig from '@/models/AzureDevOpsConfig';
import AzureDevOpsWorkItem from '@/models/AzureDevOpsWorkItem';
import Priority from '@/models/Priority';
import Comment from '@/models/Comment';
import { AzureDevOpsClient, mapAzureDevOpsStateToAppState, mapAppStateToAzureDevOpsState } from '@/lib/azureDevOps';

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

    // Obtener areas/teams disponibles
    const areaPaths = await client.getAreaPaths();

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

        // Crear mapa de tareas de Azure DevOps por título
        const adoTasksMap = new Map(
          childTasks.map(task => [task.fields['System.Title'], task])
        );

        // Crear mapa de tareas locales por título
        const localChecklistMap = new Map(
          (priority.checklist || []).map((item: any) => [item.text, item])
        );

        // Procesar cada tarea local para detectar cambios hacia Azure
        for (const localTask of priority.checklist || []) {
          const adoTask = adoTasksMap.get(localTask.text);

          if (adoTask) {
            // La tarea existe en Azure DevOps - verificar si hay cambios
            const taskIsClosed = adoTask.fields['System.State'] === 'Done' ||
                                adoTask.fields['System.State'] === 'Closed';

            // Tarea completada localmente pero no cerrada en Azure DevOps
            if (localTask.completed && !taskIsClosed) {
              changes.hasChanges = true;
              changes.checklistChanged = true;
              changes.details.push({
                type: 'tarea_completada_local',
                direction: 'to-ado',
                taskId: adoTask.id,
                taskTitle: localTask.text,
                localStatus: 'completada',
                remoteStatus: adoTask.fields['System.State']
              });
            }

            // Tarea NO completada localmente pero SÍ cerrada en Azure DevOps (REAPERTURA)
            if (!localTask.completed && taskIsClosed) {
              changes.hasChanges = true;
              changes.checklistChanged = true;
              changes.details.push({
                type: 'tarea_reabierta_local',
                direction: 'to-ado',
                taskId: adoTask.id,
                taskTitle: localTask.text,
                localStatus: 'pendiente',
                remoteStatus: adoTask.fields['System.State']
              });
            }
          } else {
            // La tarea NO existe en Azure DevOps - será creada
            changes.hasChanges = true;
            changes.checklistChanged = true;
            changes.details.push({
              type: 'tarea_nueva_local',
              direction: 'to-ado',
              taskId: null,
              taskTitle: localTask.text,
              localStatus: localTask.completed ? 'completada' : 'pendiente',
              remoteStatus: 'No existe'
            });
          }
        }

        // Procesar cada tarea de Azure para detectar las que no existen localmente
        for (const adoTask of childTasks) {
          const taskTitle = adoTask.fields['System.Title'];
          const localTask = localChecklistMap.get(taskTitle);

          if (!localTask) {
            // La tarea existe en Azure pero NO localmente - será agregada al checklist local
            const taskIsClosed = adoTask.fields['System.State'] === 'Done' ||
                                adoTask.fields['System.State'] === 'Closed';
            changes.hasChanges = true;
            changes.checklistChanged = true;
            changes.details.push({
              type: 'tarea_nueva_remota',
              direction: 'from-ado',
              taskId: adoTask.id,
              taskTitle: taskTitle,
              localStatus: 'No existe',
              remoteStatus: adoTask.fields['System.State']
            });
          }
        }

        // Combinar tareas de Azure DevOps con tareas locales que no existen en Azure
        const adoTaskTitles = new Set(childTasks.map(task => task.fields['System.Title']));
        const localOnlyTasks = (priority.checklist || [])
          .filter((item: any) => !adoTaskTitles.has(item.text))
          .map((item: any) => ({
            id: `local-${item._id || item.text}`, // ID temporal para tareas locales
            title: item.text,
            state: 'Local', // Indica que solo existe localmente
            localCompleted: item.completed,
            isLocalOnly: true // Flag para identificar tareas que solo existen localmente
          }));

        // Combinar tareas de Azure DevOps con tareas locales
        const allTasks = [
          ...childTasks.map(task => {
            const existsLocally = localChecklistMap.has(task.fields['System.Title']);
            return {
              id: task.id,
              title: task.fields['System.Title'],
              state: task.fields['System.State'],
              localCompleted: priority.checklist?.find((item: any) =>
                item.text === task.fields['System.Title']
              )?.completed || false,
              isLocalOnly: false,
              isRemoteOnly: !existsLocally // Flag para tareas que solo existen en Azure
            };
          }),
          ...localOnlyTasks
        ];

        // Detectar comentarios nuevos locales por sincronizar a Azure
        const lastCommentSync = link.lastCommentSyncDate || new Date(0);
        const newLocalCommentsCount = await Comment.countDocuments({
          priorityId: link.priorityId,
          createdAt: { $gt: lastCommentSync },
          azureCommentId: { $exists: false } // Solo comentarios que no vienen de Azure
        });

        if (newLocalCommentsCount > 0) {
          changes.hasChanges = true;
          changes.details.push({
            type: 'comentarios_nuevos_local',
            direction: 'to-ado',
            count: newLocalCommentsCount
          });
        }

        // Detectar comentarios de Azure DevOps que no existen localmente
        try {
          const azureComments = await client.getComments(link.workItemId);

          if (azureComments.length > 0) {
            const syncedAzureCommentIds = await Comment.find({
              priorityId: link.priorityId,
              azureCommentId: { $exists: true, $ne: null }
            }).distinct('azureCommentId');

            const syncedIds = new Set(syncedAzureCommentIds.map(id => Number(id)));
            const newAzureCommentsCount = azureComments.filter(c => !syncedIds.has(c.id)).length;

            if (newAzureCommentsCount > 0) {
              changes.hasChanges = true;
              changes.details.push({
                type: 'comentarios_nuevos_remoto',
                direction: 'from-ado',
                count: newAzureCommentsCount
              });
            }
          }
        } catch (error) {
          console.error(`Error obteniendo comentarios de Azure para preview (WI ${link.workItemId}):`, error);
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
          childTasks: allTasks,
          newLocalCommentsCount: newLocalCommentsCount
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
    // Incluir completadas pero excluir reprogramadas (ya que se crea una copia nueva)
    const allPriorities = await Priority.find({
      userId: (session.user as any).id,
      status: { $ne: 'REPROGRAMADO' } // Excluir reprogramadas porque ya existe la copia nueva
    }).lean();

    const linkedPriorityIds = workItemLinks.map(link => link.priorityId.toString());

    console.log('Total prioridades del usuario:', allPriorities.length);
    console.log('Prioridades vinculadas:', linkedPriorityIds.length);

    const unlinkedPrioritiesList = allPriorities.filter(
      priority => !linkedPriorityIds.includes(priority._id.toString())
    );

    console.log('Prioridades sin vincular:', unlinkedPrioritiesList.length);

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
      unlinkedPriorities: unlinkedPriorities,
      areaPaths: areaPaths // Lista de areas/teams disponibles
    });

  } catch (error) {
    console.error('Error obteniendo preview de sincronización:', error);
    return NextResponse.json(
      { error: 'Error al obtener preview de sincronización' },
      { status: 500 }
    );
  }
}

/**
 * POST - Obtiene vista previa de sincronización para una prioridad individual
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    // Verificar que el usuario sea del área Tecnología
    if ((session.user as any).area !== 'Tecnología') {
      return NextResponse.json(
        { error: 'Solo usuarios del área Tecnología pueden sincronizar con Azure DevOps' },
        { status: 403 }
      );
    }

    await connectDB();

    const body = await request.json();
    const { priorityId } = body;

    if (!priorityId) {
      return NextResponse.json(
        { error: 'priorityId es requerido' },
        { status: 400 }
      );
    }

    // Verificar que la prioridad existe y tiene vínculo con Azure DevOps
    const priority = await Priority.findById(priorityId).lean();

    if (!priority) {
      return NextResponse.json(
        { error: 'Prioridad no encontrada' },
        { status: 404 }
      );
    }

    // Buscar el vínculo con Azure DevOps
    const link = await AzureDevOpsWorkItem.findOne({ priorityId: priorityId });

    if (!link) {
      return NextResponse.json(
        { error: 'Esta prioridad no está vinculada con Azure DevOps' },
        { status: 404 }
      );
    }

    // Obtener configuración del usuario dueño de la prioridad
    const config = await AzureDevOpsConfig.findOne({
      userId: link.userId,
      isActive: true
    });

    if (!config) {
      return NextResponse.json(
        { error: 'No hay configuración de Azure DevOps para el usuario dueño de la prioridad' },
        { status: 404 }
      );
    }

    // Crear cliente de Azure DevOps
    const client = new AzureDevOpsClient({
      organization: config.organization,
      project: config.project,
      personalAccessToken: config.personalAccessToken
    });

    // Obtener estado actual de Azure DevOps
    const workItem = await client.getWorkItem(link.workItemId);
    const currentAdoState = workItem.fields['System.State'];
    const mappedAdoState = mapAzureDevOpsStateToAppState(currentAdoState, config.stateMapping);

    // Comparar estados
    const willUpdateState = mappedAdoState !== priority.status ||
                           mapAppStateToAzureDevOpsState(priority.status) !== currentAdoState;

    // Obtener tareas de Azure DevOps
    const childTasks = await client.getChildTasks(link.workItemId);
    const localChecklist = priority.checklist || [];

    // Crear mapa de tareas de Azure DevOps
    const adoTasksMap = new Map();
    for (const task of childTasks) {
      adoTasksMap.set(task.fields['System.Title'], task);
    }

    // Cambios detectados desde Azure DevOps (FROM ADO)
    const fromAzureDevOps = {
      changes: [] as string[],
      willUpdate: false
    };

    // Cambios detectados hacia Azure DevOps (TO ADO)
    const toAzureDevOps = {
      changes: [] as string[],
      willUpdate: false
    };

    // Comparar estado desde Azure
    if (mappedAdoState !== priority.status) {
      fromAzureDevOps.changes.push(`Estado: ${currentAdoState} (${mappedAdoState}) → ${priority.status}`);
      fromAzureDevOps.willUpdate = true;
    }

    // Comparar estado hacia Azure
    const expectedAdoState = mapAppStateToAzureDevOpsState(priority.status);
    if (expectedAdoState !== currentAdoState) {
      toAzureDevOps.changes.push(`Estado: ${priority.status} → ${expectedAdoState}`);
      toAzureDevOps.willUpdate = true;
    }

    // Comparar tareas
    const taskComparisons = [];

    // Revisar tareas locales vs Azure
    for (const localTask of localChecklist) {
      const taskText = (localTask as any).text;
      const adoTask = adoTasksMap.get(taskText);
      const localCompleted = (localTask as any).completed;

      if (adoTask) {
        // Tarea existe en ambos lados
        const azureCompleted = adoTask.fields['System.State'] === 'Done' ||
                              adoTask.fields['System.State'] === 'Closed';

        const willClose = localCompleted && !azureCompleted;
        const willReopen = !localCompleted && azureCompleted;

        // Siempre incluir para mostrar estado
        taskComparisons.push({
          text: taskText,
          taskId: adoTask.id.toString(),
          localCompleted,
          azureCompleted,
          willClose,
          willReopen,
          isNew: false,
          direction: willClose ? 'to-ado' : willReopen ? 'to-ado' : 'none'
        });

        if (willClose) {
          toAzureDevOps.changes.push(`Tarea: "${taskText}" → Cerrar`);
          toAzureDevOps.willUpdate = true;
        }

        if (willReopen) {
          toAzureDevOps.changes.push(`Tarea: "${taskText}" → Reabrir`);
          toAzureDevOps.willUpdate = true;
        }
      } else {
        // Tarea nueva (solo existe localmente)
        taskComparisons.push({
          text: taskText,
          taskId: (localTask as any)._id || taskText,
          localCompleted,
          azureCompleted: false,
          willClose: localCompleted,
          willReopen: false,
          isNew: true,
          direction: 'to-ado'
        });

        toAzureDevOps.changes.push(`Tarea: "${taskText}" → Crear${localCompleted ? ' y cerrar' : ''}`);
        toAzureDevOps.willUpdate = true;
      }
    }

    // Revisar tareas de Azure que no existen localmente
    for (const adoTask of childTasks) {
      const taskTitle = adoTask.fields['System.Title'];
      const existsLocally = localChecklist.some((item: any) => item.text === taskTitle);

      if (!existsLocally) {
        const azureCompleted = adoTask.fields['System.State'] === 'Done' ||
                              adoTask.fields['System.State'] === 'Closed';

        // Tarea que se agregará desde Azure
        taskComparisons.push({
          text: taskTitle,
          taskId: adoTask.id.toString(),
          localCompleted: false,
          azureCompleted,
          willClose: false,
          willReopen: false,
          isNew: false,
          direction: 'from-ado'
        });

        fromAzureDevOps.changes.push(`Tarea: "${taskTitle}" → Agregar${azureCompleted ? ' (completada)' : ''}`);
        fromAzureDevOps.willUpdate = true;
      }
    }

    // Detectar comentarios nuevos locales por sincronizar a Azure
    const lastCommentSync = link.lastCommentSyncDate || new Date(0);
    const newLocalComments = await Comment.find({
      priorityId: priorityId,
      createdAt: { $gt: lastCommentSync },
      azureCommentId: { $exists: false }
    })
      .populate('userId', 'name')
      .sort({ createdAt: 1 })
      .lean();

    if (newLocalComments.length > 0) {
      toAzureDevOps.changes.push(`${newLocalComments.length} comentario(s) nuevo(s) → Sincronizar`);
      toAzureDevOps.willUpdate = true;
    }

    // Detectar comentarios de Azure DevOps que no existen localmente
    const azureComments = await client.getComments(link.workItemId);

    if (azureComments.length > 0) {
      const syncedAzureCommentIds = await Comment.find({
        priorityId: priorityId,
        azureCommentId: { $exists: true, $ne: null }
      }).distinct('azureCommentId');

      const syncedIds = new Set(syncedAzureCommentIds.map(id => Number(id)));
      const newAzureComments = azureComments.filter(c => !syncedIds.has(c.id));

      if (newAzureComments.length > 0) {
        fromAzureDevOps.changes.push(`${newAzureComments.length} comentario(s) nuevo(s) → Agregar`);
        fromAzureDevOps.willUpdate = true;
      }
    }

    return NextResponse.json({
      success: true,
      preview: {
        localState: priority.status,
        azureState: currentAdoState,
        willUpdateState,
        tasks: taskComparisons,
        fromAzureDevOps,
        toAzureDevOps,
        hasChanges: fromAzureDevOps.willUpdate || toAzureDevOps.willUpdate
      }
    });

  } catch (error) {
    console.error('Error en vista previa de sincronización:', error);
    return NextResponse.json(
      { error: 'Error al obtener vista previa de sincronización' },
      { status: 500 }
    );
  }
}
