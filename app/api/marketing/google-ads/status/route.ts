import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import connectDB from '@/lib/mongodb';
import MarketingPlatformConfig from '@/models/MarketingPlatformConfig';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    await connectDB();

    const config = await MarketingPlatformConfig.findOne({ platform: 'GOOGLE_ADS' });

    if (!config) {
      return NextResponse.json({
        connected: false,
        platform: 'GOOGLE_ADS',
      });
    }

    // Check if token is expired
    const isExpired = config.tokenExpiresAt && new Date(config.tokenExpiresAt) < new Date();

    return NextResponse.json({
      connected: config.isActive && !isExpired,
      platform: 'GOOGLE_ADS',
      accountName: config.platformAccountName,
      accountId: config.platformUserId,
      lastSyncAt: config.lastSyncAt,
      syncEnabled: config.syncEnabled,
      syncFrequency: config.syncFrequency,
      tokenExpiresAt: config.tokenExpiresAt,
      isExpired,
      customerAccounts: config.platformData?.customerAccounts || [],
      consecutiveErrors: config.consecutiveErrors,
      lastError: config.lastError,
    });
  } catch (error) {
    console.error('Error getting Google Ads status:', error);
    return NextResponse.json(
      { error: 'Error al obtener estado' },
      { status: 500 }
    );
  }
}
