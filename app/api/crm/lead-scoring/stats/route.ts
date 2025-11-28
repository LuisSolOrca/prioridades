import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { hasPermission } from '@/lib/permissions';
import { getLeadTemperatureStats } from '@/lib/leadScoringEngine';
import connectDB from '@/lib/mongodb';
import Deal from '@/models/Deal';

export const dynamic = 'force-dynamic';

// GET - Obtener estadísticas de lead scoring
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

    // Estadísticas por temperatura
    const temperatureStats = await getLeadTemperatureStats();

    // Top hot leads
    const hotLeads = await Deal.find({ leadTemperature: 'hot' })
      .select('title leadScore value currency clientId ownerId')
      .populate('clientId', 'name')
      .populate('ownerId', 'name')
      .sort({ leadScore: -1 })
      .limit(10)
      .lean();

    // Deals que necesitan actualización de score (más de 7 días sin actualizar)
    const staleThreshold = new Date();
    staleThreshold.setDate(staleThreshold.getDate() - 7);

    const staleCount = await Deal.countDocuments({
      $or: [
        { leadScoreUpdatedAt: { $lt: staleThreshold } },
        { leadScoreUpdatedAt: { $exists: false } },
      ],
    });

    // Score promedio por etapa
    const scoreByStage = await Deal.aggregate([
      {
        $lookup: {
          from: 'pipelinestages',
          localField: 'stageId',
          foreignField: '_id',
          as: 'stage',
        },
      },
      { $unwind: '$stage' },
      {
        $group: {
          _id: '$stageId',
          stageName: { $first: '$stage.name' },
          stageOrder: { $first: '$stage.order' },
          avgScore: { $avg: '$leadScore' },
          count: { $sum: 1 },
        },
      },
      { $sort: { stageOrder: 1 } },
    ]);

    // Distribución de scores
    const scoreDistribution = await Deal.aggregate([
      {
        $bucket: {
          groupBy: '$leadScore',
          boundaries: [0, 20, 40, 60, 80, 101],
          default: 'Other',
          output: {
            count: { $sum: 1 },
            totalValue: { $sum: '$value' },
          },
        },
      },
    ]);

    return NextResponse.json({
      temperature: temperatureStats,
      hotLeads,
      staleCount,
      scoreByStage: scoreByStage.map(s => ({
        stageId: s._id,
        stageName: s.stageName,
        avgScore: Math.round(s.avgScore || 0),
        count: s.count,
      })),
      scoreDistribution: scoreDistribution.map(d => ({
        range: d._id === 'Other' ? 'Other' : `${d._id}-${d._id + 19}`,
        count: d.count,
        totalValue: d.totalValue,
      })),
    });
  } catch (error: any) {
    console.error('Error fetching lead scoring stats:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
