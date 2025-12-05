import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import connectDB from '@/lib/mongodb';
import Conversion, { AttributionModel } from '@/models/Conversion';

// GET - Compare different attribution models
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    await connectDB();

    const { searchParams } = new URL(request.url);
    const days = parseInt(searchParams.get('days') || '30');
    const modelsParam = searchParams.get('models');

    const models: AttributionModel[] = modelsParam
      ? modelsParam.split(',') as AttributionModel[]
      : ['first_touch', 'last_touch', 'linear', 'time_decay', 'u_shaped'];

    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    // Get comparison data
    const comparison = await (Conversion as any).compareModels(startDate, endDate, models);

    // Format data for easy visualization
    const channels = new Set<string>();
    for (const model of models) {
      if (comparison[model]) {
        for (const item of comparison[model]) {
          channels.add(item.channel);
        }
      }
    }

    // Create comparison matrix
    const matrix: Record<string, Record<string, { attributedValue: number; conversions: number }>> = {};

    for (const channel of channels) {
      matrix[channel] = {};
      for (const model of models) {
        const modelData = comparison[model]?.find((c: any) => c.channel === channel);
        matrix[channel][model] = {
          attributedValue: modelData?.attributedValue || 0,
          conversions: modelData?.conversions || 0,
        };
      }
    }

    // Calculate variance between models for each channel
    const channelVariance: Record<string, { min: number; max: number; variance: number; percentDiff: number }> = {};

    for (const channel of channels) {
      const values = models.map(m => matrix[channel][m]?.attributedValue || 0);
      const min = Math.min(...values);
      const max = Math.max(...values);
      const avg = values.reduce((a, b) => a + b, 0) / values.length;
      const variance = values.reduce((sum, val) => sum + Math.pow(val - avg, 2), 0) / values.length;
      const percentDiff = avg > 0 ? ((max - min) / avg) * 100 : 0;

      channelVariance[channel] = { min, max, variance, percentDiff };
    }

    // Sort channels by total attributed value
    const sortedChannels = Array.from(channels).sort((a, b) => {
      const aTotal = Object.values(matrix[a]).reduce((sum, v) => sum + v.attributedValue, 0);
      const bTotal = Object.values(matrix[b]).reduce((sum, v) => sum + v.attributedValue, 0);
      return bTotal - aTotal;
    });

    return NextResponse.json({
      dateRange: { startDate, endDate, days },
      models,
      channels: sortedChannels,
      comparison: matrix,
      variance: channelVariance,
      raw: comparison,
    });
  } catch (error: any) {
    console.error('Error comparing models:', error);
    return NextResponse.json(
      { error: error.message || 'Error al comparar modelos' },
      { status: 500 }
    );
  }
}
