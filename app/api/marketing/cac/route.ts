import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import connectDB from '@/lib/mongodb';
import { calculateCAC, calculateCACWithAttribution, getSpendByPlatform, getTotalSpend } from '@/lib/marketing/cacCalculator';

// GET - Get CAC metrics
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const period = searchParams.get('period') || '30d'; // 7d, 30d, 90d, custom
    const useAttribution = searchParams.get('useAttribution') === 'true';
    const attributionModel = (searchParams.get('attributionModel') || 'last_touch') as 'first_touch' | 'last_touch' | 'linear';

    await connectDB();

    // Calculate date range
    let start: Date;
    let end: Date = new Date();

    if (startDate && endDate) {
      start = new Date(startDate);
      end = new Date(endDate);
    } else {
      start = new Date();
      switch (period) {
        case '7d':
          start.setDate(start.getDate() - 7);
          break;
        case '90d':
          start.setDate(start.getDate() - 90);
          break;
        case '30d':
        default:
          start.setDate(start.getDate() - 30);
      }
    }

    let cacData;

    if (useAttribution) {
      cacData = await calculateCACWithAttribution(start, end, attributionModel);
    } else {
      cacData = await calculateCAC(start, end, {
        includeComparison: true,
        campaignLimit: 10,
      });
    }

    return NextResponse.json(cacData);
  } catch (error: any) {
    console.error('Error calculating CAC:', error);
    return NextResponse.json(
      { error: error.message || 'Error calculating CAC' },
      { status: 500 }
    );
  }
}
