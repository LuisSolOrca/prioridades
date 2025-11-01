import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import connectDB from '@/lib/mongodb';
import User from '@/models/User';

/**
 * API endpoint para buscar usuarios por nombre
 * Usado para autocompletar menciones en comentarios
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    await connectDB();

    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q') || '';

    if (query.length < 1) {
      return NextResponse.json([]);
    }

    // Buscar usuarios activos cuyo nombre coincida (case-insensitive)
    const users = await User.find({
      isActive: true,
      name: { $regex: new RegExp(query, 'i') }
    })
      .select('name email')
      .limit(10)
      .lean();

    return NextResponse.json(users);
  } catch (error: any) {
    console.error('Error searching users:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
