import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import connectDB from '@/lib/mongodb';
import WorkflowExecution from '@/models/WorkflowExecution';
import Workflow from '@/models/Workflow';

/**
 * GET /api/workflows/[id]/executions
 * Obtiene el historial de ejecuciones de un workflow
 * Query params: ?limit=50 (default: 50)
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

    // Verificar que el workflow pertenece al usuario
    const workflow = await Workflow.findById(params.id);
    if (!workflow) {
      return NextResponse.json(
        { error: 'Workflow no encontrado' },
        { status: 404 }
      );
    }

    if (session.user.role !== 'ADMIN' && workflow.createdBy.toString() !== session.user.id) {
      return NextResponse.json(
        { error: 'No tienes permiso para ver las ejecuciones de este workflow' },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '50', 10);

    const executions = await WorkflowExecution.find({ workflowId: params.id })
      .populate('priorityId', 'title status completionPercentage')
      .sort({ executedAt: -1 })
      .limit(limit);

    return NextResponse.json(executions);

  } catch (error: any) {
    console.error('Error obteniendo ejecuciones:', error);
    return NextResponse.json(
      { error: 'Error obteniendo ejecuciones' },
      { status: 500 }
    );
  }
}
