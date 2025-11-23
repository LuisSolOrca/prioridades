import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import connectDB from '@/lib/mongodb';
import Webhook from '@/models/Webhook';
import Project from '@/models/Project';

/**
 * GET /api/projects/[id]/webhooks/[webhookId]
 * Obtiene un webhook específico
 */
export async function GET(
  request: Request,
  { params }: { params: { id: string; webhookId: string } }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    await connectDB();

    const webhook = await Webhook.findOne({
      _id: params.webhookId,
      projectId: params.id,
    })
      .populate('createdBy', 'name email')
      .populate('channelId', 'name')
      .lean();

    if (!webhook) {
      return NextResponse.json({ error: 'Webhook no encontrado' }, { status: 404 });
    }

    return NextResponse.json(webhook);
  } catch (error) {
    console.error('Error getting webhook:', error);
    return NextResponse.json(
      { error: 'Error obteniendo webhook' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/projects/[id]/webhooks/[webhookId]
 * Actualiza un webhook
 */
export async function PUT(
  request: Request,
  { params }: { params: { id: string; webhookId: string } }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    await connectDB();

    const webhook = await Webhook.findOne({
      _id: params.webhookId,
      projectId: params.id,
    });

    if (!webhook) {
      return NextResponse.json({ error: 'Webhook no encontrado' }, { status: 404 });
    }

    const body = await request.json();
    const { name, description, url, events, channelId, isActive } = body;

    if (name !== undefined) webhook.name = name;
    if (description !== undefined) webhook.description = description;
    if (url !== undefined && webhook.type === 'OUTGOING') webhook.url = url;
    if (events !== undefined) webhook.events = events;
    if (channelId !== undefined) webhook.channelId = channelId || null;
    if (isActive !== undefined) webhook.isActive = isActive;

    await webhook.save();

    const updatedWebhook = await Webhook.findById(webhook._id)
      .populate('createdBy', 'name email')
      .populate('channelId', 'name')
      .lean();

    return NextResponse.json(updatedWebhook);
  } catch (error) {
    console.error('Error updating webhook:', error);
    return NextResponse.json(
      { error: 'Error actualizando webhook' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/projects/[id]/webhooks/[webhookId]
 * Elimina un webhook
 */
export async function DELETE(
  request: Request,
  { params }: { params: { id: string; webhookId: string } }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    await connectDB();

    const webhook = await Webhook.findOneAndDelete({
      _id: params.webhookId,
      projectId: params.id,
    });

    if (!webhook) {
      return NextResponse.json({ error: 'Webhook no encontrado' }, { status: 404 });
    }

    return NextResponse.json({ message: 'Webhook eliminado exitosamente' });
  } catch (error) {
    console.error('Error deleting webhook:', error);
    return NextResponse.json(
      { error: 'Error eliminando webhook' },
      { status: 500 }
    );
  }
}
