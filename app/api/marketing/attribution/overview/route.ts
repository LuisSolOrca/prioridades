import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import connectDB from '@/lib/mongodb';
import Conversion from '@/models/Conversion';
import Touchpoint from '@/models/Touchpoint';

// GET - Get attribution overview dashboard data
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    await connectDB();

    const { searchParams } = new URL(request.url);
    const days = parseInt(searchParams.get('days') || '30');
    const model = searchParams.get('model') || 'linear';

    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    // Get overview stats
    const overview = await (Conversion as any).getOverview(startDate, endDate);

    // Get attribution by channel
    const byChannel = await (Conversion as any).getAttributionByChannel(
      startDate,
      endDate,
      model
    );

    // Get top campaigns
    const topCampaigns = await (Conversion as any).getAttributionByCampaign(
      startDate,
      endDate,
      model,
      10
    );

    // Get conversion paths
    const conversionPaths = await (Conversion as any).getConversionPaths(
      startDate,
      endDate,
      5
    );

    // Get touchpoint stats
    const touchpointStats = await Touchpoint.aggregate([
      {
        $match: {
          occurredAt: { $gte: startDate, $lte: endDate },
        },
      },
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          identified: { $sum: { $cond: ['$isIdentified', 1, 0] } },
          anonymous: { $sum: { $cond: ['$isIdentified', 0, 1] } },
          uniqueVisitors: { $addToSet: '$visitorId' },
          uniqueContacts: { $addToSet: '$contactId' },
        },
      },
      {
        $project: {
          total: 1,
          identified: 1,
          anonymous: 1,
          uniqueVisitors: { $size: '$uniqueVisitors' },
          uniqueContacts: { $size: { $filter: { input: '$uniqueContacts', cond: { $ne: ['$$this', null] } } } },
        },
      },
    ]);

    // Get conversions over time
    const conversionsOverTime = await Conversion.aggregate([
      {
        $match: {
          convertedAt: { $gte: startDate, $lte: endDate },
          isProcessed: true,
        },
      },
      {
        $group: {
          _id: {
            $dateToString: { format: '%Y-%m-%d', date: '$convertedAt' },
          },
          count: { $sum: 1 },
          value: { $sum: '$value' },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    return NextResponse.json({
      dateRange: { startDate, endDate, days },
      overview: {
        ...overview,
        touchpoints: touchpointStats[0] || {
          total: 0,
          identified: 0,
          anonymous: 0,
          uniqueVisitors: 0,
          uniqueContacts: 0,
        },
      },
      byChannel,
      topCampaigns,
      conversionPaths,
      conversionsOverTime,
      model,
    });
  } catch (error: any) {
    console.error('Error fetching attribution overview:', error);
    return NextResponse.json(
      { error: error.message || 'Error al obtener overview de atribucion' },
      { status: 500 }
    );
  }
}
