import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import connectDB from '@/lib/mongodb';
import { getMonthlyLeaderboard } from '@/lib/gamification';

export const dynamic = 'force-dynamic';

// GET /api/leaderboard - Obtener leaderboard mensual
export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    await connectDB();
    const leaderboard = await getMonthlyLeaderboard();

    return NextResponse.json(leaderboard);
  } catch (error) {
    console.error('Error fetching leaderboard:', error);
    return NextResponse.json({ error: 'Error al obtener leaderboard' }, { status: 500 });
  }
}
