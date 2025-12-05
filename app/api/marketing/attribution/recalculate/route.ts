import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import connectDB from '@/lib/mongodb';
import { recalculateAttribution, processUnprocessedConversions } from '@/lib/marketing/attributionEngine';

// POST - Recalculate attribution for conversions
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const user = session.user as any;
    if (user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Solo admins' }, { status: 403 });
    }

    await connectDB();

    const body = await request.json();
    const { startDate, endDate, processUnprocessed = false, limit = 100 } = body;

    let processed = 0;

    if (processUnprocessed) {
      // Just process unprocessed conversions
      processed = await processUnprocessedConversions(undefined, limit);
    } else if (startDate && endDate) {
      // Recalculate for date range
      processed = await recalculateAttribution(
        new Date(startDate),
        new Date(endDate)
      );
    } else {
      // Process unprocessed by default
      processed = await processUnprocessedConversions(undefined, limit);
    }

    return NextResponse.json({
      success: true,
      processed,
      message: `Se procesaron ${processed} conversiones`,
    });
  } catch (error: any) {
    console.error('Error recalculating attribution:', error);
    return NextResponse.json(
      { error: error.message || 'Error al recalcular atribucion' },
      { status: 500 }
    );
  }
}
