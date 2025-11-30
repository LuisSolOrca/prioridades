import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import connectDB from '@/lib/mongodb';
import UserStatus from '@/models/UserStatus';
import User from '@/models/User';

// POST - Get status for multiple users
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    await connectDB();

    const body = await request.json();
    const { userIds } = body;

    if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
      return NextResponse.json(
        { error: 'userIds es requerido y debe ser un array' },
        { status: 400 }
      );
    }

    // Limit to 50 users per request
    const limitedUserIds = userIds.slice(0, 50);

    // Get all statuses
    const statuses = await UserStatus.find({
      userId: { $in: limitedUserIds },
    }).lean();

    // Get user info for users without status records
    const statusUserIds = statuses.map(s => s.userId.toString());
    const missingUserIds = limitedUserIds.filter(id => !statusUserIds.includes(id));

    // Create default offline status for users without records
    const now = new Date();
    const statusMap: Record<string, any> = {};

    // Add existing statuses
    statuses.forEach(s => {
      const userId = s.userId.toString();
      // Check if custom status has expired
      const customStatusExpired = s.customStatusExpiresAt && new Date() > s.customStatusExpiresAt;

      // Determine display status
      let displayStatus: string = s.status;
      if (s.status === 'invisible') {
        displayStatus = 'offline';
      } else if (!s.isConnected && s.status === 'online') {
        displayStatus = 'offline';
      }

      statusMap[userId] = {
        userId,
        status: s.status,
        displayStatus,
        customStatus: customStatusExpired ? undefined : s.customStatus,
        customStatusEmoji: customStatusExpired ? undefined : s.customStatusEmoji,
        lastSeenAt: s.lastSeenAt,
        isConnected: s.isConnected,
      };
    });

    // Add default status for missing users
    missingUserIds.forEach(userId => {
      statusMap[userId] = {
        userId,
        status: 'offline',
        displayStatus: 'offline',
        customStatus: undefined,
        customStatusEmoji: undefined,
        lastSeenAt: null,
        isConnected: false,
      };
    });

    return NextResponse.json({
      success: true,
      statuses: statusMap,
    });
  } catch (error: any) {
    console.error('Error getting bulk user statuses:', error);
    return NextResponse.json(
      { error: error.message || 'Error al obtener estados' },
      { status: 500 }
    );
  }
}
