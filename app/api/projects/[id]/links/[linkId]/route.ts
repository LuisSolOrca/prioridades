import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import connectDB from '@/lib/mongodb';
import ChannelLink from '@/models/ChannelLink';

/**
 * PUT /api/projects/[id]/links/[linkId]
 * Actualiza un enlace del canal
 */
export async function PUT(
  request: Request,
  { params }: { params: { id: string; linkId: string } }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    await connectDB();

    const body = await request.json();
    const { url, title, description, category } = body;

    // Buscar el enlace
    const link = await ChannelLink.findById(params.linkId);

    if (!link) {
      return NextResponse.json(
        { error: 'Enlace no encontrado' },
        { status: 404 }
      );
    }

    // Verificar que el usuario sea el autor o admin
    if (link.addedBy.toString() !== session.user.id && session.user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'No tienes permiso para editar este enlace' },
        { status: 403 }
      );
    }

    // Validar URL si se proporciona
    if (url) {
      try {
        new URL(url);
        link.url = url.trim();
      } catch {
        return NextResponse.json(
          { error: 'URL inválida' },
          { status: 400 }
        );
      }
    }

    // Actualizar campos
    if (title) link.title = title.trim();
    if (description !== undefined) link.description = description.trim();
    if (category) link.category = category;

    await link.save();

    // Poblar y devolver
    const populatedLink = await ChannelLink.findById(link._id)
      .populate('addedBy', 'name email')
      .lean();

    return NextResponse.json(populatedLink);
  } catch (error) {
    console.error('Error updating link:', error);
    return NextResponse.json(
      { error: 'Error actualizando enlace' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/projects/[id]/links/[linkId]
 * Elimina (marca como inactivo) un enlace del canal
 */
export async function DELETE(
  request: Request,
  { params }: { params: { id: string; linkId: string } }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    await connectDB();

    // Buscar el enlace
    const link = await ChannelLink.findById(params.linkId);

    if (!link) {
      return NextResponse.json(
        { error: 'Enlace no encontrado' },
        { status: 404 }
      );
    }

    // Verificar que el usuario sea el autor o admin
    if (link.addedBy.toString() !== session.user.id && session.user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'No tienes permiso para eliminar este enlace' },
        { status: 403 }
      );
    }

    // Marcar como inactivo
    link.isActive = false;
    await link.save();

    return NextResponse.json({ message: 'Enlace eliminado correctamente' });
  } catch (error) {
    console.error('Error deleting link:', error);
    return NextResponse.json(
      { error: 'Error eliminando enlace' },
      { status: 500 }
    );
  }
}
