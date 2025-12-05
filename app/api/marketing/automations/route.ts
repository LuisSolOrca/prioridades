import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import connectDB from '@/lib/mongodb';
import MarketingAutomation from '@/models/MarketingAutomation';

// GET - List automations
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const triggerType = searchParams.get('triggerType');

    await connectDB();

    const query: Record<string, any> = { isActive: true };

    if (status && status !== 'all') {
      query.status = status;
    }

    if (triggerType) {
      query['trigger.type'] = triggerType;
    }

    const automations = await MarketingAutomation.find(query)
      .select('-executionLogs -enrolledContacts')
      .sort({ updatedAt: -1 })
      .populate('createdBy', 'name')
      .lean();

    return NextResponse.json({ automations });
  } catch (error: any) {
    console.error('Error fetching automations:', error);
    return NextResponse.json(
      { error: error.message || 'Error al obtener automatizaciones' },
      { status: 500 }
    );
  }
}

// POST - Create automation
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const body = await request.json();
    const userId = (session.user as any).id;

    await connectDB();

    // Generate IDs for actions if not provided
    if (body.actions) {
      body.actions = body.actions.map((action: any, index: number) => ({
        ...action,
        id: action.id || `action-${Date.now()}-${index}`,
      }));
    }

    const automation = new MarketingAutomation({
      ...body,
      createdBy: userId,
      status: body.status || 'draft',
    });

    await automation.save();

    return NextResponse.json(automation, { status: 201 });
  } catch (error: any) {
    console.error('Error creating automation:', error);
    return NextResponse.json(
      { error: error.message || 'Error al crear automatización' },
      { status: 500 }
    );
  }
}
