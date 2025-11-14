import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import connectDB from '@/lib/mongodb';
import KPI from '@/models/KPI';
import mongoose from 'mongoose';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    await connectDB();

    const { searchParams } = new URL(request.url);
    const initiativeId = searchParams.get('initiativeId');
    const status = searchParams.get('status');
    const responsible = searchParams.get('responsible');
    const activeOnly = searchParams.get('activeOnly') === 'true';

    let query: any = {};

    if (initiativeId) {
      query.initiativeId = initiativeId;
    }

    if (status) {
      query.status = status;
    }

    if (responsible) {
      query.responsible = responsible;
    }

    if (activeOnly) {
      query.isActive = true;
    }

    const kpis = await KPI.find(query)
      .populate('initiativeId', 'name color')
      .populate('responsible', 'name email')
      .populate('createdBy', 'name email')
      .populate('reviewedBy', 'name email')
      .populate('approvedBy', 'name email')
      .sort({ createdAt: -1 })
      .lean();

    return NextResponse.json(kpis);
  } catch (error: any) {
    console.error('Error fetching KPIs:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    // Solo admins pueden crear KPIs
    if ((session.user as any).role !== 'ADMIN') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    }

    await connectDB();

    const body = await request.json();

    // Validar que la iniciativa existe
    const initiativeExists = await mongoose.model('StrategicInitiative').exists({ _id: body.initiativeId });
    if (!initiativeExists) {
      return NextResponse.json({ error: 'La iniciativa estratégica no existe' }, { status: 400 });
    }

    // Validar que el responsable existe
    const responsibleExists = await mongoose.model('User').exists({ _id: body.responsible });
    if (!responsibleExists) {
      return NextResponse.json({ error: 'El usuario responsable no existe' }, { status: 400 });
    }

    // Validar tolerancia
    if (body.tolerance && body.tolerance.minimum > body.tolerance.warningThreshold) {
      return NextResponse.json(
        { error: 'El mínimo aceptable debe ser menor o igual al umbral de alerta' },
        { status: 400 }
      );
    }

    const kpi = await KPI.create({
      name: body.name,
      description: body.description,
      strategicObjective: body.strategicObjective,
      initiativeId: body.initiativeId,
      unit: body.unit,
      periodicity: body.periodicity,
      responsible: body.responsible,
      formula: body.formula,
      dataSource: body.dataSource || 'MANUAL',
      target: body.target,
      tolerance: body.tolerance,
      kpiType: body.kpiType,
      tags: body.tags || [],
      status: 'BORRADOR',
      createdBy: (session.user as any).id,
      isActive: true,
      currentVersion: 1,
    });

    // Poblar referencias antes de retornar
    const populatedKpi = await KPI.findById(kpi._id)
      .populate('initiativeId', 'name color')
      .populate('responsible', 'name email')
      .populate('createdBy', 'name email')
      .lean();

    return NextResponse.json(populatedKpi, { status: 201 });
  } catch (error: any) {
    console.error('Error creating KPI:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
