import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import connectDB from '@/lib/mongodb';
import SlackIntegration from '@/models/SlackIntegration';

/**
 * POST /api/slack/disconnect
 * Desconecta la integración organizacional de Slack (solo admins)
 */
export async function POST() {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    // Solo admins pueden desconectar la integración organizacional
    if (session.user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Solo administradores pueden desconectar Slack' },
        { status: 403 }
      );
    }

    await connectDB();

    // Eliminar la integración organizacional (solo debe existir una)
    const result = await SlackIntegration.findOneAndDelete({
      isActive: true,
    });

    if (!result) {
      return NextResponse.json(
        { error: 'No se encontró integración de Slack activa' },
        { status: 404 }
      );
    }

    console.log(`✅ Slack desconectado de la organización por admin ${session.user.id}`);

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
