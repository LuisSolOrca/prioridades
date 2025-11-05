import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import connectDB from '@/lib/mongodb';
import AzureDevOpsConfig from '@/models/AzureDevOpsConfig';
import { AzureDevOpsClient } from '@/lib/azureDevOps';

/**
 * GET - Obtiene los work items del usuario desde Azure DevOps
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
        { error: 'No hay configuración de Azure DevOps. Por favor configura tu conexión primero.' },
        { status: 404 }
      );
    }

    // Crear cliente de Azure DevOps
    const client = new AzureDevOpsClient({
      organization: config.organization,
      project: config.project,
      personalAccessToken: config.personalAccessToken
    });

    // Obtener work items del usuario
    const userEmail = session.user.email!;
    const workItems = await client.getMyWorkItems(userEmail);

    return NextResponse.json({
      success: true,
      workItems: workItems.map(wi => ({
        id: wi.id,
        title: wi.fields['System.Title'],
        description: wi.fields['System.Description'],
        state: wi.fields['System.State'],
        type: wi.fields['System.WorkItemType'],
        assignedTo: wi.fields['System.AssignedTo']?.displayName,
        storyPoints: wi.fields['Microsoft.VSTS.Scheduling.StoryPoints'],
        iterationPath: wi.fields['System.IterationPath'],
        areaPath: wi.fields['System.AreaPath'],
        url: wi.url
      }))
    });
  } catch (error) {
    console.error('Error al obtener work items:', error);
    return NextResponse.json(
      { error: 'Error al obtener work items de Azure DevOps' },
      { status: 500 }
    );
  }
}
