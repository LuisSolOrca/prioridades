import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import connectDB from '@/lib/mongodb';
import EmailCampaign from '@/models/EmailCampaign';
import mongoose from 'mongoose';

// POST - Pause sending campaign
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

    if (campaign.status !== 'sending') {
      return NextResponse.json(
        { error: 'Solo se pueden pausar campañas en envío' },
        { status: 400 }
      );
    }

    campaign.status = 'paused';
    await campaign.save();

    return NextResponse.json({
      message: 'Campaña pausada',
      status: 'paused',
    });
  } catch (error: any) {
    console.error('Error pausing email campaign:', error);
    return NextResponse.json(
      { error: error.message || 'Error al pausar campaña' },
      { status: 500 }
    );
  }
}
