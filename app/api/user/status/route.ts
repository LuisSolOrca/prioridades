import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import connectDB from '@/lib/mongodb';
import UserStatus, { PresenceStatus } from '@/models/UserStatus';
import { triggerPusherEvent } from '@/lib/pusher-server';

// GET - Get current user's status
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    await connectDB();

    const user = session.user as any;
    let status = await UserStatus.findOne({ userId: user.id });

    if (!status) {
      status = await UserStatus.create({
        userId: user.id,
        status: 'online',
        lastSeenAt: new Date(),
      });
    }

    // Clear expired custom status
    if (status.customStatusExpiresAt && new Date() > status.customStatusExpiresAt) {
      status.customStatus = undefined;
      status.customStatusEmoji = undefined;
      status.customStatusExpiresAt = undefined;
      await status.save();
    }

    return NextResponse.json({
      success: true,
      status: {
        status: status.status,
        customStatus: status.customStatus,
        customStatusEmoji: status.customStatusEmoji,
        customStatusExpiresAt: status.customStatusExpiresAt,
        lastSeenAt: status.lastSeenAt,
        isConnected: status.isConnected,
      },
    });
  } catch (error: any) {
    console.error('Error getting user status:', error);
    return NextResponse.json(
      { error: error.message || 'Error al obtener estado' },
      { status: 500 }
    );
  }
}

// PUT - Update current user's status
export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    await connectDB();

    const user = session.user as any;
    const body = await request.json();
    const {
      status,
      customStatus,
      customStatusEmoji,
      customStatusExpiresAt,
      clearCustomStatus,
    } = body;

    // Validate status if provided
    if (status && !['online', 'away', 'dnd', 'invisible'].includes(status)) {
      return NextResponse.json(
        { error: 'Estado inválido' },
        { status: 400 }
      );
    }

    let userStatus = await UserStatus.findOne({ userId: user.id });

    if (!userStatus) {
      userStatus = new UserStatus({
        userId: user.id,
        lastSeenAt: new Date(),
      });
    }

    // Update presence status
    if (status) {
      userStatus.status = status as PresenceStatus;
    }

    // Update custom status
    if (clearCustomStatus) {
      userStatus.customStatus = undefined;
      userStatus.customStatusEmoji = undefined;
      userStatus.customStatusExpiresAt = undefined;
    } else {
      if (customStatus !== undefined) {
        userStatus.customStatus = customStatus || undefined;
      }
      if (customStatusEmoji !== undefined) {
        userStatus.customStatusEmoji = customStatusEmoji || undefined;
      }
      if (customStatusExpiresAt !== undefined) {
        userStatus.customStatusExpiresAt = customStatusExpiresAt
          ? new Date(customStatusExpiresAt)
          : undefined;
      }
    }

    // Update last seen
    userStatus.lastSeenAt = new Date();

    await userStatus.save();

    // Broadcast status change via Pusher (only if not invisible)
    if (userStatus.status !== 'invisible') {
      await triggerPusherEvent('presence-global', 'user-status-changed', {
        userId: user.id,
        userName: user.name,
        status: userStatus.status,
        customStatus: userStatus.customStatus,
        customStatusEmoji: userStatus.customStatusEmoji,
      });
    }

    return NextResponse.json({
      success: true,
      status: {
        status: userStatus.status,
        customStatus: userStatus.customStatus,
        customStatusEmoji: userStatus.customStatusEmoji,
        customStatusExpiresAt: userStatus.customStatusExpiresAt,
        lastSeenAt: userStatus.lastSeenAt,
        isConnected: userStatus.isConnected,
      },
    });
  } catch (error: any) {
    console.error('Error updating user status:', error);
    return NextResponse.json(
      { error: error.message || 'Error al actualizar estado' },
      { status: 500 }
    );
  }
}
