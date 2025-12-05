import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import connectDB from '@/lib/mongodb';
import MarketingCampaign from '@/models/MarketingCampaign';
import mongoose from 'mongoose';

interface RouteParams {
  params: Promise<{ id: string }>;
}

// GET - Get single campaign
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const { id } = await params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ error: 'ID inválido' }, { status: 400 });
    }

    await connectDB();

    const campaign = await MarketingCampaign.findById(id)
      .populate('createdBy', 'name email')
      .populate('ownerId', 'name email')
      .populate('linkedDealIds', 'title value')
      .populate('linkedClientIds', 'companyName')
      .populate('linkedContactIds', 'firstName lastName email');

    if (!campaign) {
      return NextResponse.json({ error: 'Campaña no encontrada' }, { status: 404 });
    }

    return NextResponse.json(campaign);
  } catch (error) {
    console.error('Error fetching campaign:', error);
    return NextResponse.json(
      { error: 'Error al obtener campaña' },
      { status: 500 }
    );
  }
}

// PUT - Update campaign
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const user = session.user as any;
    if (!user.permissions?.canManageCampaigns && user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Sin permisos' }, { status: 403 });
    }

    const { id } = await params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ error: 'ID inválido' }, { status: 400 });
    }

    const body = await request.json();

    await connectDB();

    // Remove fields that shouldn't be updated directly
    const {
      _id,
      createdBy,
      createdAt,
      updatedAt,
      externalCampaignId,
      externalAdSetId,
      externalAdId,
      metrics,
      ...updateData
    } = body;

    const campaign = await MarketingCampaign.findByIdAndUpdate(
      id,
      { $set: updateData },
      { new: true, runValidators: true }
    )
      .populate('createdBy', 'name email')
      .populate('ownerId', 'name email');

    if (!campaign) {
      return NextResponse.json({ error: 'Campaña no encontrada' }, { status: 404 });
    }

    return NextResponse.json(campaign);
  } catch (error) {
    console.error('Error updating campaign:', error);
    return NextResponse.json(
      { error: 'Error al actualizar campaña' },
      { status: 500 }
    );
  }
}

// DELETE - Archive campaign
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const user = session.user as any;
    if (!user.permissions?.canManageCampaigns && user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Sin permisos' }, { status: 403 });
    }

    const { id } = await params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ error: 'ID inválido' }, { status: 400 });
    }

    await connectDB();

    // Soft delete - archive the campaign
    const campaign = await MarketingCampaign.findByIdAndUpdate(
      id,
      { status: 'ARCHIVED' },
      { new: true }
    );

    if (!campaign) {
      return NextResponse.json({ error: 'Campaña no encontrada' }, { status: 404 });
    }

    return NextResponse.json({ message: 'Campaña archivada correctamente' });
  } catch (error) {
    console.error('Error archiving campaign:', error);
    return NextResponse.json(
      { error: 'Error al archivar campaña' },
      { status: 500 }
    );
  }
}
