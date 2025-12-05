import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import connectDB from '@/lib/mongodb';
import EmailCampaign from '@/models/EmailCampaign';
import mongoose from 'mongoose';

// POST - Duplicate campaign
export async function POST(
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

    const campaign = await EmailCampaign.findById(params.id).lean();
    if (!campaign) {
      return NextResponse.json(
        { error: 'Campaña no encontrada' },
        { status: 404 }
      );
    }

    // Create copy without _id and with reset fields
    const {
      _id,
      status,
      scheduledAt,
      sentAt,
      completedAt,
      metrics,
      createdAt,
      updatedAt,
      ...campaignData
    } = campaign;

    const duplicatedCampaign = await EmailCampaign.create({
      ...campaignData,
      name: `${campaign.name} (copia)`,
      status: 'draft',
      metrics: {
        sent: 0,
        delivered: 0,
        opened: 0,
        clicked: 0,
        replied: 0,
        bounced: 0,
        unsubscribed: 0,
        complained: 0,
        openRate: 0,
        clickRate: 0,
        clickToOpenRate: 0,
      },
      createdBy: (session.user as any).id,
    });

    return NextResponse.json(duplicatedCampaign, { status: 201 });
  } catch (error: any) {
    console.error('Error duplicating email campaign:', error);
    return NextResponse.json(
      { error: error.message || 'Error al duplicar campaña' },
      { status: 500 }
    );
  }
}
