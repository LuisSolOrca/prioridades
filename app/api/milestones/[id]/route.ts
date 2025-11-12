import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import connectDB from '@/lib/mongodb';
import Milestone from '@/models/Milestone';

/**
 * GET - Obtiene un hito específico
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();

    const milestone = await Milestone.findById(params.id);

    if (!milestone) {
      return NextResponse.json({ error: 'Milestone not found' }, { status: 404 });
    }

    // Verificar que el usuario tenga permiso
    if (
      milestone.userId.toString() !== (session.user as any).id &&
      (session.user as any).role !== 'ADMIN'
    ) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    return NextResponse.json(milestone);
  } catch (error) {
    console.error('Error fetching milestone:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

/**
 * PUT - Actualiza un hito
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();

    const milestone = await Milestone.findById(params.id);

    if (!milestone) {
      return NextResponse.json({ error: 'Milestone not found' }, { status: 404 });
    }

    // Verificar que el usuario tenga permiso
    if (
      milestone.userId.toString() !== (session.user as any).id &&
      (session.user as any).role !== 'ADMIN'
    ) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const { title, description, dueDate, deliverables, isCompleted } = body;

    // Actualizar campos
    if (title !== undefined) milestone.title = title;
    if (description !== undefined) milestone.description = description;
    if (dueDate !== undefined) milestone.dueDate = new Date(dueDate);
    if (deliverables !== undefined) milestone.deliverables = deliverables;
    if (isCompleted !== undefined) {
      milestone.isCompleted = isCompleted;
      if (isCompleted && !milestone.completedAt) {
        milestone.completedAt = new Date();
      }
    }

    await milestone.save();

    return NextResponse.json(milestone);
  } catch (error) {
    console.error('Error updating milestone:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

/**
 * DELETE - Elimina un hito
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();

    const milestone = await Milestone.findById(params.id);

    if (!milestone) {
      return NextResponse.json({ error: 'Milestone not found' }, { status: 404 });
    }

    // Verificar que el usuario tenga permiso
    if (
      milestone.userId.toString() !== (session.user as any).id &&
      (session.user as any).role !== 'ADMIN'
    ) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    await Milestone.findByIdAndDelete(params.id);

    return NextResponse.json({ message: 'Milestone deleted successfully' });
  } catch (error) {
    console.error('Error deleting milestone:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
