import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import connectDB from '@/lib/mongodb';
import Deal from '@/models/Deal';
import Activity from '@/models/Activity';
import SalesQuota from '@/models/SalesQuota';
import PipelineStage from '@/models/PipelineStage';
import User from '@/models/User';
import Client from '@/models/Client';
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

  // === MÉTRICAS FINANCIERAS ===
  // Lifetime Value
  avgCustomerLifetimeValue: number;  // CLTV promedio
  totalCustomerLifetimeValue: number; // CLTV total

  // Margen
  avgMargin: number;                  // Margen promedio por deal
  totalMargin: number;                // Margen total
  marginRate: number;                 // % de margen

  // Retención y Churn
  retentionRate: number;              // Tasa de retención
  churnRate: number;                  // Tasa de pérdida
  activeCustomers: number;            // Clientes activos
  churnedCustomers: number;           // Clientes perdidos
  atRiskCustomers: number;            // Clientes en riesgo

  // Revenue
  revenuePerSalesperson: number;      // Revenue promedio por vendedor
  mrr: number;                        // Monthly Recurring Revenue
  arr: number;                        // Annual Recurring Revenue

  // Expansión
  upsellRate: number;                 // Tasa de upsell
  upsellRevenue: number;              // Ingresos por upsell
  newBusinessRevenue: number;         // Ingresos nuevo negocio
  renewalRevenue: number;             // Ingresos por renovaciones

  // Concentración
  portfolioConcentration: number;     // % de ingresos en top 10 clientes
  topClients: { clientId: string; clientName: string; revenue: number; percentage: number }[];
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
        const days = (closed.getTime() - created.getTime()) / (1000 * 60 * 60 * 24);
        // Mínimo 1 día para evitar divisiones extremas
        return Math.max(days, 1);
      });
    const avgSalesCycleDays = cycledurations.length > 0
      ? cycledurations.reduce((a, b) => a + b, 0) / cycledurations.length
      : 0;

    // Pipeline Velocity: (# oportunidades × valor promedio × win rate) / ciclo promedio
    // Usar mínimo 1 día para el ciclo para evitar números irreales
    const effectiveCycleDays = Math.max(avgSalesCycleDays, 1);
    const pipelineVelocity = effectiveCycleDays > 0
      ? (openDeals.length * averageDealSize * (winRate / 100)) / effectiveCycleDays
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

    // === MÉTRICAS FINANCIERAS ===

    // Obtener todos los clientes para métricas de retención
    const allClients = await Client.find({}).lean();
    const activeClients = allClients.filter(c => c.status === 'active').length;
    const churnedClients = allClients.filter(c => c.status === 'churned').length;
    const atRiskClients = allClients.filter(c => c.status === 'at_risk').length;
    const totalClientsWithStatus = activeClients + churnedClients;

    // Tasa de retención y churn
    const retentionRate = totalClientsWithStatus > 0
      ? (activeClients / totalClientsWithStatus) * 100
      : 100;
    const churnRate = totalClientsWithStatus > 0
      ? (churnedClients / totalClientsWithStatus) * 100
      : 0;

    // CLTV (Customer Lifetime Value)
    // Calculamos desde los campos del cliente o estimamos desde deals
    const clientsWithCLTV = allClients.filter(c => c.lifetimeValue && c.lifetimeValue > 0);
    const avgCustomerLifetimeValue = clientsWithCLTV.length > 0
      ? clientsWithCLTV.reduce((sum, c) => sum + (c.lifetimeValue || 0), 0) / clientsWithCLTV.length
      : averageDealSize * (recurringCustomersRate > 0 ? (1 + recurringCustomersRate / 100) : 1);

    const totalCustomerLifetimeValue = clientsWithCLTV.length > 0
      ? clientsWithCLTV.reduce((sum, c) => sum + (c.lifetimeValue || 0), 0)
      : totalWonValue;

    // Margen (desde deals que tengan costOfSale)
    const dealsWithMargin = wonDeals.filter(d => d.margin !== undefined && d.margin !== null);
    const dealsWithCost = wonDeals.filter(d => d.costOfSale !== undefined && d.costOfSale !== null);

    let totalMargin = 0;
    let avgMargin = 0;
    let marginRate = 0;

    if (dealsWithMargin.length > 0) {
      totalMargin = dealsWithMargin.reduce((sum, d) => sum + (d.margin || 0), 0);
      avgMargin = totalMargin / dealsWithMargin.length;
      marginRate = totalWonValue > 0 ? (totalMargin / totalWonValue) * 100 : 0;
    } else if (dealsWithCost.length > 0) {
      // Calcular margen desde costo de venta
      totalMargin = dealsWithCost.reduce((sum, d) => sum + (d.value - (d.costOfSale || 0)), 0);
      avgMargin = totalMargin / dealsWithCost.length;
      const totalValueWithCost = dealsWithCost.reduce((sum, d) => sum + d.value, 0);
      marginRate = totalValueWithCost > 0 ? (totalMargin / totalValueWithCost) * 100 : 0;
    }

    // MRR y ARR (desde deals recurrentes)
    const recurringDeals = wonDeals.filter(d => d.isRecurring);
    let mrr = 0;

    recurringDeals.forEach(deal => {
      if (deal.recurringValue) {
        mrr += deal.recurringValue;
      } else if (deal.recurringFrequency) {
        // Convertir a mensual si no hay recurringValue
        switch (deal.recurringFrequency) {
          case 'monthly':
            mrr += deal.value;
            break;
          case 'quarterly':
            mrr += deal.value / 3;
            break;
          case 'yearly':
            mrr += deal.value / 12;
            break;
        }
      }
    });

    // También considerar MRR desde clientes
    const clientMRR = allClients.reduce((sum, c) => sum + (c.monthlyRecurringRevenue || 0), 0);
    mrr = Math.max(mrr, clientMRR); // Usar el mayor valor disponible

    const arr = mrr * 12;

    // Revenue por vendedor
    const salespeople = dealsByOwner.filter(o => o.ownerName !== 'Sin asignar');
    const revenuePerSalesperson = salespeople.length > 0
      ? salespeople.reduce((sum, o) => sum + o.wonValue, 0) / salespeople.length
      : 0;

    // Tasa de Upsell y Revenue por tipo
    const upsellDeals = wonDeals.filter(d => d.dealType === 'upsell' || d.dealType === 'cross_sell');
    const newBusinessDeals = wonDeals.filter(d => d.dealType === 'new_business' || !d.dealType);
    const renewalDeals = wonDeals.filter(d => d.dealType === 'renewal');

    const upsellRevenue = upsellDeals.reduce((sum, d) => sum + d.value, 0);
    const newBusinessRevenue = newBusinessDeals.reduce((sum, d) => sum + d.value, 0);
    const renewalRevenue = renewalDeals.reduce((sum, d) => sum + d.value, 0);

    // Tasa de upsell: clientes con upsell / total clientes activos
    const clientsWithUpsell = new Set(upsellDeals.map(d => d.clientId?.toString())).size;
    const upsellRate = totalCustomers > 0 ? (clientsWithUpsell / totalCustomers) * 100 : 0;

    // Concentración de cartera (Top 10 clientes)
    const clientRevenueMap = new Map<string, { name: string; revenue: number }>();
    wonDeals.forEach(deal => {
      const clientId = deal.clientId?.toString();
      if (clientId) {
        const existing = clientRevenueMap.get(clientId) || { name: '', revenue: 0 };
        clientRevenueMap.set(clientId, {
          name: existing.name,
          revenue: existing.revenue + deal.value
        });
      }
    });

    // Obtener nombres de clientes
    const clientIds = Array.from(clientRevenueMap.keys());
    const clientsData = await Client.find({ _id: { $in: clientIds } }, 'name').lean();
    clientsData.forEach(c => {
      const entry = clientRevenueMap.get(c._id.toString());
      if (entry) {
        entry.name = c.name;
      }
    });

    // Ordenar y calcular top clientes
    const sortedClients = Array.from(clientRevenueMap.entries())
      .map(([id, data]) => ({ clientId: id, clientName: data.name, revenue: data.revenue }))
      .sort((a, b) => b.revenue - a.revenue);

    const top10Revenue = sortedClients.slice(0, 10).reduce((sum, c) => sum + c.revenue, 0);
    const portfolioConcentration = totalWonValue > 0 ? (top10Revenue / totalWonValue) * 100 : 0;

    const topClients = sortedClients.slice(0, 10).map(c => ({
      ...c,
      percentage: totalWonValue > 0 ? (c.revenue / totalWonValue) * 100 : 0
    }));

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
      },

      // Métricas Financieras
      avgCustomerLifetimeValue: Math.round(avgCustomerLifetimeValue),
      totalCustomerLifetimeValue: Math.round(totalCustomerLifetimeValue),
      avgMargin: Math.round(avgMargin),
      totalMargin: Math.round(totalMargin),
      marginRate: Math.round(marginRate * 10) / 10,
      retentionRate: Math.round(retentionRate * 10) / 10,
      churnRate: Math.round(churnRate * 10) / 10,
      activeCustomers: activeClients,
      churnedCustomers: churnedClients,
      atRiskCustomers: atRiskClients,
      revenuePerSalesperson: Math.round(revenuePerSalesperson),
      mrr: Math.round(mrr),
      arr: Math.round(arr),
      upsellRate: Math.round(upsellRate * 10) / 10,
      upsellRevenue: Math.round(upsellRevenue),
      newBusinessRevenue: Math.round(newBusinessRevenue),
      renewalRevenue: Math.round(renewalRevenue),
      portfolioConcentration: Math.round(portfolioConcentration * 10) / 10,
      topClients: topClients.map(c => ({
        ...c,
        revenue: Math.round(c.revenue),
        percentage: Math.round(c.percentage * 10) / 10
      }))
    };

    return NextResponse.json(metrics);
  } catch (error: any) {
    console.error('Error fetching CRM analytics:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
