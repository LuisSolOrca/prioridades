import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import connectDB from '@/lib/mongodb';
import Priority from '@/models/Priority';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    await connectDB();

    const { id } = await params;
    const priority = await Priority.findById(id);

    if (!priority) {
      return NextResponse.json({ error: 'Prioridad no encontrada' }, { status: 404 });
    }

    // Verificar que el usuario solo vea sus propias prioridades (a menos que sea admin)
    if ((session.user as any).role !== 'ADMIN' && priority.userId.toString() !== (session.user as any).id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    }

    return NextResponse.json(priority);
  } catch (error: any) {
    console.error('Error fetching priority:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    await connectDB();

    const { id } = await params;
    const priority = await Priority.findById(id);

    if (!priority) {
      return NextResponse.json({ error: 'Prioridad no encontrada' }, { status: 404 });
    }

    // Verificar que el usuario solo edite sus propias prioridades (a menos que sea admin)
    if ((session.user as any).role !== 'ADMIN' && priority.userId.toString() !== (session.user as any).id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    }

    const body = await request.json();

    // Preparar datos para actualizar
    const updateData: any = {
      ...body,
      wasEdited: true,
      lastEditedAt: new Date(),
      updatedAt: new Date()
    };

    // Solo manejar initiativeIds si viene en el body
    if (body.initiativeIds !== undefined || body.initiativeId !== undefined) {
      let initiativeIds = body.initiativeIds || [];
      if (body.initiativeId && initiativeIds.length === 0) {
        initiativeIds = [body.initiativeId];
      }
      updateData.initiativeIds = initiativeIds;
    }

    const updatedPriority = await Priority.findByIdAndUpdate(
      id,
      updateData,
      { new: true, runValidators: true }
    );

    return NextResponse.json(updatedPriority);
  } catch (error: any) {
    console.error('Error updating priority:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    await connectDB();

    const { id } = await params;
    const priority = await Priority.findById(id);

    if (!priority) {
      return NextResponse.json({ error: 'Prioridad no encontrada' }, { status: 404 });
    }

    // Verificar que el usuario solo elimine sus propias prioridades (a menos que sea admin)
    if ((session.user as any).role !== 'ADMIN' && priority.userId.toString() !== (session.user as any).id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    }

    await Priority.findByIdAndDelete(id);

    return NextResponse.json({ message: 'Prioridad eliminada exitosamente' });
  } catch (error: any) {
    console.error('Error deleting priority:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
