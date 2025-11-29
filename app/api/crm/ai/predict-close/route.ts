import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import connectDB from '@/lib/mongodb';
import Deal from '@/models/Deal';
import Client from '@/models/Client';
import Activity from '@/models/Activity';
import Competitor from '@/models/Competitor';
import Pipeline from '@/models/Pipeline';
import PipelineStage from '@/models/PipelineStage';
import { predictDealClose } from '@/lib/crm/aiService';

// Ensure models are registered for populate
void Pipeline;
void PipelineStage;

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    await connectDB();

    const body = await request.json();
    const { dealId } = body;

    if (!dealId) {
      return NextResponse.json({ error: 'dealId es requerido' }, { status: 400 });
    }

    // Get deal with populated fields
    const deal = await Deal.findById(dealId)
      .populate('stageId', 'name order')
      .populate('clientId', 'name industry size')
      .populate('pipelineId', 'name')
      .lean() as any;

    if (!deal) {
      return NextResponse.json({ error: 'Deal no encontrado' }, { status: 404 });
    }

    const now = new Date();
    const createdAt = new Date(deal.createdAt);
    const stageChangedAt = deal.stageChangedAt ? new Date(deal.stageChangedAt) : createdAt;

    const dealData = {
      title: deal.title,
      value: deal.value || 0,
      stage: deal.stageId?.name || 'Sin etapa',
      currentProbability: deal.probability,
      daysInPipeline: Math.floor((now.getTime() - createdAt.getTime()) / (1000 * 60 * 60 * 24)),
      daysInCurrentStage: Math.floor((now.getTime() - stageChangedAt.getTime()) / (1000 * 60 * 60 * 24)),
      expectedCloseDate: deal.expectedCloseDate?.toISOString(),
      source: deal.source,
    };

    // Get client info
    let clientData: any = undefined;
    if (deal.clientId) {
      // Get previous deals from this client
      const clientDeals = await Deal.find({
        clientId: deal.clientId._id,
        _id: { $ne: dealId },
      }).lean() as any[];

      const wonDeals = clientDeals.filter((d: any) => d.status === 'won').length;

      clientData = {
        name: deal.clientId.name,
        industry: deal.clientId.industry,
        size: deal.clientId.size,
        previousDeals: clientDeals.length,
        wonDeals,
      };
    }

    // Get activities
    const activities = await Activity.find({ dealId })
      .sort({ createdAt: -1 })
      .limit(20)
      .lean() as any[];

    const activityData = activities.map((a: any) => ({
      type: a.type,
      date: new Date(a.createdAt).toLocaleDateString('es-MX'),
      outcome: a.outcome,
    }));

    // Get competitors if assigned
    let competitors: string[] = [];
    if (deal.competitors && deal.competitors.length > 0) {
      const competitorDocs = await Competitor.find({
        _id: { $in: deal.competitors },
      }).lean() as any[];
      competitors = competitorDocs.map((c: any) => c.name);
    }

    // Calculate historical data for this pipeline
    const pipelineDeals = await Deal.find({
      pipelineId: deal.pipelineId?._id,
      status: { $in: ['won', 'lost'] },
      closedAt: { $gte: new Date(Date.now() - 180 * 24 * 60 * 60 * 1000) }, // Last 6 months
    }).lean() as any[];

    let historicalData: any = undefined;
    if (pipelineDeals.length >= 10) {
      const wonDeals = pipelineDeals.filter((d: any) => d.status === 'won');
      const avgDaysToClose = wonDeals.length > 0
        ? wonDeals.reduce((sum: number, d: any) => {
            const created = new Date(d.createdAt);
            const closed = new Date(d.closedAt);
            return sum + Math.floor((closed.getTime() - created.getTime()) / (1000 * 60 * 60 * 24));
          }, 0) / wonDeals.length
        : 30;

      const avgDealValue = pipelineDeals.reduce((sum: number, d: any) => sum + (d.value || 0), 0) / pipelineDeals.length;

      // Calculate win rate by source
      const sourceGroups: Record<string, { won: number; total: number }> = {};
      pipelineDeals.forEach((d: any) => {
        const source = d.source || 'unknown';
        if (!sourceGroups[source]) {
          sourceGroups[source] = { won: 0, total: 0 };
        }
        sourceGroups[source].total++;
        if (d.status === 'won') {
          sourceGroups[source].won++;
        }
      });

      const winRateBySource: Record<string, number> = {};
      Object.entries(sourceGroups).forEach(([source, data]) => {
        winRateBySource[source] = Math.round((data.won / data.total) * 100);
      });

      historicalData = {
        avgDaysToClose: Math.round(avgDaysToClose),
        avgDealValue: Math.round(avgDealValue),
        stageConversionRates: {}, // Could be calculated with more pipeline stage analysis
        winRateBySource,
      };
    }

    // Generate prediction using AI
    const prediction = await predictDealClose({
      deal: dealData,
      client: clientData,
      activities: activityData,
      competitors,
      historicalData,
    });

    return NextResponse.json({
      success: true,
      prediction,
      dealId,
      dealTitle: deal.title,
    });
  } catch (error: any) {
    console.error('Error predicting deal close:', error);
    return NextResponse.json(
      { error: error.message || 'Error al predecir cierre' },
      { status: 500 }
    );
  }
}
