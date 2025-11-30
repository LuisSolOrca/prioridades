import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import connectDB from '@/lib/mongodb';
import UserStatus from '@/models/UserStatus';

// POST - Update heartbeat (last seen and connection status)
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    await connectDB();

    const user = session.user as any;
    const body = await request.json().catch(() => ({}));
    const { channelId, action } = body; // action: 'connect' | 'disconnect' | 'heartbeat'

    let userStatus = await UserStatus.findOne({ userId: user.id });

    if (!userStatus) {
      userStatus = new UserStatus({
        userId: user.id,
        status: 'online',
        lastSeenAt: new Date(),
        isConnected: true,
        connectedAt: new Date(),
      });
    }

    const now = new Date();

    switch (action) {
      case 'connect':
        userStatus.isConnected = true;
        userStatus.connectedAt = now;
        userStatus.lastSeenAt = now;
        // Restore online status if was offline (but respect dnd/away/invisible)
        if (userStatus.status === 'online' || !userStatus.status) {
          userStatus.status = 'online';
        }
        break;

      case 'disconnect':
        userStatus.isConnected = false;
        userStatus.disconnectedAt = now;
        userStatus.lastSeenAt = now;
        break;

      default: // heartbeat
        userStatus.lastSeenAt = now;
        if (channelId) {
          userStatus.lastActiveChannelId = channelId;
        }
        // If user is sending heartbeats but marked as disconnected, reconnect
        if (!userStatus.isConnected) {
          userStatus.isConnected = true;
          userStatus.connectedAt = now;
        }
        break;
    }

    await userStatus.save();

    return NextResponse.json({
      success: true,
      lastSeenAt: userStatus.lastSeenAt,
      isConnected: userStatus.isConnected,
    });
  } catch (error: any) {
    console.error('Error updating heartbeat:', error);
    return NextResponse.json(
      { error: error.message || 'Error al actualizar heartbeat' },
      { status: 500 }
    );
  }
}
