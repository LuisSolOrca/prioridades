import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import connectDB from '@/lib/mongodb';
import User from '@/models/User';

export const dynamic = 'force-dynamic';

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

    const user = await User.findById(params.id).select('-password');

    if (!user) {
      return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 });
    }

    // Solo admins o el mismo usuario pueden ver el perfil
    if ((session.user as any).role !== 'ADMIN' && (session.user as any).id !== params.id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    }

    return NextResponse.json(user);
  } catch (error: any) {
    console.error('Error fetching user:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    // Solo admins pueden editar usuarios (excepto su propio perfil)
    if ((session.user as any).role !== 'ADMIN' && (session.user as any).id !== params.id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    }

    await connectDB();

    const user = await User.findById(params.id);

    if (!user) {
      return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 });
    }

    const body = await request.json();

    // Si se está cambiando el email, verificar que no exista otro usuario con ese email
    if (body.email && body.email !== user.email) {
      const existingUser = await User.findOne({ email: body.email });
      if (existingUser) {
        return NextResponse.json({ error: 'El email ya está registrado' }, { status: 400 });
      }
    }

    // Si se está cambiando la contraseña, validar longitud
    if (body.password) {
      if (body.password.length < 6) {
        return NextResponse.json({ error: 'La contraseña debe tener al menos 6 caracteres' }, { status: 400 });
      }
    }

    // Actualizar campos
    if (body.name) user.name = body.name;
    if (body.email) user.email = body.email;

    // Solo admins pueden cambiar el rol, estado, área y líder de área
    if ((session.user as any).role === 'ADMIN') {
      if (body.role) user.role = body.role;
      if (body.isActive !== undefined) user.isActive = body.isActive;
      if (body.area !== undefined) user.area = body.area;
      if (body.isAreaLeader !== undefined) user.isAreaLeader = body.isAreaLeader;
    }

    // Si se está cambiando la contraseña
    if (body.password) {
      user.password = body.password;
    }

    // Usar .save() para que se ejecute el pre-save hook
    await user.save();

    // Devolver usuario sin password
    const userResponse = user.toObject();
    delete (userResponse as any).password;

    return NextResponse.json(userResponse);
  } catch (error: any) {
    console.error('Error updating user:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    // Solo admins pueden eliminar usuarios
    if ((session.user as any).role !== 'ADMIN') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    }

    await connectDB();

    const user = await User.findById(params.id);

    if (!user) {
      return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 });
    }

    // No permitir eliminar al último admin
    if (user.role === 'ADMIN') {
      const adminCount = await User.countDocuments({ role: 'ADMIN', isActive: true });
      if (adminCount <= 1) {
        return NextResponse.json({ error: 'No puedes eliminar al último administrador' }, { status: 400 });
      }
    }

    await User.findByIdAndDelete(params.id);

    return NextResponse.json({ message: 'Usuario eliminado exitosamente' });
  } catch (error: any) {
    console.error('Error deleting user:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
