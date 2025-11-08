import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import connectDB from '@/lib/mongodb';
import Priority from '@/models/Priority';
import AzureDevOpsWorkItem from '@/models/AzureDevOpsWorkItem';
import AzureDevOpsConfig from '@/models/AzureDevOpsConfig';
import { AzureDevOpsClient, mapAppStateToAzureDevOpsState } from '@/lib/azureDevOps';
import { notifyStatusChange, notifyPriorityUnblocked, notifyCompletionMilestone, notifyWeekCompleted } from '@/lib/notifications';
import { awardBadge } from '@/lib/gamification';
import { executeWorkflowsForPriority } from '@/lib/workflows';

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
    const priority = await Priority.findById(id).lean();

    if (!priority) {
      return NextResponse.json({ error: 'Prioridad no encontrada' }, { status: 404 });
    }

    // Verificar que el usuario solo vea sus propias prioridades (a menos que sea admin)
    if ((session.user as any).role !== 'ADMIN' && priority.userId.toString() !== (session.user as any).id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    }

    // Obtener información de Azure DevOps si existe
    const azureDevOpsLink = await AzureDevOpsWorkItem.findOne({ priorityId: id }).lean() as any;

    const priorityWithAzureDevOps = {
      ...priority,
      azureDevOps: azureDevOpsLink ? {
        workItemId: azureDevOpsLink.workItemId,
        workItemType: azureDevOpsLink.workItemType,
        organization: azureDevOpsLink.organization,
        project: azureDevOpsLink.project,
        lastSyncDate: azureDevOpsLink.lastSyncDate
      } : null
    };

    return NextResponse.json(priorityWithAzureDevOps);
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
    let priority = await Priority.findById(id);

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
    const oldChecklistLength = priority.checklist?.length || 0;
    const oldChecklist = JSON.stringify(priority.checklist || []);
    const oldWeekStart = priority.weekStart.toISOString();
    const oldWeekEnd = priority.weekEnd.toISOString();

    // Detectar si se cambió la semana
    const weekChanged = body.weekStart && body.weekEnd && (
      new Date(body.weekStart).toISOString() !== oldWeekStart ||
      new Date(body.weekEnd).toISOString() !== oldWeekEnd
    );

    // Si se cambió la semana y la prioridad NO está completada ni reprogramada, crear copia y marcar original como REPROGRAMADO
    if (weekChanged && priority.status !== 'COMPLETADO' && priority.status !== 'REPROGRAMADO') {
      // Marcar la prioridad original como REPROGRAMADO
      await Priority.findByIdAndUpdate(
        id,
        {
          status: 'REPROGRAMADO',
          wasEdited: true,
          lastEditedAt: new Date(),
          updatedAt: new Date()
        },
        { new: true, runValidators: true }
      );

      // Crear una copia para la nueva semana
      const newPriority = new Priority({
        title: priority.title,
        description: priority.description,
        weekStart: new Date(body.weekStart),
        weekEnd: new Date(body.weekEnd),
        completionPercentage: 0, // Resetear progreso
        status: 'EN_TIEMPO',
        userId: priority.userId,
        initiativeIds: body.initiativeIds || priority.initiativeIds,
        clientId: body.clientId || priority.clientId,
        checklist: priority.checklist?.map(item => ({ text: item.text, completed: false })) || [],
        evidenceLinks: [],
        wasEdited: false,
        isCarriedOver: true
      });

      const savedPriority = await newPriority.save();

      // Retornar la nueva prioridad
      return NextResponse.json(savedPriority);
    }

    // Preparar datos para actualizar (si no se cambió la semana)
    const updateData: any = {
      ...body,
      wasEdited: true,
      lastEditedAt: new Date(),
      updatedAt: new Date()
    };

    // Si se marca como COMPLETADO, automáticamente completar al 100%
    if (body.status === 'COMPLETADO' && body.completionPercentage !== 100) {
      updateData.completionPercentage = 100;
    }

    // Solo manejar initiativeIds si viene en el body
    if (body.initiativeIds !== undefined || body.initiativeId !== undefined) {
      let initiativeIds = body.initiativeIds || [];
      if (body.initiativeId && initiativeIds.length === 0) {
        initiativeIds = [body.initiativeId];
      }
      updateData.initiativeIds = initiativeIds;
    }

    // Permitir reasignación de usuario solo para admins
    if (body.userId && (session.user as any).role === 'ADMIN') {
      updateData.userId = body.userId;
    }

    // Asegurar que clientId se actualice si viene en el body
    if (body.clientId !== undefined) {
      updateData.clientId = body.clientId;
    }

    // Si hay checklist en el body, necesitamos actualizar usando $set para forzar la actualización de subdocumentos
    if (body.checklist) {
      // Usar updateOne con $set para forzar actualización completa del array y otros campos
      delete updateData.checklist; // Remover checklist del updateData antes de usarlo en $set
      await Priority.updateOne(
        { _id: id },
        {
          $set: {
            checklist: body.checklist,
            ...updateData // Incluir todos los demás campos en el $set
          }
        }
      );
      // Recargar el documento con todos los cambios
      const updatedPriority = await Priority.findById(id);
      priority = updatedPriority!;
    } else {
      // Sin checklist, actualización normal
      Object.assign(priority, updateData);
      await priority.save();
    }

    const updatedPriority = priority;

    // Otorgar badge de FIRST_TASK si agregó su primera tarea
    if (body.checklist && Array.isArray(body.checklist) && body.checklist.length > 0 && oldChecklistLength === 0) {
      try {
        // Verificar si el usuario tiene alguna tarea previa en todas sus prioridades
        // Badge FIRST_TASK removido - ya no existe en el nuevo sistema de badges
        // El badge PRIMERA_VICTORIA se otorga automáticamente cuando se completa la primera prioridad
      } catch (badgeError) {
        console.error('[BADGE] Error checking for badges:', badgeError);
      }
    }

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
      // Solo notificar el hito más alto alcanzado para evitar spam
      if (body.completionPercentage !== undefined && body.completionPercentage !== oldCompletionPercentage) {
        const milestones = [25, 50, 75, 100];
        let highestMilestoneReached = null;

        for (const milestone of milestones) {
          if (oldCompletionPercentage < milestone && body.completionPercentage >= milestone) {
            highestMilestoneReached = milestone;
          }
        }

        // Solo notificar si se alcanzó algún hito
        if (highestMilestoneReached !== null) {
          await notifyCompletionMilestone(
            priority.userId.toString(),
            priority.title,
            highestMilestoneReached,
            id
          );
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

    // Sincronización automática con Azure DevOps
    try {
      // Detectar si el checklist cambió realmente
      const newChecklist = JSON.stringify(body.checklist || []);
      const checklistChanged = body.checklist && newChecklist !== oldChecklist;

      // Solo sincronizar si el estado cambió o el checklist cambió
      const shouldSync = (body.status && body.status !== oldStatus) || checklistChanged;

      console.log(`🔍 [Azure DevOps Sync] Detección de cambios:`, {
        statusChanged: body.status && body.status !== oldStatus,
        checklistChanged,
        shouldSync,
        oldChecklistLength,
        newChecklistLength: body.checklist?.length || 0
      });

      if (shouldSync) {
        // Verificar si hay vínculo con Azure DevOps
        const adoLink = await AzureDevOpsWorkItem.findOne({ priorityId: id });

        if (adoLink) {
          // Obtener configuración de Azure DevOps
          const adoConfig = await AzureDevOpsConfig.findOne({
            userId: priority.userId,
            isActive: true
          });

          if (adoConfig && adoConfig.syncEnabled) {
            const client = new AzureDevOpsClient({
              organization: adoConfig.organization,
              project: adoConfig.project,
              personalAccessToken: adoConfig.personalAccessToken
            });

            // Sincronizar estado si cambió
            if (body.status && body.status !== oldStatus) {
              const newAdoState = mapAppStateToAzureDevOpsState(body.status);

              try {
                await client.updateWorkItemState(adoLink.workItemId, newAdoState);

                // Actualizar último estado sincronizado
                adoLink.lastSyncedState = newAdoState;
                adoLink.lastSyncDate = new Date();
                await adoLink.save();

                console.log(`🔄 [Azure DevOps] Sincronizado estado de WI ${adoLink.workItemId}: ${body.status} → ${newAdoState}`);
              } catch (adoSyncError) {
                console.error(`Error sincronizando estado a Azure DevOps:`, adoSyncError);

                // Registrar error en el vínculo
                adoLink.syncErrors.push({
                  error: adoSyncError instanceof Error ? adoSyncError.message : 'Error desconocido',
                  date: new Date()
                });
                await adoLink.save();
              }
            }

            // Sincronizar tareas del checklist (reapertura automática, cierre con horas)
            if (body.checklist && Array.isArray(body.checklist)) {
              try {
                const childTasks = await client.getChildTasks(adoLink.workItemId);
                let tasksReopenedCount = 0;
                let tasksClosedCount = 0;

                for (const checklistItem of body.checklist) {
                  // Buscar tarea correspondiente en Azure DevOps
                  const correspondingTask = childTasks.find(task =>
                    task.fields['System.Title'] === (checklistItem as any).text
                  );

                  if (correspondingTask) {
                    const taskState = correspondingTask.fields['System.State'];
                    const taskIsClosed = taskState === 'Done' || taskState === 'Closed';

                    if (checklistItem.completed && !taskIsClosed) {
                      // Tarea completada localmente pero NO cerrada en Azure DevOps
                      // Cerrar automáticamente solo si tiene horas registradas
                      const hours = (checklistItem as any).completedHours || 0;
                      if (hours > 0) {
                        await client.closeTaskWithHours(correspondingTask.id, hours);
                        console.log(`✅ [Azure DevOps] Tarea cerrada automáticamente: ${correspondingTask.id} - ${correspondingTask.fields['System.Title']} (${hours}h)`);
                        tasksClosedCount++;
                      }
                    } else if (!checklistItem.completed && taskIsClosed) {
                      // Tarea NO completada localmente pero SÍ cerrada en Azure DevOps - reabrirla
                      await client.reopenTask(correspondingTask.id);
                      console.log(`🔄 [Azure DevOps] Tarea reabierta automáticamente: ${correspondingTask.id} - ${correspondingTask.fields['System.Title']}`);
                      tasksReopenedCount++;
                    }
                  }
                }

                // Si se reabrió alguna tarea, reabrir también la historia principal si está cerrada
                if (tasksReopenedCount > 0) {
                  const currentWorkItem = await client.getWorkItem(adoLink.workItemId);
                  const workItemState = currentWorkItem.fields['System.State'];
                  const workItemIsClosed = workItemState === 'Done' || workItemState === 'Closed' || workItemState === 'Resolved';

                  if (workItemIsClosed) {
                    await client.updateWorkItemState(adoLink.workItemId, 'Active');
                    console.log(`🔄 [Azure DevOps] Historia reabierta automáticamente: ${adoLink.workItemId} (${workItemState} → Active)`);
                  }
                }
              } catch (adoTaskError) {
                console.error('Error reabriendo tareas en Azure DevOps:', adoTaskError);
              }
            }
          }
        }
      }
    } catch (adoError) {
      console.error('Error en sincronización con Azure DevOps:', adoError);
      // No fallar la actualización de la prioridad si falla la sincronización
    }

    // Ejecutar workflows basados en eventos
    try {
      // Disparar workflow general de actualización (se ejecuta siempre que se edita)
      await executeWorkflowsForPriority(
        id,
        'priority_updated',
        oldStatus,
        oldCompletionPercentage
      );

      // Disparar workflows por cambio de estado
      if (body.status && body.status !== oldStatus) {
        await executeWorkflowsForPriority(
          id,
          'priority_status_change',
          oldStatus,
          oldCompletionPercentage
        );
      }

      // Disparar workflows por % completado bajo
      if (body.completionPercentage !== undefined &&
          body.completionPercentage < 50 &&
          oldCompletionPercentage >= 50) {
        await executeWorkflowsForPriority(
          id,
          'completion_low',
          oldStatus,
          oldCompletionPercentage
        );
      }

      // Disparar workflows por prioridad atrasada
      const now = new Date();
      const weekEnd = new Date(priority.weekEnd);
      if (now > weekEnd && body.status !== 'COMPLETADO') {
        await executeWorkflowsForPriority(
          id,
          'priority_overdue',
          oldStatus,
          oldCompletionPercentage
        );
      }
    } catch (workflowError) {
      console.error('Error ejecutando workflows:', workflowError);
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

    // Eliminar vínculos de Azure DevOps si existen
    try {
      const deletedLinks = await AzureDevOpsWorkItem.deleteMany({ priorityId: id });
      if (deletedLinks.deletedCount > 0) {
        console.log(`🔗 Eliminados ${deletedLinks.deletedCount} vínculos de Azure DevOps para la prioridad ${id}`);
      }
    } catch (adoError) {
      console.error('Error eliminando vínculos de Azure DevOps:', adoError);
      // No fallar la eliminación de la prioridad si falla la limpieza de vínculos
    }

    await Priority.findByIdAndDelete(id);

    return NextResponse.json({ message: 'Prioridad eliminada exitosamente' });
  } catch (error: any) {
    console.error('Error deleting priority:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
