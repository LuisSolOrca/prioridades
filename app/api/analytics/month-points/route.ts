import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import connectDB from '@/lib/mongodb';
import User from '@/models/User';
import { calculateCurrentMonthPoints } from '@/lib/gamification';

export const dynamic = 'force-dynamic';

// GET /api/analytics/month-points - Obtener puntos del mes para todos los usuarios
export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    await connectDB();

    const users = await User.find({ isActive: true }).select('_id name');

    // Filtrar Francisco Puente
    const filteredUsers = users.filter(u => !/Francisco Puente/i.test(u.name));

    const pointsData: { [userId: string]: number } = {};

    for (const user of filteredUsers) {
      const points = await calculateCurrentMonthPoints(user._id.toString());
      pointsData[user._id.toString()] = points;
    }

    return NextResponse.json(pointsData);
  } catch (error) {
    console.error('Error fetching month points:', error);
    return NextResponse.json({ error: 'Error al obtener puntos del mes' }, { status: 500 });
  }
}
