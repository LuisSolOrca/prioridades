import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import MarketingPlatformConfig from '@/models/MarketingPlatformConfig';
import MarketingSyncLog from '@/models/MarketingSyncLog';

// This endpoint can be called by external cron services like cron-job.org
// It syncs all active marketing platforms

export async function GET() {
  try {
    await connectDB();

    // Get all active platform configs
    const activeConfigs = await MarketingPlatformConfig.find({
      isActive: true,
      syncEnabled: true,
    });

    if (activeConfigs.length === 0) {
      return NextResponse.json({
        message: 'No hay plataformas activas para sincronizar',
        synced: 0,
      });
    }

    const results: any[] = [];

    for (const config of activeConfigs) {
      // Check if sync is needed based on frequency
      const now = new Date();
      const lastSync = config.lastSyncAt ? new Date(config.lastSyncAt) : null;

      let shouldSync = false;

      if (!lastSync) {
        shouldSync = true;
      } else {
        const hoursSinceLastSync = (now.getTime() - lastSync.getTime()) / (1000 * 60 * 60);

        switch (config.syncFrequency) {
          case 'HOURLY':
            shouldSync = hoursSinceLastSync >= 1;
            break;
          case 'DAILY':
            shouldSync = hoursSinceLastSync >= 24;
            break;
          case 'MANUAL':
            shouldSync = false;
            break;
        }
      }

      if (!shouldSync) {
        results.push({
          platform: config.platform,
          status: 'skipped',
          reason: 'Not due for sync',
        });
        continue;
      }

      // Create sync log
      const syncLog = await MarketingSyncLog.create({
        platform: config.platform,
        platformConfigId: config._id,
        syncType: 'METRICS',
        status: 'IN_PROGRESS',
        startedAt: new Date(),
        triggerType: 'SCHEDULED',
        recordsProcessed: 0,
        apiCallsMade: 0,
      });

      try {
        // Platform-specific sync logic would go here
        // For now, we just update the lastSyncAt timestamp

        // Update config
        config.lastSyncAt = new Date();
        config.consecutiveErrors = 0;
        config.lastError = undefined;
        config.lastErrorAt = undefined;
        await config.save();

        // Complete sync log
        syncLog.status = 'SUCCESS';
        syncLog.completedAt = new Date();
        syncLog.durationMs = new Date().getTime() - syncLog.startedAt.getTime();
        await syncLog.save();

        results.push({
          platform: config.platform,
          status: 'success',
          duration: syncLog.durationMs,
        });
      } catch (error: any) {
        // Update config with error
        config.lastError = error.message;
        config.lastErrorAt = new Date();
        config.consecutiveErrors = (config.consecutiveErrors || 0) + 1;
        await config.save();

        // Update sync log
        syncLog.status = 'FAILED';
        syncLog.completedAt = new Date();
        syncLog.durationMs = new Date().getTime() - syncLog.startedAt.getTime();
        (syncLog as any).errors = [{ error: error.message, timestamp: new Date() }];
        await syncLog.save();

        results.push({
          platform: config.platform,
          status: 'failed',
          error: error.message,
        });
      }
    }

    return NextResponse.json({
      message: 'Sincronización completada',
      timestamp: new Date().toISOString(),
      results,
      synced: results.filter((r) => r.status === 'success').length,
      failed: results.filter((r) => r.status === 'failed').length,
      skipped: results.filter((r) => r.status === 'skipped').length,
    });
  } catch (error) {
    console.error('Error in marketing sync cron:', error);
    return NextResponse.json(
      { error: 'Error en sincronización' },
      { status: 500 }
    );
  }
}

// POST method for manual sync
export async function POST() {
  return GET();
}
