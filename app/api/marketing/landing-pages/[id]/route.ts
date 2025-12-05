import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import connectDB from '@/lib/mongodb';
import LandingPage from '@/models/LandingPage';
import WebForm from '@/models/WebForm';
import mongoose from 'mongoose';

// GET - Get single landing page
export async function GET(
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

    const page = await LandingPage.findById(params.id)
      .populate('formId')
      .populate('createdBy', 'name email')
      .lean();

    if (!page) {
      return NextResponse.json(
        { error: 'Landing page no encontrada' },
        { status: 404 }
      );
    }

    return NextResponse.json(page);
  } catch (error: any) {
    console.error('Error fetching landing page:', error);
    return NextResponse.json(
      { error: error.message || 'Error al obtener landing page' },
      { status: 500 }
    );
  }
}

// PUT - Update landing page
export async function PUT(
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
    } = body;

    // Check slug uniqueness if changed
    if (slug && slug !== page.slug) {
      const existing = await LandingPage.findOne({ slug, _id: { $ne: params.id } });
      if (existing) {
        return NextResponse.json(
          { error: 'El slug ya esta en uso' },
          { status: 400 }
        );
      }
    }

    // Validate formId if changed
    if (formId && formId !== page.formId?.toString()) {
      const form = await WebForm.findById(formId);
      if (!form) {
        return NextResponse.json(
          { error: 'Formulario no encontrado' },
          { status: 400 }
        );
      }
    }

    // Update fields
    if (name !== undefined) page.name = name;
    if (slug !== undefined) page.slug = slug;
    if (title !== undefined) page.title = title;
    if (description !== undefined) page.description = description;
    if (keywords !== undefined) page.keywords = keywords;
    if (content !== undefined) page.content = content;
    if (formId !== undefined) page.formId = formId || undefined;
    if (customDomain !== undefined) page.customDomain = customDomain;
    if (favicon !== undefined) page.favicon = favicon;
    if (ogImage !== undefined) page.ogImage = ogImage;
    if (ogTitle !== undefined) page.ogTitle = ogTitle;
    if (ogDescription !== undefined) page.ogDescription = ogDescription;
    if (scripts !== undefined) page.scripts = scripts;
    if (abTest !== undefined) page.abTest = abTest;
    if (campaignId !== undefined) page.campaignId = campaignId;

    await page.save();

    return NextResponse.json(page);
  } catch (error: any) {
    console.error('Error updating landing page:', error);
    return NextResponse.json(
      { error: error.message || 'Error al actualizar landing page' },
      { status: 500 }
    );
  }
}

// DELETE - Delete landing page
export async function DELETE(
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

    // Soft delete
    page.isActive = false;
    page.status = 'archived';
    await page.save();

    return NextResponse.json({ message: 'Landing page eliminada' });
  } catch (error: any) {
    console.error('Error deleting landing page:', error);
    return NextResponse.json(
      { error: error.message || 'Error al eliminar landing page' },
      { status: 500 }
    );
  }
}
