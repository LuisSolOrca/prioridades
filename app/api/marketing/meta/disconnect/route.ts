import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import connectDB from '@/lib/mongodb';
import MarketingPlatformConfig from '@/models/MarketingPlatformConfig';

export async function POST() {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    // Only admins can disconnect integrations
    if (session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Sin permisos' }, { status: 403 });
    }

    await connectDB();

    const config = await MarketingPlatformConfig.findOneAndUpdate(
      { platform: 'META' },
      {
        isActive: false,
        accessToken: '',
        refreshToken: '',
        platformData: {},
      },
      { new: true }
    );

    if (!config) {
      return NextResponse.json(
        { error: 'No hay integración de Meta configurada' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      message: 'Integración de Meta desconectada correctamente',
    });
  } catch (error) {
    console.error('Error disconnecting Meta:', error);
    return NextResponse.json(
      { error: 'Error al desconectar' },
      { status: 500 }
    );
  }
}
