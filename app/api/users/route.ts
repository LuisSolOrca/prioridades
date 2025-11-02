import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import connectDB from '@/lib/mongodb';
import User from '@/models/User';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    await connectDB();

    const { searchParams } = new URL(request.url);
    const activeOnly = searchParams.get('activeOnly') === 'true';

    let query: any = {};

    if (activeOnly) {
      query.isActive = true;
    }

    const users = await User.find(query)
      .select('-password')
      .sort({ name: 1 })
      .lean();

    return NextResponse.json(users);
  } catch (error: any) {
    console.error('Error fetching users:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    // Solo admins pueden crear usuarios
    if ((session.user as any).role !== 'ADMIN') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    }

    await connectDB();

    const body = await request.json();

    // Verificar que no exista un usuario con ese email
    const existingUser = await User.findOne({ email: body.email });

    if (existingUser) {
      return NextResponse.json({ error: 'El email ya está registrado' }, { status: 400 });
    }

    // Validar que venga password
    if (!body.password) {
      return NextResponse.json({ error: 'La contraseña es requerida' }, { status: 400 });
    }

    if (body.password.length < 6) {
      return NextResponse.json({ error: 'La contraseña debe tener al menos 6 caracteres' }, { status: 400 });
    }

    const user = await User.create({
      name: body.name,
      email: body.email,
      password: body.password,
      role: body.role || 'USER',
      isActive: body.isActive !== undefined ? body.isActive : true,
      area: body.area || undefined,
      isAreaLeader: body.isAreaLeader || false,
    });

    // Devolver usuario sin password
    const { password, ...userResponse } = user.toObject();

    return NextResponse.json(userResponse, { status: 201 });
  } catch (error: any) {
    console.error('Error creating user:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
