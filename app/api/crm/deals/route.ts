import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import connectDB from '@/lib/mongodb';
import Deal from '@/models/Deal';
import PipelineStage from '@/models/PipelineStage';
import { hasPermission } from '@/lib/permissions';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    // Verificar permiso para ver CRM
    if (!hasPermission(session, 'viewCRM')) {
      return NextResponse.json({ error: 'Sin permiso para ver CRM' }, { status: 403 });
    }

    await connectDB();

    const { searchParams } = new URL(request.url);
    const clientId = searchParams.get('clientId');
    const stageId = searchParams.get('stageId');
    const ownerId = searchParams.get('ownerId');
    const search = searchParams.get('search');
    const closedOnly = searchParams.get('closedOnly') === 'true';
    const openOnly = searchParams.get('openOnly') === 'true';

    const query: any = {};

    if (clientId) query.clientId = clientId;
    if (stageId) query.stageId = stageId;
    if (ownerId) query.ownerId = ownerId;

    if (search) {
      query.title = { $regex: search, $options: 'i' };
    }

    // Filtrar por etapas cerradas/abiertas
    if (closedOnly || openOnly) {
      const stages = await PipelineStage.find({ isClosed: closedOnly }).select('_id');
      query.stageId = { $in: stages.map(s => s._id) };
    }

    const deals = await Deal.find(query)
      .populate('clientId', 'name')
      .populate('contactId', 'firstName lastName email')
      .populate('stageId', 'name color probability isClosed isWon order')
      .populate('ownerId', 'name email')
      .populate('createdBy', 'name')
      .sort({ createdAt: -1 })
      .lean();

    return NextResponse.json(deals);
  } catch (error: any) {
    console.error('Error fetching deals:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    // Verificar permiso para gestionar deals
    if (!hasPermission(session, 'canManageDeals')) {
      return NextResponse.json({ error: 'Sin permiso para gestionar deals' }, { status: 403 });
    }

    await connectDB();

    const body = await request.json();
    const userId = (session.user as any).id;

    // Si no se especifica etapa, usar la por defecto
    if (!body.stageId) {
      const defaultStage = await PipelineStage.findOne({ isDefault: true, isActive: true });
      if (defaultStage) {
        body.stageId = defaultStage._id;
      } else {
        // Si no hay etapa por defecto, usar la primera
        const firstStage = await PipelineStage.findOne({ isActive: true }).sort({ order: 1 });
        if (firstStage) {
          body.stageId = firstStage._id;
        } else {
          return NextResponse.json({ error: 'No hay etapas de pipeline configuradas' }, { status: 400 });
        }
      }
    }

    // Obtener probabilidad de la etapa si no se especifica
    if (body.probability === undefined) {
      const stage = await PipelineStage.findById(body.stageId);
      if (stage) {
        body.probability = stage.probability;
      }
    }

    const deal = await Deal.create({
      ...body,
      ownerId: body.ownerId || userId,
      createdBy: userId,
    });

    const populatedDeal = await Deal.findById(deal._id)
      .populate('clientId', 'name')
      .populate('contactId', 'firstName lastName email')
      .populate('stageId', 'name color probability isClosed isWon order')
      .populate('ownerId', 'name email')
      .populate('createdBy', 'name');

    return NextResponse.json(populatedDeal, { status: 201 });
  } catch (error: any) {
    console.error('Error creating deal:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
