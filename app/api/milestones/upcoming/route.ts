import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import connectDB from '@/lib/mongodb';
import Milestone from '@/models/Milestone';

/**
 * GET - Obtiene los hitos que están próximos a vencer (7 días o menos)
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();

    const userId = (session.user as any).id;
    const now = new Date();
    const sevenDaysFromNow = new Date(now);
    sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7);

    // Buscar hitos que vencen en los próximos 7 días y no están completados
    const upcomingMilestones = await Milestone.find({
      userId,
      isCompleted: false,
      dueDate: {
        $gte: now,
        $lte: sevenDaysFromNow
      }
    }).sort({ dueDate: 1 });

    // Calcular días restantes para cada hito
    const milestonesWithDaysLeft = upcomingMilestones.map(milestone => {
      const daysLeft = Math.ceil(
        (new Date(milestone.dueDate).getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
      );

      return {
        ...milestone.toObject(),
        daysLeft
      };
    });

    return NextResponse.json(milestonesWithDaysLeft);
  } catch (error) {
    console.error('Error fetching upcoming milestones:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
