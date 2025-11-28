import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import connectDB from '@/lib/mongodb';
import Competitor from '@/models/Competitor';
import DealCompetitor from '@/models/DealCompetitor';

export const dynamic = 'force-dynamic';

// GET /api/crm/competitors - Listar competidores
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const includeInactive = searchParams.get('includeInactive') === 'true';
    const includeStats = searchParams.get('includeStats') === 'true';
    const search = searchParams.get('search');

    await connectDB();

    const query: any = {};
    if (!includeInactive) {
      query.isActive = true;
    }
    if (search) {
      query.name = { $regex: search, $options: 'i' };
    }

    let competitors = await Competitor.find(query)
      .populate('createdBy', 'name')
      .sort({ name: 1 })
      .lean();

    // Agregar estadísticas si se solicitan
    if (includeStats) {
      competitors = await Promise.all(
        competitors.map(async (competitor: any) => {
          const [totalDeals, wonAgainst, lostTo] = await Promise.all([
            DealCompetitor.countDocuments({ competitorId: competitor._id }),
            DealCompetitor.countDocuments({ competitorId: competitor._id, status: 'won_against' }),
            DealCompetitor.countDocuments({ competitorId: competitor._id, status: 'lost_to' }),
          ]);

          const decided = wonAgainst + lostTo;
          const winRate = decided > 0 ? Math.round((wonAgainst / decided) * 100) : null;

          return {
            ...competitor,
            stats: {
              totalDeals,
              wonAgainst,
              lostTo,
              winRate,
            },
          };
        })
      );
    }

    return NextResponse.json(competitors);
  } catch (error: any) {
    console.error('Error fetching competitors:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST /api/crm/competitors - Crear competidor
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const user = session.user as any;

    await connectDB();

    const body = await request.json();
    const { name, website, description, strengths, weaknesses, pricing, marketPosition, logo } = body;

    if (!name?.trim()) {
      return NextResponse.json({ error: 'El nombre es requerido' }, { status: 400 });
    }

    // Verificar nombre duplicado
    const existing = await Competitor.findOne({ name: name.trim(), isActive: true });
    if (existing) {
      return NextResponse.json({ error: 'Ya existe un competidor con ese nombre' }, { status: 400 });
    }

    const competitor = new Competitor({
      name: name.trim(),
      website: website?.trim(),
      description: description?.trim(),
      strengths: strengths || [],
      weaknesses: weaknesses || [],
      pricing: pricing?.trim(),
      marketPosition: marketPosition || 'unknown',
      logo,
      createdBy: user.id,
    });

    await competitor.save();

    return NextResponse.json(competitor, { status: 201 });
  } catch (error: any) {
    console.error('Error creating competitor:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
