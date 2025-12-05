import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import connectDB from '@/lib/mongodb';
import MarketingSyncLog from '@/models/MarketingSyncLog';
import MarketingPlatformConfig from '@/models/MarketingPlatformConfig';

// GET - Get sync alerts (recent errors and warnings)
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    await connectDB();

    const { searchParams } = new URL(request.url);
    const hoursBack = parseInt(searchParams.get('hours') || '24');

    const cutoffTime = new Date();
    cutoffTime.setHours(cutoffTime.getHours() - hoursBack);

    // Get recent failed syncs
    const recentFailures = await MarketingSyncLog.find({
      status: { $in: ['FAILED', 'PARTIAL'] },
      startedAt: { $gte: cutoffTime },
    })
      .sort({ startedAt: -1 })
      .limit(20)
      .lean();

    // Get platforms with consecutive errors
    const platformsWithErrors = await MarketingPlatformConfig.find({
      isActive: true,
      consecutiveErrors: { $gte: 3 },
    })
      .select('platform platformAccountName consecutiveErrors lastError lastErrorAt')
      .lean();

    // Get platforms that haven't synced in a while
    const staleThreshold = new Date();
    staleThreshold.setHours(staleThreshold.getHours() - 48); // 48 hours

    const stalePlatforms = await MarketingPlatformConfig.find({
      isActive: true,
      syncEnabled: true,
      $or: [
        { lastSyncAt: { $lt: staleThreshold } },
        { lastSyncAt: null },
      ],
    })
      .select('platform platformAccountName lastSyncAt syncFrequency')
      .lean();

    // Check for rate limit issues
    const rateLimitedPlatforms = await MarketingPlatformConfig.find({
      isActive: true,
      rateLimitRemaining: { $lte: 10 },
      rateLimitResetAt: { $gt: new Date() },
    })
      .select('platform rateLimitRemaining rateLimitResetAt')
      .lean();

    // Build alerts array
    const alerts: Alert[] = [];

    // Add failure alerts
    for (const failure of recentFailures) {
      alerts.push({
        id: failure._id.toString(),
        type: failure.status === 'FAILED' ? 'error' : 'warning',
        platform: failure.platform,
        title: failure.status === 'FAILED' ? 'Sincronización fallida' : 'Sincronización parcial',
        message: (failure as any).errors?.[0]?.error || 'Error durante la sincronización',
        timestamp: failure.startedAt,
        syncLogId: failure._id.toString(),
      });
    }

    // Add consecutive error alerts
    for (const platform of platformsWithErrors) {
      alerts.push({
        id: `consecutive-${platform._id}`,
        type: 'error',
        platform: platform.platform,
        title: 'Errores consecutivos',
        message: `${platform.consecutiveErrors} errores seguidos: ${platform.lastError}`,
        timestamp: platform.lastErrorAt || new Date(),
        critical: platform.consecutiveErrors >= 5,
      });
    }

    // Add stale platform alerts
    for (const platform of stalePlatforms) {
      const hoursSinceSync = platform.lastSyncAt
        ? Math.round((new Date().getTime() - new Date(platform.lastSyncAt).getTime()) / (1000 * 60 * 60))
        : null;

      alerts.push({
        id: `stale-${platform._id}`,
        type: 'warning',
        platform: platform.platform,
        title: 'Sincronización pendiente',
        message: platform.lastSyncAt
          ? `Última sincronización hace ${hoursSinceSync} horas`
          : 'Nunca se ha sincronizado',
        timestamp: platform.lastSyncAt || new Date(),
      });
    }

    // Add rate limit alerts
    for (const platform of rateLimitedPlatforms) {
      alerts.push({
        id: `ratelimit-${platform._id}`,
        type: 'warning',
        platform: platform.platform,
        title: 'Límite de API cercano',
        message: `Solo quedan ${platform.rateLimitRemaining} llamadas`,
        timestamp: new Date(),
      });
    }

    // Sort by timestamp (most recent first)
    alerts.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    // Calculate summary
    const summary = {
      total: alerts.length,
      errors: alerts.filter((a) => a.type === 'error').length,
      warnings: alerts.filter((a) => a.type === 'warning').length,
      critical: alerts.filter((a) => a.critical).length,
      platformsAffected: [...new Set(alerts.map((a) => a.platform))].length,
    };

    return NextResponse.json({
      alerts,
      summary,
      period: {
        hours: hoursBack,
        since: cutoffTime,
      },
    });
  } catch (error) {
    console.error('Error fetching sync alerts:', error);
    return NextResponse.json(
      { error: 'Error al obtener alertas' },
      { status: 500 }
    );
  }
}

interface Alert {
  id: string;
  type: 'error' | 'warning' | 'info';
  platform: string;
  title: string;
  message: string;
  timestamp: Date;
  syncLogId?: string;
  critical?: boolean;
}
