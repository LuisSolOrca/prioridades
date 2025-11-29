import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import crypto from 'crypto';
import connectDB from '@/lib/mongodb';
import CrmWebhook, { WEBHOOK_EVENTS } from '@/models/CrmWebhook';

// GET - Listar webhooks
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    await connectDB();

    const webhooks = await CrmWebhook.find()
      .populate('createdBy', 'name email')
      .populate('filters.pipelineId', 'name')
      .populate('filters.stageId', 'name')
      .populate('filters.ownerId', 'name')
      .sort({ createdAt: -1 });

    return NextResponse.json({
      webhooks,
      events: WEBHOOK_EVENTS,
    });
  } catch (error: any) {
    console.error('Error fetching webhooks:', error);
    return NextResponse.json(
      { error: 'Error al obtener webhooks' },
      { status: 500 }
    );
  }
}

// POST - Crear webhook
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const user = session.user as any;
    if (user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Solo administradores' }, { status: 403 });
    }

    await connectDB();

    const body = await req.json();
    const {
      name,
      description,
      url,
      events,
      filters,
      headers,
      isActive = true,
      maxRetries = 3,
      timeoutMs = 10000,
    } = body;

    // Validaciones
    if (!name?.trim()) {
      return NextResponse.json({ error: 'El nombre es requerido' }, { status: 400 });
    }

    if (!url?.trim()) {
      return NextResponse.json({ error: 'La URL es requerida' }, { status: 400 });
    }

    try {
      new URL(url);
    } catch {
      return NextResponse.json({ error: 'URL inválida' }, { status: 400 });
    }

    if (!events || events.length === 0) {
      return NextResponse.json(
        { error: 'Debe seleccionar al menos un evento' },
        { status: 400 }
      );
    }

    // Generar secret aleatorio
    const secret = crypto.randomBytes(32).toString('hex');

    const webhook = await CrmWebhook.create({
      name: name.trim(),
      description: description?.trim(),
      url: url.trim(),
      secret,
      events,
      filters: filters || undefined,
      headers: headers || undefined,
      isActive,
      maxRetries,
      timeoutMs,
      createdBy: user.id,
    });

    const populated = await CrmWebhook.findById(webhook._id)
      .populate('createdBy', 'name email');

    return NextResponse.json(populated, { status: 201 });
  } catch (error: any) {
    console.error('Error creating webhook:', error);
    return NextResponse.json(
      { error: error.message || 'Error al crear webhook' },
      { status: 500 }
    );
  }
}
