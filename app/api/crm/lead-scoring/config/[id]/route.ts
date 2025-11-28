import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import connectDB from '@/lib/mongodb';
import LeadScoringConfig from '@/models/LeadScoringConfig';
import { hasPermission } from '@/lib/permissions';

export const dynamic = 'force-dynamic';

// GET - Obtener una configuración específica
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

    const config = await LeadScoringConfig.findById(id)
      .populate('createdBy', 'name email')
      .populate('updatedBy', 'name email')
      .lean();

    if (!config) {
      return NextResponse.json({ error: 'Configuración no encontrada' }, { status: 404 });
    }

    return NextResponse.json(config);
  } catch (error: any) {
    console.error('Error fetching lead scoring config:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// PUT - Actualizar configuración
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
      return NextResponse.json({ error: 'Solo administradores pueden editar configuraciones' }, { status: 403 });
    }

    await connectDB();
    const { id } = await params;
    const body = await request.json();

    // Validar pesos si se proporcionan
    if (body.fitWeight !== undefined && body.engagementWeight !== undefined) {
      if (body.fitWeight + body.engagementWeight !== 100) {
        return NextResponse.json(
          { error: 'Los pesos de FIT y Engagement deben sumar 100' },
          { status: 400 }
        );
      }
    }

    // Validar thresholds si se proporcionan
    if (body.warmThreshold !== undefined && body.hotThreshold !== undefined) {
      if (body.warmThreshold >= body.hotThreshold) {
        return NextResponse.json(
          { error: 'El threshold warm debe ser menor que el hot' },
          { status: 400 }
        );
      }
    }

    const config = await LeadScoringConfig.findByIdAndUpdate(
      id,
      {
        ...body,
        updatedBy: user.id,
      },
      { new: true, runValidators: true }
    )
      .populate('createdBy', 'name email')
      .populate('updatedBy', 'name email')
      .lean();

    if (!config) {
      return NextResponse.json({ error: 'Configuración no encontrada' }, { status: 404 });
    }

    return NextResponse.json(config);
  } catch (error: any) {
    console.error('Error updating lead scoring config:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// DELETE - Eliminar configuración
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
      return NextResponse.json({ error: 'Solo administradores pueden eliminar configuraciones' }, { status: 403 });
    }

    await connectDB();
    const { id } = await params;

    const config = await LeadScoringConfig.findById(id);

    if (!config) {
      return NextResponse.json({ error: 'Configuración no encontrada' }, { status: 404 });
    }

    if (config.isDefault) {
      return NextResponse.json(
        { error: 'No se puede eliminar la configuración por defecto' },
        { status: 400 }
      );
    }

    await LeadScoringConfig.findByIdAndDelete(id);

    return NextResponse.json({ message: 'Configuración eliminada' });
  } catch (error: any) {
    console.error('Error deleting lead scoring config:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
