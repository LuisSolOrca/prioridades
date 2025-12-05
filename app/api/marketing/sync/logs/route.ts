import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import connectDB from '@/lib/mongodb';
import MarketingSyncLog from '@/models/MarketingSyncLog';

// GET - List sync logs with filters
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    await connectDB();

    const { searchParams } = new URL(request.url);
    const platform = searchParams.get('platform');
    const status = searchParams.get('status');
    const syncType = searchParams.get('syncType');
    const limit = parseInt(searchParams.get('limit') || '50');
    const page = parseInt(searchParams.get('page') || '1');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    // Build query
    const query: any = {};

    if (platform) {
      query.platform = platform;
    }

    if (status) {
      query.status = status;
    }

    if (syncType) {
      query.syncType = syncType;
    }

    if (startDate || endDate) {
      query.startedAt = {};
      if (startDate) {
        query.startedAt.$gte = new Date(startDate);
      }
      if (endDate) {
        query.startedAt.$lte = new Date(endDate);
      }
    }

    // Get total count
    const total = await MarketingSyncLog.countDocuments(query);

    // Get logs with pagination
    const logs = await MarketingSyncLog.find(query)
      .sort({ startedAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .populate('triggeredBy', 'name email')
      .lean();

    // Get aggregated stats
    const stats = await MarketingSyncLog.aggregate([
      {
        $match: query.startedAt ? { startedAt: query.startedAt } : {},
      },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
        },
      },
    ]);

    const statsMap = stats.reduce((acc: any, item: any) => {
      acc[item._id] = item.count;
      return acc;
    }, {});

    // Get platform breakdown
    const platformStats = await MarketingSyncLog.aggregate([
      {
        $match: query.startedAt ? { startedAt: query.startedAt } : {},
      },
      {
        $group: {
          _id: '$platform',
          total: { $sum: 1 },
          success: {
            $sum: { $cond: [{ $eq: ['$status', 'SUCCESS'] }, 1, 0] },
          },
          failed: {
            $sum: { $cond: [{ $eq: ['$status', 'FAILED'] }, 1, 0] },
          },
          avgDuration: { $avg: '$durationMs' },
        },
      },
    ]);

    // Get recent errors
    const recentErrors = await MarketingSyncLog.find({
      status: 'FAILED',
      ...(query.startedAt ? { startedAt: query.startedAt } : {}),
    })
      .sort({ startedAt: -1 })
      .limit(10)
      .select('platform syncType startedAt errors')
      .lean();

    return NextResponse.json({
      logs,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
      stats: {
        total: total,
        success: statsMap.SUCCESS || 0,
        failed: statsMap.FAILED || 0,
        partial: statsMap.PARTIAL || 0,
        inProgress: statsMap.IN_PROGRESS || 0,
        pending: statsMap.PENDING || 0,
      },
      platformStats,
      recentErrors,
    });
  } catch (error) {
    console.error('Error fetching sync logs:', error);
    return NextResponse.json(
      { error: 'Error al obtener logs de sincronización' },
      { status: 500 }
    );
  }
}

// DELETE - Clear old sync logs (admin only)
export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || (session.user as any).role !== 'ADMIN') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    await connectDB();

    const { searchParams } = new URL(request.url);
    const daysOld = parseInt(searchParams.get('daysOld') || '30');

    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysOld);

    const result = await MarketingSyncLog.deleteMany({
      startedAt: { $lt: cutoffDate },
      status: { $in: ['SUCCESS', 'FAILED', 'PARTIAL'] },
    });

    return NextResponse.json({
      message: `Eliminados ${result.deletedCount} logs anteriores a ${daysOld} días`,
      deleted: result.deletedCount,
    });
  } catch (error) {
    console.error('Error deleting sync logs:', error);
    return NextResponse.json(
      { error: 'Error al eliminar logs' },
      { status: 500 }
    );
  }
}
