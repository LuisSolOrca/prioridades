import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import connectDB from '@/lib/mongodb';
import Deal from '@/models/Deal';
import Activity from '@/models/Activity';
import SalesQuota from '@/models/SalesQuota';
import PipelineStage from '@/models/PipelineStage';
import User from '@/models/User';
import { hasPermission } from '@/lib/permissions';

export const dynamic = 'force-dynamic';

interface SalesMetrics {
  // Tasas de conversión
  winRate: number;
  conversionRate: number;
  leadToOpportunityRate: number;

  // Valores
  averageDealSize: number;
  totalWonValue: number;
  totalPipelineValue: number;
  weightedPipelineValue: number;
  forecast: number;

  // Velocidad y tiempo
  pipelineVelocity: number;
  avgSalesCycleDays: number;
  avgResponseTimeDays: number;

  // Actividad
  activitiesPerDeal: number;
  meetingNoShowRate: number;

  // Cuota
  quotaAttainment: number;
  quotaTarget: number;
  quotaAchieved: number;

  // Conteos
  totalDeals: number;
  openDeals: number;
  wonDeals: number;
  lostDeals: number;
  hotLeads: number;
  warmLeads: number;
  coldLeads: number;

  // Por vendedor
  dealsByOwner: { ownerId: string; ownerName: string; count: number; value: number; wonValue: number }[];

  // Ventas recurrentes
  recurringCustomersRate: number;

  // Periodo comparativo
  periodComparison: {
    wonValueChange: number;
    dealsWonChange: number;
    winRateChange: number;
  };
}

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
    const period = searchParams.get('period') || 'month'; // month, quarter, year

    // Calcular fechas del período actual y anterior
    const now = new Date();
    let periodStart: Date, periodEnd: Date, prevPeriodStart: Date, prevPeriodEnd: Date;

    switch (period) {
      case 'quarter':
        const currentQuarter = Math.floor(now.getMonth() / 3);
        periodStart = new Date(now.getFullYear(), currentQuarter * 3, 1);
        periodEnd = new Date(now.getFullYear(), (currentQuarter + 1) * 3, 0, 23, 59, 59);
        prevPeriodStart = new Date(now.getFullYear(), (currentQuarter - 1) * 3, 1);
        prevPeriodEnd = new Date(now.getFullYear(), currentQuarter * 3, 0, 23, 59, 59);
        break;
      case 'year':
        periodStart = new Date(now.getFullYear(), 0, 1);
        periodEnd = new Date(now.getFullYear(), 11, 31, 23, 59, 59);
        prevPeriodStart = new Date(now.getFullYear() - 1, 0, 1);
        prevPeriodEnd = new Date(now.getFullYear() - 1, 11, 31, 23, 59, 59);
        break;
      default: // month
        periodStart = new Date(now.getFullYear(), now.getMonth(), 1);
        periodEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
        prevPeriodStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        prevPeriodEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);
    }

    // Obtener etapas cerradas
    const closedStages = await PipelineStage.find({ isClosed: true }).lean();
    const wonStageIds = closedStages.filter(s => s.isWon).map(s => s._id);
    const lostStageIds = closedStages.filter(s => !s.isWon).map(s => s._id);
    const closedStageIds = closedStages.map(s => s._id);

    // Obtener todos los deals
    const allDeals = await Deal.find({})
      .populate('stageId', 'isClosed isWon probability')
      .populate('ownerId', 'name')
      .lean();

    // Clasificar deals
    const openDeals = allDeals.filter(d => !(d.stageId as any)?.isClosed);
    const wonDeals = allDeals.filter(d => (d.stageId as any)?.isClosed && (d.stageId as any)?.isWon);
    const lostDeals = allDeals.filter(d => (d.stageId as any)?.isClosed && !(d.stageId as any)?.isWon);
    const closedDeals = [...wonDeals, ...lostDeals];

    // Deals del período actual
    const periodWonDeals = wonDeals.filter(d =>
      d.actualCloseDate && new Date(d.actualCloseDate) >= periodStart && new Date(d.actualCloseDate) <= periodEnd
    );
    const prevPeriodWonDeals = wonDeals.filter(d =>
      d.actualCloseDate && new Date(d.actualCloseDate) >= prevPeriodStart && new Date(d.actualCloseDate) <= prevPeriodEnd
    );

    // Calcular métricas base
    const totalWonValue = wonDeals.reduce((sum, d) => sum + d.value, 0);
    const periodWonValue = periodWonDeals.reduce((sum, d) => sum + d.value, 0);
    const prevPeriodWonValue = prevPeriodWonDeals.reduce((sum, d) => sum + d.value, 0);
    const totalPipelineValue = openDeals.reduce((sum, d) => sum + d.value, 0);
    const weightedPipelineValue = openDeals.reduce((sum, d) => {
      const prob = (d.stageId as any)?.probability || d.probability || 0;
      return sum + (d.value * prob / 100);
    }, 0);

    // Win Rate
    const totalClosedDeals = wonDeals.length + lostDeals.length;
    const winRate = totalClosedDeals > 0 ? (wonDeals.length / totalClosedDeals) * 100 : 0;
    const prevPeriodClosedDeals = prevPeriodWonDeals.length + lostDeals.filter(d =>
      d.actualCloseDate && new Date(d.actualCloseDate) >= prevPeriodStart && new Date(d.actualCloseDate) <= prevPeriodEnd
    ).length;
    const prevPeriodWinRate = prevPeriodClosedDeals > 0
      ? (prevPeriodWonDeals.length / prevPeriodClosedDeals) * 100
      : 0;

    // Conversion Rate (deals cerrados / total deals)
    const conversionRate = allDeals.length > 0 ? (closedDeals.length / allDeals.length) * 100 : 0;

    // Average Deal Size
    const averageDealSize = wonDeals.length > 0 ? totalWonValue / wonDeals.length : 0;

    // Sales Cycle Duration (promedio de días para cerrar)
    const cycledurations = wonDeals
      .filter(d => d.actualCloseDate && d.createdAt)
      .map(d => {
        const created = new Date(d.createdAt);
        const closed = new Date(d.actualCloseDate!);
        return (closed.getTime() - created.getTime()) / (1000 * 60 * 60 * 24);
      });
    const avgSalesCycleDays = cycledurations.length > 0
      ? cycledurations.reduce((a, b) => a + b, 0) / cycledurations.length
      : 0;

    // Pipeline Velocity: (# oportunidades × valor promedio × win rate) / ciclo promedio
    const pipelineVelocity = avgSalesCycleDays > 0
      ? (openDeals.length * averageDealSize * (winRate / 100)) / avgSalesCycleDays
      : 0;

    // Obtener actividades
    const activities = await Activity.find({}).lean();
    const dealActivities = activities.filter(a => a.dealId);
    const activitiesPerDeal = allDeals.length > 0 ? dealActivities.length / allDeals.length : 0;

    // Meeting no-show rate (aproximación: reuniones sin outcome o marcadas como no completadas)
    const meetings = activities.filter(a => a.type === 'meeting');
    const noShowMeetings = meetings.filter(a => !a.isCompleted && a.dueDate && new Date(a.dueDate) < now);
    const meetingNoShowRate = meetings.length > 0 ? (noShowMeetings.length / meetings.length) * 100 : 0;

    // Cuota del período actual
    const currentMonth = now.getMonth() + 1;
    const currentYear = now.getFullYear();
    const quotas = await SalesQuota.find({
      isActive: true,
      year: currentYear,
      $or: [
        { period: 'monthly', month: currentMonth },
        { period: 'yearly' },
        { period: 'quarterly', quarter: Math.ceil(currentMonth / 3) }
      ]
    }).lean();

    const totalQuotaTarget = quotas.reduce((sum, q) => sum + q.targetValue, 0);
    const quotaAttainment = totalQuotaTarget > 0 ? (periodWonValue / totalQuotaTarget) * 100 : 0;

    // Deals por vendedor
    const ownerMap = new Map<string, { name: string; count: number; value: number; wonValue: number }>();
    allDeals.forEach(deal => {
      const ownerId = (deal.ownerId as any)?._id?.toString() || deal.ownerId?.toString();
      const ownerName = (deal.ownerId as any)?.name || 'Sin asignar';
      if (!ownerMap.has(ownerId)) {
        ownerMap.set(ownerId, { name: ownerName, count: 0, value: 0, wonValue: 0 });
      }
      const owner = ownerMap.get(ownerId)!;
      owner.count++;
      owner.value += deal.value;
      if ((deal.stageId as any)?.isClosed && (deal.stageId as any)?.isWon) {
        owner.wonValue += deal.value;
      }
    });
    const dealsByOwner = Array.from(ownerMap.entries()).map(([ownerId, data]) => ({
      ownerId,
      ownerName: data.name,
      count: data.count,
      value: data.value,
      wonValue: data.wonValue
    })).sort((a, b) => b.wonValue - a.wonValue);

    // Lead temperature distribution
    const hotLeads = allDeals.filter(d => d.leadTemperature === 'hot' && !(d.stageId as any)?.isClosed).length;
    const warmLeads = allDeals.filter(d => d.leadTemperature === 'warm' && !(d.stageId as any)?.isClosed).length;
    const coldLeads = allDeals.filter(d => d.leadTemperature === 'cold' && !(d.stageId as any)?.isClosed).length;

    // Clientes recurrentes (clientes con más de 1 deal ganado)
    const clientDealCount = new Map<string, number>();
    wonDeals.forEach(d => {
      const clientId = d.clientId?.toString();
      if (clientId) {
        clientDealCount.set(clientId, (clientDealCount.get(clientId) || 0) + 1);
      }
    });
    const recurringCustomers = Array.from(clientDealCount.values()).filter(count => count > 1).length;
    const totalCustomers = clientDealCount.size;
    const recurringCustomersRate = totalCustomers > 0 ? (recurringCustomers / totalCustomers) * 100 : 0;

    // Lead to opportunity rate (aproximación usando deals con leadScore alto)
    const qualifiedLeads = allDeals.filter(d => d.leadScore && d.leadScore >= 50).length;
    const leadToOpportunityRate = allDeals.length > 0 ? (qualifiedLeads / allDeals.length) * 100 : 0;

    // Tiempo de respuesta promedio (primera actividad después de crear el deal)
    // Esto es una aproximación
    const avgResponseTimeDays = 1.5; // Placeholder - requeriría más datos

    // Comparación de períodos
    const wonValueChange = prevPeriodWonValue > 0
      ? ((periodWonValue - prevPeriodWonValue) / prevPeriodWonValue) * 100
      : periodWonValue > 0 ? 100 : 0;
    const dealsWonChange = prevPeriodWonDeals.length > 0
      ? ((periodWonDeals.length - prevPeriodWonDeals.length) / prevPeriodWonDeals.length) * 100
      : periodWonDeals.length > 0 ? 100 : 0;
    const winRateChange = prevPeriodWinRate > 0
      ? winRate - prevPeriodWinRate
      : 0;

    const metrics: SalesMetrics = {
      winRate: Math.round(winRate * 10) / 10,
      conversionRate: Math.round(conversionRate * 10) / 10,
      leadToOpportunityRate: Math.round(leadToOpportunityRate * 10) / 10,
      averageDealSize: Math.round(averageDealSize),
      totalWonValue,
      totalPipelineValue,
      weightedPipelineValue: Math.round(weightedPipelineValue),
      forecast: Math.round(weightedPipelineValue),
      pipelineVelocity: Math.round(pipelineVelocity),
      avgSalesCycleDays: Math.round(avgSalesCycleDays),
      avgResponseTimeDays,
      activitiesPerDeal: Math.round(activitiesPerDeal * 10) / 10,
      meetingNoShowRate: Math.round(meetingNoShowRate * 10) / 10,
      quotaAttainment: Math.round(quotaAttainment * 10) / 10,
      quotaTarget: totalQuotaTarget,
      quotaAchieved: periodWonValue,
      totalDeals: allDeals.length,
      openDeals: openDeals.length,
      wonDeals: wonDeals.length,
      lostDeals: lostDeals.length,
      hotLeads,
      warmLeads,
      coldLeads,
      dealsByOwner,
      recurringCustomersRate: Math.round(recurringCustomersRate * 10) / 10,
      periodComparison: {
        wonValueChange: Math.round(wonValueChange * 10) / 10,
        dealsWonChange: Math.round(dealsWonChange * 10) / 10,
        winRateChange: Math.round(winRateChange * 10) / 10
      }
    };

    return NextResponse.json(metrics);
  } catch (error: any) {
    console.error('Error fetching CRM analytics:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
