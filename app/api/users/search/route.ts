import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import connectDB from '@/lib/mongodb';
import User from '@/models/User';

export const dynamic = 'force-dynamic';

/**
 * Normaliza un string removiendo acentos y caracteres especiales
 * "José María" -> "jose maria"
 */
function normalizeString(str: string): string {
  return str
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Quitar acentos
    .toLowerCase();
}

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
      // Normalizar el query para búsqueda sin acentos
      const normalizedQuery = normalizeString(query);

      // Primero obtener más usuarios de los necesarios para filtrar después
      const allActiveUsers = await User.find({ isActive: true })
        .select('_id name email')
        .lean();

      // Filtrar usuarios cuyo nombre o email normalizado coincida
      users = allActiveUsers
        .filter(user => {
          const normalizedName = normalizeString(user.name || '');
          const normalizedEmail = normalizeString(user.email || '');
          return normalizedName.includes(normalizedQuery) ||
                 normalizedEmail.includes(normalizedQuery);
        })
        .slice(0, limit);
    }

    return NextResponse.json({ users });
  } catch (error: any) {
    console.error('Error searching users:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
