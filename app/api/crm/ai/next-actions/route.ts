import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import connectDB from '@/lib/mongodb';
import Deal from '@/models/Deal';
import Activity from '@/models/Activity';
import SalesQuota from '@/models/SalesQuota';
import Client from '@/models/Client';
import Contact from '@/models/Contact';
import PipelineStage from '@/models/PipelineStage';
import { generateNextBestAction } from '@/lib/crm/aiService';

// Force model registration for populate
const _Client = Client;
const _Contact = Contact;
const _PipelineStage = PipelineStage;

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const user = session.user as any;
    await connectDB();

    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '10');
    const ownerId = searchParams.get('ownerId') || user.id;

    // Get closed stage IDs to exclude
    const closedStages = await PipelineStage.find({ isClosed: true }).select('_id').lean();
    const closedStageIds = closedStages.map(s => s._id);

    // Get active deals for the user (not in closed stages)
    const dealsQuery: any = {
      stageId: { $nin: closedStageIds },
    };

    // Only filter by owner if not admin or specific owner requested
    if (user.role !== 'ADMIN' || ownerId === user.id) {
      dealsQuery.ownerId = ownerId;
    } else if (ownerId && ownerId !== 'all') {
      dealsQuery.ownerId = ownerId;
    }

    const deals = await Deal.find(dealsQuery)
      .populate('stageId', 'name order')
      .populate('clientId', 'name')
      .populate('contactId', 'firstName lastName')
      .sort({ value: -1 })
      .limit(limit)
      .lean() as any[];

    if (deals.length === 0) {
      return NextResponse.json({
        success: true,
        actions: [],
        message: 'No hay deals activos para analizar',
      });
    }

    // Get last activity for each deal
    const dealIds = deals.map(d => d._id);
    const lastActivities = await Activity.aggregate([
      { $match: { dealId: { $in: dealIds } } },
      { $sort: { createdAt: -1 } },
      {
        $group: {
          _id: '$dealId',
          lastActivity: { $first: '$$ROOT' },
        },
      },
    ]);

    const activityMap = new Map(
      lastActivities.map(a => [a._id.toString(), a.lastActivity])
    );

    // Calculate days in stage for each deal
    const now = new Date();
    const dealsData = deals.map((deal: any) => {
      const lastActivity = activityMap.get(deal._id.toString());
      const createdAt = new Date(deal.createdAt);
      const stageChangedAt = deal.stageChangedAt ? new Date(deal.stageChangedAt) : createdAt;

      return {
        id: deal._id.toString(),
        title: deal.title,
        value: deal.value || 0,
        stage: deal.stageId?.name || 'Sin etapa',
        probability: deal.probability,
        daysInStage: Math.floor((now.getTime() - stageChangedAt.getTime()) / (1000 * 60 * 60 * 24)),
        lastActivityDate: lastActivity?.createdAt?.toISOString(),
        lastActivityType: lastActivity?.type,
        clientName: deal.clientId?.name,
        contactName: deal.contactId ? `${deal.contactId.firstName} ${deal.contactId.lastName}` : undefined,
        expectedCloseDate: deal.expectedCloseDate?.toISOString(),
      };
    });

    // Get user context
    const userContext: any = {
      name: user.name,
      totalDeals: deals.length,
    };

    // Get won deals this month
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const wonStages = await PipelineStage.find({ isWon: true }).select('_id').lean();
    const wonStageIds = wonStages.map(s => s._id);
    const wonThisMonth = await Deal.countDocuments({
      ownerId,
      stageId: { $in: wonStageIds },
      updatedAt: { $gte: startOfMonth },
    });
    userContext.wonThisMonth = wonThisMonth;

    // Get quota if exists
    const currentMonth = now.getMonth() + 1;
    const currentYear = now.getFullYear();
    const quota = await SalesQuota.findOne({
      userId: ownerId,
      year: currentYear,
      $or: [
        { period: 'monthly', month: currentMonth },
        { period: 'quarterly', quarter: Math.ceil(currentMonth / 3) },
      ],
    }).lean() as any;

    if (quota) {
      userContext.quota = quota.targetAmount;
    }

    // Generate next best actions using AI
    const actions = await generateNextBestAction({
      deals: dealsData,
      userContext,
    });

    return NextResponse.json({
      success: true,
      actions,
      dealsAnalyzed: deals.length,
      userContext,
    });
  } catch (error: any) {
    console.error('Error generating next actions:', error);
    return NextResponse.json(
      { error: error.message || 'Error al generar recomendaciones' },
      { status: 500 }
    );
  }
}
