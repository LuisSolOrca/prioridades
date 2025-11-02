import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import connectDB from '@/lib/mongodb';
import Workflow from '@/models/Workflow';
import { executeWorkflowManually } from '@/lib/workflows';

/**
 * GET /api/workflows/[id]
 * Obtiene un workflow específico
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json(
        { error: 'No autenticado' },
        { status: 401 }
      );
    }

    await connectDB();

    const workflow = await Workflow.findById(params.id)
      .populate('createdBy', 'name email');

    if (!workflow) {
      return NextResponse.json(
        { error: 'Workflow no encontrado' },
        { status: 404 }
      );
    }

    // Verificar que el usuario pueda ver este workflow
    if (session.user.role !== 'ADMIN' && workflow.createdBy._id.toString() !== session.user.id) {
      return NextResponse.json(
        { error: 'No tienes permiso para ver este workflow' },
        { status: 403 }
      );
    }

    return NextResponse.json(workflow);

  } catch (error: any) {
    console.error('Error obteniendo workflow:', error);
    return NextResponse.json(
      { error: 'Error obteniendo workflow' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/workflows/[id]
 * Actualiza un workflow
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json(
        { error: 'No autenticado' },
        { status: 401 }
      );
    }

    const body = await request.json();

    await connectDB();

    const workflow = await Workflow.findById(params.id);

    if (!workflow) {
      return NextResponse.json(
        { error: 'Workflow no encontrado' },
        { status: 404 }
      );
    }

    // Verificar que el usuario pueda actualizar este workflow
    if (session.user.role !== 'ADMIN' && workflow.createdBy.toString() !== session.user.id) {
      return NextResponse.json(
        { error: 'Solo puedes actualizar tus propios workflows' },
        { status: 403 }
      );
    }

    // Actualizar campos permitidos
    if (body.name !== undefined) workflow.name = body.name;
    if (body.description !== undefined) workflow.description = body.description;
    if (body.isActive !== undefined) workflow.isActive = body.isActive;
    if (body.triggerType !== undefined) workflow.triggerType = body.triggerType;
    if (body.conditions !== undefined) workflow.conditions = body.conditions;
    if (body.actions !== undefined) workflow.actions = body.actions;
    if (body.executeOnce !== undefined) workflow.executeOnce = body.executeOnce;
    if (body.priority !== undefined) workflow.priority = body.priority;

    await workflow.save();

    return NextResponse.json(workflow);

  } catch (error: any) {
    console.error('Error actualizando workflow:', error);
    return NextResponse.json(
      { error: error.message || 'Error actualizando workflow' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/workflows/[id]
 * Elimina un workflow
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json(
        { error: 'No autenticado' },
        { status: 401 }
      );
    }

    await connectDB();

    const workflow = await Workflow.findById(params.id);

    if (!workflow) {
      return NextResponse.json(
        { error: 'Workflow no encontrado' },
        { status: 404 }
      );
    }

    // Verificar que el usuario pueda eliminar este workflow
    if (session.user.role !== 'ADMIN' && workflow.createdBy.toString() !== session.user.id) {
      return NextResponse.json(
        { error: 'Solo puedes eliminar tus propios workflows' },
        { status: 403 }
      );
    }

    await Workflow.findByIdAndDelete(params.id);

    return NextResponse.json({ message: 'Workflow eliminado correctamente' });

  } catch (error: any) {
    console.error('Error eliminando workflow:', error);
    return NextResponse.json(
      { error: 'Error eliminando workflow' },
      { status: 500 }
    );
  }
}
