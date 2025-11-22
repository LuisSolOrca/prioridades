import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import connectDB from '@/lib/mongodb';
import SlackIntegration from '@/models/SlackIntegration';

/**
 * GET /api/slack/status
 * Obtiene el estado de la integración organizacional de Slack
 */
export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    await connectDB();

    // Buscar la integración organizacional (única)
    const slackIntegration = await SlackIntegration.findOne({
      isActive: true,
    })
    .populate('configuredBy', 'name email')
    .lean();

    if (!slackIntegration) {
      return NextResponse.json({
        connected: false,
        isAdmin: session.user.role === 'ADMIN',
      });
    }

    return NextResponse.json({
      connected: true,
      workspace: {
        id: slackIntegration.slackTeamId,
        name: slackIntegration.slackTeamName,
      },
      configuredBy: slackIntegration.configuredBy,
      isAdmin: session.user.role === 'ADMIN',
    });
  } catch (error) {
    console.error('Error en /api/slack/status:', error);
    return NextResponse.json(
      { error: 'Error obteniendo estado de Slack' },
      { status: 500 }
    );
  }
}
