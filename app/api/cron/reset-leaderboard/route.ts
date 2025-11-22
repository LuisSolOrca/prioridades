import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import { resetMonthlyPointsAndNotifyWinner, type LeaderboardResetResult } from '@/lib/gamification';

/**
 * GET /api/cron/reset-leaderboard
 * Endpoint para ser llamado por un servicio cron externo (ej: cron-job.org)
 * Resetea los puntos mensuales y envía notificaciones a los top 3 ganadores
 *
 * Configuración recomendada:
 * - Ejecutar el primer lunes de cada mes a las 9:00 AM hora del servidor
 * - O usar la lógica de getNextResetDate() para determinar cuándo ejecutar
 */

// Configurar para no cachear
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET() {
  try {
    await connectDB();

    const now = new Date();
    const currentDay = now.getDay(); // 0-6 (0 = Domingo, 1 = Lunes)
    const currentDate = now.getDate(); // 1-31
    const currentHour = now.getUTCHours(); // 0-23 (UTC)

    // Verificar si es el primer lunes del mes
    // El reseteo debería ocurrir el primer lunes de cada mes
    const isMonday = currentDay === 1;
    const isFirstWeek = currentDate <= 7; // Primer lunes siempre está en los primeros 7 días
    const isResetHour = currentHour === 9; // 9 AM UTC (ajusta según necesites)

    // Para testing, puedes comentar esta validación
    if (!isMonday || !isFirstWeek || !isResetHour) {
      return NextResponse.json({
        message: 'No es momento de resetear el leaderboard',
        currentDay,
        currentDate,
        currentHour,
        currentTime: now.toISOString(),
        expectedConditions: {
          isMonday: 'Debe ser lunes (day = 1)',
          isFirstWeek: 'Debe ser la primera semana del mes (date <= 7)',
          isResetHour: 'Debe ser la hora 9 UTC'
        },
        currentConditions: {
          isMonday,
          isFirstWeek,
          isResetHour
        },
        note: 'El leaderboard se resetea el primer lunes de cada mes a las 9 AM UTC'
      }, {
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0',
          'Pragma': 'no-cache',
          'Expires': '0',
        }
      });
    }

    console.log('Iniciando reseteo del leaderboard mensual...');

    // Ejecutar el reseteo y envío de notificaciones
    const result = await resetMonthlyPointsAndNotifyWinner();

    if (!result.resetCompleted) {
      return NextResponse.json({
        message: 'No se pudo completar el reseteo del leaderboard',
        timestamp: now.toISOString(),
        error: result.error || 'No hay usuarios activos'
      }, {
        status: 500,
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0',
          'Pragma': 'no-cache',
          'Expires': '0',
        }
      });
    }

    return NextResponse.json({
      message: 'Leaderboard reseteado exitosamente',
      timestamp: now.toISOString(),
      result: {
        winners: result.winners,
        emailsSent: result.emailsSent,
        totalUsersNotified: result.totalUsersNotified
      }
    }, {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0',
        'Pragma': 'no-cache',
        'Expires': '0',
      }
    });
  } catch (error) {
    console.error('Error en cron de reseteo de leaderboard:', error);
    return NextResponse.json(
      {
        error: 'Error en cron de reseteo de leaderboard',
        details: error instanceof Error ? error.message : 'Error desconocido',
      },
      {
        status: 500,
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0',
          'Pragma': 'no-cache',
          'Expires': '0',
        }
      }
    );
  }
}
