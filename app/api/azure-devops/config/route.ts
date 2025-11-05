import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import connectDB from '@/lib/mongodb';
import AzureDevOpsConfig from '@/models/AzureDevOpsConfig';
import { AzureDevOpsClient } from '@/lib/azureDevOps';

/**
 * GET - Obtiene la configuración de Azure DevOps del usuario
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

    const config = await AzureDevOpsConfig.findOne({
      userId: (session.user as any).id
    });

    if (!config) {
      return NextResponse.json({ configured: false }, { status: 200 });
    }

    // No enviar el PAT al cliente
    const { personalAccessToken, ...safeConfig } = config.toObject();

    return NextResponse.json({
      configured: true,
      config: {
        ...safeConfig,
        hasToken: !!personalAccessToken
      }
    });
  } catch (error) {
    console.error('Error al obtener configuración Azure DevOps:', error);
    return NextResponse.json(
      { error: 'Error al obtener la configuración' },
      { status: 500 }
    );
  }
}

/**
 * POST - Crea o actualiza la configuración de Azure DevOps
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
    const { organization, project, personalAccessToken, stateMapping, syncEnabled } = body;

    // Validar campos requeridos
    if (!organization || !project || !personalAccessToken) {
      return NextResponse.json(
        { error: 'Faltan campos requeridos: organization, project, personalAccessToken' },
        { status: 400 }
      );
    }

    await connectDB();

    // Verificar conexión con Azure DevOps
    const client = new AzureDevOpsClient({
      organization,
      project,
      personalAccessToken
    });

    const connectionValid = await client.testConnection();

    if (!connectionValid) {
      return NextResponse.json(
        { error: 'No se pudo conectar con Azure DevOps. Verifica tus credenciales.' },
        { status: 400 }
      );
    }

    // Crear o actualizar configuración
    const config = await AzureDevOpsConfig.findOneAndUpdate(
      { userId: (session.user as any).id },
      {
        userId: (session.user as any).id,
        organization,
        project,
        personalAccessToken,
        stateMapping: stateMapping || undefined,
        syncEnabled: syncEnabled !== undefined ? syncEnabled : true,
        isActive: true,
        updatedAt: new Date()
      },
      { upsert: true, new: true }
    );

    // No enviar el PAT al cliente
    const { personalAccessToken: _, ...safeConfig } = config.toObject();

    return NextResponse.json({
      success: true,
      message: 'Configuración guardada correctamente',
      config: safeConfig
    });
  } catch (error) {
    console.error('Error al guardar configuración Azure DevOps:', error);
    return NextResponse.json(
      { error: 'Error al guardar la configuración' },
      { status: 500 }
    );
  }
}

/**
 * DELETE - Elimina la configuración de Azure DevOps
 */
export async function DELETE(request: NextRequest) {
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

    await AzureDevOpsConfig.findOneAndDelete({
      userId: (session.user as any).id
    });

    return NextResponse.json({
      success: true,
      message: 'Configuración eliminada correctamente'
    });
  } catch (error) {
    console.error('Error al eliminar configuración Azure DevOps:', error);
    return NextResponse.json(
      { error: 'Error al eliminar la configuración' },
      { status: 500 }
    );
  }
}
