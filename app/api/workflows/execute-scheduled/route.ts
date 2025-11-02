import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { executeScheduledWorkflows } from '@/lib/workflows';

/**
 * POST /api/workflows/execute-scheduled
 * Ejecuta workflows programados (daily_check o weekly_check)
 * Body: { triggerType: 'daily_check' | 'weekly_check' }
 *
 * Puede ser llamado:
 * - Manualmente desde admin UI
 * - Por un servicio externo de cron (ej: cron-job.org, EasyCron)
 * - Por Vercel Cron (si se habilita)
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json(
        { error: 'No autenticado' },
        { status: 401 }
      );
    }

    if (session.user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Solo administradores pueden ejecutar workflows programados' },
        { status: 403 }
      );
    }

    const body = await request.json();

    if (!body.triggerType || !['daily_check', 'weekly_check'].includes(body.triggerType)) {
      return NextResponse.json(
        { error: 'triggerType debe ser "daily_check" o "weekly_check"' },
        { status: 400 }
      );
    }

    const result = await executeScheduledWorkflows(body.triggerType);

    return NextResponse.json({
      message: `Workflows ${body.triggerType} ejecutados correctamente`,
      executed: result.executed,
      errors: result.errors,
      prioritiesProcessed: result.prioritiesProcessed
    });

  } catch (error: any) {
    console.error('Error ejecutando workflows programados:', error);
    return NextResponse.json(
      { error: 'Error ejecutando workflows programados' },
      { status: 500 }
    );
  }
}
