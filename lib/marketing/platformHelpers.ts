import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import connectDB from '@/lib/mongodb';
import MarketingPlatformConfig, { MarketingPlatform } from '@/models/MarketingPlatformConfig';

/**
 * Generic status handler for marketing platforms
 */
export async function getPlatformStatus(platform: MarketingPlatform) {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    await connectDB();

    const config = await MarketingPlatformConfig.findOne({ platform });

    if (!config) {
      return NextResponse.json({
        connected: false,
        platform,
      });
    }

    // Check if token is expired
    let tokenStatus = 'valid';
    if (config.tokenExpiresAt && new Date(config.tokenExpiresAt) < new Date()) {
      tokenStatus = 'expired';
    }

    return NextResponse.json({
      connected: config.isActive && tokenStatus !== 'expired',
      platform,
      accountName: config.platformAccountName,
      accountId: config.platformUserId,
      tokenStatus,
      tokenExpiresAt: config.tokenExpiresAt,
      lastSyncAt: config.lastSyncAt,
      lastError: config.lastError,
      platformData: config.platformData,
      syncEnabled: config.syncEnabled,
      syncFrequency: config.syncFrequency,
    });
  } catch (error) {
    console.error(`Error getting ${platform} status:`, error);
    return NextResponse.json(
      { error: 'Error al obtener estado' },
      { status: 500 }
    );
  }
}

/**
 * Generic disconnect handler for marketing platforms
 */
export async function disconnectPlatform(platform: MarketingPlatform) {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    if (session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Sin permisos' }, { status: 403 });
    }

    await connectDB();

    const config = await MarketingPlatformConfig.findOneAndUpdate(
      { platform },
      {
        isActive: false,
        accessToken: '',
        refreshToken: '',
        platformData: {},
      },
      { new: true }
    );

    if (!config) {
      return NextResponse.json(
        { error: `No hay integración de ${platform} configurada` },
        { status: 404 }
      );
    }

    return NextResponse.json({
      message: `Integración de ${platform} desconectada correctamente`,
    });
  } catch (error) {
    console.error(`Error disconnecting ${platform}:`, error);
    return NextResponse.json(
      { error: 'Error al desconectar' },
      { status: 500 }
    );
  }
}

/**
 * Platform display names
 */
export const PLATFORM_NAMES: Record<MarketingPlatform, string> = {
  META: 'Meta (Facebook/Instagram)',
  TWITTER: 'Twitter/X',
  TIKTOK: 'TikTok',
  YOUTUBE: 'YouTube',
  LINKEDIN: 'LinkedIn',
  WHATSAPP: 'WhatsApp Business',
  GA4: 'Google Analytics 4',
  GOOGLE_ADS: 'Google Ads',
};

/**
 * Platform icons (for UI)
 */
export const PLATFORM_COLORS: Record<MarketingPlatform, string> = {
  META: '#1877F2',
  TWITTER: '#1DA1F2',
  TIKTOK: '#000000',
  YOUTUBE: '#FF0000',
  LINKEDIN: '#0A66C2',
  WHATSAPP: '#25D366',
  GA4: '#F9AB00',
  GOOGLE_ADS: '#4285F4',
};
