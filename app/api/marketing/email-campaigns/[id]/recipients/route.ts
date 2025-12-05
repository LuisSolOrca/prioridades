import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import connectDB from '@/lib/mongodb';
import EmailCampaignRecipient from '@/models/EmailCampaignRecipient';
import mongoose from 'mongoose';

// GET - Get campaign recipients with filters
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    await connectDB();

    if (!mongoose.Types.ObjectId.isValid(params.id)) {
      return NextResponse.json({ error: 'ID inválido' }, { status: 400 });
    }

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');
    const status = searchParams.get('status');
    const opened = searchParams.get('opened');
    const clicked = searchParams.get('clicked');
    const bounced = searchParams.get('bounced');
    const variant = searchParams.get('variant');
    const search = searchParams.get('search');

    const query: Record<string, any> = {
      campaignId: new mongoose.Types.ObjectId(params.id),
    };

    if (status) {
      query.status = status;
    }

    if (opened === 'true') {
      query.openedAt = { $ne: null };
    } else if (opened === 'false') {
      query.openedAt = null;
    }

    if (clicked === 'true') {
      query.clickedAt = { $ne: null };
    } else if (clicked === 'false') {
      query.clickedAt = null;
    }

    if (bounced === 'true') {
      query.status = 'bounced';
    }

    if (variant) {
      query.variant = variant;
    }

    if (search) {
      query.$or = [
        { email: { $regex: search, $options: 'i' } },
        { firstName: { $regex: search, $options: 'i' } },
        { lastName: { $regex: search, $options: 'i' } },
      ];
    }

    const skip = (page - 1) * limit;

    const [recipients, total] = await Promise.all([
      EmailCampaignRecipient.find(query)
        .sort({ sentAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      EmailCampaignRecipient.countDocuments(query),
    ]);

    return NextResponse.json({
      recipients,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error: any) {
    console.error('Error fetching recipients:', error);
    return NextResponse.json(
      { error: error.message || 'Error al obtener destinatarios' },
      { status: 500 }
    );
  }
}
