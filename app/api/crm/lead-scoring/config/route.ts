import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import connectDB from '@/lib/mongodb';
import LeadScoringConfig from '@/models/LeadScoringConfig';
import { hasPermission } from '@/lib/permissions';

export const dynamic = 'force-dynamic';

// GET - Obtener configuraciones de lead scoring
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
    const activeOnly = searchParams.get('activeOnly') === 'true';

    const filter: any = {};
    if (activeOnly) {
      filter.isActive = true;
    }

    const configs = await LeadScoringConfig.find(filter)
      .populate('createdBy', 'name email')
      .sort({ isDefault: -1, createdAt: -1 })
      .lean();

    return NextResponse.json(configs);
  } catch (error: any) {
    console.error('Error fetching lead scoring configs:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST - Crear nueva configuración
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const user = session.user as any;
    if (user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Solo administradores pueden crear configuraciones' }, { status: 403 });
    }

    await connectDB();

    const body = await request.json();
    const userId = user.id;

    // Validar pesos
    if (body.fitWeight + body.engagementWeight !== 100) {
      return NextResponse.json(
        { error: 'Los pesos de FIT y Engagement deben sumar 100' },
        { status: 400 }
      );
    }

    // Validar thresholds
    if (body.warmThreshold >= body.hotThreshold) {
      return NextResponse.json(
        { error: 'El threshold warm debe ser menor que el hot' },
        { status: 400 }
      );
    }

    const config = await LeadScoringConfig.create({
      ...body,
      createdBy: userId,
    });

    const populated = await LeadScoringConfig.findById(config._id)
      .populate('createdBy', 'name email')
      .lean();

    return NextResponse.json(populated, { status: 201 });
  } catch (error: any) {
    console.error('Error creating lead scoring config:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
