import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import connectDB from '@/lib/mongodb';
import MarketingCreative from '@/models/MarketingCreative';
import { deleteFileFromR2 } from '@/lib/r2-client';
import mongoose from 'mongoose';

// GET - Get single creative
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

    const creative = await MarketingCreative.findById(params.id)
      .populate('createdBy', 'name email')
      .populate('usedInCampaigns', 'name status')
      .lean();

    if (!creative) {
      return NextResponse.json(
        { error: 'Creativo no encontrado' },
        { status: 404 }
      );
    }

    return NextResponse.json(creative);
  } catch (error: any) {
    console.error('Error fetching creative:', error);
    return NextResponse.json(
      { error: error.message || 'Error al obtener creativo' },
      { status: 500 }
    );
  }
}

// PUT - Update creative
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
    const updateData: Record<string, any> = {};

    // Fields that can be updated
    const allowedFields = [
      'name', 'description', 'type', 'platforms', 'aspectRatio',
      'primaryAsset', 'carouselSlides', 'headline', 'callToAction',
      'linkUrl', 'textOverlays', 'backgroundColor', 'brandColors',
      'tags', 'status', 'isTemplate', 'templateCategory'
    ];

    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        updateData[field] = body[field];
      }
    }

    // Auto-update status based on assets
    if (updateData.primaryAsset || updateData.carouselSlides) {
      if (updateData.status === 'DRAFT') {
        updateData.status = 'READY';
      }
    }

    const creative = await MarketingCreative.findByIdAndUpdate(
      params.id,
      updateData,
      { new: true, runValidators: true }
    ).populate('createdBy', 'name email');

    if (!creative) {
      return NextResponse.json(
        { error: 'Creativo no encontrado' },
        { status: 404 }
      );
    }

    return NextResponse.json(creative);
  } catch (error: any) {
    console.error('Error updating creative:', error);
    return NextResponse.json(
      { error: error.message || 'Error al actualizar creativo' },
      { status: 500 }
    );
  }
}

// DELETE - Delete creative
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

    const creative = await MarketingCreative.findById(params.id);

    if (!creative) {
      return NextResponse.json(
        { error: 'Creativo no encontrado' },
        { status: 404 }
      );
    }

    // Check if in use
    if (creative.usedInCampaigns && creative.usedInCampaigns.length > 0) {
      // Soft delete - archive
      creative.status = 'ARCHIVED';
      await creative.save();
      return NextResponse.json({
        message: 'Creativo archivado (está en uso por campañas)',
        archived: true,
      });
    }

    // Delete R2 assets
    try {
      if (creative.primaryAsset?.r2Key) {
        await deleteFileFromR2(creative.primaryAsset.r2Key);
      }
      if (creative.carouselSlides) {
        for (const slide of creative.carouselSlides) {
          if (slide.asset?.r2Key) {
            await deleteFileFromR2(slide.asset.r2Key);
          }
        }
      }
    } catch (r2Error) {
      console.error('Error deleting R2 assets:', r2Error);
      // Continue with deletion even if R2 fails
    }

    await MarketingCreative.findByIdAndDelete(params.id);

    return NextResponse.json({
      message: 'Creativo eliminado',
      deleted: true,
    });
  } catch (error: any) {
    console.error('Error deleting creative:', error);
    return NextResponse.json(
      { error: error.message || 'Error al eliminar creativo' },
      { status: 500 }
    );
  }
}
