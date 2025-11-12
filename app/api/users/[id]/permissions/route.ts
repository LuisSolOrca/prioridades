import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import connectDB from '@/lib/mongodb';
import User from '@/models/User';

/**
 * PUT - Actualiza los permisos de un usuario (solo ADMIN)
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || (session.user as any).role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();

    const body = await request.json();
    const { permissions } = body;

    if (!permissions) {
      return NextResponse.json({ error: 'Permissions object is required' }, { status: 400 });
    }

    const user = await User.findById(params.id);
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Actualizar permisos
    user.permissions = {
      viewDashboard: permissions.viewDashboard ?? true,
      viewAreaDashboard: permissions.viewAreaDashboard ?? true,
      viewMyPriorities: permissions.viewMyPriorities ?? true,
      viewReports: permissions.viewReports ?? true,
      viewAnalytics: permissions.viewAnalytics ?? true,
      viewLeaderboard: permissions.viewLeaderboard ?? true,
      viewAutomations: permissions.viewAutomations ?? true,
      viewHistory: permissions.viewHistory ?? true,
      canReassignPriorities: permissions.canReassignPriorities ?? false,
      canCreateMilestones: permissions.canCreateMilestones ?? true,
    };

    await user.save();

    return NextResponse.json({
      message: 'Permissions updated successfully',
      permissions: user.permissions
    });
  } catch (error) {
    console.error('Error updating user permissions:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
