import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import connectDB from '@/lib/mongodb';
import CRMWorkflow from '@/models/CRMWorkflow';
import CRMWorkflowExecution from '@/models/CRMWorkflowExecution';
import { hasPermission } from '@/lib/permissions';

export const dynamic = 'force-dynamic';

// GET - Obtener workflow por ID
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

    const workflow = await CRMWorkflow.findById(id)
      .populate('createdBy', 'name email')
      .populate('updatedBy', 'name email')
      .lean();

    if (!workflow) {
      return NextResponse.json({ error: 'Workflow no encontrado' }, { status: 404 });
    }

    // Obtener últimas ejecuciones
    const recentExecutions = await CRMWorkflowExecution.find({ workflowId: id })
      .sort({ createdAt: -1 })
      .limit(10)
      .lean();

    return NextResponse.json({ ...workflow, recentExecutions });
  } catch (error: any) {
    console.error('Error fetching CRM workflow:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// PUT - Actualizar workflow
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
        { error: 'Solo administradores pueden editar workflows' },
        { status: 403 }
      );
    }

    await connectDB();
    const { id } = await params;
    const body = await request.json();

    const workflow = await CRMWorkflow.findById(id);
    if (!workflow) {
      return NextResponse.json({ error: 'Workflow no encontrado' }, { status: 404 });
    }

    // Validar acciones si se están actualizando
    if (body.actions && body.actions.length === 0) {
      return NextResponse.json(
        { error: 'El workflow debe tener al menos una acción' },
        { status: 400 }
      );
    }

    // Generar IDs para nuevas condiciones y acciones
    if (body.trigger?.conditions) {
      body.trigger.conditions = body.trigger.conditions.map((c: any, i: number) => ({
        ...c,
        id: c.id || `condition_${Date.now()}_${i}`,
      }));
    }

    if (body.actions) {
      body.actions = body.actions.map((a: any, i: number) => ({
        ...a,
        id: a.id || `action_${Date.now()}_${i}`,
        order: a.order ?? i,
      }));
    }

    const updatedWorkflow = await CRMWorkflow.findByIdAndUpdate(
      id,
      {
        ...body,
        updatedBy: user.id,
      },
      { new: true, runValidators: true }
    )
      .populate('createdBy', 'name email')
      .populate('updatedBy', 'name email')
      .lean();

    return NextResponse.json(updatedWorkflow);
  } catch (error: any) {
    console.error('Error updating CRM workflow:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// DELETE - Eliminar workflow
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
        { error: 'Solo administradores pueden eliminar workflows' },
        { status: 403 }
      );
    }

    await connectDB();
    const { id } = await params;

    const workflow = await CRMWorkflow.findById(id);
    if (!workflow) {
      return NextResponse.json({ error: 'Workflow no encontrado' }, { status: 404 });
    }

    // Eliminar workflow y sus ejecuciones
    await Promise.all([
      CRMWorkflow.findByIdAndDelete(id),
      CRMWorkflowExecution.deleteMany({ workflowId: id }),
    ]);

    return NextResponse.json({ message: 'Workflow eliminado correctamente' });
  } catch (error: any) {
    console.error('Error deleting CRM workflow:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
