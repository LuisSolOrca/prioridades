import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import connectDB from '@/lib/mongodb';
import PipelineStage from '@/models/PipelineStage';
import mongoose from 'mongoose';

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    if ((session.user as any).role !== 'ADMIN') {
      return NextResponse.json({ error: 'Solo administradores pueden editar etapas' }, { status: 403 });
    }

    await connectDB();

    if (!mongoose.Types.ObjectId.isValid(params.id)) {
      return NextResponse.json({ error: 'ID inválido' }, { status: 400 });
    }

    const body = await request.json();

    const stage = await PipelineStage.findByIdAndUpdate(
      params.id,
      body,
      { new: true, runValidators: true }
    );

    if (!stage) {
      return NextResponse.json({ error: 'Etapa no encontrada' }, { status: 404 });
    }

    return NextResponse.json(stage);
  } catch (error: any) {
    console.error('Error updating pipeline stage:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    if ((session.user as any).role !== 'ADMIN') {
      return NextResponse.json({ error: 'Solo administradores pueden eliminar etapas' }, { status: 403 });
    }

    await connectDB();

    if (!mongoose.Types.ObjectId.isValid(params.id)) {
      return NextResponse.json({ error: 'ID inválido' }, { status: 400 });
    }

    // Verificar si hay deals en esta etapa
    const Deal = mongoose.models.Deal || (await import('@/models/Deal')).default;
    const dealsCount = await Deal.countDocuments({ stageId: params.id });

    if (dealsCount > 0) {
      return NextResponse.json({
        error: `No se puede eliminar la etapa porque tiene ${dealsCount} deal(s). Mueve los deals a otra etapa primero.`
      }, { status: 400 });
    }

    const stage = await PipelineStage.findByIdAndDelete(params.id);

    if (!stage) {
      return NextResponse.json({ error: 'Etapa no encontrada' }, { status: 404 });
    }

    return NextResponse.json({ message: 'Etapa eliminada correctamente' });
  } catch (error: any) {
    console.error('Error deleting pipeline stage:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
