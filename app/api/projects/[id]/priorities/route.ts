import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import connectDB from '@/lib/mongodb';
import Priority from '@/models/Priority';
import User from '@/models/User';

/**
 * GET /api/projects/[id]/priorities
 * Obtiene las prioridades de un proyecto
 */
export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    await connectDB();

    // Obtener prioridades del proyecto
    const priorities = await Priority.find({
      projectId: params.id
    })
      .select('title status completionPercentage weekStart weekEnd userId initiativeIds updatedAt')
      .populate('userId', 'name email')
      .lean();

    return NextResponse.json({ priorities });
  } catch (error) {
    console.error('Error getting project priorities:', error);
    return NextResponse.json(
      { error: 'Error obteniendo prioridades del proyecto' },
      { status: 500 }
    );
  }
}
