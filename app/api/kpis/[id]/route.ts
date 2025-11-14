import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import connectDB from '@/lib/mongodb';
import KPI from '@/models/KPI';
import KPIValue from '@/models/KPIValue';
import mongoose from 'mongoose';

// Helper para verificar permiso de gestión de KPIs
function hasKPIManagementPermission(session: any): boolean {
  const user = session.user as any;
  return user.role === 'ADMIN' || user.permissions?.canManageKPIs === true;
}

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

    const kpi = await KPI.findById(params.id)
      .populate('initiativeId', 'name color')
      .populate('responsible', 'name email')
      .populate('createdBy', 'name email')
      .populate('reviewedBy', 'name email')
      .populate('approvedBy', 'name email')
      .populate('versions.modifiedBy', 'name email')
      .lean();

    if (!kpi) {
      return NextResponse.json({ error: 'KPI no encontrado' }, { status: 404 });
    }

    return NextResponse.json(kpi);
  } catch (error: any) {
    console.error('Error fetching KPI:', error);
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

    // Solo admins o usuarios con permiso pueden modificar KPIs
    if (!hasKPIManagementPermission(session)) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    }

    await connectDB();

    const body = await request.json();
    const kpi = await KPI.findById(params.id);

    if (!kpi) {
      return NextResponse.json({ error: 'KPI no encontrado' }, { status: 404 });
    }

    // Detectar cambios que requieren versionado
    const requiresNewVersion =
      (body.formula && body.formula !== kpi.formula) ||
      (body.target !== undefined && body.target !== kpi.target) ||
      (body.tolerance && JSON.stringify(body.tolerance) !== JSON.stringify(kpi.tolerance));

    if (requiresNewVersion) {
      const newVersion = kpi.currentVersion + 1;

      // Crear nueva versión
      kpi.versions.push({
        version: newVersion,
        date: new Date(),
        modifiedBy: new mongoose.Types.ObjectId((session.user as any).id),
        changes: body.versionChanges || 'Actualización de fórmula, meta o tolerancia',
        formula: body.formula || kpi.formula,
        target: body.target !== undefined ? body.target : kpi.target,
        tolerance: body.tolerance || kpi.tolerance,
      });

      kpi.currentVersion = newVersion;
    }

    // Actualizar campos
    if (body.name) kpi.name = body.name;
    if (body.description !== undefined) kpi.description = body.description;
    if (body.strategicObjective) kpi.strategicObjective = body.strategicObjective;
    if (body.unit) kpi.unit = body.unit;
    if (body.periodicity) kpi.periodicity = body.periodicity;
    if (body.responsible) kpi.responsible = body.responsible;
    if (body.formula) kpi.formula = body.formula;
    if (body.dataSource) kpi.dataSource = body.dataSource;
    if (body.target !== undefined) kpi.target = body.target;
    if (body.tolerance) kpi.tolerance = body.tolerance;
    if (body.kpiType) kpi.kpiType = body.kpiType;
    if (body.tags) kpi.tags = body.tags;
    if (body.isActive !== undefined) kpi.isActive = body.isActive;

    await kpi.save();

    // Poblar referencias antes de retornar
    const updatedKpi = await KPI.findById(kpi._id)
      .populate('initiativeId', 'name color')
      .populate('responsible', 'name email')
      .populate('createdBy', 'name email')
      .populate('reviewedBy', 'name email')
      .populate('approvedBy', 'name email')
      .lean();

    return NextResponse.json(updatedKpi);
  } catch (error: any) {
    console.error('Error updating KPI:', error);
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

    // Solo admins pueden eliminar KPIs
    if ((session.user as any).role !== 'ADMIN') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    }

    await connectDB();

    const { searchParams } = new URL(request.url);
    const hardDelete = searchParams.get('hard') === 'true';

    const kpi = await KPI.findById(params.id);

    if (!kpi) {
      return NextResponse.json({ error: 'KPI no encontrado' }, { status: 404 });
    }

    if (hardDelete) {
      // Hard delete: eliminar completamente de la base de datos
      await KPI.deleteOne({ _id: params.id });

      // También eliminar valores asociados
      await KPIValue.deleteMany({ kpiId: params.id });

      return NextResponse.json({ message: 'KPI eliminado permanentemente' });
    } else {
      // Soft delete: cambiar status a ARCHIVADO
      kpi.status = 'ARCHIVADO';
      kpi.isActive = false;
      await kpi.save();

      return NextResponse.json({ message: 'KPI archivado exitosamente' });
    }
  } catch (error: any) {
    console.error('Error deleting KPI:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
