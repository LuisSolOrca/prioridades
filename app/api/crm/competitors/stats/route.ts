import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import connectDB from '@/lib/mongodb';
import Competitor from '@/models/Competitor';
import DealCompetitor from '@/models/DealCompetitor';
import Deal from '@/models/Deal';
import mongoose from 'mongoose';

export const dynamic = 'force-dynamic';

// GET /api/crm/competitors/stats - Estadísticas de competidores
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const competitorId = searchParams.get('competitorId');

    await connectDB();

    // Construir filtro de fecha
    const dateFilter: any = {};
    if (startDate) {
      dateFilter.createdAt = { $gte: new Date(startDate) };
    }
    if (endDate) {
      dateFilter.createdAt = { ...dateFilter.createdAt, $lte: new Date(endDate) };
    }

    // Win rate por competidor
    const winRateByCompetitor = await DealCompetitor.aggregate([
      {
        $match: {
          status: { $in: ['won_against', 'lost_to'] },
          ...(competitorId ? { competitorId: new mongoose.Types.ObjectId(competitorId) } : {}),
          ...dateFilter,
        },
      },
      {
        $group: {
          _id: '$competitorId',
          won: { $sum: { $cond: [{ $eq: ['$status', 'won_against'] }, 1, 0] } },
          lost: { $sum: { $cond: [{ $eq: ['$status', 'lost_to'] }, 1, 0] } },
          total: { $sum: 1 },
        },
      },
      {
        $lookup: {
          from: 'competitors',
          localField: '_id',
          foreignField: '_id',
          as: 'competitor',
        },
      },
      {
        $unwind: '$competitor',
      },
      {
        $project: {
          competitorId: '$_id',
          competitorName: '$competitor.name',
          competitorLogo: '$competitor.logo',
          won: 1,
          lost: 1,
          total: 1,
          winRate: {
            $round: [{ $multiply: [{ $divide: ['$won', '$total'] }, 100] }, 0],
          },
        },
      },
      {
        $sort: { total: -1 },
      },
    ]);

    // Valor ganado/perdido por competidor
    const valueByCompetitor = await DealCompetitor.aggregate([
      {
        $match: {
          status: { $in: ['won_against', 'lost_to'] },
          ...dateFilter,
        },
      },
      {
        $lookup: {
          from: 'deals',
          localField: 'dealId',
          foreignField: '_id',
          as: 'deal',
        },
      },
      {
        $unwind: '$deal',
      },
      {
        $group: {
          _id: '$competitorId',
          valueWon: {
            $sum: {
              $cond: [{ $eq: ['$status', 'won_against'] }, '$deal.value', 0]
            }
          },
          valueLost: {
            $sum: {
              $cond: [{ $eq: ['$status', 'lost_to'] }, '$deal.value', 0]
            }
          },
        },
      },
      {
        $lookup: {
          from: 'competitors',
          localField: '_id',
          foreignField: '_id',
          as: 'competitor',
        },
      },
      {
        $unwind: '$competitor',
      },
      {
        $project: {
          competitorId: '$_id',
          competitorName: '$competitor.name',
          valueWon: 1,
          valueLost: 1,
        },
      },
    ]);

    // Top razones de pérdida (notas de deals perdidos)
    const lossReasons = await DealCompetitor.aggregate([
      {
        $match: {
          status: 'lost_to',
          notes: { $exists: true, $ne: '' },
          ...dateFilter,
        },
      },
      {
        $lookup: {
          from: 'competitors',
          localField: 'competitorId',
          foreignField: '_id',
          as: 'competitor',
        },
      },
      {
        $unwind: '$competitor',
      },
      {
        $lookup: {
          from: 'deals',
          localField: 'dealId',
          foreignField: '_id',
          as: 'deal',
        },
      },
      {
        $unwind: '$deal',
      },
      {
        $project: {
          competitorName: '$competitor.name',
          dealTitle: '$deal.title',
          notes: 1,
          theirStrengths: 1,
          createdAt: 1,
        },
      },
      {
        $sort: { createdAt: -1 },
      },
      {
        $limit: 20,
      },
    ]);

    // Tendencia mensual de wins/losses
    const monthlyTrend = await DealCompetitor.aggregate([
      {
        $match: {
          status: { $in: ['won_against', 'lost_to'] },
          createdAt: { $gte: new Date(new Date().setMonth(new Date().getMonth() - 12)) },
        },
      },
      {
        $group: {
          _id: {
            year: { $year: '$createdAt' },
            month: { $month: '$createdAt' },
          },
          won: { $sum: { $cond: [{ $eq: ['$status', 'won_against'] }, 1, 0] } },
          lost: { $sum: { $cond: [{ $eq: ['$status', 'lost_to'] }, 1, 0] } },
        },
      },
      {
        $sort: { '_id.year': 1, '_id.month': 1 },
      },
    ]);

    // Estadísticas generales
    const [totalCompetitors, activeCompetitions, totalWins, totalLosses] = await Promise.all([
      Competitor.countDocuments({ isActive: true }),
      DealCompetitor.countDocuments({ status: 'active' }),
      DealCompetitor.countDocuments({ status: 'won_against', ...dateFilter }),
      DealCompetitor.countDocuments({ status: 'lost_to', ...dateFilter }),
    ]);

    const overallWinRate = (totalWins + totalLosses) > 0
      ? Math.round((totalWins / (totalWins + totalLosses)) * 100)
      : null;

    return NextResponse.json({
      summary: {
        totalCompetitors,
        activeCompetitions,
        totalWins,
        totalLosses,
        overallWinRate,
      },
      winRateByCompetitor,
      valueByCompetitor,
      lossReasons,
      monthlyTrend: monthlyTrend.map((item: any) => ({
        month: `${item._id.year}-${String(item._id.month).padStart(2, '0')}`,
        won: item.won,
        lost: item.lost,
      })),
    });
  } catch (error: any) {
    console.error('Error fetching competitor stats:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
