import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import connectDB from '@/lib/mongodb';
import EmailCampaign from '@/models/EmailCampaign';
import EmailCampaignRecipient from '@/models/EmailCampaignRecipient';
import mongoose from 'mongoose';

// POST - Cancel campaign
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

    const campaign = await EmailCampaign.findById(params.id);
    if (!campaign) {
      return NextResponse.json(
        { error: 'Campaña no encontrada' },
        { status: 404 }
      );
    }

    if (!['sending', 'paused', 'scheduled'].includes(campaign.status)) {
      return NextResponse.json(
        { error: 'Solo se pueden cancelar campañas en envío, pausadas o programadas' },
        { status: 400 }
      );
    }

    // Cancel pending recipients
    await EmailCampaignRecipient.updateMany(
      { campaignId: params.id, status: { $in: ['pending', 'queued'] } },
      { status: 'failed' }
    );

    campaign.status = 'cancelled';
    campaign.completedAt = new Date();
    await campaign.save();

    return NextResponse.json({
      message: 'Campaña cancelada',
      status: 'cancelled',
    });
  } catch (error: any) {
    console.error('Error cancelling email campaign:', error);
    return NextResponse.json(
      { error: error.message || 'Error al cancelar campaña' },
      { status: 500 }
    );
  }
}
