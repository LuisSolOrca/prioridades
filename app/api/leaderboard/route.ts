import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import connectDB from '@/lib/mongodb';
import { getMonthlyLeaderboard } from '@/lib/gamification';

// GET /api/leaderboard - Obtener leaderboard mensual
export async function GET() {
  try {
    const session = await getServerSession();

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
