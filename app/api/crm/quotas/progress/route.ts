import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import connectDB from '@/lib/mongodb';
import SalesQuota from '@/models/SalesQuota';
import Deal from '@/models/Deal';
import PipelineStage from '@/models/PipelineStage';
import User from '@/models/User';
import { hasPermission } from '@/lib/permissions';

export const dynamic = 'force-dynamic';

interface QuotaProgress {
  quota: any;
  actualValue: number;
  actualDeals: number;
  progressValue: number; // Porcentaje 0-100
  progressDeals: number; // Porcentaje 0-100
  status: 'on_track' | 'at_risk' | 'behind' | 'exceeded';
  daysRemaining: number;
  daysElapsed: number;
  totalDays: number;
  expectedProgressPercent: number;
}

// Helper para obtener fechas del período
function getPeriodDates(
  period: 'monthly' | 'quarterly' | 'yearly',
  year: number,
  month?: number,
  quarter?: number
): { startDate: Date; endDate: Date } {
  let startDate: Date;
  let endDate: Date;

  switch (period) {
    case 'monthly':
      if (!month) throw new Error('Mes requerido');
      startDate = new Date(year, month - 1, 1);
      endDate = new Date(year, month, 0, 23, 59, 59, 999);
      break;
    case 'quarterly':
      if (!quarter) throw new Error('Trimestre requerido');
      const startMonth = (quarter - 1) * 3;
      startDate = new Date(year, startMonth, 1);
      endDate = new Date(year, startMonth + 3, 0, 23, 59, 59, 999);
      break;
    case 'yearly':
      startDate = new Date(year, 0, 1);
      endDate = new Date(year, 11, 31, 23, 59, 59, 999);
      break;
  }

  return { startDate, endDate };
}

// Helper para determinar el estado
function getStatus(
  progressValue: number,
  expectedProgress: number,
  daysRemaining: number
): 'on_track' | 'at_risk' | 'behind' | 'exceeded' {
  if (progressValue >= 100) return 'exceeded';
  if (daysRemaining <= 0) {
    return progressValue >= 100 ? 'exceeded' : 'behind';
  }

  const diff = progressValue - expectedProgress;
  if (diff >= 0) return 'on_track';
  if (diff >= -15) return 'at_risk';
  return 'behind';
}

// GET - Obtener progreso de cuotas
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    if (!hasPermission(session, 'viewCRM')) {
      return NextResponse.json({ error: 'Sin permiso para ver CRM' }, { status: 403 });
    }

    await connectDB();

    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const year = searchParams.get('year') || new Date().getFullYear().toString();
    const period = searchParams.get('period');
    const currentOnly = searchParams.get('currentOnly') === 'true';

    // Obtener etapas ganadas
    const wonStages = await PipelineStage.find({ isWon: true, isActive: true }).select('_id').lean();
    const wonStageIds = wonStages.map(s => s._id);

    // Construir filtro de cuotas
    const quotaFilter: any = { isActive: true };

    const user = session.user as any;
    if (user.role !== 'ADMIN' && !userId) {
      quotaFilter.userId = user.id;
    } else if (userId) {
      quotaFilter.userId = userId;
    }

    if (year) quotaFilter.year = parseInt(year);
    if (period) quotaFilter.period = period;

    // Si solo queremos el período actual
    if (currentOnly) {
      const now = new Date();
      const currentYear = now.getFullYear();
      const currentMonth = now.getMonth() + 1;
      const currentQuarter = Math.ceil(currentMonth / 3);

      quotaFilter.$or = [
        { period: 'monthly', year: currentYear, month: currentMonth },
        { period: 'quarterly', year: currentYear, quarter: currentQuarter },
        { period: 'yearly', year: currentYear },
      ];
    }

    const quotas = await SalesQuota.find(quotaFilter)
      .populate('userId', 'name email')
      .lean();

    const now = new Date();
    const progressData: QuotaProgress[] = [];

    for (const quota of quotas) {
      const { startDate, endDate } = getPeriodDates(
        quota.period as 'monthly' | 'quarterly' | 'yearly',
        quota.year,
        quota.month,
        quota.quarter
      );

      // Calcular días
      const totalDays = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
      const daysElapsed = Math.max(0, Math.ceil((now.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)));
      const daysRemaining = Math.max(0, Math.ceil((endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));
      const expectedProgressPercent = Math.min(100, (daysElapsed / totalDays) * 100);

      // Obtener deals ganados en el período
      const wonDeals = await Deal.find({
        ownerId: quota.userId,
        stageId: { $in: wonStageIds },
        actualCloseDate: { $gte: startDate, $lte: endDate },
      }).lean();

      const actualValue = wonDeals.reduce((sum, deal) => sum + deal.value, 0);
      const actualDeals = wonDeals.length;

      const progressValue = quota.targetValue > 0
        ? Math.round((actualValue / quota.targetValue) * 100)
        : 0;
      const progressDeals = quota.targetDeals && quota.targetDeals > 0
        ? Math.round((actualDeals / quota.targetDeals) * 100)
        : 0;

      const status = getStatus(progressValue, expectedProgressPercent, daysRemaining);

      progressData.push({
        quota,
        actualValue,
        actualDeals,
        progressValue,
        progressDeals,
        status,
        daysRemaining,
        daysElapsed,
        totalDays,
        expectedProgressPercent: Math.round(expectedProgressPercent),
      });
    }

    // Ordenar por status (behind primero) y luego por progreso
    progressData.sort((a, b) => {
      const statusOrder = { behind: 0, at_risk: 1, on_track: 2, exceeded: 3 };
      if (statusOrder[a.status] !== statusOrder[b.status]) {
        return statusOrder[a.status] - statusOrder[b.status];
      }
      return a.progressValue - b.progressValue;
    });

    // Calcular resumen general
    const summary = {
      totalQuotas: progressData.length,
      exceeded: progressData.filter(p => p.status === 'exceeded').length,
      onTrack: progressData.filter(p => p.status === 'on_track').length,
      atRisk: progressData.filter(p => p.status === 'at_risk').length,
      behind: progressData.filter(p => p.status === 'behind').length,
      totalTargetValue: progressData.reduce((sum, p) => sum + p.quota.targetValue, 0),
      totalActualValue: progressData.reduce((sum, p) => sum + p.actualValue, 0),
      overallProgress: 0,
    };

    summary.overallProgress = summary.totalTargetValue > 0
      ? Math.round((summary.totalActualValue / summary.totalTargetValue) * 100)
      : 0;

    return NextResponse.json({ progress: progressData, summary });
  } catch (error: any) {
    console.error('Error fetching quota progress:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
