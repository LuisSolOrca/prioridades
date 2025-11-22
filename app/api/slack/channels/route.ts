import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import connectDB from '@/lib/mongodb';
import SlackIntegration from '@/models/SlackIntegration';
import { getSlackChannels } from '@/lib/slack';

/**
 * GET /api/slack/channels
 * Obtiene la lista de canales de Slack disponibles (usa integración organizacional)
 */
export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    await connectDB();

    // Buscar integración organizacional de Slack (única)
    const slackIntegration = await SlackIntegration.findOne({
      isActive: true,
    }).lean();

    if (!slackIntegration) {
      return NextResponse.json(
        { error: 'No hay una integración de Slack configurada para la organización' },
        { status: 404 }
      );
    }

    // Obtener canales
    const result = await getSlackChannels(slackIntegration.accessToken);

    if (!result.success) {
      return NextResponse.json(
        { error: 'Error obteniendo canales de Slack', details: result.error },
        { status: 500 }
      );
    }

    return NextResponse.json({
      channels: result.channels,
      workspace: {
        id: slackIntegration.slackTeamId,
        name: slackIntegration.slackTeamName,
      },
    });
  } catch (error) {
    console.error('Error en /api/slack/channels:', error);
    return NextResponse.json(
      { error: 'Error obteniendo canales' },
      { status: 500 }
    );
  }
}
