import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import connectDB from '@/lib/mongodb';
import SalesQuota from '@/models/SalesQuota';
import { hasPermission } from '@/lib/permissions';

export const dynamic = 'force-dynamic';

// GET - Obtener cuota por ID
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

    const quota = await SalesQuota.findById(id)
      .populate('userId', 'name email')
      .populate('createdBy', 'name')
      .lean();

    if (!quota) {
      return NextResponse.json({ error: 'Cuota no encontrada' }, { status: 404 });
    }

    return NextResponse.json(quota);
  } catch (error: any) {
    console.error('Error fetching sales quota:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// PUT - Actualizar cuota
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    // Solo admins pueden editar cuotas
    const user = session.user as any;
    if (user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Solo administradores pueden editar metas' }, { status: 403 });
    }

    await connectDB();
    const { id } = await params;
    const body = await request.json();

    const quota = await SalesQuota.findById(id);
    if (!quota) {
      return NextResponse.json({ error: 'Cuota no encontrada' }, { status: 404 });
    }

    // No permitir cambiar el período, año, mes, trimestre o usuario
    delete body.period;
    delete body.year;
    delete body.month;
    delete body.quarter;
    delete body.userId;

    const updatedQuota = await SalesQuota.findByIdAndUpdate(
      id,
      body,
      { new: true, runValidators: true }
    )
      .populate('userId', 'name email')
      .populate('createdBy', 'name')
      .lean();

    return NextResponse.json(updatedQuota);
  } catch (error: any) {
    console.error('Error updating sales quota:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// DELETE - Eliminar cuota
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    // Solo admins pueden eliminar cuotas
    const user = session.user as any;
    if (user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Solo administradores pueden eliminar metas' }, { status: 403 });
    }

    await connectDB();
    const { id } = await params;

    const quota = await SalesQuota.findById(id);
    if (!quota) {
      return NextResponse.json({ error: 'Cuota no encontrada' }, { status: 404 });
    }

    await SalesQuota.findByIdAndDelete(id);

    return NextResponse.json({ message: 'Cuota eliminada correctamente' });
  } catch (error: any) {
    console.error('Error deleting sales quota:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
