import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import connectDB from '@/lib/mongodb';
import CRMWorkflow from '@/models/CRMWorkflow';
import { hasPermission } from '@/lib/permissions';

export const dynamic = 'force-dynamic';

// GET - Listar workflows
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    if (!hasPermission(session, 'viewCRM')) {
      return NextResponse.json({ error: 'Sin permiso para ver CRM' }, { status: 403 });
    }

    await connectDB();

    const { searchParams } = new URL(request.url);
    const isActive = searchParams.get('isActive');
    const triggerType = searchParams.get('triggerType');
    const search = searchParams.get('search');

    const filter: any = {};

    if (isActive !== null && isActive !== '') {
      filter.isActive = isActive === 'true';
    }

    if (triggerType) {
      filter['trigger.type'] = triggerType;
    }

    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
      ];
    }

    const workflows = await CRMWorkflow.find(filter)
      .populate('createdBy', 'name email')
      .populate('updatedBy', 'name email')
      .sort({ createdAt: -1 })
      .lean();

    return NextResponse.json(workflows);
  } catch (error: any) {
    console.error('Error fetching CRM workflows:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST - Crear workflow
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    // Solo admins pueden crear workflows
    const user = session.user as any;
    if (user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Solo administradores pueden crear workflows' },
        { status: 403 }
      );
    }

    await connectDB();
    const body = await request.json();

    // Validar estructura del trigger
    if (!body.trigger?.type) {
      return NextResponse.json(
        { error: 'El tipo de trigger es requerido' },
        { status: 400 }
      );
    }

    // Validar que tenga al menos una acción
    if (!body.actions || body.actions.length === 0) {
      return NextResponse.json(
        { error: 'El workflow debe tener al menos una acción' },
        { status: 400 }
      );
    }

    // Generar IDs para condiciones y acciones si no tienen
    if (body.trigger.conditions) {
      body.trigger.conditions = body.trigger.conditions.map((c: any, i: number) => ({
        ...c,
        id: c.id || `condition_${Date.now()}_${i}`,
      }));
    }

    body.actions = body.actions.map((a: any, i: number) => ({
      ...a,
      id: a.id || `action_${Date.now()}_${i}`,
      order: a.order ?? i,
    }));

    const workflow = new CRMWorkflow({
      ...body,
      createdBy: user.id,
    });

    await workflow.save();

    const populatedWorkflow = await CRMWorkflow.findById(workflow._id)
      .populate('createdBy', 'name email')
      .lean();

    return NextResponse.json(populatedWorkflow, { status: 201 });
  } catch (error: any) {
    console.error('Error creating CRM workflow:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
