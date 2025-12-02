import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import connectDB from '@/lib/mongodb';
import Activity from '@/models/Activity';
// Import referenced models to ensure they're registered for populate
import '@/models/Client';
import '@/models/Contact';
import '@/models/Deal';
import '@/models/User';
import { hasPermission } from '@/lib/permissions';

export const dynamic = 'force-dynamic';

/**
 * GET /api/crm/activities/calendar
 * Fetches activities for calendar view with date range filtering
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    if (!hasPermission(session, 'viewCRM')) {
      return NextResponse.json({ error: 'Sin permiso para ver CRM' }, { status: 403 });
    }

    await connectDB();

    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const types = searchParams.get('types'); // comma-separated
    const assignedTo = searchParams.get('assignedTo');
    const limit = parseInt(searchParams.get('limit') || '500');

    const query: any = {};

    // Date range filter - for tasks use dueDate, for others use createdAt
    if (startDate && endDate) {
      const start = new Date(startDate);
      const end = new Date(endDate);

      query.$or = [
        // Tasks with dueDate in range
        {
          type: 'task',
          dueDate: { $gte: start, $lte: end }
        },
        // Other activities with createdAt in range
        {
          type: { $ne: 'task' },
          createdAt: { $gte: start, $lte: end }
        },
        // Tasks without dueDate, use createdAt
        {
          type: 'task',
          dueDate: { $exists: false },
          createdAt: { $gte: start, $lte: end }
        }
      ];
    }

    // Type filter
    if (types) {
      const typeArray = types.split(',').filter(Boolean);
      if (typeArray.length > 0) {
        // Combine with existing $or if present
        if (query.$or) {
          query.$and = [
            { $or: query.$or },
            { type: { $in: typeArray } }
          ];
          delete query.$or;
        } else {
          query.type = { $in: typeArray };
        }
      }
    }

    // Assigned to filter
    if (assignedTo) {
      if (query.$and) {
        query.$and.push({ assignedTo });
      } else if (query.$or) {
        query.$and = [
          { $or: query.$or },
          { assignedTo }
        ];
        delete query.$or;
      } else {
        query.assignedTo = assignedTo;
      }
    }

    const activities = await Activity.find(query)
      .populate('clientId', 'name')
      .populate('contactId', 'firstName lastName')
      .populate('dealId', 'title value')
      .populate('createdBy', 'name')
      .populate('assignedTo', 'name')
      .sort({ dueDate: 1, createdAt: -1 })
      .limit(limit)
      .lean();

    return NextResponse.json(activities);
  } catch (error: any) {
    console.error('Error fetching calendar activities:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
