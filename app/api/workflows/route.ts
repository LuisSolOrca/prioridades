import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import connectDB from '@/lib/mongodb';
import Workflow from '@/models/Workflow';

/**
 * GET /api/workflows
 * Lista workflows del usuario actual (o todos si es ADMIN)
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json(
        { error: 'No autenticado' },
        { status: 401 }
      );
    }

    await connectDB();

    // ADMIN puede ver todos los workflows, usuarios normales solo los suyos
    const query = session.user.role === 'ADMIN'
      ? {}
      : { createdBy: session.user.id };

    const workflows = await Workflow.find(query)
      .populate('createdBy', 'name email')
      .sort({ priority: 1, createdAt: -1 });

    return NextResponse.json(workflows);

  } catch (error: any) {
    console.error('Error obteniendo workflows:', error);
    return NextResponse.json(
      { error: 'Error obteniendo workflows' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/workflows
 * Crea un nuevo workflow
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json(
        { error: 'No autenticado' },
        { status: 401 }
      );
    }

    const body = await request.json();

    // Validaciones básicas
    if (!body.name || !body.triggerType || !body.actions || body.actions.length === 0) {
      return NextResponse.json(
        { error: 'Campos requeridos: name, triggerType, actions' },
        { status: 400 }
      );
    }

    await connectDB();

    const workflow = new Workflow({
      name: body.name,
      description: body.description,
      isActive: body.isActive !== undefined ? body.isActive : true,
      triggerType: body.triggerType,
      conditions: body.conditions || [],
      actions: body.actions,
      executeOnce: body.executeOnce || false,
      priority: body.priority || 100,
      createdBy: session.user.id
    });

    await workflow.save();

    return NextResponse.json(workflow, { status: 201 });

  } catch (error: any) {
    console.error('Error creando workflow:', error);
    return NextResponse.json(
      { error: error.message || 'Error creando workflow' },
      { status: 500 }
    );
  }
}
