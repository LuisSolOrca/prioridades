import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import connectDB from '@/lib/mongodb';
import Deal from '@/models/Deal';
import PipelineStage from '@/models/PipelineStage';
import Activity from '@/models/Activity';
import mongoose from 'mongoose';
import { hasPermission } from '@/lib/permissions';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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

    if (!mongoose.Types.ObjectId.isValid(params.id)) {
      return NextResponse.json({ error: 'ID inválido' }, { status: 400 });
    }

    const deal = await Deal.findById(params.id)
      .populate('clientId', 'name industry website phone')
      .populate('contactId', 'firstName lastName email phone position')
      .populate('stageId', 'name color probability isClosed isWon order')
      .populate('ownerId', 'name email')
      .populate('projectId', 'name')
      .populate('createdBy', 'name');

    if (!deal) {
      return NextResponse.json({ error: 'Deal no encontrado' }, { status: 404 });
    }

    // Obtener actividades relacionadas
    const activities = await Activity.find({ dealId: params.id })
      .populate('createdBy', 'name')
      .populate('assignedTo', 'name')
      .sort({ createdAt: -1 })
      .limit(20)
      .lean();

    return NextResponse.json({ ...deal.toObject(), activities });
  } catch (error: any) {
    console.error('Error fetching deal:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    // Verificar permiso para gestionar deals
    if (!hasPermission(session, 'canManageDeals')) {
      return NextResponse.json({ error: 'Sin permiso para gestionar deals' }, { status: 403 });
    }

    await connectDB();

    if (!mongoose.Types.ObjectId.isValid(params.id)) {
      return NextResponse.json({ error: 'ID inválido' }, { status: 400 });
    }

    const body = await request.json();
    const userId = (session.user as any).id;

    // Obtener deal actual para comparar cambios
    const currentDeal = await Deal.findById(params.id).populate('stageId', 'name');
    if (!currentDeal) {
      return NextResponse.json({ error: 'Deal no encontrado' }, { status: 404 });
    }

    // Si cambió la etapa, actualizar probabilidad y crear actividad
    if (body.stageId && body.stageId !== currentDeal.stageId._id.toString()) {
      const newStage = await PipelineStage.findById(body.stageId);
      if (newStage) {
        // Actualizar probabilidad si no se especificó
        if (body.probability === undefined) {
          body.probability = newStage.probability;
        }

        // Si es etapa cerrada, registrar fecha
        if (newStage.isClosed && !currentDeal.actualCloseDate) {
          body.actualCloseDate = new Date();
        }

        // Crear actividad de cambio de etapa
        await Activity.create({
          type: 'note',
          title: `Deal movido de "${(currentDeal.stageId as any).name}" a "${newStage.name}"`,
          dealId: params.id,
          clientId: currentDeal.clientId,
          createdBy: userId,
          isCompleted: true,
          completedAt: new Date(),
        });
      }
    }

    const deal = await Deal.findByIdAndUpdate(
      params.id,
      body,
      { new: true, runValidators: true }
    )
      .populate('clientId', 'name')
      .populate('contactId', 'firstName lastName email')
      .populate('stageId', 'name color probability isClosed isWon order')
      .populate('ownerId', 'name email')
      .populate('createdBy', 'name');

    return NextResponse.json(deal);
  } catch (error: any) {
    console.error('Error updating deal:', error);
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

    // Verificar permiso para gestionar deals
    if (!hasPermission(session, 'canManageDeals')) {
      return NextResponse.json({ error: 'Sin permiso para eliminar deals' }, { status: 403 });
    }

    await connectDB();

    if (!mongoose.Types.ObjectId.isValid(params.id)) {
      return NextResponse.json({ error: 'ID inválido' }, { status: 400 });
    }

    // Eliminar actividades asociadas
    await Activity.deleteMany({ dealId: params.id });

    const deal = await Deal.findByIdAndDelete(params.id);

    if (!deal) {
      return NextResponse.json({ error: 'Deal no encontrado' }, { status: 404 });
    }

    return NextResponse.json({ message: 'Deal eliminado correctamente' });
  } catch (error: any) {
    console.error('Error deleting deal:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
