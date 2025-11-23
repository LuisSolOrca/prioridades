import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import connectDB from '@/lib/mongodb';
import ProjectActivity from '@/models/ProjectActivity';
import User from '@/models/User';

/**
 * GET /api/projects/[id]/activities
 * Obtiene el feed de actividades de un proyecto
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

    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    // Obtener actividades del proyecto
    const activities = await ProjectActivity.find({ projectId: params.id })
      .sort({ createdAt: -1 })
      .skip(offset)
      .limit(limit)
      .populate('userId', 'name email')
      .lean();

    // Contar total de actividades
    const total = await ProjectActivity.countDocuments({ projectId: params.id });

    return NextResponse.json({
      activities,
      pagination: {
        total,
        offset,
        limit,
        hasMore: offset + limit < total
      }
    });
  } catch (error) {
    console.error('Error getting project activities:', error);
    return NextResponse.json(
      { error: 'Error obteniendo actividades del proyecto' },
      { status: 500 }
    );
  }
}
