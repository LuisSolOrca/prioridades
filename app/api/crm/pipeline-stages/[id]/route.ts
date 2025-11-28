import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import connectDB from '@/lib/mongodb';
import PipelineStage from '@/models/PipelineStage';
import Deal from '@/models/Deal';
import { hasPermission } from '@/lib/permissions';

export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    if (!hasPermission(session, 'viewCRM')) {
      return NextResponse.json({ error: 'Sin permiso para ver CRM' }, { status: 403 });
    }

    await connectDB();
    const { id } = await params;

    const stage = await PipelineStage.findById(id).lean();
    if (!stage) {
      return NextResponse.json({ error: 'Etapa no encontrada' }, { status: 404 });
    }

    return NextResponse.json(stage);
  } catch (error: any) {
    console.error('Error fetching pipeline stage:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    if (!hasPermission(session, 'canManagePipelineStages')) {
      return NextResponse.json({ error: 'Sin permiso para gestionar etapas del pipeline' }, { status: 403 });
    }

    await connectDB();
    const { id } = await params;
    const body = await request.json();

    // Validar si se está marcando como default
    if (body.isDefault === true) {
      // Quitar default de todas las demás etapas
      await PipelineStage.updateMany(
        { _id: { $ne: id } },
        { isDefault: false }
      );
    }

    // Validar que si es isClosed con isWon, la probabilidad sea coherente
    if (body.isClosed && body.isWon && body.probability !== undefined && body.probability !== 100) {
      body.probability = 100;
    }
    if (body.isClosed && !body.isWon && body.probability !== undefined && body.probability !== 0) {
      body.probability = 0;
    }

    const stage = await PipelineStage.findByIdAndUpdate(
      id,
      { $set: body },
      { new: true, runValidators: true }
    ).lean();

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
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    if (!hasPermission(session, 'canManagePipelineStages')) {
      return NextResponse.json({ error: 'Sin permiso para gestionar etapas del pipeline' }, { status: 403 });
    }

    await connectDB();
    const { id } = await params;

    // Verificar si hay deals en esta etapa
    const dealsCount = await Deal.countDocuments({ stageId: id });
    if (dealsCount > 0) {
      return NextResponse.json(
        { error: `No se puede eliminar: hay ${dealsCount} deal(s) en esta etapa. Muévelos primero.` },
        { status: 400 }
      );
    }

    const stage = await PipelineStage.findById(id);
    if (!stage) {
      return NextResponse.json({ error: 'Etapa no encontrada' }, { status: 404 });
    }

    // Prevenir eliminar la etapa por defecto
    if (stage.isDefault) {
      return NextResponse.json(
        { error: 'No se puede eliminar la etapa por defecto. Asigna otra etapa como default primero.' },
        { status: 400 }
      );
    }

    await PipelineStage.findByIdAndDelete(id);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error deleting pipeline stage:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
