import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import connectDB from '@/lib/mongodb';
import AzureDevOpsConfig from '@/models/AzureDevOpsConfig';
import AzureDevOpsWorkItem from '@/models/AzureDevOpsWorkItem';
import Priority from '@/models/Priority';
import { AzureDevOpsClient, mapAzureDevOpsStateToAppState } from '@/lib/azureDevOps';

/**
 * GET - Sincronización automática desde Azure DevOps hacia la aplicación
 * Este endpoint puede ser llamado periódicamente para mantener sincronizados los estados
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
      updated: 0,
      unchanged: 0,
      errors: [] as any[]
    };

    // Obtener todos los vínculos del usuario
    const workItemLinks = await AzureDevOpsWorkItem.find({
      userId: (session.user as any).id
    });

    console.log(`🔄 [Auto-Sync] Iniciando sincronización para ${workItemLinks.length} work items`);

    // Sincronizar cada vínculo
    for (const link of workItemLinks) {
      try {
        // Obtener estado actual del work item en Azure DevOps
        const workItem = await client.getWorkItem(link.workItemId);
        const currentAdoState = workItem.fields['System.State'];

        // Obtener prioridad local
        const priority = await Priority.findById(link.priorityId);
        if (!priority) {
          syncResults.unchanged++;
          continue;
        }

        let hasChanges = false;

        // Si el estado en Azure DevOps cambió desde la última sincronización
        if (currentAdoState !== link.lastSyncedState) {
          console.log(`🔄 [Auto-Sync] WI ${link.workItemId}: ${link.lastSyncedState} → ${currentAdoState}`);

          // Mapear a estado de la app
          const newAppState = mapAzureDevOpsStateToAppState(
            currentAdoState,
            config.stateMapping
          );

          // Actualizar estado
          priority.status = newAppState;

          // Si el estado es COMPLETADO, establecer el porcentaje al 100%
          if (newAppState === 'COMPLETADO') {
            priority.completionPercentage = 100;
          }

          hasChanges = true;

          // Actualizar último estado sincronizado
          link.lastSyncedState = currentAdoState;
          link.lastSyncDate = new Date();

          console.log(`✅ [Auto-Sync] Estado actualizado: ${newAppState}`);
        }

        // Sincronizar tareas entre Azure DevOps y el checklist local (bidireccional)
        if (priority.checklist && priority.checklist.length > 0) {
          const childTasks = await client.getChildTasks(link.workItemId);

          if (childTasks.length > 0) {
            const checklistMap = new Map(
              priority.checklist.map((item: any, index: number) => [item.text, index])
            );

            for (const task of childTasks) {
              const taskTitle = task.fields['System.Title'];
              const taskIsClosed = task.fields['System.State'] === 'Done' ||
                                  task.fields['System.State'] === 'Closed';

              const checklistIndex = checklistMap.get(taskTitle);

              if (checklistIndex !== undefined) {
                const checklistItem = priority.checklist[checklistIndex];

                // Si la tarea está cerrada en Azure DevOps pero no localmente, completarla
                if (taskIsClosed && !checklistItem.completed) {
                  checklistItem.completed = true;
                  hasChanges = true;
                  console.log(`✅ [Auto-Sync] Tarea completada desde ADO: ${taskTitle}`);
                }
                // Si la tarea NO está cerrada en Azure DevOps pero SÍ está completada localmente, desmarcarla
                else if (!taskIsClosed && checklistItem.completed) {
                  checklistItem.completed = false;
                  hasChanges = true;
                  console.log(`🔄 [Auto-Sync] Tarea reabierta desde ADO: ${taskTitle}`);
                }
              }
            }
          }
        }

        // Guardar cambios si hubo alguno
        if (hasChanges) {
          await priority.save();
          await link.save();
          syncResults.updated++;
          console.log(`✅ [Auto-Sync] Prioridad ${link.priorityId} sincronizada`);
        } else {
          syncResults.unchanged++;
        }
      } catch (error) {
        console.error(`❌ [Auto-Sync] Error sincronizando WI ${link.workItemId}:`, error);

        // Registrar error en el vínculo
        link.syncErrors.push({
          error: error instanceof Error ? error.message : 'Error desconocido',
          date: new Date()
        });
        await link.save();

        syncResults.errors.push({
          workItemId: link.workItemId,
          error: error instanceof Error ? error.message : 'Error desconocido'
        });
      }
    }

    // Actualizar fecha de última sincronización en la configuración
    await AzureDevOpsConfig.findByIdAndUpdate(config._id, {
      lastSyncDate: new Date()
    });

    console.log(`✅ [Auto-Sync] Completado: ${syncResults.updated} actualizados, ${syncResults.unchanged} sin cambios, ${syncResults.errors.length} errores`);

    return NextResponse.json({
      success: true,
      message: 'Sincronización automática completada',
      results: syncResults
    });
  } catch (error) {
    console.error('❌ [Auto-Sync] Error en sincronización automática:', error);
    return NextResponse.json(
      { error: 'Error en sincronización automática' },
      { status: 500 }
    );
  }
}
