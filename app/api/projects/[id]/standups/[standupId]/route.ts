import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import connectDB from '@/lib/mongodb';
import Standup from '@/models/Standup';

/**
 * PUT /api/projects/[id]/standups/[standupId]
 * Actualiza un standup existente
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string; standupId: string } }
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

    // Buscar el standup
    const standup = await Standup.findById(params.standupId);

    if (!standup) {
      return NextResponse.json(
        { error: 'Standup no encontrado' },
        { status: 404 }
      );
    }

    // Verificar que sea el autor
    if (standup.userId.toString() !== (session.user as any).id) {
      return NextResponse.json(
        { error: 'No tienes permiso para editar este standup' },
        { status: 403 }
      );
    }

    // Actualizar
    standup.yesterday = yesterday;
    standup.today = today;
    standup.blockers = blockers || '';
    standup.risks = risks || '';
    await standup.save();

    // Populate and return
    const updatedStandup = await Standup.findById(standup._id)
      .populate('userId', 'name email')
      .lean();

    return NextResponse.json(updatedStandup);
  } catch (error) {
    console.error('Error updating standup:', error);
    return NextResponse.json(
      { error: 'Error actualizando standup' },
      { status: 500 }
    );
  }
}
