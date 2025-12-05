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

    await connectDB();

    await MarketingPlatformConfig.findOneAndUpdate(
      { platform: 'GOOGLE_ADS' },
      {
        isActive: false,
        accessToken: '',
        refreshToken: '',
        platformData: {},
      }
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error disconnecting Google Ads:', error);
    return NextResponse.json(
      { error: 'Error al desconectar' },
      { status: 500 }
    );
  }
}
