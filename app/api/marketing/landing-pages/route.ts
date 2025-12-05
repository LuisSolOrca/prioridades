import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import connectDB from '@/lib/mongodb';
import LandingPage from '@/models/LandingPage';
import WebForm from '@/models/WebForm';

// GET - List landing pages
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    await connectDB();

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const status = searchParams.get('status');
    const search = searchParams.get('search');

    const query: Record<string, any> = { isActive: true };

    if (status) {
      query.status = status;
    }

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { title: { $regex: search, $options: 'i' } },
        { slug: { $regex: search, $options: 'i' } },
      ];
    }

    const skip = (page - 1) * limit;

    const [pages, total] = await Promise.all([
      LandingPage.find(query)
        .select('-content.sections')
        .populate('formId', 'name')
        .populate('createdBy', 'name email')
        .sort({ updatedAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      LandingPage.countDocuments(query),
    ]);

    return NextResponse.json({
      pages,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error: any) {
    console.error('Error fetching landing pages:', error);
    return NextResponse.json(
      { error: error.message || 'Error al obtener landing pages' },
      { status: 500 }
    );
  }
}

// POST - Create landing page
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
      slug,
      title,
      description,
      keywords,
      content,
      formId,
      customDomain,
      favicon,
      ogImage,
      ogTitle,
      ogDescription,
      scripts,
      abTest,
      campaignId,
      templateId,
    } = body;

    if (!name || !title) {
      return NextResponse.json(
        { error: 'El nombre y titulo son requeridos' },
        { status: 400 }
      );
    }

    // Generate slug if not provided
    const finalSlug = slug || name
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .trim();

    // Check slug uniqueness
    const existing = await LandingPage.findOne({ slug: finalSlug });
    if (existing) {
      return NextResponse.json(
        { error: 'El slug ya esta en uso' },
        { status: 400 }
      );
    }

    // Validate formId if provided
    if (formId) {
      const form = await WebForm.findById(formId);
      if (!form) {
        return NextResponse.json(
          { error: 'Formulario no encontrado' },
          { status: 400 }
        );
      }
    }

    const landingPage = new LandingPage({
      name,
      slug: finalSlug,
      title,
      description,
      keywords,
      content: content || {
        sections: [],
        globalStyles: {
          primaryColor: '#3B82F6',
          secondaryColor: '#10B981',
          backgroundColor: '#ffffff',
          textColor: '#1F2937',
          fontFamily: 'Inter, system-ui, sans-serif',
          containerWidth: 1200,
          borderRadius: 8,
        },
      },
      formId,
      customDomain,
      favicon,
      ogImage,
      ogTitle,
      ogDescription,
      scripts,
      abTest,
      campaignId,
      templateId,
      createdBy: session.user.id,
    });

    await landingPage.save();

    return NextResponse.json(landingPage, { status: 201 });
  } catch (error: any) {
    console.error('Error creating landing page:', error);
    return NextResponse.json(
      { error: error.message || 'Error al crear landing page' },
      { status: 500 }
    );
  }
}
