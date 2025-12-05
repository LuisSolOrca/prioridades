import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import connectDB from '@/lib/mongodb';
import MarketingAutomation from '@/models/MarketingAutomation';
import mongoose from 'mongoose';

interface RouteParams {
  params: Promise<{ id: string }>;
}

// GET - Get single automation
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

    const automation = await MarketingAutomation.findById(id)
      .populate('createdBy', 'name email')
      .populate('lastModifiedBy', 'name email')
      .lean();

    if (!automation) {
      return NextResponse.json({ error: 'Automatización no encontrada' }, { status: 404 });
    }

    return NextResponse.json(automation);
  } catch (error: any) {
    console.error('Error fetching automation:', error);
    return NextResponse.json(
      { error: error.message || 'Error al obtener automatización' },
      { status: 500 }
    );
  }
}

// PUT - Update automation
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();
    const userId = (session.user as any).id;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ error: 'ID inválido' }, { status: 400 });
    }

    await connectDB();

    // Generate IDs for new actions
    if (body.actions) {
      body.actions = body.actions.map((action: any, index: number) => ({
        ...action,
        id: action.id || `action-${Date.now()}-${index}`,
      }));
    }

    const automation = await MarketingAutomation.findByIdAndUpdate(
      id,
      {
        ...body,
        lastModifiedBy: userId,
      },
      { new: true, runValidators: true }
    ).populate('createdBy', 'name');

    if (!automation) {
      return NextResponse.json({ error: 'Automatización no encontrada' }, { status: 404 });
    }

    return NextResponse.json(automation);
  } catch (error: any) {
    console.error('Error updating automation:', error);
    return NextResponse.json(
      { error: error.message || 'Error al actualizar automatización' },
      { status: 500 }
    );
  }
}

// DELETE - Delete automation
export async function DELETE(request: NextRequest, { params }: RouteParams) {
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

    const automation = await MarketingAutomation.findByIdAndUpdate(
      id,
      { isActive: false, status: 'archived' },
      { new: true }
    );

    if (!automation) {
      return NextResponse.json({ error: 'Automatización no encontrada' }, { status: 404 });
    }

    return NextResponse.json({ message: 'Automatización eliminada correctamente' });
  } catch (error: any) {
    console.error('Error deleting automation:', error);
    return NextResponse.json(
      { error: error.message || 'Error al eliminar automatización' },
      { status: 500 }
    );
  }
}
