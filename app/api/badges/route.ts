import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import connectDB from '@/lib/mongodb';
import { getUserBadges } from '@/lib/gamification';

export const dynamic = 'force-dynamic';

// GET /api/badges - Obtener badges del usuario actual
export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    await connectDB();
    const badges = await getUserBadges(session.user.id);

    return NextResponse.json(badges);
  } catch (error) {
    console.error('Error fetching badges:', error);
    return NextResponse.json({ error: 'Error al obtener badges' }, { status: 500 });
  }
}
