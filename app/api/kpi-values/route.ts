import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import connectDB from '@/lib/mongodb';
import KPIValue from '@/models/KPIValue';
import KPI from '@/models/KPI';
import { calculateFormulaValue } from '@/lib/kpi-utils/formula-parser';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    await connectDB();

    const { searchParams } = new URL(request.url);
    const kpiId = searchParams.get('kpiId');
    const status = searchParams.get('status');
    const periodStart = searchParams.get('periodStart');
    const periodEnd = searchParams.get('periodEnd');

    let query: any = {};

    if (kpiId) {
      query.kpiId = kpiId;
    }

    if (status) {
      query.status = status;
    }

    if (periodStart && periodEnd) {
      query.periodStart = { $gte: new Date(periodStart) };
      query.periodEnd = { $lte: new Date(periodEnd) };
    }

    const values = await KPIValue.find(query)
      .populate('kpiId', 'name unit target tolerance')
      .populate('registeredBy', 'name email')
      .populate('approvedBy', 'name email')
      .sort({ periodStart: -1 })
      .lean();

    return NextResponse.json(values);
  } catch (error: any) {
    console.error('Error fetching KPI values:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    await connectDB();

    const body = await request.json();

    // Validar que el KPI existe y está activo
    const kpi = await KPI.findById(body.kpiId);
    if (!kpi) {
      return NextResponse.json({ error: 'KPI no encontrado' }, { status: 404 });
    }

    if (kpi.status !== 'ACTIVO') {
      return NextResponse.json(
        { error: 'Solo se pueden registrar valores para KPIs activos' },
        { status: 400 }
      );
    }

    // Verificar que el usuario sea el responsable del KPI o sea admin
    const userId = (session.user as any).id;
    const userRole = (session.user as any).role;
    const isResponsible = kpi.responsible.toString() === userId;
    const isAdmin = userRole === 'ADMIN';

    if (!isResponsible && !isAdmin) {
      return NextResponse.json(
        { error: 'Solo el responsable del KPI o un administrador pueden registrar valores' },
        { status: 403 }
      );
    }

    // Validar que no exista un valor para el mismo período
    const existingValue = await KPIValue.findOne({
      kpiId: body.kpiId,
      periodStart: new Date(body.periodStart),
      periodEnd: new Date(body.periodEnd),
    });

    if (existingValue) {
      return NextResponse.json(
        { error: 'Ya existe un valor registrado para este período' },
        { status: 400 }
      );
    }

    // Validar período
    const periodStart = new Date(body.periodStart);
    const periodEnd = new Date(body.periodEnd);

    if (periodStart >= periodEnd) {
      return NextResponse.json(
        { error: 'La fecha de inicio debe ser anterior a la fecha de fin' },
        { status: 400 }
      );
    }

    // Calcular valor si se proporcionan variables y hay fórmula
    let calculatedValue = body.value;
    if (body.variables && Object.keys(body.variables).length > 0) {
      const result = calculateFormulaValue(kpi.formula, body.variables);

      if (!result.success) {
        return NextResponse.json(
          { error: `Error en la fórmula: ${result.error}` },
          { status: 400 }
        );
      }

      calculatedValue = result.result;
    }

    const kpiValue = await KPIValue.create({
      kpiId: body.kpiId,
      kpiVersion: kpi.currentVersion,
      value: body.value,
      calculatedValue,
      variables: body.variables,
      periodStart,
      periodEnd,
      status: 'PRELIMINAR',
      registeredBy: (session.user as any).id,
      notes: body.notes,
    });

    // Poblar referencias antes de retornar
    const populatedValue = await KPIValue.findById(kpiValue._id)
      .populate('kpiId', 'name unit target tolerance')
      .populate('registeredBy', 'name email')
      .lean();

    return NextResponse.json(populatedValue, { status: 201 });
  } catch (error: any) {
    console.error('Error creating KPI value:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
