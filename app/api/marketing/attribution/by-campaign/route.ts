import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import connectDB from '@/lib/mongodb';
import Conversion, { AttributionModel } from '@/models/Conversion';
import Touchpoint from '@/models/Touchpoint';

// GET - Get attribution by campaign
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
    const limit = parseInt(searchParams.get('limit') || '50');

    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    // Get attribution by campaign
    const campaignAttribution = await (Conversion as any).getAttributionByCampaign(
      startDate,
      endDate,
      model,
      limit
    );

    // Get touchpoint performance by campaign
    const campaignTouchpoints = await (Touchpoint as any).getCampaignPerformance(
      startDate,
      endDate,
      limit
    );

    // Merge data by campaign
    const campaignMap = new Map<string, any>();

    for (const tp of campaignTouchpoints) {
      const key = `${tp.campaign}|${tp.source || ''}|${tp.medium || ''}`;
      campaignMap.set(key, {
        campaign: tp.campaign,
        source: tp.source,
        medium: tp.medium,
        touchpoints: tp.touchpoints,
        uniqueVisitors: tp.uniqueVisitors,
        uniqueContacts: tp.uniqueContacts,
        channels: tp.channels,
        conversions: 0,
        attributedValue: 0,
        avgCredit: 0,
      });
    }

    for (const attr of campaignAttribution) {
      const key = `${attr.campaign}|${attr.source || ''}|${attr.medium || ''}`;
      if (campaignMap.has(key)) {
        const existing = campaignMap.get(key);
        existing.conversions = attr.conversions;
        existing.attributedValue = attr.totalAttributedValue;
        existing.avgCredit = attr.avgCredit;
      } else {
        campaignMap.set(key, {
          campaign: attr.campaign,
          source: attr.source,
          medium: attr.medium,
          touchpoints: 0,
          uniqueVisitors: 0,
          uniqueContacts: 0,
          channels: attr.channels || [],
          conversions: attr.conversions,
          attributedValue: attr.totalAttributedValue,
          avgCredit: attr.avgCredit,
        });
      }
    }

    const campaigns = Array.from(campaignMap.values())
      .map(c => ({
        ...c,
        conversionRate: c.uniqueContacts > 0
          ? (c.conversions / c.uniqueContacts) * 100
          : 0,
        valuePerConversion: c.conversions > 0
          ? c.attributedValue / c.conversions
          : 0,
      }))
      .sort((a, b) => b.attributedValue - a.attributedValue);

    return NextResponse.json({
      dateRange: { startDate, endDate, days },
      model,
      campaigns,
    });
  } catch (error: any) {
    console.error('Error fetching campaign attribution:', error);
    return NextResponse.json(
      { error: error.message || 'Error al obtener atribucion por campaña' },
      { status: 500 }
    );
  }
}
