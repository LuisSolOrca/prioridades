import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import connectDB from '@/lib/mongodb';
import Priority from '@/models/Priority';
import ChannelMessage from '@/models/ChannelMessage';
import User from '@/models/User';

/**
 * GET /api/projects/[id]/activity/user
 * Obtiene la actividad reciente de un usuario en un proyecto
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
    const userId = searchParams.get('userId');
    const days = parseInt(searchParams.get('days') || '7', 10);

    if (!userId) {
      return NextResponse.json(
        { error: 'userId es requerido' },
        { status: 400 }
      );
    }

    // Get user
    const user = await User.findById(userId).select('name email').lean();
    if (!user) {
      return NextResponse.json(
        { error: 'Usuario no encontrado' },
        { status: 404 }
      );
    }

    // Calculate date range
    const now = new Date();
    const startDate = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);

    // Get priorities worked on in the period
    const priorities = await Priority.find({
      projectId: params.id,
      userId: userId,
      updatedAt: { $gte: startDate }
    })
      .select('title status completionPercentage weekStart weekEnd updatedAt')
      .sort({ updatedAt: -1 })
      .limit(10)
      .lean();

    // Get messages from the period
    const messages = await ChannelMessage.find({
      projectId: params.id,
      userId: userId,
      isDeleted: false,
      createdAt: { $gte: startDate }
    })
      .select('content createdAt')
      .sort({ createdAt: -1 })
      .limit(10)
      .lean();

    // Calculate stats
    const allPriorities = await Priority.find({
      projectId: params.id,
      userId: userId
    }).lean();

    const stats = {
      totalPriorities: priorities.length,
      completedPriorities: priorities.filter(p => p.status === 'COMPLETADO').length,
      inProgressPriorities: priorities.filter(p =>
        ['EN_TIEMPO', 'EN_RIESGO'].includes(p.status)
      ).length,
      totalMessages: messages.length,
      avgCompletionPercentage: priorities.length > 0
        ? Math.round(
            priorities.reduce((sum, p) => sum + p.completionPercentage, 0) / priorities.length
          )
        : 0
    };

    return NextResponse.json({
      user: {
        _id: user._id,
        name: user.name,
        email: user.email
      },
      priorities,
      messages,
      stats
    });
  } catch (error) {
    console.error('Error getting user activity:', error);
    return NextResponse.json(
      { error: 'Error obteniendo actividad del usuario' },
      { status: 500 }
    );
  }
}
