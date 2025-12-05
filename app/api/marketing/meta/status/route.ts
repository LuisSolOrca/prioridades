import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import connectDB from '@/lib/mongodb';
import MarketingPlatformConfig from '@/models/MarketingPlatformConfig';
import { decryptToken } from '@/lib/marketing/tokenEncryption';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    await connectDB();

    const config = await MarketingPlatformConfig.findOne({ platform: 'META' });

    if (!config) {
      return NextResponse.json({
        connected: false,
        platform: 'META',
      });
    }

    // Check if token is still valid
    let isTokenValid = true;
    let tokenStatus = 'valid';

    if (config.tokenExpiresAt && new Date(config.tokenExpiresAt) < new Date()) {
      isTokenValid = false;
      tokenStatus = 'expired';
    } else if (config.isActive && config.accessToken) {
      // Verify token with Meta API
      try {
        const token = decryptToken(config.accessToken);
        const response = await fetch(
          `https://graph.facebook.com/v18.0/debug_token?input_token=${token}&access_token=${token}`
        );
        const data = await response.json();

        if (data.data?.is_valid === false) {
          isTokenValid = false;
          tokenStatus = 'invalid';
        }
      } catch {
        // If we can't verify, assume it might be valid
        tokenStatus = 'unknown';
      }
    }

    return NextResponse.json({
      connected: config.isActive && isTokenValid,
      platform: 'META',
      accountName: config.platformAccountName,
      accountId: config.platformUserId,
      tokenStatus,
      tokenExpiresAt: config.tokenExpiresAt,
      lastSyncAt: config.lastSyncAt,
      lastError: config.lastError,
      adAccounts: config.platformData?.adAccounts || [],
      pages: config.platformData?.pages || [],
      syncEnabled: config.syncEnabled,
      syncFrequency: config.syncFrequency,
    });
  } catch (error) {
    console.error('Error getting Meta status:', error);
    return NextResponse.json(
      { error: 'Error al obtener estado' },
      { status: 500 }
    );
  }
}
