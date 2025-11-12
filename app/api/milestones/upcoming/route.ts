import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import connectDB from '@/lib/mongodb';
import Milestone from '@/models/Milestone';
import User from '@/models/User';
import { DIRECCION_GENERAL_USER_ID } from '@/lib/direccionGeneralFilter';

/**
 * GET - Obtiene los hitos que están próximos a vencer (7 días o menos)
 * Incluye hitos propios y del líder de área (excepto Dirección General)
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();

    const userId = (session.user as any).id;

    // Obtener el usuario actual para conocer su área
    const currentUser = await User.findById(userId);
    if (!currentUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Construir lista de IDs de usuarios cuyos hitos se deben mostrar
    const userIds = [userId]; // Siempre incluir los propios hitos

    // Si el usuario tiene área, buscar el líder de esa área
    if (currentUser.area) {
      const areaLeader = await User.findOne({
        area: currentUser.area,
        isAreaLeader: true,
        _id: { $ne: userId } // No incluir al mismo usuario si es líder
      });

      // Si hay líder y NO es Francisco Puente (Dirección General), incluir sus hitos
      if (areaLeader && areaLeader._id.toString() !== DIRECCION_GENERAL_USER_ID) {
        userIds.push(areaLeader._id.toString());
      }
    }

    const now = new Date();
    const sevenDaysFromNow = new Date(now);
    sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7);

    // Buscar hitos que vencen en los próximos 7 días y no están completados
    const upcomingMilestones = await Milestone.find({
      userId: { $in: userIds },
      isCompleted: false,
      dueDate: {
        $gte: now,
        $lte: sevenDaysFromNow
      }
    }).sort({ dueDate: 1 });

    // Calcular días restantes para cada hito
    const milestonesWithDaysLeft = upcomingMilestones.map(milestone => {
      const daysLeft = Math.ceil(
        (new Date(milestone.dueDate).getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
      );

      return {
        ...milestone.toObject(),
        daysLeft
      };
    });

    return NextResponse.json(milestonesWithDaysLeft);
  } catch (error) {
    console.error('Error fetching upcoming milestones:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
