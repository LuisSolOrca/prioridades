import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import connectDB from '@/lib/mongodb';
import UserGroup from '@/models/UserGroup';

/**
 * GET /api/user-groups
 * Obtiene todos los grupos de usuarios
 */
export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    await connectDB();

    const groups = await UserGroup.find({ isActive: true })
      .populate('members', 'name email')
      .populate('createdBy', 'name email')
      .sort({ name: 1 })
      .lean();

    return NextResponse.json(groups);
  } catch (error) {
    console.error('Error fetching user groups:', error);
    return NextResponse.json(
      { error: 'Error obteniendo grupos' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/user-groups
 * Crea un nuevo grupo de usuarios
 */
export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    // Solo admins pueden crear grupos
    if (session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Acceso denegado' }, { status: 403 });
    }

    await connectDB();

    const body = await request.json();
    const { name, description, tag, members, color } = body;

    if (!name || !tag) {
      return NextResponse.json(
        { error: 'Nombre y tag son requeridos' },
        { status: 400 }
      );
    }

    // Validar que el tag no exista
    const existingGroup = await UserGroup.findOne({ tag: tag.toLowerCase() });
    if (existingGroup) {
      return NextResponse.json(
        { error: 'Ya existe un grupo con ese tag' },
        { status: 400 }
      );
    }

    // Crear grupo
    const group = await UserGroup.create({
      name: name.trim(),
      description: description?.trim() || '',
      tag: tag.toLowerCase().trim(),
      members: members || [],
      color: color || '#3b82f6',
      isActive: true,
      createdBy: session.user.id,
    });

    const populatedGroup = await UserGroup.findById(group._id)
      .populate('members', 'name email')
      .populate('createdBy', 'name email')
      .lean();

    return NextResponse.json(populatedGroup, { status: 201 });
  } catch (error: any) {
    console.error('Error creating user group:', error);
    return NextResponse.json(
      { error: error.message || 'Error creando grupo' },
      { status: 500 }
    );
  }
}
