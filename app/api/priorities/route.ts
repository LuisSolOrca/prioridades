import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import connectDB from '@/lib/mongodb';
import Priority from '@/models/Priority';
import { awardBadge } from '@/lib/gamification';
import { executeWorkflowsForPriority } from '@/lib/workflows';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    await connectDB();

    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const weekStart = searchParams.get('weekStart');
    const weekEnd = searchParams.get('weekEnd');
    const forDashboard = searchParams.get('forDashboard'); // Nuevo parámetro para indicar que es para el dashboard

    let query: any = {};

    // Si es para el dashboard, mostrar todas las prioridades (ambos roles pueden ver el dashboard completo)
    // Si no es para el dashboard, aplicar filtros según el rol
    if (forDashboard !== 'true') {
      // Si es usuario normal, solo ver sus prioridades
      if ((session.user as any).role !== 'ADMIN' && !userId) {
        query.userId = (session.user as any).id;
      } else if (userId) {
        query.userId = userId;
      }
    } else if (userId) {
      // Incluso para dashboard, respetar el filtro de userId si se especifica
      query.userId = userId;
    }

    // Filtrar por semana exacta
    // Usamos solo weekStart porque cada prioridad pertenece a una semana específica
    if (weekStart) {
      const weekStartDate = new Date(weekStart);
      // Crear rango de 1 día para comparación (mismo día, cualquier hora)
      const nextDay = new Date(weekStartDate);
      nextDay.setDate(nextDay.getDate() + 1);

      query.weekStart = {
        $gte: weekStartDate,
        $lt: nextDay
      };
    }

    const priorities = await Priority.find(query)
      .sort({ weekStart: -1, createdAt: -1 })
      .lean();

    return NextResponse.json(priorities);
  } catch (error: any) {
    console.error('Error fetching priorities:', error);
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

    // Validar que el usuario solo cree sus propias prioridades (a menos que sea admin)
    if ((session.user as any).role !== 'ADMIN' && body.userId !== (session.user as any).id) {
      return NextResponse.json({ error: 'No puedes crear prioridades para otros usuarios' }, { status: 403 });
    }

    // Validar límite de 10 prioridades por semana
    const existingPriorities = await Priority.countDocuments({
      userId: body.userId,
      weekStart: body.weekStart
    });

    if (existingPriorities >= 10) {
      return NextResponse.json({
        error: 'Has alcanzado el límite de 10 prioridades por semana. Para agregar una nueva, elimina alguna existente.'
      }, { status: 400 });
    }

    // Compatibilidad: convertir initiativeId a initiativeIds si existe
    let initiativeIds = body.initiativeIds || [];
    if (body.initiativeId && initiativeIds.length === 0) {
      initiativeIds = [body.initiativeId];
    }

    const priority = await Priority.create({
      ...body,
      initiativeIds,
      wasEdited: false,
      isCarriedOver: false,
      createdAt: new Date(),
      updatedAt: new Date()
    });

    // Otorgar badge de FIRST_TASK si es la primera tarea del usuario
    if (body.checklist && Array.isArray(body.checklist) && body.checklist.length > 0) {
      try {
        // Badge FIRST_TASK removido - ya no existe en el nuevo sistema de badges
        // El badge PRIMERA_VICTORIA se otorga automáticamente cuando se completa la primera prioridad
      } catch (badgeError) {
        console.error('[BADGE] Error checking for badges:', badgeError);
      }
    }

    // Ejecutar workflows basados en evento de creación
    try {
      await executeWorkflowsForPriority(
        priority._id.toString(),
        'priority_created'
      );
    } catch (workflowError) {
      console.error('Error ejecutando workflows:', workflowError);
    }

    return NextResponse.json(priority, { status: 201 });
  } catch (error: any) {
    console.error('Error creating priority:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
