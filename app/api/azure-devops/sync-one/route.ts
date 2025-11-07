import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import connectDB from '@/lib/mongodb';
import AzureDevOpsConfig from '@/models/AzureDevOpsConfig';
import AzureDevOpsWorkItem from '@/models/AzureDevOpsWorkItem';
import Priority from '@/models/Priority';
import Comment from '@/models/Comment';
import User from '@/models/User';
import { AzureDevOpsClient, mapAzureDevOpsStateToAppState, mapAppStateToAzureDevOpsState } from '@/lib/azureDevOps';

/**
 * POST - Sincroniza una prioridad individual con Azure DevOps (bidireccional)
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
    const { priorityId, taskHours = {}, conflictResolutions = {} } = body;

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

    const syncResult = {
      fromAzureDevOps: { updated: false, changes: [] as string[] },
      toAzureDevOps: { updated: false, changes: [] as string[] }
    };

    // ========================================
    // PASO 1: Sincronizar FROM Azure DevOps
    // ========================================
    try {
      const workItem = await client.getWorkItem(link.workItemId);
      const currentAdoState = workItem.fields['System.State'];

      // Comparar estado
      const mappedAdoState = mapAzureDevOpsStateToAppState(currentAdoState, config.stateMapping);

      if (mappedAdoState !== priority.status) {
        await Priority.findByIdAndUpdate(priorityId, { status: mappedAdoState });
        syncResult.fromAzureDevOps.updated = true;
        syncResult.fromAzureDevOps.changes.push(`Estado actualizado de ${priority.status} a ${mappedAdoState}`);

        link.lastSyncedState = currentAdoState;
        link.lastSyncDate = new Date();
        await link.save();
      }

      // Sincronizar tareas del checklist desde Azure DevOps
      const childTasks = await client.getChildTasks(link.workItemId);
      const localChecklist = priority.checklist || [];
      let checklistUpdated = false;
      const updatedChecklist = [...localChecklist];

      // Actualizar estado de tareas existentes en Azure
      for (const adoTask of childTasks) {
        const taskTitle = adoTask.fields['System.Title'];
        const taskIsClosed = adoTask.fields['System.State'] === 'Done' || adoTask.fields['System.State'] === 'Closed';

        const existingTask = updatedChecklist.find((item: any) => item.text === taskTitle);

        if (!existingTask) {
          // Tarea existe en Azure pero no localmente - CONFLICTO
          // No agregamos automáticamente, se manejará en resolución de conflictos
          // Solo si el usuario resolvió agregándola en conflictResolutions
          const taskWasAddedByUser = conflictResolutions[adoTask.id.toString()] === 'add';
          if (taskWasAddedByUser) {
            // Ya fue agregada en el PASO 1.5, no hacer nada aquí
          }
        } else if (existingTask.completed !== taskIsClosed) {
          // Actualizar estado de tarea existente
          const index = updatedChecklist.findIndex((item: any) => item.text === taskTitle);
          if (index !== -1) {
            updatedChecklist[index] = {
              ...updatedChecklist[index],
              completed: taskIsClosed
            };
            checklistUpdated = true;
            syncResult.fromAzureDevOps.updated = true;
            syncResult.fromAzureDevOps.changes.push(`Tarea actualizada: ${taskTitle} (${taskIsClosed ? 'completada' : 'pendiente'})`);
          }
        }
      }

      if (checklistUpdated) {
        await Priority.findByIdAndUpdate(priorityId, { checklist: updatedChecklist });
      }

      // Sincronizar comentarios desde Azure DevOps
      const azureComments = await client.getComments(link.workItemId);

      if (azureComments.length > 0) {
        const syncedAzureCommentIds = await Comment.find({
          priorityId: priorityId,
          azureCommentId: { $exists: true, $ne: null }
        }).distinct('azureCommentId');

        const syncedIds = new Set(syncedAzureCommentIds.map(id => Number(id)));
        const newAzureComments = azureComments.filter(c => !syncedIds.has(c.id));

        if (newAzureComments.length > 0) {
          // Buscar o crear usuario del sistema
          let systemUser = await User.findOne({ email: 'azure-devops@system.local' });
          if (!systemUser) {
            const bcryptjs = require('bcryptjs');
            const hashedPassword = await bcryptjs.hash('SYSTEM_USER_NO_LOGIN', 10);

            systemUser = await User.create({
              name: 'Azure DevOps',
              email: 'azure-devops@system.local',
              password: hashedPassword,
              role: 'USER',
              isActive: false,
              area: 'Sistema'
            });
          }

          for (const azureComment of newAzureComments) {
            const commentText = `[Azure DevOps - ${azureComment.createdBy?.displayName || 'Usuario'}]\n${azureComment.text}`;

            await Comment.create({
              priorityId: priorityId,
              userId: systemUser._id,
              text: commentText,
              isSystemComment: true,
              azureCommentId: azureComment.id,
              createdAt: new Date(azureComment.createdDate)
            });

            syncResult.fromAzureDevOps.updated = true;
            syncResult.fromAzureDevOps.changes.push(`Comentario agregado desde Azure`);
          }
        }
      }
    } catch (error) {
      console.error(`Error sincronizando desde Azure (WI ${link.workItemId}):`, error);
    }

    // ========================================
    // PASO 1.5: Resolver conflictos
    // ========================================
    const deletedTaskIds = new Set<number>(); // Rastrear tareas eliminadas

    try {
      for (const [key, resolution] of Object.entries(conflictResolutions)) {
        if (key === 'state') {
          // Conflicto de estado
          if (resolution === 'local') {
            // Usar estado local → actualizar Azure
            const expectedAdoState = mapAppStateToAzureDevOpsState(priority.status);
            await client.updateWorkItemState(link.workItemId, expectedAdoState);
            syncResult.toAzureDevOps.updated = true;
            syncResult.toAzureDevOps.changes.push(`Estado actualizado en Azure (conflicto resuelto): ${expectedAdoState}`);
            link.lastSyncedState = expectedAdoState;
            await link.save();
          } else if (resolution === 'azure') {
            // Usar estado de Azure → actualizar local
            const workItem = await client.getWorkItem(link.workItemId);
            const currentAdoState = workItem.fields['System.State'];
            const mappedAdoState = mapAzureDevOpsStateToAppState(currentAdoState, config.stateMapping);
            await Priority.findByIdAndUpdate(priorityId, { status: mappedAdoState });
            syncResult.fromAzureDevOps.updated = true;
            syncResult.fromAzureDevOps.changes.push(`Estado actualizado localmente (conflicto resuelto): ${mappedAdoState}`);
            link.lastSyncedState = currentAdoState;
            await link.save();
          }
        } else {
          // Conflicto de tarea
          if (resolution === 'delete') {
            // Eliminar tarea de Azure DevOps
            const taskIdNum = Number(key);
            await client.deleteTask(taskIdNum);
            deletedTaskIds.add(taskIdNum); // Marcar como eliminada
            syncResult.toAzureDevOps.updated = true;
            syncResult.toAzureDevOps.changes.push(`Tarea eliminada de Azure (conflicto resuelto)`);
          } else if (resolution === 'add') {
            // Agregar tarea desde Azure al checklist local
            const taskIdNum = Number(key);
            const childTasks = await client.getChildTasks(link.workItemId);
            const adoTask = childTasks.find(t => t.id === taskIdNum);

            if (adoTask) {
              const taskTitle = adoTask.fields['System.Title'];
              const taskIsClosed = adoTask.fields['System.State'] === 'Done' || adoTask.fields['System.State'] === 'Closed';

              // Obtener checklist actual
              const currentPriority = await Priority.findById(priorityId).lean();
              const currentChecklist = currentPriority?.checklist || [];

              // Verificar que no exista ya
              const exists = currentChecklist.some((item: any) => item.text === taskTitle);

              if (!exists) {
                const updatedChecklist = [
                  ...currentChecklist,
                  {
                    text: taskTitle,
                    completed: taskIsClosed,
                    createdAt: new Date()
                  }
                ];

                await Priority.findByIdAndUpdate(priorityId, { checklist: updatedChecklist });
                syncResult.fromAzureDevOps.updated = true;
                syncResult.fromAzureDevOps.changes.push(`Tarea agregada desde Azure (conflicto resuelto): ${taskTitle}`);
              }
            }
          }
        }
      }
    } catch (error) {
      console.error(`Error resolviendo conflictos:`, error);
    }

    // ========================================
    // PASO 2: Sincronizar TO Azure DevOps
    // ========================================
    try {
      // Refrescar datos de la prioridad
      const refreshedPriority = await Priority.findById(priorityId).lean();
      if (!refreshedPriority) throw new Error('Prioridad no encontrada después de refresh');

      const childTasks = await client.getChildTasks(link.workItemId);

      // Filtrar tareas que fueron eliminadas en la resolución de conflictos
      const activeChildTasks = childTasks.filter(task => !deletedTaskIds.has(task.id));

      // Sincronizar checklist a Azure DevOps
      if (refreshedPriority.checklist && refreshedPriority.checklist.length > 0) {
        for (const checklistItem of refreshedPriority.checklist) {
          const adoTask = activeChildTasks.find(task => task.fields['System.Title'] === (checklistItem as any).text);

          // Buscar horas: primero por ID de Azure DevOps (si existe), luego por _id local, finalmente por texto
          let hours = 0;
          if (adoTask) {
            // Tarea existente en Azure - buscar por ID de Azure
            hours = taskHours[adoTask.id.toString()] || taskHours[(checklistItem as any)._id] || taskHours[(checklistItem as any).text] || 0;
          } else {
            // Tarea nueva - buscar por _id local o texto
            hours = taskHours[(checklistItem as any)._id] || taskHours[(checklistItem as any).text] || 0;
          }

          if (adoTask) {
            const taskIsClosed = adoTask.fields['System.State'] === 'Done' || adoTask.fields['System.State'] === 'Closed';

            // Cerrar tarea si está completada localmente
            if ((checklistItem as any).completed && !taskIsClosed) {
              await client.closeTaskWithHours(adoTask.id, hours);
              syncResult.toAzureDevOps.updated = true;
              syncResult.toAzureDevOps.changes.push(`Tarea completada en Azure: ${(checklistItem as any).text} (${hours}h)`);
            }

            // Reabrir tarea si está pendiente localmente
            if (!(checklistItem as any).completed && taskIsClosed) {
              await client.reopenTask(adoTask.id);
              syncResult.toAzureDevOps.updated = true;
              syncResult.toAzureDevOps.changes.push(`Tarea reabierta en Azure: ${(checklistItem as any).text}`);
            }
          } else {
            // Crear tarea nueva en Azure
            const newTask = await client.createChildTask(
              link.workItemId,
              (checklistItem as any).text,
              ''
            );

            // Si la tarea está completada, cerrarla siempre (con o sin horas)
            if ((checklistItem as any).completed) {
              await client.closeTaskWithHours(newTask.id, hours);
            }

            syncResult.toAzureDevOps.updated = true;
            syncResult.toAzureDevOps.changes.push(`Tarea creada en Azure: ${(checklistItem as any).text}${hours > 0 ? ` (${hours}h)` : ''}`);
          }
        }
      }

      // Sincronizar estado a Azure DevOps
      const expectedAdoState = mapAppStateToAzureDevOpsState(refreshedPriority.status);
      const currentWorkItem = await client.getWorkItem(link.workItemId);
      const currentAdoState = currentWorkItem.fields['System.State'];

      if (expectedAdoState !== currentAdoState) {
        await client.updateWorkItemState(link.workItemId, expectedAdoState);
        syncResult.toAzureDevOps.updated = true;
        syncResult.toAzureDevOps.changes.push(`Estado actualizado en Azure de ${currentAdoState} a ${expectedAdoState}`);

        link.lastSyncedState = expectedAdoState;
        link.lastSyncDate = new Date();
        await link.save();
      }

      // Sincronizar comentarios a Azure
      const lastCommentSync = link.lastCommentSyncDate || new Date(0);
      const newComments = await Comment.find({
        priorityId: priorityId,
        createdAt: { $gt: lastCommentSync },
        azureCommentId: { $exists: false }
      })
        .populate('userId', 'name')
        .sort({ createdAt: 1 })
        .lean();

      if (newComments.length > 0) {
        for (const comment of newComments) {
          const userName = (comment.userId as any)?.name || 'Usuario';
          const commentText = comment.isSystemComment
            ? `🤖 [Sistema] ${comment.text}`
            : `💬 [${userName}] ${comment.text}`;

          const azureCommentResult = await client.addComment(link.workItemId, commentText);

          // Guardar el azureCommentId
          await Comment.findByIdAndUpdate(comment._id, {
            azureCommentId: azureCommentResult.id
          });

          syncResult.toAzureDevOps.updated = true;
          syncResult.toAzureDevOps.changes.push(`Comentario sincronizado a Azure`);
        }

        link.lastCommentSyncDate = new Date();
        await link.save();
      }
    } catch (error) {
      console.error(`Error sincronizando hacia Azure (WI ${link.workItemId}):`, error);
    }

    return NextResponse.json({
      success: true,
      message: 'Sincronización completada',
      result: syncResult
    });

  } catch (error) {
    console.error('Error en sincronización individual:', error);
    return NextResponse.json(
      { error: 'Error al sincronizar con Azure DevOps' },
      { status: 500 }
    );
  }
}
