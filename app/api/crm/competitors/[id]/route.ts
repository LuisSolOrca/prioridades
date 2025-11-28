import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import connectDB from '@/lib/mongodb';
import Competitor from '@/models/Competitor';
import DealCompetitor from '@/models/DealCompetitor';

export const dynamic = 'force-dynamic';

// GET /api/crm/competitors/[id] - Obtener competidor
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

    const competitor = await Competitor.findById(id)
      .populate('createdBy', 'name')
      .lean();

    if (!competitor) {
      return NextResponse.json({ error: 'Competidor no encontrado' }, { status: 404 });
    }

    // Obtener estadísticas
    const [totalDeals, wonAgainst, lostTo, activeDeals] = await Promise.all([
      DealCompetitor.countDocuments({ competitorId: id }),
      DealCompetitor.countDocuments({ competitorId: id, status: 'won_against' }),
      DealCompetitor.countDocuments({ competitorId: id, status: 'lost_to' }),
      DealCompetitor.find({ competitorId: id, status: 'active' })
        .populate({
          path: 'dealId',
          select: 'title value clientId',
          populate: { path: 'clientId', select: 'name' }
        })
        .lean(),
    ]);

    const decided = wonAgainst + lostTo;
    const winRate = decided > 0 ? Math.round((wonAgainst / decided) * 100) : null;

    return NextResponse.json({
      ...competitor,
      stats: {
        totalDeals,
        wonAgainst,
        lostTo,
        winRate,
        activeDeals: activeDeals.length,
      },
      activeDeals,
    });
  } catch (error: any) {
    console.error('Error fetching competitor:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// PUT /api/crm/competitors/[id] - Actualizar competidor
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

    // Verificar nombre duplicado si se está cambiando
    if (body.name) {
      const existing = await Competitor.findOne({
        name: body.name.trim(),
        isActive: true,
        _id: { $ne: id },
      });
      if (existing) {
        return NextResponse.json(
          { error: 'Ya existe un competidor con ese nombre' },
          { status: 400 }
        );
      }
    }

    const competitor = await Competitor.findByIdAndUpdate(
      id,
      { $set: body },
      { new: true, runValidators: true }
    ).populate('createdBy', 'name');

    if (!competitor) {
      return NextResponse.json({ error: 'Competidor no encontrado' }, { status: 404 });
    }

    return NextResponse.json(competitor);
  } catch (error: any) {
    console.error('Error updating competitor:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// DELETE /api/crm/competitors/[id] - Eliminar/desactivar competidor
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const user = session.user as any;
    if (user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Solo administradores pueden eliminar competidores' },
        { status: 403 }
      );
    }

    await connectDB();

    const { id } = await params;

    // Soft delete
    const competitor = await Competitor.findByIdAndUpdate(
      id,
      { isActive: false },
      { new: true }
    );

    if (!competitor) {
      return NextResponse.json({ error: 'Competidor no encontrado' }, { status: 404 });
    }

    return NextResponse.json({ success: true, message: 'Competidor eliminado' });
  } catch (error: any) {
    console.error('Error deleting competitor:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
