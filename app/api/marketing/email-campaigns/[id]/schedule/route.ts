import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import connectDB from '@/lib/mongodb';
import EmailCampaign from '@/models/EmailCampaign';
import mongoose from 'mongoose';

// POST - Schedule campaign for later
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

    const body = await request.json();
    const { scheduledAt } = body;

    if (!scheduledAt) {
      return NextResponse.json(
        { error: 'La fecha de programación es requerida' },
        { status: 400 }
      );
    }

    const scheduleDate = new Date(scheduledAt);
    if (scheduleDate <= new Date()) {
      return NextResponse.json(
        { error: 'La fecha de programación debe ser en el futuro' },
        { status: 400 }
      );
    }

    const campaign = await EmailCampaign.findById(params.id);
    if (!campaign) {
      return NextResponse.json(
        { error: 'Campaña no encontrada' },
        { status: 404 }
      );
    }

    if (!['draft', 'scheduled'].includes(campaign.status)) {
      return NextResponse.json(
        { error: 'Solo se pueden programar campañas en borrador' },
        { status: 400 }
      );
    }

    // Validate required fields
    if (!campaign.subject || !campaign.fromName || !campaign.fromEmail) {
      return NextResponse.json(
        { error: 'Faltan campos requeridos: asunto, nombre de remitente o email' },
        { status: 400 }
      );
    }

    if (!campaign.content?.html && (!campaign.content?.json?.blocks || campaign.content.json.blocks.length === 0)) {
      return NextResponse.json(
        { error: 'La campaña no tiene contenido' },
        { status: 400 }
      );
    }

    campaign.status = 'scheduled';
    campaign.scheduledAt = scheduleDate;
    await campaign.save();

    return NextResponse.json({
      message: 'Campaña programada',
      scheduledAt: scheduleDate,
      status: 'scheduled',
    });
  } catch (error: any) {
    console.error('Error scheduling email campaign:', error);
    return NextResponse.json(
      { error: error.message || 'Error al programar campaña' },
      { status: 500 }
    );
  }
}

// DELETE - Unschedule (back to draft)
export async function DELETE(
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

    if (campaign.status !== 'scheduled') {
      return NextResponse.json(
        { error: 'Solo se pueden desprogramar campañas programadas' },
        { status: 400 }
      );
    }

    campaign.status = 'draft';
    campaign.scheduledAt = undefined;
    await campaign.save();

    return NextResponse.json({
      message: 'Campaña desprogramada',
      status: 'draft',
    });
  } catch (error: any) {
    console.error('Error unscheduling email campaign:', error);
    return NextResponse.json(
      { error: error.message || 'Error al desprogramar campaña' },
      { status: 500 }
    );
  }
}
