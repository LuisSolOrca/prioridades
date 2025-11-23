import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import connectDB from '@/lib/mongodb';
import ChannelLink from '@/models/ChannelLink';

/**
 * GET /api/projects/[id]/links
 * Obtiene los enlaces compartidos del proyecto
 */
export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    await connectDB();

    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category');
    const search = searchParams.get('search') || '';

    // Construir query
    const query: any = {
      projectId: params.id,
      isActive: true
    };

    if (category) {
      query.category = category;
    }

    // Si hay búsqueda, agregar condiciones
    if (search.trim()) {
      const searchRegex = new RegExp(search.trim(), 'i');
      query.$or = [
        { title: searchRegex },
        { description: searchRegex },
        { url: searchRegex },
        { category: searchRegex }
      ];
    }

    // Obtener enlaces
    const links = await ChannelLink.find(query)
      .sort({ createdAt: -1 })
      .populate('addedBy', 'name email')
      .lean();

    return NextResponse.json({ links });
  } catch (error) {
    console.error('Error getting project links:', error);
    return NextResponse.json(
      { error: 'Error obteniendo enlaces del proyecto' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/projects/[id]/links
 * Agrega un nuevo enlace al proyecto
 */
export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    await connectDB();

    const body = await request.json();
    const { url, title, description, category = 'other' } = body;

    if (!url || !title) {
      return NextResponse.json(
        { error: 'URL y título son requeridos' },
        { status: 400 }
      );
    }

    // Validar URL
    try {
      new URL(url);
    } catch {
      return NextResponse.json(
        { error: 'URL inválida' },
        { status: 400 }
      );
    }

    // Crear enlace
    const link = await ChannelLink.create({
      projectId: params.id,
      url: url.trim(),
      title: title.trim(),
      description: description?.trim() || '',
      category,
      addedBy: session.user.id,
      isActive: true
    });

    // Poblar el enlace creado
    const populatedLink = await ChannelLink.findById(link._id)
      .populate('addedBy', 'name email')
      .lean();

    return NextResponse.json(populatedLink, { status: 201 });
  } catch (error) {
    console.error('Error creating project link:', error);
    return NextResponse.json(
      { error: 'Error creando enlace' },
      { status: 500 }
    );
  }
}
