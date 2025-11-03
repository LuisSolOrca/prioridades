import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { executeWorkflowManually } from '@/lib/workflows';
import connectDB from '@/lib/mongodb';
import Workflow from '@/models/Workflow';
import Priority from '@/models/Priority';

/**
 * POST /api/workflows/[id]/execute
 * Ejecuta manualmente un workflow para una prioridad específica
 * Body: { priorityId: string }
 */
export async function POST(
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

    // Verificar que el workflow pertenece al usuario
    const workflow = await Workflow.findById(params.id);
    if (!workflow) {
      return NextResponse.json(
        { error: 'Workflow no encontrado' },
        { status: 404 }
      );
    }

    // Verificar que el usuario sea el creador del workflow
    if (workflow.createdBy.toString() !== session.user.id) {
      return NextResponse.json(
        { error: 'Solo puedes ejecutar tus propios workflows' },
        { status: 403 }
      );
    }

    const body = await request.json();

    if (!body.priorityId) {
      return NextResponse.json(
        { error: 'priorityId es requerido' },
        { status: 400 }
      );
    }

    // Verificar que la prioridad existe y pertenece al usuario
    const priority = await Priority.findById(body.priorityId);
    if (!priority) {
      return NextResponse.json(
        { error: 'Prioridad no encontrada' },
        { status: 404 }
      );
    }

    // Solo se pueden ejecutar workflows en prioridades propias
    if (priority.userId.toString() !== session.user.id) {
      return NextResponse.json(
        { error: 'Solo puedes ejecutar workflows en tus propias prioridades' },
        { status: 403 }
      );
    }

    const result = await executeWorkflowManually(params.id, body.priorityId);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error, actionsExecuted: result.actionsExecuted },
        { status: 400 }
      );
    }

    return NextResponse.json({
      message: 'Workflow ejecutado correctamente',
      actionsExecuted: result.actionsExecuted
    });

  } catch (error: any) {
    console.error('Error ejecutando workflow:', error);
    return NextResponse.json(
      { error: 'Error ejecutando workflow' },
      { status: 500 }
    );
  }
}
