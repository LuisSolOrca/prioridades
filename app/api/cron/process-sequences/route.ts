import { NextResponse } from 'next/server';
import { processSequenceSteps } from '@/lib/sequenceEngine';

/**
 * GET /api/cron/process-sequences
 * Endpoint para ser llamado por un servicio cron externo (ej: cron-job.org)
 * Procesa los pasos pendientes de las secuencias de email
 * Recomendado: ejecutar cada 15 minutos o cada hora
 */

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET() {
  try {
    console.log('[Sequences Cron] Iniciando procesamiento de secuencias...');

    const result = await processSequenceSteps();

    console.log(`[Sequences Cron] Completado: ${result.processed} procesados, ${result.errors} errores`);

    return NextResponse.json({
      success: true,
      message: 'Procesamiento de secuencias completado',
      timestamp: new Date().toISOString(),
      processed: result.processed,
      errors: result.errors,
      details: result.details,
    }, {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0',
        'Pragma': 'no-cache',
        'Expires': '0',
      }
    });
  } catch (error) {
    console.error('[Sequences Cron] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Error procesando secuencias',
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
