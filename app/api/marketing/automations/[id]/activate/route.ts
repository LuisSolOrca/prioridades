import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import connectDB from '@/lib/mongodb';
import MarketingAutomation from '@/models/MarketingAutomation';
import mongoose from 'mongoose';

interface RouteParams {
  params: Promise<{ id: string }>;
}

// POST - Activate automation
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

    const automation = await MarketingAutomation.findById(id);

    if (!automation) {
      return NextResponse.json({ error: 'Automatización no encontrada' }, { status: 404 });
    }

    // Validate automation has required fields
    if (!automation.trigger || !automation.trigger.type) {
      return NextResponse.json(
        { error: 'La automatización necesita un trigger configurado' },
        { status: 400 }
      );
    }

    if (!automation.actions || automation.actions.length === 0) {
      return NextResponse.json(
        { error: 'La automatización necesita al menos una acción' },
        { status: 400 }
      );
    }

    automation.status = 'active';
    automation.lastModifiedBy = new mongoose.Types.ObjectId((session.user as any).id);
    await automation.save();

    return NextResponse.json({
      message: 'Automatización activada',
      automation,
    });
  } catch (error: any) {
    console.error('Error activating automation:', error);
    return NextResponse.json(
      { error: error.message || 'Error al activar automatización' },
      { status: 500 }
    );
  }
}
