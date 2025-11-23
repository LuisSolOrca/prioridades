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
    const search = searchParams.get('search') || '';

    // Construir query base
    const query: any = { projectId: params.id };

    // Si hay búsqueda, agregar condiciones
    if (search.trim()) {
      const searchRegex = new RegExp(search.trim(), 'i');

      // Primero, buscar usuarios que coincidan con el término de búsqueda
      const matchingUsers = await User.find({
        name: searchRegex,
        isActive: true
      }).select('_id').lean();

      const userIds = matchingUsers.map(u => u._id);

      // Construir query con búsqueda en múltiples campos
      query.$or = [
        // Buscar por tipo de actividad
        { activityType: searchRegex },
        // Buscar por userId
        ...(userIds.length > 0 ? [{ userId: { $in: userIds } }] : []),
        // Buscar en metadata
        { 'metadata.priorityTitle': searchRegex },
        { 'metadata.taskTitle': searchRegex },
        { 'metadata.commentText': searchRegex },
        { 'metadata.milestoneTitle': searchRegex },
        { 'metadata.oldStatus': searchRegex },
        { 'metadata.newStatus': searchRegex }
      ];
    }

    // Obtener actividades del proyecto
    const activities = await ProjectActivity.find(query)
      .sort({ createdAt: -1 })
      .skip(offset)
      .limit(limit)
      .populate('userId', 'name email')
      .lean();

    // Contar total de actividades
    const total = await ProjectActivity.countDocuments(query);

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
