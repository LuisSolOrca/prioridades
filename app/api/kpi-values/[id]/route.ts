import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import connectDB from '@/lib/mongodb';
import KPIValue from '@/models/KPIValue';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    await connectDB();

    const value = await KPIValue.findById(params.id)
      .populate('kpiId', 'name unit target tolerance')
      .populate('registeredBy', 'name email')
      .populate('approvedBy', 'name email')
      .lean();

    if (!value) {
      return NextResponse.json({ error: 'Valor no encontrado' }, { status: 404 });
    }

    return NextResponse.json(value);
  } catch (error: any) {
    console.error('Error fetching KPI value:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    await connectDB();

    const body = await request.json();
    const value = await KPIValue.findById(params.id);

    if (!value) {
      return NextResponse.json({ error: 'Valor no encontrado' }, { status: 404 });
    }

    // Solo se pueden editar valores en estado PRELIMINAR
    if (value.status !== 'PRELIMINAR') {
      return NextResponse.json(
        { error: 'Solo se pueden editar valores en estado PRELIMINAR' },
        { status: 400 }
      );
    }

    // Verificar que el usuario sea el que registró el valor o sea admin
    const isOwner = value.registeredBy.toString() === (session.user as any).id;
    const isAdmin = (session.user as any).role === 'ADMIN';

    if (!isOwner && !isAdmin) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    }

    // Actualizar campos
    if (body.value !== undefined) value.value = body.value;
    if (body.variables) value.variables = body.variables;
    if (body.notes !== undefined) value.notes = body.notes;
    if (body.status) value.status = body.status;

    await value.save();

    const updatedValue = await KPIValue.findById(value._id)
      .populate('kpiId', 'name unit target tolerance')
      .populate('registeredBy', 'name email')
      .populate('approvedBy', 'name email')
      .lean();

    return NextResponse.json(updatedValue);
  } catch (error: any) {
    console.error('Error updating KPI value:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    await connectDB();

    const value = await KPIValue.findById(params.id);

    if (!value) {
      return NextResponse.json({ error: 'Valor no encontrado' }, { status: 404 });
    }

    // Solo se pueden eliminar valores en estado PRELIMINAR
    if (value.status !== 'PRELIMINAR') {
      return NextResponse.json(
        { error: 'Solo se pueden eliminar valores en estado PRELIMINAR' },
        { status: 400 }
      );
    }

    // Verificar que el usuario sea el que registró el valor o sea admin
    const isOwner = value.registeredBy.toString() === (session.user as any).id;
    const isAdmin = (session.user as any).role === 'ADMIN';

    if (!isOwner && !isAdmin) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    }

    await KPIValue.deleteOne({ _id: params.id });

    return NextResponse.json({ message: 'Valor eliminado exitosamente' });
  } catch (error: any) {
    console.error('Error deleting KPI value:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
