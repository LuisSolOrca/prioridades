import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import connectDB from '@/lib/mongodb';
import Touchpoint from '@/models/Touchpoint';
import Conversion from '@/models/Conversion';
import Contact from '@/models/Contact';
import mongoose from 'mongoose';

// GET - Get customer journey for a contact
export async function GET(
  request: NextRequest,
  { params }: { params: { contactId: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    await connectDB();

    if (!mongoose.Types.ObjectId.isValid(params.contactId)) {
      return NextResponse.json({ error: 'ID invalido' }, { status: 400 });
    }

    const contactId = new mongoose.Types.ObjectId(params.contactId);

    // Get contact info
    const contact = await Contact.findById(contactId)
      .select('firstName lastName email company phone leadScore status')
      .lean();

    if (!contact) {
      return NextResponse.json({ error: 'Contacto no encontrado' }, { status: 404 });
    }

    // Get all touchpoints for this contact
    const touchpoints = await Touchpoint.find({ contactId })
      .sort({ occurredAt: 1 })
      .lean();

    // Get all conversions for this contact
    const conversions = await Conversion.find({ contactId })
      .populate('dealId', 'title value stage')
      .sort({ convertedAt: 1 })
      .lean();

    // Build timeline combining touchpoints and conversions
    const timeline: any[] = [];

    for (const tp of touchpoints) {
      timeline.push({
        type: 'touchpoint',
        eventType: tp.type,
        channel: tp.channel,
        source: tp.source,
        medium: tp.medium,
        campaign: tp.campaign,
        url: tp.url,
        referrer: tp.referrer,
        device: tp.device,
        browser: tp.browser,
        os: tp.os,
        referenceType: tp.referenceType,
        referenceId: tp.referenceId,
        metadata: tp.metadata,
        occurredAt: tp.occurredAt,
      });
    }

    for (const conv of conversions) {
      timeline.push({
        type: 'conversion',
        eventType: conv.type,
        value: conv.value,
        currency: conv.currency,
        deal: (conv as any).dealId ? {
          title: (conv as any).dealId.title,
          value: (conv as any).dealId.value,
        } : null,
        touchpointCount: conv.touchpointCount,
        journeyDuration: conv.journeyDuration,
        occurredAt: conv.convertedAt,
      });
    }

    // Sort timeline by date
    timeline.sort((a, b) =>
      new Date(a.occurredAt).getTime() - new Date(b.occurredAt).getTime()
    );

    // Calculate journey stats
    const channels = [...new Set(touchpoints.map(t => t.channel))];
    const campaigns = [...new Set(touchpoints.map(t => t.campaign).filter(Boolean))];
    const sources = [...new Set(touchpoints.map(t => t.source).filter(Boolean))];

    const firstTouchpoint = touchpoints[0];
    const lastTouchpoint = touchpoints[touchpoints.length - 1];
    const totalConversions = conversions.length;
    const totalValue = conversions.reduce((sum, c) => sum + (c.value || 0), 0);

    let journeyDuration = 0;
    if (firstTouchpoint && lastTouchpoint) {
      journeyDuration = Math.ceil(
        (new Date(lastTouchpoint.occurredAt).getTime() -
          new Date(firstTouchpoint.occurredAt).getTime()) /
        (1000 * 60 * 60 * 24)
      );
    }

    // Group touchpoints by channel for funnel view
    const channelBreakdown: Record<string, number> = {};
    for (const tp of touchpoints) {
      channelBreakdown[tp.channel] = (channelBreakdown[tp.channel] || 0) + 1;
    }

    return NextResponse.json({
      contact: {
        id: contact._id,
        name: `${(contact as any).firstName || ''} ${(contact as any).lastName || ''}`.trim(),
        email: (contact as any).email,
        company: (contact as any).company,
        leadScore: (contact as any).leadScore,
        status: (contact as any).status,
      },
      stats: {
        totalTouchpoints: touchpoints.length,
        totalConversions,
        totalValue,
        journeyDuration,
        channels,
        campaigns,
        sources,
        channelBreakdown,
      },
      firstTouchpoint: firstTouchpoint ? {
        channel: firstTouchpoint.channel,
        source: firstTouchpoint.source,
        campaign: firstTouchpoint.campaign,
        date: firstTouchpoint.occurredAt,
      } : null,
      lastTouchpoint: lastTouchpoint ? {
        channel: lastTouchpoint.channel,
        source: lastTouchpoint.source,
        campaign: lastTouchpoint.campaign,
        date: lastTouchpoint.occurredAt,
      } : null,
      timeline,
    });
  } catch (error: any) {
    console.error('Error fetching customer journey:', error);
    return NextResponse.json(
      { error: error.message || 'Error al obtener journey' },
      { status: 500 }
    );
  }
}
