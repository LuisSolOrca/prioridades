import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import connectDB from '@/lib/mongodb';
import DealCompetitor from '@/models/DealCompetitor';
import Competitor from '@/models/Competitor';
import Deal from '@/models/Deal';

export const dynamic = 'force-dynamic';

// GET /api/crm/deals/[id]/competitors - Listar competidores del deal
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    await connectDB();

    const { id } = await params;

    // Verificar que el deal existe
    const deal = await Deal.findById(id);
    if (!deal) {
      return NextResponse.json({ error: 'Deal no encontrado' }, { status: 404 });
    }

    const competitors = await DealCompetitor.find({ dealId: id })
      .populate('competitorId', 'name logo website marketPosition')
      .populate('createdBy', 'name')
      .sort({ threatLevel: -1, createdAt: -1 });

    return NextResponse.json(competitors);
  } catch (error: any) {
    console.error('Error fetching deal competitors:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST /api/crm/deals/[id]/competitors - Agregar competidor al deal
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const user = session.user as any;

    await connectDB();

    const { id } = await params;
    const body = await request.json();
    const { competitorId, threatLevel, notes, contactedBy, theirPrice, theirStrengths, theirWeaknesses } = body;

    // Verificar que el deal existe
    const deal = await Deal.findById(id);
    if (!deal) {
      return NextResponse.json({ error: 'Deal no encontrado' }, { status: 404 });
    }

    // Verificar que el competidor existe
    const competitor = await Competitor.findById(competitorId);
    if (!competitor) {
      return NextResponse.json({ error: 'Competidor no encontrado' }, { status: 404 });
    }

    // Verificar si ya existe la relación
    const existing = await DealCompetitor.findOne({ dealId: id, competitorId });
    if (existing) {
      return NextResponse.json({ error: 'Este competidor ya está agregado al deal' }, { status: 400 });
    }

    const dealCompetitor = new DealCompetitor({
      dealId: id,
      competitorId,
      status: 'active',
      threatLevel: threatLevel || 'medium',
      notes,
      contactedBy,
      theirPrice,
      theirStrengths: theirStrengths || [],
      theirWeaknesses: theirWeaknesses || [],
      createdBy: user.id,
    });

    await dealCompetitor.save();

    // Poblar datos para la respuesta
    await dealCompetitor.populate('competitorId', 'name logo website marketPosition');
    await dealCompetitor.populate('createdBy', 'name');

    return NextResponse.json(dealCompetitor, { status: 201 });
  } catch (error: any) {
    console.error('Error adding deal competitor:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// PUT /api/crm/deals/[id]/competitors - Actualizar competidor del deal
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    await connectDB();

    const { id } = await params;
    const body = await request.json();
    const { competitorId, ...updateData } = body;

    if (!competitorId) {
      return NextResponse.json({ error: 'competitorId es requerido' }, { status: 400 });
    }

    const dealCompetitor = await DealCompetitor.findOneAndUpdate(
      { dealId: id, competitorId },
      { $set: updateData },
      { new: true, runValidators: true }
    )
      .populate('competitorId', 'name logo website marketPosition')
      .populate('createdBy', 'name');

    if (!dealCompetitor) {
      return NextResponse.json({ error: 'Competidor no encontrado en este deal' }, { status: 404 });
    }

    return NextResponse.json(dealCompetitor);
  } catch (error: any) {
    console.error('Error updating deal competitor:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// DELETE /api/crm/deals/[id]/competitors - Eliminar competidor del deal
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    await connectDB();

    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const competitorId = searchParams.get('competitorId');

    if (!competitorId) {
      return NextResponse.json({ error: 'competitorId es requerido' }, { status: 400 });
    }

    const result = await DealCompetitor.findOneAndDelete({ dealId: id, competitorId });

    if (!result) {
      return NextResponse.json({ error: 'Competidor no encontrado en este deal' }, { status: 404 });
    }

    return NextResponse.json({ success: true, message: 'Competidor eliminado del deal' });
  } catch (error: any) {
    console.error('Error removing deal competitor:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
