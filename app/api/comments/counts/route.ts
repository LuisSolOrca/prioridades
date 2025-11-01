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

    // Convert string IDs to ObjectIds for MongoDB comparison
    const mongoose = require('mongoose');
    const objectIds = priorityIds.map(id => {
      try {
        return new mongoose.Types.ObjectId(id);
      } catch (e) {
        console.error('[API COUNTS] Invalid ObjectId:', id);
        return null;
      }
    }).filter(id => id !== null);

    // Aggregate comment counts by priorityId
    const counts = await Comment.aggregate([
      {
        $match: {
          priorityId: { $in: objectIds }
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
    // Convert ObjectId back to string for the key
    const countsMap = counts.reduce((acc, item) => {
      const stringId = item._id.toString();
      acc[stringId] = item.count;
      return acc;
    }, {} as { [key: string]: number });

    return NextResponse.json(countsMap);
  } catch (error: any) {
    console.error('Error fetching comment counts:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
