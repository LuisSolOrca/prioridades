import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import connectDB from '@/lib/mongodb';
import EmailCampaignTemplate from '@/models/EmailCampaignTemplate';
import mongoose from 'mongoose';

interface RouteParams {
  params: Promise<{ id: string }>;
}

// GET - Get single template
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

    const template = await EmailCampaignTemplate.findById(id)
      .populate('createdBy', 'name email')
      .lean();

    if (!template) {
      return NextResponse.json({ error: 'Plantilla no encontrada' }, { status: 404 });
    }

    return NextResponse.json(template);
  } catch (error: any) {
    console.error('Error fetching template:', error);
    return NextResponse.json(
      { error: error.message || 'Error al obtener plantilla' },
      { status: 500 }
    );
  }
}

// PUT - Update template
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const { id } = await params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ error: 'ID inválido' }, { status: 400 });
    }

    const body = await request.json();

    await connectDB();

    const template = await EmailCampaignTemplate.findById(id);

    if (!template) {
      return NextResponse.json({ error: 'Plantilla no encontrada' }, { status: 404 });
    }

    // Check ownership
    const userId = (session.user as any).id;
    if (template.createdBy.toString() !== userId && (session.user as any).role !== 'ADMIN') {
      return NextResponse.json({ error: 'No tienes permisos para editar esta plantilla' }, { status: 403 });
    }

    const updatedTemplate = await EmailCampaignTemplate.findByIdAndUpdate(
      id,
      { $set: body },
      { new: true, runValidators: true }
    ).populate('createdBy', 'name email');

    return NextResponse.json(updatedTemplate);
  } catch (error: any) {
    console.error('Error updating template:', error);
    return NextResponse.json(
      { error: error.message || 'Error al actualizar plantilla' },
      { status: 500 }
    );
  }
}

// DELETE - Delete template
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

    const template = await EmailCampaignTemplate.findById(id);

    if (!template) {
      return NextResponse.json({ error: 'Plantilla no encontrada' }, { status: 404 });
    }

    // Check ownership
    const userId = (session.user as any).id;
    if (template.createdBy.toString() !== userId && (session.user as any).role !== 'ADMIN') {
      return NextResponse.json({ error: 'No tienes permisos para eliminar esta plantilla' }, { status: 403 });
    }

    await EmailCampaignTemplate.findByIdAndDelete(id);

    return NextResponse.json({ message: 'Plantilla eliminada correctamente' });
  } catch (error: any) {
    console.error('Error deleting template:', error);
    return NextResponse.json(
      { error: error.message || 'Error al eliminar plantilla' },
      { status: 500 }
    );
  }
}
