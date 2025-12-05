import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import connectDB from '@/lib/mongodb';
import Conversion, { AttributionModel } from '@/models/Conversion';
import Touchpoint from '@/models/Touchpoint';

// GET - Get attribution by channel
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    await connectDB();

    const { searchParams } = new URL(request.url);
    const days = parseInt(searchParams.get('days') || '30');
    const model = (searchParams.get('model') || 'linear') as AttributionModel;

    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    // Get attribution by channel
    const channelAttribution = await (Conversion as any).getAttributionByChannel(
      startDate,
      endDate,
      model
    );

    // Get touchpoint breakdown by channel
    const channelTouchpoints = await (Touchpoint as any).getChannelBreakdown(
      startDate,
      endDate
    );

    // Merge data
    const channels = new Set([
      ...channelAttribution.map((c: any) => c.channel),
      ...channelTouchpoints.map((c: any) => c.channel),
    ]);

    const result = Array.from(channels).map(channel => {
      const attribution = channelAttribution.find((c: any) => c.channel === channel) || {};
      const touchpoints = channelTouchpoints.find((c: any) => c.channel === channel) || {};

      return {
        channel,
        touchpoints: touchpoints.count || 0,
        uniqueVisitors: touchpoints.uniqueVisitors || 0,
        uniqueContacts: touchpoints.uniqueContacts || 0,
        conversions: attribution.conversions || 0,
        attributedValue: attribution.totalAttributedValue || 0,
        avgCredit: attribution.avgCredit || 0,
        conversionRate: touchpoints.uniqueContacts > 0
          ? ((attribution.conversions || 0) / touchpoints.uniqueContacts) * 100
          : 0,
      };
    });

    // Sort by attributed value
    result.sort((a, b) => b.attributedValue - a.attributedValue);

    // Calculate totals
    const totals = result.reduce(
      (acc, item) => ({
        touchpoints: acc.touchpoints + item.touchpoints,
        uniqueVisitors: acc.uniqueVisitors + item.uniqueVisitors,
        uniqueContacts: acc.uniqueContacts + item.uniqueContacts,
        conversions: acc.conversions + item.conversions,
        attributedValue: acc.attributedValue + item.attributedValue,
      }),
      { touchpoints: 0, uniqueVisitors: 0, uniqueContacts: 0, conversions: 0, attributedValue: 0 }
    );

    return NextResponse.json({
      dateRange: { startDate, endDate, days },
      model,
      channels: result,
      totals,
    });
  } catch (error: any) {
    console.error('Error fetching channel attribution:', error);
    return NextResponse.json(
      { error: error.message || 'Error al obtener atribucion por canal' },
      { status: 500 }
    );
  }
}
