import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import connectDB from '@/lib/mongodb';
import Pipeline from '@/models/Pipeline';
import PipelineStage from '@/models/PipelineStage';
import Deal from '@/models/Deal';

export const dynamic = 'force-dynamic';

// GET /api/crm/pipelines/[id] - Obtener pipeline con sus etapas
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    await connectDB();

    const { id } = await params;

    const pipeline = await Pipeline.findById(id)
      .populate('createdBy', 'name')
      .lean();

    if (!pipeline) {
      return NextResponse.json({ error: 'Pipeline no encontrado' }, { status: 404 });
    }

    // Obtener etapas del pipeline
    const stages = await PipelineStage.find({
      pipelineId: id,
      isActive: true,
    }).sort({ order: 1 });

    // Obtener estadísticas
    const pipelineDoc = pipeline as any;
    const [dealsCount, totalValue, dealsByStage] = await Promise.all([
      Deal.countDocuments({ pipelineId: id }),
      Deal.aggregate([
        { $match: { pipelineId: pipelineDoc._id } },
        { $group: { _id: null, total: { $sum: '$value' } } },
      ]),
      Deal.aggregate([
        { $match: { pipelineId: pipelineDoc._id } },
        { $group: { _id: '$stageId', count: { $sum: 1 }, value: { $sum: '$value' } } },
      ]),
    ]);

    return NextResponse.json({
      ...pipeline,
      stages,
      dealsCount,
      totalValue: totalValue[0]?.total || 0,
      dealsByStage,
    });
  } catch (error: any) {
    console.error('Error fetching pipeline:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// PUT /api/crm/pipelines/[id] - Actualizar pipeline
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const user = session.user as any;
    if (user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Solo administradores pueden editar pipelines' },
        { status: 403 }
      );
    }

    await connectDB();

    const { id } = await params;
    const body = await request.json();

    // Verificar nombre duplicado si se está cambiando
    if (body.name) {
      const existing = await Pipeline.findOne({
        name: body.name.trim(),
        isActive: true,
        _id: { $ne: id },
      });
      if (existing) {
        return NextResponse.json(
          { error: 'Ya existe un pipeline con ese nombre' },
          { status: 400 }
        );
      }
    }

    const pipeline = await Pipeline.findByIdAndUpdate(
      id,
      { $set: body },
      { new: true, runValidators: true }
    ).populate('createdBy', 'name');

    if (!pipeline) {
      return NextResponse.json({ error: 'Pipeline no encontrado' }, { status: 404 });
    }

    return NextResponse.json(pipeline);
  } catch (error: any) {
    console.error('Error updating pipeline:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// DELETE /api/crm/pipelines/[id] - Eliminar/desactivar pipeline
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const user = session.user as any;
    if (user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Solo administradores pueden eliminar pipelines' },
        { status: 403 }
      );
    }

    await connectDB();

    const { id } = await params;

    // Verificar si hay deals en este pipeline
    const dealsCount = await Deal.countDocuments({ pipelineId: id });
    if (dealsCount > 0) {
      return NextResponse.json(
        { error: `No se puede eliminar: hay ${dealsCount} deal(s) en este pipeline. Mueve los deals a otro pipeline primero.` },
        { status: 400 }
      );
    }

    // Verificar que no sea el único pipeline activo
    const activePipelines = await Pipeline.countDocuments({ isActive: true });
    if (activePipelines <= 1) {
      return NextResponse.json(
        { error: 'No se puede eliminar el único pipeline activo' },
        { status: 400 }
      );
    }

    // Soft delete
    const pipeline = await Pipeline.findByIdAndUpdate(
      id,
      { isActive: false, isDefault: false },
      { new: true }
    );

    if (!pipeline) {
      return NextResponse.json({ error: 'Pipeline no encontrado' }, { status: 404 });
    }

    // Desactivar las etapas del pipeline
    await PipelineStage.updateMany(
      { pipelineId: id },
      { isActive: false }
    );

    return NextResponse.json({ success: true, message: 'Pipeline eliminado' });
  } catch (error: any) {
    console.error('Error deleting pipeline:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
