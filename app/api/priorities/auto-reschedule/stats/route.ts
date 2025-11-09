import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import connectDB from '@/lib/mongodb';
import Priority from '@/models/Priority';
import Comment from '@/models/Comment';
import User from '@/models/User';
import StrategicInitiative from '@/models/StrategicInitiative';
import Client from '@/models/Client';
import Project from '@/models/Project';

export const dynamic = 'force-dynamic';

/**
 * Get statistics about auto-rescheduling
 * Returns counts of pending and recently rescheduled priorities
 */
export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session || (session.user as any).role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();

    // Force model registration (needed in serverless environment)
    User;
    StrategicInitiative;
    Client;
    Project;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Get priorities pending auto-reschedule
    const pendingPriorities = await Priority.find({
      weekEnd: { $lt: today },
      status: 'EN_TIEMPO',
    }).populate('userId', 'name email')
      .populate('initiativeIds', 'name color')
      .sort({ weekEnd: 1 })
      .limit(50)
      .lean();

    // Get recently rescheduled priorities (last 7 days)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const recentlyRescheduled = await Priority.find({
      status: 'REPROGRAMADO',
      updatedAt: { $gte: sevenDaysAgo }
    }).populate('userId', 'name email')
      .populate('initiativeIds', 'name color')
      .sort({ updatedAt: -1 })
      .limit(50)
      .lean();

    // Get carried over priorities (created in last 7 days)
    const recentlyCarriedOver = await Priority.find({
      isCarriedOver: true,
      createdAt: { $gte: sevenDaysAgo }
    }).populate('userId', 'name email')
      .populate('initiativeIds', 'name color')
      .sort({ createdAt: -1 })
      .limit(50)
      .lean();

    // Get system comments about auto-rescheduling
    const autoRescheduleComments = await Comment.find({
      isSystemComment: true,
      text: { $regex: 'reprogramada automáticamente', $options: 'i' },
      createdAt: { $gte: sevenDaysAgo }
    }).populate('priorityId', 'title')
      .populate('userId', 'name email')
      .sort({ createdAt: -1 })
      .limit(20)
      .lean();

    // Calculate statistics
    const stats = {
      pending: {
        count: pendingPriorities.length,
        priorities: pendingPriorities
      },
      recentlyRescheduled: {
        count: recentlyRescheduled.length,
        priorities: recentlyRescheduled
      },
      recentlyCarriedOver: {
        count: recentlyCarriedOver.length,
        priorities: recentlyCarriedOver
      },
      recentActivity: {
        count: autoRescheduleComments.length,
        comments: autoRescheduleComments
      },
      totalRescheduled: await Priority.countDocuments({ status: 'REPROGRAMADO' }),
      totalCarriedOver: await Priority.countDocuments({ isCarriedOver: true })
    };

    return NextResponse.json(stats);
  } catch (error: any) {
    console.error('Error getting auto-reschedule stats:', error);
    return NextResponse.json({
      error: error.message
    }, { status: 500 });
  }
}
