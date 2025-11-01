import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    // Solo admins pueden ver esta info
    if ((session.user as any).role !== 'ADMIN') {
      return NextResponse.json({ error: 'Solo administradores' }, { status: 403 });
    }

    return NextResponse.json({
      emailConfigured: {
        EMAIL_USERNAME: !!process.env.EMAIL_USERNAME,
        EMAIL_PASSWORD: !!process.env.EMAIL_PASSWORD,
        EMAIL_USERNAME_value: process.env.EMAIL_USERNAME ? `${process.env.EMAIL_USERNAME.substring(0, 3)}***` : 'NOT SET',
        EMAIL_PASSWORD_length: process.env.EMAIL_PASSWORD?.length || 0,
        NEXTAUTH_URL: process.env.NEXTAUTH_URL,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
