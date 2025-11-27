import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import connectDB from '@/lib/mongodb';
import User from '@/models/User';

export const dynamic = 'force-dynamic';

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
    const limit = parseInt(searchParams.get('limit') || '10');

    let users;

    if (query.length < 1) {
      // Si no hay query, devolver los primeros usuarios ordenados por nombre
      users = await User.find({ isActive: true })
        .select('_id name email')
        .sort({ name: 1 })
        .limit(limit)
        .lean();
    } else {
      // Buscar usuarios activos cuyo nombre o email coincida (case-insensitive)
      users = await User.find({
        isActive: true,
        $or: [
          { name: { $regex: new RegExp(query, 'i') } },
          { email: { $regex: new RegExp(query, 'i') } }
        ]
      })
        .select('_id name email')
        .limit(limit)
        .lean();
    }

    return NextResponse.json({ users });
  } catch (error: any) {
    console.error('Error searching users:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
