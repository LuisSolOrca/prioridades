import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import connectDB from '@/lib/mongodb';
import Pipeline from '@/models/Pipeline';
import PipelineStage from '@/models/PipelineStage';
import Deal from '@/models/Deal';

export const dynamic = 'force-dynamic';

// GET /api/crm/pipelines - Listar pipelines
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const includeInactive = searchParams.get('includeInactive') === 'true';
    const includeStats = searchParams.get('includeStats') === 'true';

    await connectDB();

    const query: any = {};
    if (!includeInactive) {
      query.isActive = true;
    }

    let pipelines = await Pipeline.find(query)
      .populate('createdBy', 'name')
      .sort({ isDefault: -1, name: 1 })
      .lean();

    // Agregar estadísticas si se solicitan
    if (includeStats) {
      pipelines = await Promise.all(
        pipelines.map(async (pipeline) => {
          const [stagesCount, dealsCount, totalValue] = await Promise.all([
            PipelineStage.countDocuments({ pipelineId: pipeline._id, isActive: true }),
            Deal.countDocuments({ pipelineId: pipeline._id }),
            Deal.aggregate([
              { $match: { pipelineId: pipeline._id } },
              { $group: { _id: null, total: { $sum: '$value' } } },
            ]),
          ]);

          return {
            ...pipeline,
            stagesCount,
            dealsCount,
            totalValue: totalValue[0]?.total || 0,
          };
        })
      );
    }

    return NextResponse.json(pipelines);
  } catch (error: any) {
    console.error('Error fetching pipelines:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST /api/crm/pipelines - Crear pipeline
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const user = session.user as any;
    if (user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Solo administradores pueden crear pipelines' },
        { status: 403 }
      );
    }

    await connectDB();

    const body = await request.json();
    const { name, description, color, isDefault, copyStagesFrom } = body;

    if (!name?.trim()) {
      return NextResponse.json(
        { error: 'El nombre es requerido' },
        { status: 400 }
      );
    }

    // Verificar nombre duplicado
    const existing = await Pipeline.findOne({ name: name.trim(), isActive: true });
    if (existing) {
      return NextResponse.json(
        { error: 'Ya existe un pipeline con ese nombre' },
        { status: 400 }
      );
    }

    // Crear pipeline
    const pipeline = new Pipeline({
      name: name.trim(),
      description: description?.trim(),
      color: color || '#3B82F6',
      isDefault: isDefault || false,
      createdBy: user.id,
    });

    await pipeline.save();

    // Si se especifica copiar etapas de otro pipeline
    if (copyStagesFrom) {
      const sourceStages = await PipelineStage.find({
        pipelineId: copyStagesFrom,
        isActive: true,
      }).sort({ order: 1 });

      if (sourceStages.length > 0) {
        const newStages = sourceStages.map((stage) => ({
          pipelineId: pipeline._id,
          name: stage.name,
          order: stage.order,
          color: stage.color,
          probability: stage.probability,
          isDefault: stage.isDefault,
          isClosed: stage.isClosed,
          isWon: stage.isWon,
          isActive: true,
        }));

        await PipelineStage.insertMany(newStages);
      }
    }

    return NextResponse.json(pipeline, { status: 201 });
  } catch (error: any) {
    console.error('Error creating pipeline:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
