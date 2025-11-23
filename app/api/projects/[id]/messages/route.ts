import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import connectDB from '@/lib/mongodb';
import ChannelMessage from '@/models/ChannelMessage';
import User from '@/models/User';
import Project from '@/models/Project';
import Notification from '@/models/Notification';

/**
 * GET /api/projects/[id]/messages
 * Obtiene los mensajes del chat del proyecto
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

    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');
    const parentMessageId = searchParams.get('parentMessageId');

    // Construir query
    const query: any = {
      projectId: params.id,
      isDeleted: false
    };

    // Si se especifica parentMessageId, obtener respuestas del hilo
    if (parentMessageId) {
      query.parentMessageId = parentMessageId;
    } else {
      // Solo mensajes principales (no respuestas)
      query.parentMessageId = null;
    }

    // Obtener mensajes
    const messages = await ChannelMessage.find(query)
      .sort({ createdAt: -1 })
      .skip(offset)
      .limit(limit)
      .populate('userId', 'name email')
      .populate('mentions', 'name email')
      .populate('reactions.userId', 'name')
      .lean();

    // Contar total
    const total = await ChannelMessage.countDocuments(query);

    return NextResponse.json({
      messages,
      pagination: {
        total,
        offset,
        limit,
        hasMore: offset + limit < total
      }
    });
  } catch (error) {
    console.error('Error getting project messages:', error);
    return NextResponse.json(
      { error: 'Error obteniendo mensajes del proyecto' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/projects/[id]/messages
 * Envía un nuevo mensaje en el chat del proyecto
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

    const body = await request.json();
    const { content, mentions = [], parentMessageId } = body;

    if (!content || content.trim().length === 0) {
      return NextResponse.json(
        { error: 'El contenido del mensaje es requerido' },
        { status: 400 }
      );
    }

    // Crear mensaje
    const message = await ChannelMessage.create({
      projectId: params.id,
      userId: session.user.id,
      content: content.trim(),
      mentions,
      parentMessageId: parentMessageId || null,
      reactions: [],
      replyCount: 0,
      isEdited: false,
      isDeleted: false
    });

    // Si es una respuesta, incrementar contador en el mensaje padre
    if (parentMessageId) {
      await ChannelMessage.findByIdAndUpdate(parentMessageId, {
        $inc: { replyCount: 1 }
      });
    }

    // Poblar el mensaje creado
    const populatedMessage = await ChannelMessage.findById(message._id)
      .populate('userId', 'name email')
      .populate('mentions', 'name email')
      .lean();

    // Detectar menciones y crear notificaciones
    try {
      const mentionRegex = /@([\w\s]+?)(?=\s|$|[^\w\s])/g;
      const mentionsFound = content.match(mentionRegex);
      const project = await Project.findById(params.id).lean() as any;
      const author = await User.findById(session.user.id).lean() as any;

      if (mentionsFound && author && project) {
        const usernames = [...new Set<string>(mentionsFound.map((m: string) => m.substring(1).trim()))];

        for (const username of usernames) {
          try {
            const escapedUsername = username.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

            // Buscar usuario mencionado
            let mentionedUser = await User.findOne({
              name: { $regex: new RegExp(`^${escapedUsername}$`, 'i') },
              isActive: true
            }).lean() as any;

            if (!mentionedUser) {
              mentionedUser = await User.findOne({
                name: { $regex: new RegExp(escapedUsername, 'i') },
                isActive: true
              }).lean() as any;
            }

            // Crear notificación si no es el mismo autor
            if (mentionedUser && mentionedUser._id.toString() !== author._id.toString()) {
              await Notification.create({
                userId: mentionedUser._id,
                type: 'CHANNEL_MENTION',
                title: `Te mencionaron en #${project.name}`,
                message: `${author.name} te mencionó: "${content.substring(0, 100)}${content.length > 100 ? '...' : ''}"`,
                projectId: params.id,
                messageId: message._id,
                actionUrl: `/channels/${params.id}?message=${message._id}`,
                isRead: false
              });
            }
          } catch (err) {
            console.error(`Error creating notification for mention @${username}:`, err);
          }
        }
      }

      // Si es un reply, notificar al autor del mensaje original
      if (parentMessageId && author && project) {
        const parentMessage = await ChannelMessage.findById(parentMessageId)
          .populate('userId', 'name email')
          .lean() as any;

        if (parentMessage && parentMessage.userId._id.toString() !== author._id.toString()) {
          await Notification.create({
            userId: parentMessage.userId._id,
            type: 'CHANNEL_REPLY',
            title: `Nueva respuesta en #${project.name}`,
            message: `${author.name} respondió a tu mensaje: "${content.substring(0, 100)}${content.length > 100 ? '...' : ''}"`,
            projectId: params.id,
            messageId: message._id,
            actionUrl: `/channels/${params.id}?message=${message._id}`,
            isRead: false
          });
        }
      }
    } catch (notifError) {
      console.error('Error creating notifications:', notifError);
      // No fallar la creación del mensaje si las notificaciones fallan
    }

    return NextResponse.json(populatedMessage, { status: 201 });
  } catch (error) {
    console.error('Error creating project message:', error);
    return NextResponse.json(
      { error: 'Error creando mensaje' },
      { status: 500 }
    );
  }
}
