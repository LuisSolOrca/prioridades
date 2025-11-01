import { NextRequest, NextResponse } from 'next/server';
import sendWeekendReminders from '@/scripts/weekend-reminder';

/**
 * API endpoint para ejecutar el recordatorio de fin de semana
 * Puede ser llamado por un cron job o manualmente
 *
 * Para seguridad, requiere un token de autenticación en el header
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

    // Ejecutar el script de recordatorios
    const result = await sendWeekendReminders();

    return NextResponse.json({
      message: 'Recordatorios de fin de semana enviados',
      ...result
    });
  } catch (error: any) {
    console.error('Error executing weekend reminder:', error);
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}

// GET para testing en desarrollo (solo si NODE_ENV es development)
export async function GET(request: NextRequest) {
  if (process.env.NODE_ENV !== 'development') {
    return NextResponse.json(
      { error: 'Endpoint solo disponible en desarrollo' },
      { status: 403 }
    );
  }

  try {
    const result = await sendWeekendReminders();

    return NextResponse.json({
      message: 'Recordatorios de fin de semana enviados (modo desarrollo)',
      ...result
    });
  } catch (error: any) {
    console.error('Error executing weekend reminder:', error);
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}
