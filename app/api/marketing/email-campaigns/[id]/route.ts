import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import connectDB from '@/lib/mongodb';
import EmailCampaign from '@/models/EmailCampaign';
import EmailCampaignRecipient from '@/models/EmailCampaignRecipient';
import mongoose from 'mongoose';

// GET - Get single campaign with metrics
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

    const campaign = await EmailCampaign.findById(params.id)
      .populate('createdBy', 'name email')
      .populate('lastEditedBy', 'name email')
      .populate('audienceId', 'name estimatedReach')
      .lean();

    if (!campaign) {
      return NextResponse.json(
        { error: 'Campaña no encontrada' },
        { status: 404 }
      );
    }

    // Get real-time metrics if campaign has been sent
    if (['sending', 'sent', 'paused'].includes(campaign.status)) {
      const stats = await (EmailCampaignRecipient as any).getCampaignStats(
        new mongoose.Types.ObjectId(params.id)
      );

      campaign.metrics = {
        ...campaign.metrics,
        sent: stats.sent,
        delivered: stats.delivered,
        opened: stats.opened,
        clicked: stats.clicked,
        bounced: stats.bounced,
        unsubscribed: stats.unsubscribed,
        complained: stats.complained,
        openRate: stats.delivered > 0 ? (stats.opened / stats.delivered) * 100 : 0,
        clickRate: stats.delivered > 0 ? (stats.clicked / stats.delivered) * 100 : 0,
        clickToOpenRate: stats.opened > 0 ? (stats.clicked / stats.opened) * 100 : 0,
      };
    }

    return NextResponse.json(campaign);
  } catch (error: any) {
    console.error('Error fetching email campaign:', error);
    return NextResponse.json(
      { error: error.message || 'Error al obtener campaña' },
      { status: 500 }
    );
  }
}

// PUT - Update campaign (only drafts)
export async function PUT(
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

    // Only allow editing drafts or scheduled (before send time)
    if (!['draft', 'scheduled'].includes(campaign.status)) {
      return NextResponse.json(
        { error: 'Solo se pueden editar campañas en borrador o programadas' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const allowedFields = [
      'name',
      'subject',
      'preheader',
      'fromName',
      'fromEmail',
      'replyTo',
      'content',
      'audienceType',
      'audienceId',
      'audienceFilter',
      'excludeAudienceIds',
      'abTest',
      'tags',
      'category',
      'scheduledAt',
    ];

    const updateData: Record<string, any> = {
      lastEditedBy: (session.user as any).id,
    };

    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        updateData[field] = body[field];
      }
    }

    // Validate email if changed
    if (updateData.fromEmail) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(updateData.fromEmail)) {
        return NextResponse.json(
          { error: 'El email del remitente no es válido' },
          { status: 400 }
        );
      }
    }

    const updatedCampaign = await EmailCampaign.findByIdAndUpdate(
      params.id,
      updateData,
      { new: true, runValidators: true }
    ).populate('createdBy', 'name email');

    return NextResponse.json(updatedCampaign);
  } catch (error: any) {
    console.error('Error updating email campaign:', error);
    return NextResponse.json(
      { error: error.message || 'Error al actualizar campaña' },
      { status: 500 }
    );
  }
}

// DELETE - Delete campaign (only drafts)
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

    // Only allow deleting drafts
    if (campaign.status !== 'draft') {
      return NextResponse.json(
        { error: 'Solo se pueden eliminar campañas en borrador' },
        { status: 400 }
      );
    }

    await EmailCampaign.findByIdAndDelete(params.id);

    // Also delete any recipients (shouldn't exist for drafts, but just in case)
    await EmailCampaignRecipient.deleteMany({ campaignId: params.id });

    return NextResponse.json({ message: 'Campaña eliminada', deleted: true });
  } catch (error: any) {
    console.error('Error deleting email campaign:', error);
    return NextResponse.json(
      { error: error.message || 'Error al eliminar campaña' },
      { status: 500 }
    );
  }
}
