import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import connectDB from '@/lib/mongodb';
import Standup from '@/models/Standup';
import User from '@/models/User';

/**
 * GET /api/projects/[id]/standups
 * Obtiene los standups del proyecto (por defecto del día actual)
 */
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

    const { searchParams } = new URL(request.url);
    const dateParam = searchParams.get('date');

    // Si no se proporciona fecha, usar hoy
    const targetDate = dateParam ? new Date(dateParam) : new Date();
    const startOfDay = new Date(targetDate);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(targetDate);
    endOfDay.setHours(23, 59, 59, 999);

    const standups = await Standup.find({
      projectId: params.id,
      date: {
        $gte: startOfDay,
        $lte: endOfDay
      }
    })
      .populate('userId', 'name email')
      .sort({ createdAt: -1 })
      .lean();

    return NextResponse.json({ standups });
  } catch (error) {
    console.error('Error getting standups:', error);
    return NextResponse.json(
      { error: 'Error obteniendo standups' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/projects/[id]/standups
 * Crea un nuevo standup
 */
export async function POST(
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
    const { yesterday, today, blockers, risks } = body;

    if (!yesterday || !today) {
      return NextResponse.json(
        { error: 'Los campos "yesterday" y "today" son requeridos' },
        { status: 400 }
      );
    }

    // Verificar si ya existe un standup del usuario para hoy
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);

    const existingStandup = await Standup.findOne({
      projectId: params.id,
      userId: (session.user as any).id,
      date: {
        $gte: todayStart,
        $lte: todayEnd
      }
    });

    if (existingStandup) {
      return NextResponse.json(
        { error: 'Ya existe un standup para hoy. Usa PUT para actualizarlo.' },
        { status: 400 }
      );
    }

    const standup = await Standup.create({
      projectId: params.id,
      userId: (session.user as any).id,
      yesterday,
      today,
      blockers: blockers || '',
      risks: risks || '',
      date: new Date()
    });

    // Populate user data
    const populatedStandup = await Standup.findById(standup._id)
      .populate('userId', 'name email')
      .lean();

    return NextResponse.json(populatedStandup, { status: 201 });
  } catch (error) {
    console.error('Error creating standup:', error);
    return NextResponse.json(
      { error: 'Error creando standup' },
      { status: 500 }
    );
  }
}
