import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import connectDB from '@/lib/mongodb';
import Touchpoint from '@/models/Touchpoint';
import { headers } from 'next/headers';

// GET - List touchpoints
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    await connectDB();

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');
    const contactId = searchParams.get('contactId');
    const visitorId = searchParams.get('visitorId');
    const channel = searchParams.get('channel');
    const campaign = searchParams.get('campaign');
    const type = searchParams.get('type');
    const days = parseInt(searchParams.get('days') || '30');
    const isIdentified = searchParams.get('isIdentified');

    const skip = (page - 1) * limit;

    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    // Build query
    const query: any = {
      occurredAt: { $gte: startDate, $lte: endDate },
    };

    if (contactId) query.contactId = contactId;
    if (visitorId) query.visitorId = visitorId;
    if (channel) query.channel = channel;
    if (campaign) query.campaign = campaign;
    if (type) query.type = type;
    if (isIdentified !== null && isIdentified !== undefined) {
      query.isIdentified = isIdentified === 'true';
    }

    const touchpoints = await Touchpoint.find(query)
      .populate('contactId', 'firstName lastName email')
      .sort({ occurredAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    const total = await Touchpoint.countDocuments(query);

    return NextResponse.json({
      touchpoints: touchpoints.map((tp: any) => ({
        ...tp,
        contact: tp.contactId ? {
          id: tp.contactId._id,
          name: `${tp.contactId.firstName || ''} ${tp.contactId.lastName || ''}`.trim(),
          email: tp.contactId.email,
        } : null,
        contactId: tp.contactId?._id,
      })),
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
      dateRange: { startDate, endDate, days },
    });
  } catch (error: any) {
    console.error('Error fetching touchpoints:', error);
    return NextResponse.json(
      { error: error.message || 'Error al obtener touchpoints' },
      { status: 500 }
    );
  }
}

// POST - Register a new touchpoint
export async function POST(request: NextRequest) {
  try {
    await connectDB();

    const body = await request.json();
    const {
      contactId,
      visitorId,
      sessionId,
      type,
      channel,
      source,
      medium,
      campaign,
      content,
      term,
      referenceType,
      referenceId,
      url,
      referrer,
      metadata,
    } = body;

    if (!visitorId) {
      return NextResponse.json(
        { error: 'visitorId es requerido' },
        { status: 400 }
      );
    }

    if (!type) {
      return NextResponse.json(
        { error: 'type es requerido' },
        { status: 400 }
      );
    }

    // Get device info from headers
    const headersList = headers();
    const userAgent = headersList.get('user-agent') || '';

    let device: 'desktop' | 'mobile' | 'tablet' = 'desktop';
    const ua = userAgent.toLowerCase();
    if (/tablet|ipad|playbook|silk/i.test(ua)) device = 'tablet';
    else if (/mobile|iphone|ipod|android|blackberry|opera mini|iemobile/i.test(ua)) device = 'mobile';

    // Detect browser
    let browser = 'Other';
    if (ua.includes('firefox')) browser = 'Firefox';
    else if (ua.includes('edg')) browser = 'Edge';
    else if (ua.includes('chrome')) browser = 'Chrome';
    else if (ua.includes('safari')) browser = 'Safari';
    else if (ua.includes('opera') || ua.includes('opr')) browser = 'Opera';

    // Detect OS
    let os = 'Other';
    if (ua.includes('windows')) os = 'Windows';
    else if (ua.includes('mac')) os = 'macOS';
    else if (ua.includes('linux')) os = 'Linux';
    else if (ua.includes('android')) os = 'Android';
    else if (ua.includes('ios') || ua.includes('iphone') || ua.includes('ipad')) os = 'iOS';

    // Detect channel if not provided
    const detectedChannel = channel || (Touchpoint as any).detectChannel(source, medium, referrer);

    const touchpoint = new Touchpoint({
      contactId,
      visitorId,
      sessionId,
      type,
      channel: detectedChannel,
      source,
      medium,
      campaign,
      content,
      term,
      referenceType,
      referenceId,
      url,
      referrer,
      metadata: metadata || {},
      device,
      browser,
      os,
      occurredAt: new Date(),
      isIdentified: !!contactId,
    });

    await touchpoint.save();

    return NextResponse.json({
      success: true,
      touchpoint: {
        id: touchpoint._id,
        type: touchpoint.type,
        channel: touchpoint.channel,
        occurredAt: touchpoint.occurredAt,
      },
    });
  } catch (error: any) {
    console.error('Error creating touchpoint:', error);
    return NextResponse.json(
      { error: error.message || 'Error al crear touchpoint' },
      { status: 500 }
    );
  }
}
