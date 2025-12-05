import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import connectDB from '@/lib/mongodb';
import MarketingAudience from '@/models/MarketingAudience';

// GET - List all audiences
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    await connectDB();

    const { searchParams } = new URL(request.url);
    const platform = searchParams.get('platform');
    const isTemplate = searchParams.get('isTemplate');
    const search = searchParams.get('search');
    const limit = parseInt(searchParams.get('limit') || '50');
    const page = parseInt(searchParams.get('page') || '1');

    const query: Record<string, any> = { isActive: true };

    if (platform) {
      query.platforms = platform;
    }

    if (isTemplate !== null) {
      query.isTemplate = isTemplate === 'true';
    }

    if (search) {
      query.$text = { $search: search };
    }

    const [audiences, total] = await Promise.all([
      MarketingAudience.find(query)
        .sort({ usageCount: -1, createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .populate('createdBy', 'name email')
        .lean(),
      MarketingAudience.countDocuments(query),
    ]);

    return NextResponse.json({
      audiences,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error: any) {
    console.error('Error fetching audiences:', error);
    return NextResponse.json(
      { error: error.message || 'Error al obtener audiencias' },
      { status: 500 }
    );
  }
}

// POST - Create new audience
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    await connectDB();

    const body = await request.json();
    const { name, description, platforms, rules, tags, isTemplate } = body;

    if (!name) {
      return NextResponse.json(
        { error: 'El nombre es requerido' },
        { status: 400 }
      );
    }

    if (!rules || !rules.groups || rules.groups.length === 0) {
      return NextResponse.json(
        { error: 'Debe definir al menos una regla de segmentación' },
        { status: 400 }
      );
    }

    const audience = await MarketingAudience.create({
      name,
      description,
      platforms: platforms || ['META', 'LINKEDIN', 'TWITTER', 'TIKTOK', 'YOUTUBE', 'WHATSAPP'],
      rules,
      tags,
      isTemplate: isTemplate || false,
      createdBy: (session.user as any).id,
    });

    return NextResponse.json(audience, { status: 201 });
  } catch (error: any) {
    console.error('Error creating audience:', error);
    return NextResponse.json(
      { error: error.message || 'Error al crear audiencia' },
      { status: 500 }
    );
  }
}
