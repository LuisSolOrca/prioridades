import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import connectDB from '@/lib/mongodb';
import EmailSequence from '@/models/EmailSequence';
import SequenceEnrollment from '@/models/SequenceEnrollment';
import { hasPermission } from '@/lib/permissions';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    if (!hasPermission(session, 'viewCRM')) {
      return NextResponse.json({ error: 'Sin permiso' }, { status: 403 });
    }

    await connectDB();

    const { searchParams } = new URL(request.url);
    const isActive = searchParams.get('isActive');
    const search = searchParams.get('search');

    const query: any = {};

    if (isActive !== null && isActive !== '') {
      query.isActive = isActive === 'true';
    }

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
      ];
    }

    const sequences = await EmailSequence.find(query)
      .populate('createdBy', 'name email')
      .sort({ createdAt: -1 })
      .lean();

    // Get enrollment counts for each sequence
    const sequencesWithStats = await Promise.all(
      sequences.map(async (seq) => {
        const [activeCount, completedCount, totalCount] = await Promise.all([
          SequenceEnrollment.countDocuments({ sequenceId: seq._id, status: 'active' }),
          SequenceEnrollment.countDocuments({ sequenceId: seq._id, status: 'completed' }),
          SequenceEnrollment.countDocuments({ sequenceId: seq._id }),
        ]);

        return {
          ...seq,
          activeEnrolled: activeCount,
          completedCount: completedCount,
          totalEnrolled: totalCount,
        };
      })
    );

    return NextResponse.json(sequencesWithStats);
  } catch (error: any) {
    console.error('Error fetching sequences:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    if (!hasPermission(session, 'canManageDeals')) {
      return NextResponse.json({ error: 'Sin permiso' }, { status: 403 });
    }

    await connectDB();

    const body = await request.json();
    const userId = (session.user as any).id;

    // Ensure steps have correct order
    if (body.steps) {
      body.steps = body.steps.map((step: any, index: number) => ({
        ...step,
        order: index + 1,
      }));
    }

    const sequence = await EmailSequence.create({
      ...body,
      createdBy: userId,
    });

    const populated = await EmailSequence.findById(sequence._id)
      .populate('createdBy', 'name email');

    return NextResponse.json(populated, { status: 201 });
  } catch (error: any) {
    console.error('Error creating sequence:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
