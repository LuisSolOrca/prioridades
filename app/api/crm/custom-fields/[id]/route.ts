import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import connectDB from '@/lib/mongodb';
import CustomField from '@/models/CustomField';

export const dynamic = 'force-dynamic';

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
    const field = await CustomField.findById(id)
      .populate('createdBy', 'name');

    if (!field) {
      return NextResponse.json({ error: 'Campo no encontrado' }, { status: 404 });
    }

    return NextResponse.json(field);
  } catch (error: any) {
    console.error('Error fetching custom field:', error);
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

    const user = session.user as any;
    if (user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Solo administradores pueden editar campos personalizados' }, { status: 403 });
    }

    await connectDB();

    const { id } = await params;
    const body = await request.json();

    // No permitir cambiar el nombre ni el tipo de entidad
    delete body.name;
    delete body.entityType;

    const field = await CustomField.findByIdAndUpdate(
      id,
      { $set: body },
      { new: true, runValidators: true }
    ).populate('createdBy', 'name');

    if (!field) {
      return NextResponse.json({ error: 'Campo no encontrado' }, { status: 404 });
    }

    return NextResponse.json(field);
  } catch (error: any) {
    console.error('Error updating custom field:', error);
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

    const user = session.user as any;
    if (user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Solo administradores pueden eliminar campos personalizados' }, { status: 403 });
    }

    await connectDB();

    const { id } = await params;

    // En lugar de eliminar, desactivamos el campo
    // Esto preserva los datos históricos
    const field = await CustomField.findByIdAndUpdate(
      id,
      { isActive: false },
      { new: true }
    );

    if (!field) {
      return NextResponse.json({ error: 'Campo no encontrado' }, { status: 404 });
    }

    return NextResponse.json({ success: true, message: 'Campo desactivado' });
  } catch (error: any) {
    console.error('Error deleting custom field:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
