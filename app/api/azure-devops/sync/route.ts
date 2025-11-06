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

          // Obtener prioridad actual
          const priority = await Priority.findById(link.priorityId);
          if (!priority) {
            continue;
          }

          let needsUpdate = false;
          const updates: any = {};

          // Sincronizar estado si cambió
          if (currentAdoState !== link.lastSyncedState) {
            // Mapear a estado de la app
            const newAppState = mapAzureDevOpsStateToAppState(
              currentAdoState,
              config.stateMapping
            );

            updates.status = newAppState;
            if (newAppState === 'COMPLETADO') {
              updates.completionPercentage = 100;
            }

            needsUpdate = true;

            // Actualizar último estado sincronizado
            link.lastSyncedState = currentAdoState;
            link.lastSyncDate = new Date();
            await link.save();

            syncResults.fromAzureDevOps.updated++;
          }

          // Sincronizar tareas del checklist desde Azure DevOps
          const childTasks = await client.getChildTasks(link.workItemId);
          if (childTasks.length > 0) {
            // Crear mapa de tareas locales por título
            const localChecklistMap = new Map(
              (priority.checklist || []).map((item: any) => [item.text, item])
            );

            let checklistUpdated = false;
            const updatedChecklist = [...(priority.checklist || [])];

            for (const adoTask of childTasks) {
              const taskTitle = adoTask.fields['System.Title'];
              const taskIsClosed = adoTask.fields['System.State'] === 'Done' ||
                                  adoTask.fields['System.State'] === 'Closed';
              const localTask = localChecklistMap.get(taskTitle);

              if (!localTask) {
                // La tarea existe en Azure pero NO localmente → AGREGAR
                updatedChecklist.push({
                  text: taskTitle,
                  completed: taskIsClosed,
                  createdAt: new Date()
                });
                checklistUpdated = true;
                console.log(`⬇️ [Sync from Azure] Tarea agregada al checklist local: ${taskTitle}`);
              } else if (localTask.completed !== taskIsClosed) {
                // La tarea existe pero el estado de completado difiere → ACTUALIZAR
                const index = updatedChecklist.findIndex((item: any) => item.text === taskTitle);
                if (index !== -1) {
                  updatedChecklist[index] = {
                    ...updatedChecklist[index],
                    completed: taskIsClosed
                  };
                  checklistUpdated = true;
                  console.log(`⬇️ [Sync from Azure] Tarea actualizada: ${taskTitle} (${taskIsClosed ? 'completada' : 'pendiente'})`);
                }
              }
            }

            if (checklistUpdated) {
              updates.checklist = updatedChecklist;
              needsUpdate = true;
            }
          }

          // Aplicar actualizaciones si hay cambios
          if (needsUpdate) {
            await Priority.findByIdAndUpdate(link.priorityId, updates);
          }

          // Sincronizar comentarios desde Azure DevOps
          try {
            console.log(`🔍 [Comentarios from-ado] Obteniendo comentarios de WI ${link.workItemId}`);
            const azureComments = await client.getComments(link.workItemId);
            console.log(`📊 [Comentarios from-ado] Total comentarios en Azure: ${azureComments.length}`);

            if (azureComments.length > 0) {
              // Obtener IDs de comentarios de Azure ya sincronizados
              const syncedAzureCommentIds = await Comment.find({
                priorityId: link.priorityId,
                azureCommentId: { $exists: true, $ne: null }
              }).distinct('azureCommentId');

              console.log(`📊 [Comentarios from-ado] Comentarios ya sincronizados: ${syncedAzureCommentIds.length}`);
              console.log(`📋 [Comentarios from-ado] IDs sincronizados:`, syncedAzureCommentIds);

              const syncedIds = new Set(syncedAzureCommentIds.map(id => Number(id)));

              // Filtrar comentarios que aún no se han sincronizado
              const newAzureComments = azureComments.filter(c => !syncedIds.has(c.id));
              console.log(`📊 [Comentarios from-ado] Comentarios nuevos por sincronizar: ${newAzureComments.length}`);

              if (newAzureComments.length > 0) {
                console.log(`⬇️ [Azure DevOps] Sincronizando ${newAzureComments.length} comentarios desde WI ${link.workItemId}`);

                // Buscar o crear usuario del sistema para comentarios de Azure (fuera del loop)
                let systemUser = await User.findOne({ email: 'azure-devops@system.local' });
                if (!systemUser) {
                  console.log('⚙️ [Azure DevOps] Creando usuario del sistema para comentarios...');
                  try {
                    const bcryptjs = require('bcryptjs');
                    const hashedPassword = await bcryptjs.hash('SYSTEM_USER_NO_LOGIN', 10);

                    systemUser = await User.create({
                      name: 'Azure DevOps',
                      email: 'azure-devops@system.local',
                      password: hashedPassword,
                      role: 'USER',
                      isActive: false, // Usuario no puede iniciar sesión
                      area: 'Sistema' // Área especial para usuario del sistema
                    });
                    console.log('✅ [Azure DevOps] Usuario del sistema creado exitosamente');
                  } catch (userCreateError) {
                    console.error('❌ [Azure DevOps] Error creando usuario del sistema:', userCreateError);
                    throw userCreateError;
                  }
                }

                for (const azureComment of newAzureComments) {
                  // Crear comentario local
                  const commentText = `[Azure DevOps - ${azureComment.createdBy?.displayName || 'Usuario'}]\n${azureComment.text}`;

                  try {
                    console.log(`⬇️ [Comentarios from-ado] Creando comentario local para Azure ID: ${azureComment.id}`);

                    await Comment.create({
                      priorityId: link.priorityId,
                      userId: systemUser._id,
                      text: commentText,
                      isSystemComment: true, // Marcar como comentario del sistema
                      azureCommentId: azureComment.id,
                      createdAt: new Date(azureComment.createdDate)
                    });

                    console.log(`✅ [Azure DevOps] Comentario sincronizado: ${azureComment.id} - ${commentText.substring(0, 50)}...`);
                  } catch (commentCreateError) {
                    console.error(`❌ [Azure DevOps] Error creando comentario ${azureComment.id}:`, commentCreateError);
                  }
                }

                syncResults.fromAzureDevOps.updated++;
              } else {
                console.log(`✅ [Comentarios from-ado] No hay comentarios nuevos por sincronizar para WI ${link.workItemId}`);
              }
            } else {
              console.log(`ℹ️ [Comentarios from-ado] No hay comentarios en Azure para WI ${link.workItemId}`);
            }
          } catch (commentSyncError) {
            console.error(`❌ [Comentarios from-ado] Error sincronizando comentarios desde Azure DevOps (WI ${link.workItemId}):`, commentSyncError);
            // No fallar la sincronización completa si falla la sincronización de comentarios
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

          // Sincronizar tareas del checklist
          if (priority.checklist && priority.checklist.length > 0) {
            // Obtener child tasks de Azure DevOps
            const childTasks = await client.getChildTasks(link.workItemId);

            // Crear mapa de tareas existentes en Azure DevOps por título
            const adoTasksMap = new Map(
              childTasks.map(task => [task.fields['System.Title'], task])
            );

            for (const checklistItem of priority.checklist) {
              const adoTask = adoTasksMap.get((checklistItem as any).text);

              if (adoTask) {
                // La tarea YA EXISTE en Azure DevOps
                const taskState = adoTask.fields['System.State'];
                const taskIsClosed = taskState === 'Done' || taskState === 'Closed';

                if (checklistItem.completed && !taskIsClosed) {
                  // Tarea completada localmente pero NO cerrada en Azure DevOps → CERRAR
                  const hours = taskHours[adoTask.id] || 0;

                  // Cerrar tarea con horas
                  await client.closeTaskWithHours(adoTask.id, hours);

                  console.log(`✅ [Azure DevOps] Tarea cerrada: ${adoTask.id} - ${(checklistItem as any).text} (${hours}h)`);
                  syncResults.toAzureDevOps.updated++;
                } else if (!checklistItem.completed && taskIsClosed) {
                  // Tarea NO completada localmente pero SÍ cerrada en Azure DevOps → REABRIR
                  await client.reopenTask(adoTask.id);

                  console.log(`🔄 [Azure DevOps] Tarea reabierta: ${adoTask.id} - ${(checklistItem as any).text}`);
                  syncResults.toAzureDevOps.updated++;
                }
              } else {
                // La tarea NO EXISTE en Azure DevOps - CREAR NUEVA
                const taskId = `local-${(checklistItem as any)._id || (checklistItem as any).text}`;
                const hours = taskHours[taskId] || 0;

                // Crear la tarea en Azure DevOps
                const newTask = await client.createChildTask(
                  link.workItemId,
                  (checklistItem as any).text,
                  '', // descripción vacía
                  hours
                );

                console.log(`✨ [Azure DevOps] Tarea creada: ${newTask.id} - ${(checklistItem as any).text}`);

                // Si la tarea está completada localmente, cerrarla inmediatamente
                if (checklistItem.completed && hours > 0) {
                  await client.closeTaskWithHours(newTask.id, hours);
                  console.log(`✓ [Azure DevOps] Tarea cerrada inmediatamente: ${newTask.id}`);
                }

                syncResults.toAzureDevOps.updated++;
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

          // Sincronizar comentarios nuevos desde la última sincronización
          try {
            const lastCommentSync = link.lastCommentSyncDate || new Date(0); // Si nunca se han sincronizado, usar fecha muy antigua
            console.log(`🔍 [Comentarios to-ado] Buscando comentarios después de ${lastCommentSync.toISOString()} para WI ${link.workItemId}`);

            // Obtener comentarios nuevos desde la última sincronización (solo los locales, no los que vienen de Azure)
            const newComments = await Comment.find({
              priorityId: link.priorityId,
              createdAt: { $gt: lastCommentSync },
              azureCommentId: { $exists: false } // Excluir comentarios que ya vienen de Azure
            })
              .populate('userId', 'name')
              .sort({ createdAt: 1 })
              .lean();

            console.log(`📊 [Comentarios to-ado] Encontrados ${newComments.length} comentarios para sincronizar`);

            if (newComments.length > 0) {
              console.log(`💬 [Azure DevOps] Sincronizando ${newComments.length} comentarios nuevos para WI ${link.workItemId}`);

              for (const comment of newComments) {
                const userName = (comment.userId as any)?.name || 'Usuario';
                const commentText = comment.isSystemComment
                  ? `🤖 [Sistema] ${comment.text}`
                  : `💬 [${userName}] ${comment.text}`;

                try {
                  console.log(`⬆️ [Comentarios to-ado] Enviando: ${commentText.substring(0, 50)}...`);

                  // Agregar comentario a Azure DevOps y obtener el ID asignado
                  const azureCommentResult = await client.addComment(link.workItemId, commentText);
                  console.log(`✅ [Azure DevOps] Comentario creado con ID: ${azureCommentResult.id}`);

                  // Actualizar el comentario local con el ID de Azure para evitar duplicados
                  await Comment.findByIdAndUpdate(comment._id, {
                    azureCommentId: azureCommentResult.id
                  });
                  console.log(`✅ [Azure DevOps] azureCommentId guardado: ${azureCommentResult.id} para comentario local ${comment._id}`);
                } catch (commentError) {
                  console.error(`❌ [Comentarios to-ado] Error agregando comentario a WI ${link.workItemId}:`, commentError);
                }
              }

              // Actualizar fecha de última sincronización de comentarios
              link.lastCommentSyncDate = new Date();
              await link.save();
              console.log(`✅ [Comentarios to-ado] lastCommentSyncDate actualizada para WI ${link.workItemId}`);
            }
          } catch (commentSyncError) {
            console.error(`❌ [Comentarios to-ado] Error sincronizando comentarios para WI ${link.workItemId}:`, commentSyncError);
            // No fallar la sincronización completa si falla la sincronización de comentarios
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
                    (checklistItem as any).text,
                    undefined, // description
                    userEmail || undefined // assignedTo - asignar tarea al usuario
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
