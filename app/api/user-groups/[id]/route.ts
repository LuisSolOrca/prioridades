import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import connectDB from '@/lib/mongodb';
import UserGroup from '@/models/UserGroup';

/**
 * GET /api/user-groups/[id]
 * Obtiene un grupo específico
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

    const group = await UserGroup.findById(params.id)
      .populate('members', 'name email')
      .populate('createdBy', 'name email')
      .lean();

    if (!group) {
      return NextResponse.json(
        { error: 'Grupo no encontrado' },
        { status: 404 }
      );
    }

    return NextResponse.json(group);
  } catch (error) {
    console.error('Error fetching user group:', error);
    return NextResponse.json(
      { error: 'Error obteniendo grupo' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/user-groups/[id]
 * Actualiza un grupo de usuarios
 */
export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    // Solo admins pueden editar grupos
    if (session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Acceso denegado' }, { status: 403 });
    }

    await connectDB();

    const body = await request.json();
    const { name, description, tag, members, color, isActive } = body;

    const group = await UserGroup.findById(params.id);

    if (!group) {
      return NextResponse.json(
        { error: 'Grupo no encontrado' },
        { status: 404 }
      );
    }

    // Si se cambia el tag, verificar que no exista
    if (tag && tag !== group.tag) {
      const existingGroup = await UserGroup.findOne({
        tag: tag.toLowerCase(),
        _id: { $ne: params.id },
      });
      if (existingGroup) {
        return NextResponse.json(
          { error: 'Ya existe un grupo con ese tag' },
          { status: 400 }
        );
      }
      group.tag = tag.toLowerCase().trim();
    }

    // Actualizar campos
    if (name) group.name = name.trim();
    if (description !== undefined) group.description = description.trim();
    if (members !== undefined) group.members = members;
    if (color) group.color = color;
    if (isActive !== undefined) group.isActive = isActive;

    await group.save();

    const updatedGroup = await UserGroup.findById(group._id)
      .populate('members', 'name email')
      .populate('createdBy', 'name email')
      .lean();

    return NextResponse.json(updatedGroup);
  } catch (error: any) {
    console.error('Error updating user group:', error);
    return NextResponse.json(
      { error: error.message || 'Error actualizando grupo' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/user-groups/[id]
 * Elimina un grupo de usuarios (soft delete)
 */
export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    // Solo admins pueden eliminar grupos
    if (session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Acceso denegado' }, { status: 403 });
    }

    await connectDB();

    const group = await UserGroup.findById(params.id);

    if (!group) {
      return NextResponse.json(
        { error: 'Grupo no encontrado' },
        { status: 404 }
      );
    }

    // Soft delete
    group.isActive = false;
    await group.save();

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting user group:', error);
    return NextResponse.json(
      { error: 'Error eliminando grupo' },
      { status: 500 }
    );
  }
}
