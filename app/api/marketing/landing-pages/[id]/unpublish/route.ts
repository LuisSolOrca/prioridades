import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import connectDB from '@/lib/mongodb';
import LandingPage from '@/models/LandingPage';
import mongoose from 'mongoose';

// POST - Unpublish landing page
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

    if (page.status !== 'published') {
      return NextResponse.json(
        { error: 'La pagina no esta publicada' },
        { status: 400 }
      );
    }

    page.status = 'draft';

    // End A/B test if running
    if (page.abTest?.enabled && page.abTest.startedAt && !page.abTest.endedAt) {
      page.abTest.endedAt = new Date();
    }

    await page.save();

    return NextResponse.json({
      message: 'Landing page despublicada',
      page: {
        id: page._id,
        slug: page.slug,
        status: page.status,
      },
    });
  } catch (error: any) {
    console.error('Error unpublishing landing page:', error);
    return NextResponse.json(
      { error: error.message || 'Error al despublicar landing page' },
      { status: 500 }
    );
  }
}
