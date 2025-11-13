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

    // Asegurar que permissions existe
    if (!user.permissions) {
      user.permissions = {
        viewDashboard: true,
        viewAreaDashboard: true,
        viewMyPriorities: true,
        viewReports: true,
        viewAnalytics: true,
        viewLeaderboard: true,
        viewAutomations: true,
        viewHistory: true,
        canReassignPriorities: user.role === 'ADMIN',
        canCreateMilestones: true,
        canEditHistoricalPriorities: user.role === 'ADMIN',
        canManageProjects: user.role === 'ADMIN',
      };
    }

    // Actualizar permisos manteniendo estructura
    user.permissions = {
      viewDashboard: permissions.viewDashboard !== undefined ? permissions.viewDashboard : user.permissions.viewDashboard,
      viewAreaDashboard: permissions.viewAreaDashboard !== undefined ? permissions.viewAreaDashboard : user.permissions.viewAreaDashboard,
      viewMyPriorities: permissions.viewMyPriorities !== undefined ? permissions.viewMyPriorities : user.permissions.viewMyPriorities,
      viewReports: permissions.viewReports !== undefined ? permissions.viewReports : user.permissions.viewReports,
      viewAnalytics: permissions.viewAnalytics !== undefined ? permissions.viewAnalytics : user.permissions.viewAnalytics,
      viewLeaderboard: permissions.viewLeaderboard !== undefined ? permissions.viewLeaderboard : user.permissions.viewLeaderboard,
      viewAutomations: permissions.viewAutomations !== undefined ? permissions.viewAutomations : user.permissions.viewAutomations,
      viewHistory: permissions.viewHistory !== undefined ? permissions.viewHistory : user.permissions.viewHistory,
      canReassignPriorities: permissions.canReassignPriorities !== undefined ? permissions.canReassignPriorities : user.permissions.canReassignPriorities,
      canCreateMilestones: permissions.canCreateMilestones !== undefined ? permissions.canCreateMilestones : user.permissions.canCreateMilestones,
      canEditHistoricalPriorities: permissions.canEditHistoricalPriorities !== undefined ? permissions.canEditHistoricalPriorities : (user.permissions.canEditHistoricalPriorities ?? (user.role === 'ADMIN')),
      canManageProjects: permissions.canManageProjects !== undefined ? permissions.canManageProjects : (user.permissions.canManageProjects ?? (user.role === 'ADMIN')),
    };

    // Marcar como modificado explícitamente
    user.markModified('permissions');
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
