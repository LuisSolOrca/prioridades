import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import connectDB from '@/lib/mongodb';
import CrmWebhook from '@/models/CrmWebhook';
import CrmWebhookLog from '@/models/CrmWebhookLog';

// GET - Obtener logs de un webhook
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
    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 100);
    const status = searchParams.get('status');
    const event = searchParams.get('event');

    await connectDB();

    // Verificar que el webhook existe
    const webhook = await CrmWebhook.findById(id);
    if (!webhook) {
      return NextResponse.json({ error: 'Webhook no encontrado' }, { status: 404 });
    }

    // Construir filtro
    const filter: Record<string, any> = { webhookId: id };
    if (status) filter.status = status;
    if (event) filter.event = event;

    // Obtener logs paginados
    const [logs, total] = await Promise.all([
      CrmWebhookLog.find(filter)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .populate('triggeredBy', 'name'),
      CrmWebhookLog.countDocuments(filter),
    ]);

    return NextResponse.json({
      logs,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error: any) {
    console.error('Error fetching webhook logs:', error);
    return NextResponse.json(
      { error: 'Error al obtener logs' },
      { status: 500 }
    );
  }
}

// DELETE - Limpiar logs antiguos
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
    const { searchParams } = new URL(req.url);
    const olderThanDays = parseInt(searchParams.get('olderThanDays') || '7');

    await connectDB();

    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);

    const result = await CrmWebhookLog.deleteMany({
      webhookId: id,
      createdAt: { $lt: cutoffDate },
      status: { $in: ['success', 'failed'] }, // No eliminar pending/retrying
    });

    return NextResponse.json({
      success: true,
      deleted: result.deletedCount,
    });
  } catch (error: any) {
    console.error('Error deleting webhook logs:', error);
    return NextResponse.json(
      { error: 'Error al eliminar logs' },
      { status: 500 }
    );
  }
}
