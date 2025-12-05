import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import connectDB from '@/lib/mongodb';
import MarketingPlatformConfig from '@/models/MarketingPlatformConfig';

const VALID_PLATFORMS = ['META', 'LINKEDIN', 'TWITTER', 'TIKTOK', 'YOUTUBE', 'WHATSAPP', 'GA4'];

// POST - Sync all connected platforms
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    await connectDB();

    // Get all connected platforms
    const connectedPlatforms = await MarketingPlatformConfig.find({
      isActive: true,
      accessToken: { $exists: true, $ne: null },
    }).select('platform');

    if (connectedPlatforms.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No hay plataformas conectadas para sincronizar',
        results: [],
      });
    }

    // Get base URL from request
    const baseUrl = request.nextUrl.origin;

    // Sync each platform in parallel
    const syncPromises = connectedPlatforms.map(async (config) => {
      try {
        const response = await fetch(`${baseUrl}/api/marketing/sync/${config.platform.toLowerCase()}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Cookie: request.headers.get('cookie') || '',
          },
        });

        const result = await response.json();
        return {
          platform: config.platform,
          success: response.ok,
          ...result,
        };
      } catch (error: any) {
        return {
          platform: config.platform,
          success: false,
          error: error.message,
        };
      }
    });

    const results = await Promise.all(syncPromises);

    const successCount = results.filter((r) => r.success).length;
    const failCount = results.filter((r) => !r.success).length;

    return NextResponse.json({
      success: failCount === 0,
      message: `Sincronización completada: ${successCount} exitosas, ${failCount} fallidas`,
      totalPlatforms: connectedPlatforms.length,
      successCount,
      failCount,
      results,
    });
  } catch (error: any) {
    console.error('Error syncing all platforms:', error);
    return NextResponse.json(
      { error: error.message || 'Error al sincronizar plataformas' },
      { status: 500 }
    );
  }
}

// GET - Get sync status for all platforms
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    await connectDB();

    const platformStatuses = await Promise.all(
      VALID_PLATFORMS.map(async (platform) => {
        const config = await MarketingPlatformConfig.findOne({
          platform,
          isActive: true,
        });

        return {
          platform,
          connected: !!config?.accessToken,
          syncEnabled: config?.syncEnabled || false,
          lastSyncAt: config?.lastSyncAt,
          lastError: config?.lastError,
          consecutiveErrors: config?.consecutiveErrors || 0,
        };
      })
    );

    const connectedCount = platformStatuses.filter((p) => p.connected).length;

    return NextResponse.json({
      platforms: platformStatuses,
      summary: {
        total: VALID_PLATFORMS.length,
        connected: connectedCount,
        disconnected: VALID_PLATFORMS.length - connectedCount,
      },
    });
  } catch (error: any) {
    console.error('Error getting all platforms status:', error);
    return NextResponse.json(
      { error: error.message || 'Error al obtener estado de plataformas' },
      { status: 500 }
    );
  }
}
