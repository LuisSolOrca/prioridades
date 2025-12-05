import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import connectDB from '@/lib/mongodb';
import Conversion from '@/models/Conversion';

// GET - List conversions with attribution data
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    await connectDB();

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const type = searchParams.get('type');
    const channel = searchParams.get('channel');
    const campaign = searchParams.get('campaign');
    const days = parseInt(searchParams.get('days') || '30');
    const minValue = searchParams.get('minValue');

    const skip = (page - 1) * limit;

    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    // Build query
    const query: any = {
      convertedAt: { $gte: startDate, $lte: endDate },
      isProcessed: true,
    };

    if (type) query.type = type;
    if (minValue) query.value = { $gte: parseFloat(minValue) };

    if (channel) {
      query['attribution.channel'] = channel;
    }

    if (campaign) {
      query['attribution.campaign'] = campaign;
    }

    // Get conversions
    const conversions = await Conversion.find(query)
      .populate('contactId', 'firstName lastName email company')
      .populate('dealId', 'title value stage')
      .populate('firstTouchpoint', 'channel source medium campaign occurredAt')
      .populate('lastTouchpoint', 'channel source medium campaign occurredAt')
      .sort({ convertedAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    const total = await Conversion.countDocuments(query);

    // Format response
    const formattedConversions = conversions.map((c: any) => ({
      _id: c._id,
      type: c.type,
      value: c.value,
      currency: c.currency,
      contact: c.contactId ? {
        id: c.contactId._id,
        name: `${c.contactId.firstName || ''} ${c.contactId.lastName || ''}`.trim(),
        email: c.contactId.email,
        company: c.contactId.company,
      } : null,
      deal: c.dealId ? {
        id: c.dealId._id,
        title: c.dealId.title,
        value: c.dealId.value,
        stage: c.dealId.stage,
      } : null,
      firstTouchpoint: c.firstTouchpoint ? {
        channel: c.firstTouchpoint.channel,
        source: c.firstTouchpoint.source,
        medium: c.firstTouchpoint.medium,
        campaign: c.firstTouchpoint.campaign,
        date: c.firstTouchpoint.occurredAt,
      } : null,
      lastTouchpoint: c.lastTouchpoint ? {
        channel: c.lastTouchpoint.channel,
        source: c.lastTouchpoint.source,
        medium: c.lastTouchpoint.medium,
        campaign: c.lastTouchpoint.campaign,
        date: c.lastTouchpoint.occurredAt,
      } : null,
      touchpointCount: c.touchpointCount,
      journeyDuration: c.journeyDuration,
      convertedAt: c.convertedAt,
      // Get unique channels from attribution
      channels: [...new Set(c.attribution?.map((a: any) => a.channel) || [])],
    }));

    return NextResponse.json({
      conversions: formattedConversions,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
      dateRange: { startDate, endDate, days },
    });
  } catch (error: any) {
    console.error('Error fetching conversions:', error);
    return NextResponse.json(
      { error: error.message || 'Error al obtener conversiones' },
      { status: 500 }
    );
  }
}
