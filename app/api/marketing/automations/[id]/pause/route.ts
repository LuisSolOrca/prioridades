import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import connectDB from '@/lib/mongodb';
import MarketingAutomation from '@/models/MarketingAutomation';
import mongoose from 'mongoose';

interface RouteParams {
  params: Promise<{ id: string }>;
}

// POST - Pause automation
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const { id } = await params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ error: 'ID inválido' }, { status: 400 });
    }

    await connectDB();

    const automation = await MarketingAutomation.findByIdAndUpdate(
      id,
      {
        status: 'paused',
        lastModifiedBy: (session.user as any).id,
      },
      { new: true }
    );

    if (!automation) {
      return NextResponse.json({ error: 'Automatización no encontrada' }, { status: 404 });
    }

    return NextResponse.json({
      message: 'Automatización pausada',
      automation,
    });
  } catch (error: any) {
    console.error('Error pausing automation:', error);
    return NextResponse.json(
      { error: error.message || 'Error al pausar automatización' },
      { status: 500 }
    );
  }
}
