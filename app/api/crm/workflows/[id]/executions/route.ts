import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import connectDB from '@/lib/mongodb';
import CRMWorkflow from '@/models/CRMWorkflow';
import CRMWorkflowExecution from '@/models/CRMWorkflowExecution';
import { hasPermission } from '@/lib/permissions';

export const dynamic = 'force-dynamic';

// GET - Obtener ejecuciones de un workflow
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

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const status = searchParams.get('status');

    // Verificar que el workflow existe
    const workflow = await CRMWorkflow.findById(id).lean();
    if (!workflow) {
      return NextResponse.json({ error: 'Workflow no encontrado' }, { status: 404 });
    }

    const filter: any = { workflowId: id };
    if (status) {
      filter.status = status;
    }

    const [executions, total] = await Promise.all([
      CRMWorkflowExecution.find(filter)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      CRMWorkflowExecution.countDocuments(filter),
    ]);

    // Calcular estadísticas
    const stats = await CRMWorkflowExecution.aggregate([
      { $match: { workflowId: workflow._id } },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
          avgDuration: { $avg: '$duration' },
        },
      },
    ]);

    const statsMap = stats.reduce((acc, s) => {
      acc[s._id] = { count: s.count, avgDuration: Math.round(s.avgDuration || 0) };
      return acc;
    }, {} as Record<string, { count: number; avgDuration: number }>);

    return NextResponse.json({
      executions,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
      stats: {
        total,
        completed: statsMap.completed?.count || 0,
        failed: statsMap.failed?.count || 0,
        running: statsMap.running?.count || 0,
        avgDuration: statsMap.completed?.avgDuration || 0,
      },
    });
  } catch (error: any) {
    console.error('Error fetching workflow executions:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
