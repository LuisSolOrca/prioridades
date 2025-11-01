import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import connectDB from '@/lib/mongodb';
import Comment from '@/models/Comment';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    await connectDB();

    const { searchParams } = new URL(request.url);
    const priorityIdsParam = searchParams.get('priorityIds');

    if (!priorityIdsParam) {
      return NextResponse.json({ error: 'priorityIds es requerido' }, { status: 400 });
    }

    // Parse comma-separated priority IDs
    const priorityIds = priorityIdsParam.split(',').filter(id => id.trim());

    if (priorityIds.length === 0) {
      return NextResponse.json({});
    }

    // Aggregate comment counts by priorityId
    const counts = await Comment.aggregate([
      {
        $match: {
          priorityId: { $in: priorityIds }
        }
      },
      {
        $group: {
          _id: '$priorityId',
          count: { $sum: 1 }
        }
      }
    ]);

    // Convert to object format: { priorityId: count }
    const countsMap = counts.reduce((acc, item) => {
      acc[item._id] = item.count;
      return acc;
    }, {} as { [key: string]: number });

    return NextResponse.json(countsMap);
  } catch (error: any) {
    console.error('Error fetching comment counts:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
