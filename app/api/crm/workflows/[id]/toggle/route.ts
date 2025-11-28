import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import connectDB from '@/lib/mongodb';
import CRMWorkflow from '@/models/CRMWorkflow';

export const dynamic = 'force-dynamic';

// POST - Toggle estado activo del workflow
export async function POST(
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
        { error: 'Solo administradores pueden activar/desactivar workflows' },
        { status: 403 }
      );
    }

    await connectDB();
    const { id } = await params;

    const workflow = await CRMWorkflow.findById(id);
    if (!workflow) {
      return NextResponse.json({ error: 'Workflow no encontrado' }, { status: 404 });
    }

    workflow.isActive = !workflow.isActive;
    workflow.updatedBy = user.id;
    await workflow.save();

    return NextResponse.json({
      message: workflow.isActive ? 'Workflow activado' : 'Workflow desactivado',
      isActive: workflow.isActive,
    });
  } catch (error: any) {
    console.error('Error toggling CRM workflow:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
