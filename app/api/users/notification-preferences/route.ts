import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import connectDB from '@/lib/mongodb';
import User from '@/models/User';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    await connectDB();

    const user = await User.findById((session.user as any).id).lean();

    if (!user) {
      return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 });
    }

    return NextResponse.json({
      emailNotifications: user.emailNotifications || {
        enabled: true,
        newComments: true,
        priorityAssigned: true,
        statusChanges: true,
      }
    });
  } catch (error: any) {
    console.error('Error fetching notification preferences:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    await connectDB();

    const body = await request.json();
    const { emailNotifications } = body;

    if (!emailNotifications) {
      return NextResponse.json({
        error: 'emailNotifications es requerido'
      }, { status: 400 });
    }

    const user = await User.findByIdAndUpdate(
      (session.user as any).id,
      { emailNotifications },
      { new: true }
    ).lean();

    if (!user) {
      return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 });
    }

    return NextResponse.json({
      message: 'Preferencias actualizadas exitosamente',
      emailNotifications: user.emailNotifications
    });
  } catch (error: any) {
    console.error('Error updating notification preferences:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
