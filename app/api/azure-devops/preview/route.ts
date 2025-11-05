import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import connectDB from '@/lib/mongodb';
import AzureDevOpsConfig from '@/models/AzureDevOpsConfig';
import { AzureDevOpsClient, mapAzureDevOpsStateToAppState } from '@/lib/azureDevOps';

/**
 * POST - Obtiene un preview de lo que se va a importar sin crear nada
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
    const { workItemIds } = body;

    if (!workItemIds || !Array.isArray(workItemIds) || workItemIds.length === 0) {
      return NextResponse.json(
        { error: 'Debes seleccionar al menos un work item' },
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

    // Crear cliente de Azure DevOps
    const client = new AzureDevOpsClient({
      organization: config.organization,
      project: config.project,
      personalAccessToken: config.personalAccessToken
    });

    const previews = [];

    // Procesar cada work item para obtener preview
    for (const workItemId of workItemIds) {
      try {
        // Obtener detalles del work item
        const workItem = await client.getWorkItem(workItemId);

        // Obtener child tasks (tareas hijas)
        const childTasks = await client.getChildTasks(workItemId);

        // Crear checklist con las child tasks
        const checklist = childTasks.map(task => ({
          text: task.fields['System.Title'],
          completed: task.fields['System.State'] === 'Done' || task.fields['System.State'] === 'Closed'
        }));

        // Obtener enlaces de las discusiones
        const discussionLinks = await client.getWorkItemLinks(workItemId);

        // Crear enlace de evidencia al work item
        const workItemWebUrl = `https://dev.azure.com/${config.organization}/${config.project}/_workitems/edit/${workItemId}`;
        const evidenceLinks = [
          {
            title: `Azure DevOps: ${workItem.fields['System.WorkItemType']} #${workItemId}`,
            url: workItemWebUrl
          },
          ...discussionLinks
        ];

        // Mapear estado de Azure DevOps a estado de la app
        const appState = mapAzureDevOpsStateToAppState(
          workItem.fields['System.State'],
          config.stateMapping
        );

        previews.push({
          workItemId,
          title: workItem.fields['System.Title'],
          description: workItem.fields['System.Description'] || '',
          type: workItem.fields['System.WorkItemType'],
          state: workItem.fields['System.State'],
          appState,
          checklist,
          evidenceLinks,
          storyPoints: workItem.fields['Microsoft.VSTS.Scheduling.StoryPoints']
        });
      } catch (error) {
        console.error(`Error obteniendo preview para work item ${workItemId}:`, error);
        previews.push({
          workItemId,
          error: error instanceof Error ? error.message : 'Error desconocido'
        });
      }
    }

    return NextResponse.json({
      success: true,
      previews
    });
  } catch (error) {
    console.error('Error obteniendo preview:', error);
    return NextResponse.json(
      { error: 'Error al obtener preview de work items' },
      { status: 500 }
    );
  }
}
