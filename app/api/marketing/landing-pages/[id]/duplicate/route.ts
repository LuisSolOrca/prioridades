import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import connectDB from '@/lib/mongodb';
import LandingPage from '@/models/LandingPage';
import mongoose from 'mongoose';

// POST - Duplicate landing page
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

    const original = await LandingPage.findById(params.id).lean();
    if (!original) {
      return NextResponse.json(
        { error: 'Landing page no encontrada' },
        { status: 404 }
      );
    }

    // Generate unique slug
    let newSlug = `${original.slug}-copia`;
    let counter = 1;
    while (await LandingPage.findOne({ slug: newSlug })) {
      newSlug = `${original.slug}-copia-${counter}`;
      counter++;
    }

    // Create duplicate
    const duplicate = new LandingPage({
      name: `${original.name} (Copia)`,
      slug: newSlug,
      title: original.title,
      description: original.description,
      keywords: original.keywords,
      content: original.content,
      formId: original.formId,
      customDomain: undefined,
      favicon: original.favicon,
      ogImage: original.ogImage,
      ogTitle: original.ogTitle,
      ogDescription: original.ogDescription,
      scripts: original.scripts,
      abTest: undefined,
      analytics: {
        views: 0,
        uniqueVisitors: 0,
        formSubmissions: 0,
        conversionRate: 0,
        avgTimeOnPage: 0,
        bounceRate: 0,
        topSources: [],
        deviceBreakdown: { desktop: 0, mobile: 0, tablet: 0 },
      },
      campaignId: original.campaignId,
      templateId: original.templateId,
      createdBy: session.user.id,
      status: 'draft',
    });

    await duplicate.save();

    return NextResponse.json(duplicate, { status: 201 });
  } catch (error: any) {
    console.error('Error duplicating landing page:', error);
    return NextResponse.json(
      { error: error.message || 'Error al duplicar landing page' },
      { status: 500 }
    );
  }
}
