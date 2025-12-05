import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import connectDB from '@/lib/mongodb';
import MarketingAudience from '@/models/MarketingAudience';
import mongoose from 'mongoose';

// GET - Get single audience
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

    const audience = await MarketingAudience.findById(params.id)
      .populate('createdBy', 'name email')
      .populate('usedInCampaigns', 'name status')
      .lean();

    if (!audience) {
      return NextResponse.json(
        { error: 'Audiencia no encontrada' },
        { status: 404 }
      );
    }

    return NextResponse.json(audience);
  } catch (error: any) {
    console.error('Error fetching audience:', error);
    return NextResponse.json(
      { error: error.message || 'Error al obtener audiencia' },
      { status: 500 }
    );
  }
}

// PUT - Update audience
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

    const body = await request.json();
    const { name, description, platforms, rules, tags, isActive } = body;

    const updateData: Record<string, any> = {};

    if (name !== undefined) updateData.name = name;
    if (description !== undefined) updateData.description = description;
    if (platforms !== undefined) updateData.platforms = platforms;
    if (rules !== undefined) updateData.rules = rules;
    if (tags !== undefined) updateData.tags = tags;
    if (isActive !== undefined) updateData.isActive = isActive;

    const audience = await MarketingAudience.findByIdAndUpdate(
      params.id,
      updateData,
      { new: true, runValidators: true }
    ).populate('createdBy', 'name email');

    if (!audience) {
      return NextResponse.json(
        { error: 'Audiencia no encontrada' },
        { status: 404 }
      );
    }

    return NextResponse.json(audience);
  } catch (error: any) {
    console.error('Error updating audience:', error);
    return NextResponse.json(
      { error: error.message || 'Error al actualizar audiencia' },
      { status: 500 }
    );
  }
}

// DELETE - Delete audience (soft delete)
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

    const audience = await MarketingAudience.findById(params.id);

    if (!audience) {
      return NextResponse.json(
        { error: 'Audiencia no encontrada' },
        { status: 404 }
      );
    }

    // Check if used in active campaigns
    if (audience.usedInCampaigns && audience.usedInCampaigns.length > 0) {
      // Soft delete
      audience.isActive = false;
      await audience.save();
      return NextResponse.json({
        message: 'Audiencia desactivada (está en uso por campañas)',
        softDeleted: true,
      });
    }

    // Hard delete if not in use
    await MarketingAudience.findByIdAndDelete(params.id);

    return NextResponse.json({
      message: 'Audiencia eliminada',
      deleted: true,
    });
  } catch (error: any) {
    console.error('Error deleting audience:', error);
    return NextResponse.json(
      { error: error.message || 'Error al eliminar audiencia' },
      { status: 500 }
    );
  }
}
