import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import connectDB from '@/lib/mongodb';
import EmailCampaign from '@/models/EmailCampaign';

// GET - List email campaigns with filters
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    await connectDB();

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const status = searchParams.get('status');
    const category = searchParams.get('category');
    const search = searchParams.get('search');
    const tags = searchParams.get('tags');
    const sortBy = searchParams.get('sortBy') || 'createdAt';
    const sortOrder = searchParams.get('sortOrder') || 'desc';

    const query: Record<string, any> = {};

    if (status) {
      query.status = status;
    }

    if (category) {
      query.category = category;
    }

    if (tags) {
      query.tags = { $in: tags.split(',') };
    }

    if (search) {
      query.$text = { $search: search };
    }

    const skip = (page - 1) * limit;
    const sort: Record<string, 1 | -1> = { [sortBy]: sortOrder === 'asc' ? 1 : -1 };

    const [campaigns, total] = await Promise.all([
      EmailCampaign.find(query)
        .sort(sort)
        .skip(skip)
        .limit(limit)
        .populate('createdBy', 'name email')
        .lean(),
      EmailCampaign.countDocuments(query),
    ]);

    return NextResponse.json({
      campaigns,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error: any) {
    console.error('Error listing email campaigns:', error);
    return NextResponse.json(
      { error: error.message || 'Error al listar campañas' },
      { status: 500 }
    );
  }
}

// POST - Create new email campaign
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
      subject,
      preheader,
      fromName,
      fromEmail,
      replyTo,
      content,
      audienceType,
      audienceId,
      audienceFilter,
      excludeAudienceIds,
      abTest,
      tags,
      category,
    } = body;

    if (!name || !subject || !fromName || !fromEmail) {
      return NextResponse.json(
        { error: 'Nombre, asunto, nombre de remitente y email son requeridos' },
        { status: 400 }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(fromEmail)) {
      return NextResponse.json(
        { error: 'El email del remitente no es válido' },
        { status: 400 }
      );
    }

    if (replyTo && !emailRegex.test(replyTo)) {
      return NextResponse.json(
        { error: 'El email de respuesta no es válido' },
        { status: 400 }
      );
    }

    const campaign = await EmailCampaign.create({
      name,
      subject,
      preheader,
      fromName,
      fromEmail,
      replyTo: replyTo || fromEmail,
      content: content || {
        html: '',
        json: {
          blocks: [],
          globalStyles: {
            backgroundColor: '#f5f5f5',
            contentWidth: 600,
            fontFamily: 'Arial, sans-serif',
          },
        },
      },
      audienceType: audienceType || 'segment',
      audienceId,
      audienceFilter,
      excludeAudienceIds,
      abTest,
      tags,
      category,
      status: 'draft',
      createdBy: (session.user as any).id,
    });

    return NextResponse.json(campaign, { status: 201 });
  } catch (error: any) {
    console.error('Error creating email campaign:', error);
    return NextResponse.json(
      { error: error.message || 'Error al crear campaña' },
      { status: 500 }
    );
  }
}
