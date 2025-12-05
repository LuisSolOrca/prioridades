import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import connectDB from '@/lib/mongodb';
import LandingPage from '@/models/LandingPage';
import mongoose from 'mongoose';

// POST - Publish landing page
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    await connectDB();

    if (!mongoose.Types.ObjectId.isValid(params.id)) {
      return NextResponse.json({ error: 'ID invalido' }, { status: 400 });
    }

    const page = await LandingPage.findById(params.id);
    if (!page) {
      return NextResponse.json(
        { error: 'Landing page no encontrada' },
        { status: 404 }
      );
    }

    // Validate page has content
    if (!page.content?.sections || page.content.sections.length === 0) {
      return NextResponse.json(
        { error: 'La pagina debe tener al menos una seccion' },
        { status: 400 }
      );
    }

    // Validate required SEO fields
    if (!page.title) {
      return NextResponse.json(
        { error: 'El titulo es requerido para publicar' },
        { status: 400 }
      );
    }

    page.status = 'published';
    page.publishedAt = new Date();

    // Start A/B test if enabled
    if (page.abTest?.enabled && !page.abTest.startedAt) {
      page.abTest.startedAt = new Date();
    }

    await page.save();

    return NextResponse.json({
      message: 'Landing page publicada',
      page: {
        id: page._id,
        slug: page.slug,
        status: page.status,
        publishedAt: page.publishedAt,
        url: `/lp/${page.slug}`,
      },
    });
  } catch (error: any) {
    console.error('Error publishing landing page:', error);
    return NextResponse.json(
      { error: error.message || 'Error al publicar landing page' },
      { status: 500 }
    );
  }
}
