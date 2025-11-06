import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import connectDB from '@/lib/mongodb';
import AzureDevOpsConfig from '@/models/AzureDevOpsConfig';
import AzureDevOpsWorkItem from '@/models/AzureDevOpsWorkItem';
import Priority from '@/models/Priority';
import { AzureDevOpsClient, mapAppStateToAzureDevOpsState } from '@/lib/azureDevOps';

/**
 * POST - Exporta una prioridad existente a Azure DevOps
 * Crea un work item con sus tareas del checklist y enlaces de evidencia
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
    const { priorityId, workItemType = 'User Story' } = body;
    // workItemType: 'User Story' o 'Bug'

    if (!priorityId) {
      return NextResponse.json(
        { error: 'Se requiere priorityId' },
        { status: 400 }
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

    // Verificar que la prioridad no esté ya vinculada
    const existingLink = await AzureDevOpsWorkItem.findOne({
      priorityId: priorityId
    });

    if (existingLink) {
      return NextResponse.json(
        { error: 'Esta prioridad ya está vinculada a un work item de Azure DevOps' },
        { status: 400 }
      );
    }

    // Obtener la prioridad
    const priority = await Priority.findById(priorityId);

    if (!priority) {
      return NextResponse.json(
        { error: 'Prioridad no encontrada' },
        { status: 404 }
      );
    }

    // Verificar que la prioridad pertenezca al usuario
    if (priority.userId.toString() !== (session.user as any).id) {
      return NextResponse.json(
        { error: 'No tienes permiso para exportar esta prioridad' },
        { status: 403 }
      );
    }

    // Crear cliente de Azure DevOps
    const client = new AzureDevOpsClient({
      organization: config.organization,
      project: config.project,
      personalAccessToken: config.personalAccessToken
    });

    const exportResults = {
      workItem: null as any,
      tasks: [] as any[],
      links: [] as any[],
      errors: [] as any[]
    };

    try {
      // 1. Crear el work item principal
      const workItem = await client.createWorkItem(
        workItemType,
        priority.title,
        priority.description
      );

      exportResults.workItem = {
        id: workItem.id,
        type: workItemType,
        title: priority.title,
        url: workItem.url
      };

      // 2. Crear tareas del checklist si existen
      if (priority.checklist && priority.checklist.length > 0) {
        for (const checklistItem of priority.checklist) {
          try {
            const task = await client.createChildTask(
              workItem.id,
              (checklistItem as any).text
            );

            exportResults.tasks.push({
              id: task.id,
              title: (checklistItem as any).text,
              completed: (checklistItem as any).completed
            });

            // Si la tarea ya estaba completada, cerrarla en Azure DevOps
            if ((checklistItem as any).completed) {
              await client.closeTaskWithHours(task.id, 0);
            }
          } catch (error) {
            console.error('Error creando tarea del checklist:', error);
            exportResults.errors.push({
              type: 'checklist_task',
              item: (checklistItem as any).text,
              error: error instanceof Error ? error.message : 'Error desconocido'
            });
          }
        }
      }

      // 3. Agregar enlaces de evidencia como comentarios
      if (priority.evidenceLinks && priority.evidenceLinks.length > 0) {
        const linksText = priority.evidenceLinks
          .map((link: any) => `${link.title}: ${link.url}`)
          .join('\n');

        try {
          await client.addComment(
            workItem.id,
            `Enlaces de evidencia:\n${linksText}`
          );

          exportResults.links = priority.evidenceLinks.map((link: any) => ({
            title: link.title,
            url: link.url
          }));
        } catch (error) {
          console.error('Error agregando enlaces de evidencia:', error);
          exportResults.errors.push({
            type: 'evidence_links',
            error: error instanceof Error ? error.message : 'Error desconocido'
          });
        }
      }

      // 4. Sincronizar estado inicial
      const azureState = mapAppStateToAzureDevOpsState(priority.status);
      if (azureState !== 'Active') {
        try {
          await client.updateWorkItemState(workItem.id, azureState);
        } catch (error) {
          console.error('Error sincronizando estado inicial:', error);
          exportResults.errors.push({
            type: 'initial_state',
            error: error instanceof Error ? error.message : 'Error desconocido'
          });
        }
      }

      // 5. Crear vínculo en la base de datos
      await AzureDevOpsWorkItem.create({
        userId: (session.user as any).id,
        priorityId: priority._id,
        workItemId: workItem.id,
        workItemType: workItemType,
        organization: config.organization,
        project: config.project,
        lastSyncedState: azureState
      });

      return NextResponse.json({
        success: true,
        message: 'Prioridad exportada a Azure DevOps exitosamente',
        results: exportResults
      });
    } catch (error) {
      console.error('Error exportando prioridad a Azure DevOps:', error);
      return NextResponse.json(
        {
          error: 'Error al exportar la prioridad a Azure DevOps',
          details: error instanceof Error ? error.message : 'Error desconocido'
        },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Error en exportación:', error);
    return NextResponse.json(
      { error: 'Error al procesar la solicitud de exportación' },
      { status: 500 }
    );
  }
}
