import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import connectDB from '@/lib/mongodb';
import PipelineStage, { DEFAULT_PIPELINE_STAGES } from '@/models/PipelineStage';
import { hasPermission } from '@/lib/permissions';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    // Verificar permiso para ver CRM
    if (!hasPermission(session, 'viewCRM')) {
      return NextResponse.json({ error: 'Sin permiso para ver CRM' }, { status: 403 });
    }

    await connectDB();

    const { searchParams } = new URL(request.url);
    const activeOnly = searchParams.get('activeOnly') === 'true';

    const query: any = {};
    if (activeOnly) {
      query.isActive = true;
    }

    let stages = await PipelineStage.find(query)
      .sort({ order: 1 })
      .lean();

    // Si no hay etapas, crear las por defecto
    if (stages.length === 0) {
      await PipelineStage.insertMany(DEFAULT_PIPELINE_STAGES.map(s => ({ ...s, isActive: true })));
      stages = await PipelineStage.find(query).sort({ order: 1 }).lean();
    }

    return NextResponse.json(stages);
  } catch (error: any) {
    console.error('Error fetching pipeline stages:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    // Verificar permiso para gestionar pipeline stages
    if (!hasPermission(session, 'canManagePipelineStages')) {
      return NextResponse.json({ error: 'Sin permiso para gestionar etapas del pipeline' }, { status: 403 });
    }

    await connectDB();

    const body = await request.json();

    // Obtener el orden máximo actual
    const maxOrderStage = await PipelineStage.findOne().sort({ order: -1 });
    const newOrder = maxOrderStage ? maxOrderStage.order + 1 : 1;

    const stage = await PipelineStage.create({
      ...body,
      order: body.order ?? newOrder,
      isActive: true,
    });

    return NextResponse.json(stage, { status: 201 });
  } catch (error: any) {
    console.error('Error creating pipeline stage:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// Reordenar etapas
export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    // Verificar permiso para gestionar pipeline stages
    if (!hasPermission(session, 'canManagePipelineStages')) {
      return NextResponse.json({ error: 'Sin permiso para reordenar etapas del pipeline' }, { status: 403 });
    }

    await connectDB();

    const body = await request.json();
    const { stageIds } = body; // Array de IDs en el nuevo orden

    if (!Array.isArray(stageIds)) {
      return NextResponse.json({ error: 'stageIds debe ser un array' }, { status: 400 });
    }

    // Actualizar el orden de cada etapa
    const updates = stageIds.map((id, index) =>
      PipelineStage.findByIdAndUpdate(id, { order: index + 1 })
    );

    await Promise.all(updates);

    const stages = await PipelineStage.find({ isActive: true }).sort({ order: 1 }).lean();

    return NextResponse.json(stages);
  } catch (error: any) {
    console.error('Error reordering pipeline stages:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
