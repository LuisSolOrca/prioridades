import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import connectDB from '@/lib/mongodb';
import MarketingCreative from '@/models/MarketingCreative';

// GET - List all creatives
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    await connectDB();

    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type');
    const platform = searchParams.get('platform');
    const status = searchParams.get('status');
    const isTemplate = searchParams.get('isTemplate');
    const search = searchParams.get('search');
    const limit = parseInt(searchParams.get('limit') || '50');
    const page = parseInt(searchParams.get('page') || '1');

    const query: Record<string, any> = {};

    if (type) {
      query.type = type;
    }

    if (platform) {
      query.platforms = platform;
    }

    if (status) {
      query.status = status;
    } else {
      query.status = { $ne: 'ARCHIVED' };
    }

    if (isTemplate !== null) {
      query.isTemplate = isTemplate === 'true';
    }

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
        { tags: { $in: [new RegExp(search, 'i')] } },
      ];
    }

    const [creatives, total] = await Promise.all([
      MarketingCreative.find(query)
        .sort({ updatedAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .populate('createdBy', 'name email')
        .lean(),
      MarketingCreative.countDocuments(query),
    ]);

    return NextResponse.json({
      creatives,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error: any) {
    console.error('Error fetching creatives:', error);
    return NextResponse.json(
      { error: error.message || 'Error al obtener creativos' },
      { status: 500 }
    );
  }
}

// POST - Create new creative
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    await connectDB();

    const body = await request.json();
    const {
      name,
      description,
      type,
      platforms,
      aspectRatio,
      primaryAsset,
      carouselSlides,
      headline,
      callToAction,
      linkUrl,
      textOverlays,
      backgroundColor,
      brandColors,
      tags,
      isTemplate,
      templateCategory,
    } = body;

    if (!name) {
      return NextResponse.json(
        { error: 'El nombre es requerido' },
        { status: 400 }
      );
    }

    if (!type) {
      return NextResponse.json(
        { error: 'El tipo de creativo es requerido' },
        { status: 400 }
      );
    }

    const creative = await MarketingCreative.create({
      name,
      description,
      type,
      platforms: platforms || ['META', 'LINKEDIN', 'TWITTER', 'TIKTOK', 'YOUTUBE'],
      aspectRatio: aspectRatio || '1:1',
      primaryAsset,
      carouselSlides,
      headline,
      callToAction,
      linkUrl,
      textOverlays,
      backgroundColor,
      brandColors,
      tags,
      isTemplate: isTemplate || false,
      templateCategory,
      status: primaryAsset || (carouselSlides && carouselSlides.length > 0) ? 'READY' : 'DRAFT',
      createdBy: (session.user as any).id,
    });

    return NextResponse.json(creative, { status: 201 });
  } catch (error: any) {
    console.error('Error creating creative:', error);
    return NextResponse.json(
      { error: error.message || 'Error al crear creativo' },
      { status: 500 }
    );
  }
}
