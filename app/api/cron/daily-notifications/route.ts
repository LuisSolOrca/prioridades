import { NextRequest, NextResponse } from 'next/server';
import sendDailyNotifications from '@/scripts/daily-notifications';

/**
 * API endpoint para ejecutar notificaciones diarias
 * Ejecutado por cron job diario a las 9 AM
 */
export async function POST(request: NextRequest) {
  try {
    // Verificar token de autenticación para cron jobs
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET || 'dev-secret-change-in-production';

    if (authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json(
        { error: 'No autorizado' },
        { status: 401 }
      );
    }

    // Ejecutar el script de notificaciones diarias
    const result = await sendDailyNotifications();

    return NextResponse.json({
      message: 'Notificaciones diarias enviadas',
      ...result
    });
  } catch (error: any) {
    console.error('Error executing daily notifications:', error);
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}

// GET para testing en desarrollo
export async function GET(request: NextRequest) {
  if (process.env.NODE_ENV !== 'development') {
    return NextResponse.json(
      { error: 'Endpoint solo disponible en desarrollo' },
      { status: 403 }
    );
  }

  try {
    const result = await sendDailyNotifications();

    return NextResponse.json({
      message: 'Notificaciones diarias enviadas (modo desarrollo)',
      ...result
    });
  } catch (error: any) {
    console.error('Error executing daily notifications:', error);
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}
