import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import connectDB from '@/lib/mongodb';
import AzureDevOpsConfig from '@/models/AzureDevOpsConfig';
import AzureDevOpsWorkItem from '@/models/AzureDevOpsWorkItem';
import Priority from '@/models/Priority';
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
    const { direction = 'both', selectedItems = [], taskHours = {} } = body;
    // direction: 'both', 'from-ado', 'to-ado'
    // selectedItems: array de workItemIds para sincronizar (vacío = todos)
    // taskHours: { [taskId]: hours } - horas por tarea completada

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
      toAzureDevOps: { updated: 0, errors: [] as any[] }
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
