import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import connectDB from '@/lib/mongodb';
import Webhook from '@/models/Webhook';
import Project from '@/models/Project';
import crypto from 'crypto';

/**
 * GET /api/projects/[id]/webhooks
 * Obtiene todos los webhooks del proyecto
 */
export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    await connectDB();

    // Verificar que el usuario tenga acceso al proyecto
    const project = await Project.findById(params.id);
    if (!project) {
      return NextResponse.json({ error: 'Proyecto no encontrado' }, { status: 404 });
    }

    const webhooks = await Webhook.find({ projectId: params.id })
      .populate('createdBy', 'name email')
      .populate('channelId', 'name')
      .sort({ createdAt: -1 })
      .lean();

    return NextResponse.json(webhooks);
  } catch (error) {
    console.error('Error getting webhooks:', error);
    return NextResponse.json(
      { error: 'Error obteniendo webhooks' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/projects/[id]/webhooks
 * Crea un nuevo webhook
 */
export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    await connectDB();

    // Verificar que el usuario tenga acceso al proyecto
    const project = await Project.findById(params.id);
    if (!project) {
      return NextResponse.json({ error: 'Proyecto no encontrado' }, { status: 404 });
    }

    const body = await request.json();
    const { name, description, type, url, events, channelId } = body;

    if (!name || !type) {
      return NextResponse.json(
        { error: 'Nombre y tipo son requeridos' },
        { status: 400 }
      );
    }

    if (!['INCOMING', 'OUTGOING'].includes(type)) {
      return NextResponse.json(
        { error: 'Tipo inválido' },
        { status: 400 }
      );
    }

    if (type === 'OUTGOING' && !url) {
      return NextResponse.json(
        { error: 'URL es requerida para webhooks salientes' },
        { status: 400 }
      );
    }

    // Generar secret token único
    const secret = crypto.randomBytes(32).toString('hex');

    const webhook = await Webhook.create({
      projectId: params.id,
      name,
      description,
      type,
      url: url || null,
      secret,
      events: events || [],
      channelId: channelId || null,
      createdBy: session.user.id,
      isActive: true,
    });

    const populatedWebhook = await Webhook.findById(webhook._id)
      .populate('createdBy', 'name email')
      .populate('channelId', 'name')
      .lean();

    return NextResponse.json(populatedWebhook, { status: 201 });
  } catch (error) {
    console.error('Error creating webhook:', error);
    return NextResponse.json(
      { error: 'Error creando webhook' },
      { status: 500 }
    );
  }
}
