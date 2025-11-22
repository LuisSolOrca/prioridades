import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import connectDB from '@/lib/mongodb';
import { resetMonthlyPointsAndNotifyWinner } from '@/lib/gamification';

/**
 * POST /api/admin/reset-leaderboard
 * Endpoint para que administradores puedan resetear manualmente el leaderboard
 * y enviar notificaciones a los top 3 ganadores
 *
 * Solo accesible por usuarios con rol ADMIN
 */
export async function POST() {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    if (session.user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Solo administradores pueden resetear el leaderboard' },
        { status: 403 }
      );
    }

    await connectDB();

    console.log(`Admin ${session.user.email} está reseteando el leaderboard manualmente`);

    // Ejecutar el reseteo y envío de notificaciones
    const result = await resetMonthlyPointsAndNotifyWinner();

    return NextResponse.json({
      message: 'Leaderboard reseteado exitosamente',
      timestamp: new Date().toISOString(),
      result: {
        winners: result.winners,
        emailsSent: result.emailsSent,
        totalUsersNotified: result.totalUsersNotified
      }
    });
  } catch (error) {
    console.error('Error reseteando leaderboard:', error);
    return NextResponse.json(
      {
        error: 'Error al resetear el leaderboard',
        details: error instanceof Error ? error.message : 'Error desconocido',
      },
      { status: 500 }
    );
  }
}
