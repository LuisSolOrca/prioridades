import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { getNextResetDate } from '@/lib/gamification';

/**
 * GET /api/leaderboard/next-reset
 * Obtiene la fecha del próximo reseteo del leaderboard mensual
 */
export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const nextResetDate = getNextResetDate();

    // Calcular días restantes
    const now = new Date();
    const diffTime = nextResetDate.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    return NextResponse.json({
      nextResetDate: nextResetDate.toISOString(),
      formattedDate: nextResetDate.toLocaleDateString('es-MX', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      }),
      formattedTime: nextResetDate.toLocaleTimeString('es-MX', {
        hour: '2-digit',
        minute: '2-digit',
      }),
      daysUntilReset: diffDays,
    });
  } catch (error) {
    console.error('Error obteniendo próxima fecha de reset:', error);
    return NextResponse.json(
      { error: 'Error obteniendo fecha de reset' },
      { status: 500 }
    );
  }
}
