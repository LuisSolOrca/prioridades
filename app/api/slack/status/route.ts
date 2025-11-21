import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import connectDB from '@/lib/mongodb';
import SlackIntegration from '@/models/SlackIntegration';

/**
 * GET /api/slack/status
 * Obtiene el estado de la integración de Slack del usuario
 */
export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    await connectDB();

    const slackIntegration = await SlackIntegration.findOne({
      userId: session.user.id,
    }).lean();

    if (!slackIntegration) {
      return NextResponse.json({
        connected: false,
      });
    }

    return NextResponse.json({
      connected: slackIntegration.isActive,
      workspace: {
        id: slackIntegration.slackTeamId,
        name: slackIntegration.slackTeamName,
      },
      slackUserId: slackIntegration.slackUserId,
    });
  } catch (error) {
    console.error('Error en /api/slack/status:', error);
    return NextResponse.json(
      { error: 'Error obteniendo estado de Slack' },
      { status: 500 }
    );
  }
}
