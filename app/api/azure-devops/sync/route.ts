import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import connectDB from '@/lib/mongodb';
import AzureDevOpsConfig from '@/models/AzureDevOpsConfig';
import AzureDevOpsWorkItem from '@/models/AzureDevOpsWorkItem';
import Priority from '@/models/Priority';
import Comment from '@/models/Comment';
import User from '@/models/User';
import {
  AzureDevOpsClient,
  mapAzureDevOpsStateToAppState,
  mapAppStateToAzureDevOpsState
} from '@/lib/azureDevOps';

/**
 * POST - Sincroniza estados entre Azure DevOps y la aplicación
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
        { error: 'Solo usuarios del área Tecnología pueden acceder a Azure DevOps' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { direction = 'both', selectedItems = [], taskHours = {}, exportUnlinked = false, workItemType = 'User Story', areaPaths = {}, unlinkedTaskHours = {} } = body;
    // direction: 'both', 'from-ado', 'to-ado'
    // selectedItems: array de workItemIds para sincronizar (vacío = todos)
    // taskHours: { [taskId]: hours } - horas por tarea completada (tareas vinculadas)
    // exportUnlinked: si es true, exporta prioridades que no están vinculadas a Azure DevOps
    // workItemType: tipo de work item a crear ('User Story' o 'Bug')
    // areaPaths: { [priorityId]: areaPath } - área/team para cada prioridad
    // unlinkedTaskHours: { "priorityId-taskIndex": hours } - horas para tareas de prioridades no vinculadas

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

    if (!config.syncEnabled) {
      return NextResponse.json(
        { error: 'La sincronización está deshabilitada' },
        { status: 400 }
      );
    }

    // Crear cliente de Azure DevOps
    const client = new AzureDevOpsClient({
      organization: config.organization,
      project: config.project,
      personalAccessToken: config.personalAccessToken
    });

    const syncResults = {
      fromAzureDevOps: { updated: 0, errors: [] as any[] },
      toAzureDevOps: { updated: 0, errors: [] as any[] },
      exported: { created: 0, workItems: [] as any[], errors: [] as any[] }
    };

    // Obtener todos los vínculos del usuario
    let workItemLinks = await AzureDevOpsWorkItem.find({
      userId: (session.user as any).id
    });

    // Filtrar por selectedItems si se especificaron
    if (selectedItems.length > 0) {
      workItemLinks = workItemLinks.filter(link => selectedItems.includes(link.workItemId));
    }

    // Sincronización desde Azure DevOps hacia la app
    if (direction === 'both' || direction === 'from-ado') {
      for (const link of workItemLinks) {
        try {
          // Obtener estado actual del work item en Azure DevOps
          const workItem = await client.getWorkItem(link.workItemId);
          const currentAdoState = workItem.fields['System.State'];

          // Si el estado en Azure DevOps cambió
          if (currentAdoState !== link.lastSyncedState) {
            // Mapear a estado de la app
            const newAppState = mapAzureDevOpsStateToAppState(
              currentAdoState,
              config.stateMapping
            );

            // Actualizar prioridad
            await Priority.findByIdAndUpdate(link.priorityId, {
              status: newAppState,
              completionPercentage: newAppState === 'COMPLETADO' ? 100 : undefined
            });

            // Actualizar último estado sincronizado
            link.lastSyncedState = currentAdoState;
            link.lastSyncDate = new Date();
            await link.save();

            syncResults.fromAzureDevOps.updated++;
          }
        } catch (error) {
          console.error(`Error sincronizando desde Azure DevOps (WI ${link.workItemId}):`, error);

          // Registrar error en el vínculo
          link.syncErrors.push({
            error: error instanceof Error ? error.message : 'Error desconocido',
            date: new Date()
          });
          await link.save();

          syncResults.fromAzureDevOps.errors.push({
            workItemId: link.workItemId,
            error: error instanceof Error ? error.message : 'Error desconocido'
          });
        }
      }
    }

    // Sincronización desde la app hacia Azure DevOps
    if (direction === 'both' || direction === 'to-ado') {
      for (const link of workItemLinks) {
        try {
          // Obtener prioridad actual
          const priority = await Priority.findById(link.priorityId);

          if (!priority) {
            continue;
          }

          // Sincronizar tareas completadas del checklist
          if (priority.checklist && priority.checklist.length > 0) {
            // Obtener child tasks de Azure DevOps
            const childTasks = await client.getChildTasks(link.workItemId);

            for (const checklistItem of priority.checklist) {
              if (checklistItem.completed) {
                // Buscar la tarea correspondiente en Azure DevOps
                const correspondingTask = childTasks.find(task =>
                  task.fields['System.Title'] === (checklistItem as any).text
                );

                if (correspondingTask) {
                  const taskState = correspondingTask.fields['System.State'];

                  // Si la tarea no está cerrada en Azure DevOps
                  if (taskState !== 'Done' && taskState !== 'Closed') {
                    // Obtener horas de taskHours o usar 0 por defecto
                    const hours = taskHours[correspondingTask.id] || 0;

                    // Cerrar tarea con horas
                    await client.closeTaskWithHours(correspondingTask.id, hours);

                    syncResults.toAzureDevOps.updated++;
                  }
                }
              }
            }
          }

          // Mapear estado de la app a Azure DevOps
          const expectedAdoState = mapAppStateToAzureDevOpsState(priority.status);

          // Si el estado esperado es diferente al último sincronizado
          if (expectedAdoState !== link.lastSyncedState) {
            // Actualizar work item en Azure DevOps
            await client.updateWorkItemState(link.workItemId, expectedAdoState);

            // Actualizar último estado sincronizado
            link.lastSyncedState = expectedAdoState;
            link.lastSyncDate = new Date();
            await link.save();

            syncResults.toAzureDevOps.updated++;
          }
        } catch (error) {
          console.error(`Error sincronizando hacia Azure DevOps (WI ${link.workItemId}):`, error);

          // Registrar error en el vínculo
          link.syncErrors.push({
            error: error instanceof Error ? error.message : 'Error desconocido',
            date: new Date()
          });
          await link.save();

          syncResults.toAzureDevOps.errors.push({
            workItemId: link.workItemId,
            error: error instanceof Error ? error.message : 'Error desconocido'
          });
        }
      }
    }

    // Exportar prioridades no vinculadas si se solicitó
    if (exportUnlinked) {
      try {
        // Obtener todas las prioridades del usuario (incluir completadas pero excluir reprogramadas)
        const allPriorities = await Priority.find({
          userId: (session.user as any).id,
          status: { $ne: 'REPROGRAMADO' } // Excluir reprogramadas porque ya existe la copia nueva
        });

        // Obtener IDs de prioridades ya vinculadas
        const linkedPriorityIds = workItemLinks.map(link => link.priorityId.toString());

        // Filtrar prioridades no vinculadas
        const unlinkedPriorities = allPriorities.filter(
          priority => !linkedPriorityIds.includes(priority._id.toString())
        );

        // Obtener el sprint/iteración actual
        const currentIteration = await client.getCurrentIteration();

        // Obtener email del usuario para asignación
        const userEmail = session.user.email;

        // Exportar cada prioridad no vinculada
        for (const priority of unlinkedPriorities) {
          try {
            // Obtener el areaPath seleccionado para esta prioridad
            const selectedAreaPath = areaPaths[priority._id.toString()];

            // Crear el work item principal con el sprint actual, área y asignado al usuario
            const workItem = await client.createWorkItem(
              workItemType,
              priority.title,
              priority.description,
              selectedAreaPath || undefined, // areaPath - área/team seleccionado
              currentIteration || undefined, // iterationPath - sprint actual
              userEmail || undefined // assignedTo - email del usuario
            );

            const exportedWorkItem = {
              id: workItem.id,
              priorityId: priority._id,
              title: priority.title,
              tasks: [] as any[],
              hasLinks: false
            };

            // Crear tareas del checklist si existen
            if (priority.checklist && priority.checklist.length > 0) {
              for (let taskIndex = 0; taskIndex < priority.checklist.length; taskIndex++) {
                const checklistItem = priority.checklist[taskIndex];
                try {
                  const task = await client.createChildTask(
                    workItem.id,
                    (checklistItem as any).text
                  );

                  exportedWorkItem.tasks.push((checklistItem as any).text);

                  // Si la tarea ya estaba completada, cerrarla con las horas ingresadas
                  if ((checklistItem as any).completed) {
                    // Obtener horas para esta tarea del objeto unlinkedTaskHours
                    const hoursKey = `${priority._id.toString()}-${taskIndex}`;
                    const hours = unlinkedTaskHours[hoursKey] || 0;

                    await client.closeTaskWithHours(task.id, hours);
                  }
                } catch (error) {
                  console.error('Error creando tarea del checklist:', error);
                }
              }
            }

            // Agregar enlaces de evidencia como comentarios
            if (priority.evidenceLinks && priority.evidenceLinks.length > 0) {
              const linksText = priority.evidenceLinks
                .map((link: any) => `${link.title}: ${link.url}`)
                .join('\n');

              try {
                await client.addComment(
                  workItem.id,
                  `📎 Enlaces de evidencia:\n${linksText}`
                );
                exportedWorkItem.hasLinks = true;
              } catch (error) {
                console.error('Error agregando enlaces de evidencia:', error);
              }
            }

            // Agregar comentarios de la prioridad
            try {
              const comments = await Comment.find({ priorityId: priority._id })
                .populate('userId', 'name')
                .sort({ createdAt: 1 })
                .lean();

              if (comments.length > 0) {
                for (const comment of comments) {
                  const userName = (comment.userId as any)?.name || 'Usuario';
                  const commentText = comment.isSystemComment
                    ? `🤖 [Sistema] ${comment.text}`
                    : `💬 [${userName}] ${comment.text}`;

                  try {
                    await client.addComment(workItem.id, commentText);
                  } catch (error) {
                    console.error('Error agregando comentario:', error);
                  }
                }
              }
            } catch (error) {
              console.error('Error obteniendo comentarios de la prioridad:', error);
            }

            // Sincronizar estado inicial
            const azureState = mapAppStateToAzureDevOpsState(priority.status);
            if (azureState !== 'Active') {
              try {
                await client.updateWorkItemState(workItem.id, azureState);
              } catch (error) {
                console.error('Error sincronizando estado inicial:', error);
              }
            }

            // Crear vínculo en la base de datos
            await AzureDevOpsWorkItem.create({
              userId: (session.user as any).id,
              priorityId: priority._id,
              workItemId: workItem.id,
              workItemType: workItemType,
              organization: config.organization,
              project: config.project,
              lastSyncedState: azureState
            });

            syncResults.exported.created++;
            syncResults.exported.workItems.push(exportedWorkItem);
          } catch (error) {
            console.error(`Error exportando prioridad ${priority._id}:`, error);
            syncResults.exported.errors.push({
              priorityId: priority._id,
              title: priority.title,
              error: error instanceof Error ? error.message : 'Error desconocido'
            });
          }
        }
      } catch (error) {
        console.error('Error en exportación de prioridades no vinculadas:', error);
        syncResults.exported.errors.push({
          error: error instanceof Error ? error.message : 'Error desconocido'
        });
      }
    }

    // Actualizar fecha de última sincronización en la configuración
    await AzureDevOpsConfig.findByIdAndUpdate(config._id, {
      lastSyncDate: new Date()
    });

    return NextResponse.json({
      success: true,
      message: 'Sincronización completada',
      results: syncResults
    });
  } catch (error) {
    console.error('Error en sincronización:', error);
    return NextResponse.json(
      { error: 'Error al sincronizar con Azure DevOps' },
      { status: 500 }
    );
  }
}
