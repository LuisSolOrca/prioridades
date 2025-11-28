import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import connectDB from '@/lib/mongodb';
import SalesQuota from '@/models/SalesQuota';
import { hasPermission } from '@/lib/permissions';

export const dynamic = 'force-dynamic';

// GET - Listar cuotas de venta
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    if (!hasPermission(session, 'viewCRM')) {
      return NextResponse.json({ error: 'Sin permiso para ver CRM' }, { status: 403 });
    }

    await connectDB();

    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const year = searchParams.get('year');
    const period = searchParams.get('period');
    const activeOnly = searchParams.get('activeOnly') === 'true';

    const filter: any = {};

    // Solo admins pueden ver todas las cuotas, usuarios ven solo las suyas
    const user = session.user as any;
    if (user.role !== 'ADMIN' && !userId) {
      filter.userId = user.id;
    } else if (userId) {
      filter.userId = userId;
    }

    if (year) filter.year = parseInt(year);
    if (period) filter.period = period;
    if (activeOnly) filter.isActive = true;

    const quotas = await SalesQuota.find(filter)
      .populate('userId', 'name email')
      .populate('createdBy', 'name')
      .sort({ year: -1, month: -1, quarter: -1 })
      .lean();

    return NextResponse.json(quotas);
  } catch (error: any) {
    console.error('Error fetching sales quotas:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST - Crear nueva cuota de venta
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    // Solo admins pueden crear cuotas
    const user = session.user as any;
    if (user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Solo administradores pueden crear metas' }, { status: 403 });
    }

    await connectDB();

    const body = await request.json();

    // Validar período
    if (body.period === 'monthly' && !body.month) {
      return NextResponse.json(
        { error: 'El mes es requerido para metas mensuales' },
        { status: 400 }
      );
    }
    if (body.period === 'quarterly' && !body.quarter) {
      return NextResponse.json(
        { error: 'El trimestre es requerido para metas trimestrales' },
        { status: 400 }
      );
    }

    // Verificar que no exista una cuota duplicada
    const existingQuery: any = {
      userId: body.userId,
      period: body.period,
      year: body.year,
    };
    if (body.period === 'monthly') existingQuery.month = body.month;
    if (body.period === 'quarterly') existingQuery.quarter = body.quarter;

    const existing = await SalesQuota.findOne(existingQuery);
    if (existing) {
      return NextResponse.json(
        { error: 'Ya existe una meta para este vendedor en el período seleccionado' },
        { status: 400 }
      );
    }

    const quota = await SalesQuota.create({
      ...body,
      createdBy: session.user.id,
    });

    const populatedQuota = await SalesQuota.findById(quota._id)
      .populate('userId', 'name email')
      .populate('createdBy', 'name')
      .lean();

    return NextResponse.json(populatedQuota, { status: 201 });
  } catch (error: any) {
    console.error('Error creating sales quota:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
