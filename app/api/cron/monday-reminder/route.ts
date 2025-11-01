import { NextRequest, NextResponse } from 'next/server';
import sendMondayReminders from '@/scripts/monday-reminder';

/**
 * API endpoint para ejecutar recordatorios de lunes
 * Ejecutado por cron job los lunes a las 8 AM
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

    // Ejecutar el script de recordatorios de lunes
    const result = await sendMondayReminders();

    return NextResponse.json({
      message: 'Recordatorios de lunes enviados',
      ...result
    });
  } catch (error: any) {
    console.error('Error executing Monday reminders:', error);
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
    const result = await sendMondayReminders();

    return NextResponse.json({
      message: 'Recordatorios de lunes enviados (modo desarrollo)',
      ...result
    });
  } catch (error: any) {
    console.error('Error executing Monday reminders:', error);
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}
