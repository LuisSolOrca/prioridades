import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import connectDB from '@/lib/mongodb';
import Milestone from '@/models/Milestone';
import User from '@/models/User';
import { DIRECCION_GENERAL_USER_ID } from '@/lib/direccionGeneralFilter';

/**
 * GET - Obtiene los hitos del usuario más los de su líder de área
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();

    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId') || (session.user as any).id;
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    // Solo los admins pueden ver hitos de otros usuarios
    if (userId !== (session.user as any).id && (session.user as any).role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

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

    let query: any = { userId: { $in: userIds } };

    // Filtrar por rango de fechas si se proporciona
    if (startDate || endDate) {
      query.dueDate = {};
      if (startDate) {
        query.dueDate.$gte = new Date(startDate);
      }
      if (endDate) {
        query.dueDate.$lte = new Date(endDate);
      }
    }

    const milestones = await Milestone.find(query).sort({ dueDate: 1 });

    return NextResponse.json(milestones);
  } catch (error) {
    console.error('Error fetching milestones:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

/**
 * POST - Crea un nuevo hito
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();

    const body = await request.json();
    const { title, description, dueDate, deliverables } = body;

    // Validaciones
    if (!title || !dueDate) {
      return NextResponse.json(
        { error: 'Title and dueDate are required' },
        { status: 400 }
      );
    }

    const milestone = await Milestone.create({
      userId: (session.user as any).id,
      title,
      description,
      dueDate: new Date(dueDate),
      deliverables: deliverables || []
    });

    return NextResponse.json(milestone, { status: 201 });
  } catch (error) {
    console.error('Error creating milestone:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
