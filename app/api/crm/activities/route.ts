import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import connectDB from '@/lib/mongodb';
import Activity from '@/models/Activity';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    await connectDB();

    const { searchParams } = new URL(request.url);
    const clientId = searchParams.get('clientId');
    const contactId = searchParams.get('contactId');
    const dealId = searchParams.get('dealId');
    const type = searchParams.get('type');
    const assignedTo = searchParams.get('assignedTo');
    const pendingOnly = searchParams.get('pendingOnly') === 'true';
    const limit = parseInt(searchParams.get('limit') || '50');

    const query: any = {};

    if (clientId) query.clientId = clientId;
    if (contactId) query.contactId = contactId;
    if (dealId) query.dealId = dealId;
    if (type) query.type = type;
    if (assignedTo) query.assignedTo = assignedTo;
    if (pendingOnly) {
      query.isCompleted = false;
      query.type = 'task';
    }

    const activities = await Activity.find(query)
      .populate('clientId', 'name')
      .populate('contactId', 'firstName lastName')
      .populate('dealId', 'title value')
      .populate('createdBy', 'name')
      .populate('assignedTo', 'name')
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean();

    return NextResponse.json(activities);
  } catch (error: any) {
    console.error('Error fetching activities:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    await connectDB();

    const body = await request.json();
    const userId = (session.user as any).id;

    // Validar que al menos una relación está presente
    if (!body.clientId && !body.contactId && !body.dealId) {
      return NextResponse.json({
        error: 'La actividad debe estar asociada a un cliente, contacto o deal'
      }, { status: 400 });
    }

    const activity = await Activity.create({
      ...body,
      createdBy: userId,
      isCompleted: body.isCompleted ?? (body.type !== 'task'),
      completedAt: body.type !== 'task' ? new Date() : undefined,
    });

    const populatedActivity = await Activity.findById(activity._id)
      .populate('clientId', 'name')
      .populate('contactId', 'firstName lastName')
      .populate('dealId', 'title value')
      .populate('createdBy', 'name')
      .populate('assignedTo', 'name');

    return NextResponse.json(populatedActivity, { status: 201 });
  } catch (error: any) {
    console.error('Error creating activity:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
