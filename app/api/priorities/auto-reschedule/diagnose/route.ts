import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import connectDB from '@/lib/mongodb';
import Priority from '@/models/Priority';
import User from '@/models/User';
import StrategicInitiative from '@/models/StrategicInitiative';
import Client from '@/models/Client';
import Project from '@/models/Project';

export const dynamic = 'force-dynamic';

/**
 * Diagnostic endpoint for auto-rescheduling
 * Checks for orphaned priorities (REPROGRAMADO without corresponding isCarriedOver copy)
 */
export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session || (session.user as any).role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();

    // Force model registration
    User;
    StrategicInitiative;
    Client;
    Project;

    // Find all REPROGRAMADO priorities
    const reprogrammedPriorities = await Priority.find({
      status: 'REPROGRAMADO'
    }).populate('userId', 'name email')
      .populate('initiativeIds', 'name color')
      .sort({ updatedAt: -1 })
      .lean();

    const orphanedPriorities = [];
    const matchedPriorities = [];

    for (const reprogrammed of reprogrammedPriorities) {
      // Look for corresponding carried over priority
      const originalWeekEnd = new Date(reprogrammed.weekEnd);

      const carriedOver = await Priority.findOne({
        userId: reprogrammed.userId,
        title: reprogrammed.title,
        isCarriedOver: true,
        weekStart: { $gt: originalWeekEnd }
      }).sort({ weekStart: 1 })
        .populate('userId', 'name email')
        .lean();

      if (carriedOver) {
        matchedPriorities.push({
          reprogrammed: {
            _id: reprogrammed._id,
            title: reprogrammed.title,
            userId: reprogrammed.userId,
            weekStart: reprogrammed.weekStart,
            weekEnd: reprogrammed.weekEnd,
            updatedAt: reprogrammed.updatedAt
          },
          carriedOver: {
            _id: carriedOver._id,
            status: carriedOver.status,
            weekStart: carriedOver.weekStart,
            weekEnd: carriedOver.weekEnd,
            completionPercentage: carriedOver.completionPercentage,
            createdAt: carriedOver.createdAt
          }
        });
      } else {
        orphanedPriorities.push({
          _id: reprogrammed._id,
          title: reprogrammed.title,
          description: reprogrammed.description,
          userId: reprogrammed.userId,
          initiativeIds: reprogrammed.initiativeIds,
          clientId: reprogrammed.clientId,
          projectId: reprogrammed.projectId,
          weekStart: reprogrammed.weekStart,
          weekEnd: reprogrammed.weekEnd,
          completionPercentage: reprogrammed.completionPercentage,
          updatedAt: reprogrammed.updatedAt,
          checklist: reprogrammed.checklist
        });
      }
    }

    const summary = {
      total: reprogrammedPriorities.length,
      withCopy: matchedPriorities.length,
      orphaned: orphanedPriorities.length,
      orphanedPercentage: reprogrammedPriorities.length > 0
        ? ((orphanedPriorities.length / reprogrammedPriorities.length) * 100).toFixed(1)
        : 0
    };

    return NextResponse.json({
      summary,
      orphanedPriorities,
      matchedPriorities: matchedPriorities.slice(0, 10), // Only first 10 for brevity
      message: orphanedPriorities.length > 0
        ? `⚠️ Found ${orphanedPriorities.length} orphaned priorities that need repair`
        : '✅ All REPROGRAMADO priorities have their corresponding copies'
    });
  } catch (error: any) {
    console.error('Error in diagnose endpoint:', error);
    return NextResponse.json({
      error: error.message
    }, { status: 500 });
  }
}
