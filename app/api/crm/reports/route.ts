import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import connectDB from '@/lib/mongodb';
import Deal from '@/models/Deal';
import Activity from '@/models/Activity';
import PipelineStage from '@/models/PipelineStage';
import Contact from '@/models/Contact';
import { hasPermission } from '@/lib/permissions';

export const dynamic = 'force-dynamic';

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
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const ownerId = searchParams.get('ownerId');
    const clientId = searchParams.get('clientId');

    // Build date filter
    const dateFilter: any = {};
    if (startDate) {
      dateFilter.$gte = new Date(startDate);
    }
    if (endDate) {
      dateFilter.$lte = new Date(endDate + 'T23:59:59.999Z');
    }

    // Build deals query
    const dealsQuery: any = {};
    if (Object.keys(dateFilter).length > 0) {
      dealsQuery.createdAt = dateFilter;
    }
    if (ownerId) {
      dealsQuery.ownerId = ownerId;
    }
    if (clientId) {
      dealsQuery.clientId = clientId;
    }

    // Get all data
    const [deals, stages, activities, contacts] = await Promise.all([
      Deal.find(dealsQuery)
        .populate('stageId', 'name color probability isClosed isWon order')
        .populate('clientId', 'name')
        .populate('ownerId', 'name')
        .lean(),
      PipelineStage.find({ isActive: true }).sort({ order: 1 }).lean(),
      Activity.find(Object.keys(dateFilter).length > 0 ? { createdAt: dateFilter } : {})
        .populate('createdBy', 'name')
        .lean(),
      Contact.find({ isActive: true }).lean(),
    ]);

    // Calculate metrics
    const openDeals = deals.filter((d: any) => !d.stageId?.isClosed);
    const wonDeals = deals.filter((d: any) => d.stageId?.isClosed && d.stageId?.isWon);
    const lostDeals = deals.filter((d: any) => d.stageId?.isClosed && !d.stageId?.isWon);
    const closedDeals = [...wonDeals, ...lostDeals];

    // Pipeline value
    const totalPipelineValue = openDeals.reduce((sum: number, d: any) => sum + (d.value || 0), 0);
    const weightedPipelineValue = openDeals.reduce(
      (sum: number, d: any) => sum + ((d.value || 0) * (d.stageId?.probability || 0) / 100),
      0
    );
    const wonValue = wonDeals.reduce((sum: number, d: any) => sum + (d.value || 0), 0);
    const lostValue = lostDeals.reduce((sum: number, d: any) => sum + (d.value || 0), 0);

    // Conversion rates
    const totalDeals = deals.length;
    const winRate = closedDeals.length > 0 ? (wonDeals.length / closedDeals.length) * 100 : 0;
    const lossRate = closedDeals.length > 0 ? (lostDeals.length / closedDeals.length) * 100 : 0;

    // Average deal value
    const avgDealValue = deals.length > 0 
      ? deals.reduce((sum: number, d: any) => sum + (d.value || 0), 0) / deals.length 
      : 0;
    const avgWonDealValue = wonDeals.length > 0 
      ? wonValue / wonDeals.length 
      : 0;

    // Sales cycle (days from creation to close)
    const salesCycles = wonDeals
      .filter((d: any) => d.closedAt)
      .map((d: any) => {
        const created = new Date(d.createdAt);
        const closed = new Date(d.closedAt);
        return Math.ceil((closed.getTime() - created.getTime()) / (1000 * 60 * 60 * 24));
      });
    const avgSalesCycle = salesCycles.length > 0 
      ? salesCycles.reduce((a, b) => a + b, 0) / salesCycles.length 
      : 0;

    // Deals by stage
    const dealsByStage = stages.map((stage: any) => {
      const stageDeals = deals.filter((d: any) => d.stageId?._id?.toString() === stage._id.toString());
      const stageValue = stageDeals.reduce((sum: number, d: any) => sum + (d.value || 0), 0);
      const weightedValue = stageDeals.reduce(
        (sum: number, d: any) => sum + ((d.value || 0) * (stage.probability || 0) / 100),
        0
      );
      return {
        _id: stage._id,
        name: stage.name,
        color: stage.color,
        probability: stage.probability,
        isClosed: stage.isClosed,
        isWon: stage.isWon,
        dealsCount: stageDeals.length,
        totalValue: stageValue,
        weightedValue: weightedValue,
        deals: stageDeals.map((d: any) => ({
          _id: d._id,
          title: d.title,
          value: d.value,
          currency: d.currency,
          clientName: d.clientId?.name,
          ownerName: d.ownerId?.name,
          expectedCloseDate: d.expectedCloseDate,
          createdAt: d.createdAt,
        })),
      };
    });

    // Deals by owner
    const ownerMap = new Map<string, any>();
    deals.forEach((d: any) => {
      const ownerId = d.ownerId?._id?.toString() || 'unknown';
      const ownerName = d.ownerId?.name || 'Sin asignar';
      if (!ownerMap.has(ownerId)) {
        ownerMap.set(ownerId, {
          _id: ownerId,
          name: ownerName,
          totalDeals: 0,
          openDeals: 0,
          wonDeals: 0,
          lostDeals: 0,
          totalValue: 0,
          wonValue: 0,
        });
      }
      const owner = ownerMap.get(ownerId);
      owner.totalDeals++;
      owner.totalValue += d.value || 0;
      if (!d.stageId?.isClosed) {
        owner.openDeals++;
      } else if (d.stageId?.isWon) {
        owner.wonDeals++;
        owner.wonValue += d.value || 0;
      } else {
        owner.lostDeals++;
      }
    });
    const dealsByOwner = Array.from(ownerMap.values());

    // Deals by client
    const clientMap = new Map<string, any>();
    deals.forEach((d: any) => {
      const clientId = d.clientId?._id?.toString() || 'unknown';
      const clientName = d.clientId?.name || 'Sin cliente';
      if (!clientMap.has(clientId)) {
        clientMap.set(clientId, {
          _id: clientId,
          name: clientName,
          totalDeals: 0,
          wonDeals: 0,
          totalValue: 0,
          wonValue: 0,
        });
      }
      const client = clientMap.get(clientId);
      client.totalDeals++;
      client.totalValue += d.value || 0;
      if (d.stageId?.isClosed && d.stageId?.isWon) {
        client.wonDeals++;
        client.wonValue += d.value || 0;
      }
    });
    const dealsByClient = Array.from(clientMap.values())
      .sort((a, b) => b.totalValue - a.totalValue)
      .slice(0, 10);

    // Monthly trend (last 12 months)
    const monthlyTrend = [];
    const now = new Date();
    for (let i = 11; i >= 0; i--) {
      const monthStart = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 0, 23, 59, 59);
      
      const monthDeals = deals.filter((d: any) => {
        const created = new Date(d.createdAt);
        return created >= monthStart && created <= monthEnd;
      });
      
      const monthWon = monthDeals.filter((d: any) => d.stageId?.isClosed && d.stageId?.isWon);
      const monthLost = monthDeals.filter((d: any) => d.stageId?.isClosed && !d.stageId?.isWon);
      
      monthlyTrend.push({
        month: monthStart.toLocaleDateString('es-MX', { month: 'short', year: '2-digit' }),
        monthDate: monthStart.toISOString(),
        created: monthDeals.length,
        won: monthWon.length,
        lost: monthLost.length,
        wonValue: monthWon.reduce((sum: number, d: any) => sum + (d.value || 0), 0),
        createdValue: monthDeals.reduce((sum: number, d: any) => sum + (d.value || 0), 0),
      });
    }

    // Forecast (next 3 months based on expected close dates)
    const forecast = [];
    for (let i = 0; i < 3; i++) {
      const monthStart = new Date(now.getFullYear(), now.getMonth() + i, 1);
      const monthEnd = new Date(now.getFullYear(), now.getMonth() + i + 1, 0, 23, 59, 59);
      
      const forecastDeals = openDeals.filter((d: any) => {
        if (!d.expectedCloseDate) return false;
        const expected = new Date(d.expectedCloseDate);
        return expected >= monthStart && expected <= monthEnd;
      });
      
      const totalValue = forecastDeals.reduce((sum: number, d: any) => sum + (d.value || 0), 0);
      const weightedValue = forecastDeals.reduce(
        (sum: number, d: any) => sum + ((d.value || 0) * (d.stageId?.probability || 0) / 100),
        0
      );
      
      forecast.push({
        month: monthStart.toLocaleDateString('es-MX', { month: 'long', year: 'numeric' }),
        monthDate: monthStart.toISOString(),
        dealsCount: forecastDeals.length,
        totalValue,
        weightedValue,
        deals: forecastDeals.map((d: any) => ({
          _id: d._id,
          title: d.title,
          value: d.value,
          probability: d.stageId?.probability,
          clientName: d.clientId?.name,
          stageName: d.stageId?.name,
          stageColor: d.stageId?.color,
        })),
      });
    }

    // Activities summary
    const activityTypes = ['call', 'email', 'meeting', 'note', 'task'];
    const activitiesByType = activityTypes.map(type => ({
      type,
      count: activities.filter((a: any) => a.type === type).length,
    }));

    const activitiesByOwner: any[] = [];
    const activityOwnerMap = new Map<string, any>();
    activities.forEach((a: any) => {
      const ownerId = a.createdBy?._id?.toString() || 'unknown';
      const ownerName = a.createdBy?.name || 'Desconocido';
      if (!activityOwnerMap.has(ownerId)) {
        activityOwnerMap.set(ownerId, { name: ownerName, count: 0 });
      }
      activityOwnerMap.get(ownerId).count++;
    });
    activityOwnerMap.forEach((value, key) => {
      activitiesByOwner.push({ _id: key, ...value });
    });

    return NextResponse.json({
      summary: {
        totalDeals,
        openDeals: openDeals.length,
        wonDeals: wonDeals.length,
        lostDeals: lostDeals.length,
        totalPipelineValue,
        weightedPipelineValue,
        wonValue,
        lostValue,
        winRate: Math.round(winRate * 10) / 10,
        lossRate: Math.round(lossRate * 10) / 10,
        avgDealValue: Math.round(avgDealValue),
        avgWonDealValue: Math.round(avgWonDealValue),
        avgSalesCycle: Math.round(avgSalesCycle),
        totalContacts: contacts.length,
        totalActivities: activities.length,
      },
      dealsByStage,
      dealsByOwner,
      dealsByClient,
      monthlyTrend,
      forecast,
      activitiesByType,
      activitiesByOwner: activitiesByOwner.sort((a, b) => b.count - a.count),
    });
  } catch (error: any) {
    console.error('Error generating CRM report:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
