import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import connectDB from '@/lib/mongodb';
import SlackIntegration from '@/models/SlackIntegration';

/**
 * POST /api/slack/disconnect
 * Desconecta la integración de Slack del usuario
 */
export async function POST() {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    await connectDB();

    // Desactivar integración
    const result = await SlackIntegration.findOneAndUpdate(
      { userId: session.user.id },
      { isActive: false },
      { new: true }
    );

    if (!result) {
      return NextResponse.json(
        { error: 'No se encontró integración de Slack' },
        { status: 404 }
      );
    }

    console.log(`✅ Slack desconectado para usuario ${session.user.id}`);

    return NextResponse.json({
      message: 'Integración de Slack desconectada exitosamente',
    });
  } catch (error) {
    console.error('Error en /api/slack/disconnect:', error);
    return NextResponse.json(
      { error: 'Error desconectando Slack' },
      { status: 500 }
    );
  }
}
