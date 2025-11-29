import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import crypto from 'crypto';
import connectDB from '@/lib/mongodb';
import CrmWebhook from '@/models/CrmWebhook';
import CrmWebhookLog from '@/models/CrmWebhookLog';
import { getWebhookStats } from '@/lib/crm/webhookEngine';

// GET - Obtener webhook con estadísticas
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession();
    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const { id } = await params;
    await connectDB();

    const webhook = await CrmWebhook.findById(id)
      .populate('createdBy', 'name email')
      .populate('filters.pipelineId', 'name')
      .populate('filters.stageId', 'name')
      .populate('filters.ownerId', 'name');

    if (!webhook) {
      return NextResponse.json({ error: 'Webhook no encontrado' }, { status: 404 });
    }

    // Obtener estadísticas
    const stats = await getWebhookStats(id);

    // Obtener últimos logs
    const recentLogs = await CrmWebhookLog.find({ webhookId: id })
      .sort({ createdAt: -1 })
      .limit(10)
      .select('event status responseStatus responseTime createdAt entityType entityName error');

    return NextResponse.json({
      webhook,
      stats,
      recentLogs,
    });
  } catch (error: any) {
    console.error('Error fetching webhook:', error);
    return NextResponse.json(
      { error: 'Error al obtener webhook' },
      { status: 500 }
    );
  }
}

// PUT - Actualizar webhook
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession();
    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const user = session.user as any;
    if (user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Solo administradores' }, { status: 403 });
    }

    const { id } = await params;
    await connectDB();

    const webhook = await CrmWebhook.findById(id);
    if (!webhook) {
      return NextResponse.json({ error: 'Webhook no encontrado' }, { status: 404 });
    }

    const body = await req.json();
    const {
      name,
      description,
      url,
      events,
      filters,
      headers,
      isActive,
      maxRetries,
      timeoutMs,
      regenerateSecret,
    } = body;

    // Validaciones
    if (name !== undefined && !name?.trim()) {
      return NextResponse.json({ error: 'El nombre es requerido' }, { status: 400 });
    }

    if (url !== undefined) {
      if (!url?.trim()) {
        return NextResponse.json({ error: 'La URL es requerida' }, { status: 400 });
      }
      try {
        new URL(url);
      } catch {
        return NextResponse.json({ error: 'URL inválida' }, { status: 400 });
      }
    }

    if (events !== undefined && events.length === 0) {
      return NextResponse.json(
        { error: 'Debe seleccionar al menos un evento' },
        { status: 400 }
      );
    }

    // Actualizar campos
    if (name !== undefined) webhook.name = name.trim();
    if (description !== undefined) webhook.description = description?.trim() || undefined;
    if (url !== undefined) webhook.url = url.trim();
    if (events !== undefined) webhook.events = events;
    if (filters !== undefined) webhook.filters = filters || undefined;
    if (headers !== undefined) webhook.headers = headers || undefined;
    if (isActive !== undefined) webhook.isActive = isActive;
    if (maxRetries !== undefined) webhook.maxRetries = maxRetries;
    if (timeoutMs !== undefined) webhook.timeoutMs = timeoutMs;

    // Regenerar secret si se solicita
    if (regenerateSecret) {
      webhook.secret = crypto.randomBytes(32).toString('hex');
    }

    // Resetear contador de fallos si se reactiva
    if (isActive === true) {
      webhook.consecutiveFailures = 0;
    }

    await webhook.save();

    const updated = await CrmWebhook.findById(id)
      .populate('createdBy', 'name email');

    return NextResponse.json(updated);
  } catch (error: any) {
    console.error('Error updating webhook:', error);
    return NextResponse.json(
      { error: error.message || 'Error al actualizar webhook' },
      { status: 500 }
    );
  }
}

// DELETE - Eliminar webhook
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession();
    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const user = session.user as any;
    if (user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Solo administradores' }, { status: 403 });
    }

    const { id } = await params;
    await connectDB();

    const webhook = await CrmWebhook.findByIdAndDelete(id);
    if (!webhook) {
      return NextResponse.json({ error: 'Webhook no encontrado' }, { status: 404 });
    }

    // Eliminar logs asociados
    await CrmWebhookLog.deleteMany({ webhookId: id });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error deleting webhook:', error);
    return NextResponse.json(
      { error: 'Error al eliminar webhook' },
      { status: 500 }
    );
  }
}
