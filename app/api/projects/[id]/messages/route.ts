import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import connectDB from '@/lib/mongodb';
import ChannelMessage from '@/models/ChannelMessage';
import User from '@/models/User';
import Project from '@/models/Project';
import Priority from '@/models/Priority';
import { notifyChannelMention, notifyChannelReply } from '@/lib/notifications';

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
    const search = searchParams.get('search') || '';

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

    // Si hay búsqueda, agregar condiciones
    if (search.trim()) {
      const searchRegex = new RegExp(search.trim(), 'i');

      // Buscar usuarios que coincidan
      const matchingUsers = await User.find({
        name: searchRegex,
        isActive: true
      }).select('_id').lean();

      const userIds = matchingUsers.map(u => u._id);

      // Buscar en contenido o por usuario
      query.$or = [
        { content: searchRegex },
        ...(userIds.length > 0 ? [{ userId: { $in: userIds } }] : [])
      ];
    }

    // Obtener mensajes
    const messages = await ChannelMessage.find(query)
      .sort({ createdAt: -1 })
      .skip(offset)
      .limit(limit)
      .populate('userId', 'name email')
      .populate('mentions', 'name email')
      .populate('priorityMentions', 'title status completionPercentage userId')
      .populate('reactions.userId', 'name')
      .populate('pinnedBy', 'name')
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

    // Detectar menciones de prioridades (#P-123 o #titulo-prioridad)
    const priorityMentionsIds: string[] = [];
    try {
      // Patrón 1: #P-{ObjectId} formato corto
      const idPattern = /#P-([a-f0-9]{24})/gi;
      const idMatches = content.match(idPattern);
      if (idMatches) {
        for (const match of idMatches) {
          const priorityId = match.substring(3); // Quitar "#P-"
          const priority = await Priority.findOne({
            _id: priorityId,
            projectId: params.id
          }).lean();
          if (priority && !priorityMentionsIds.includes(priorityId)) {
            priorityMentionsIds.push(priorityId);
          }
        }
      }

      // Patrón 2: #titulo-de-prioridad (buscar por título)
      const titlePattern = /#([\w\-áéíóúñÁÉÍÓÚÑ]+(?:\-[\w\-áéíóúñÁÉÍÓÚÑ]+)*)/gi;
      const titleMatches = content.match(titlePattern);
      if (titleMatches) {
        for (const match of titleMatches) {
          // Saltar si ya es formato #P-{id}
          if (match.match(/^#P-[a-f0-9]{24}$/i)) continue;

          const searchTitle = match.substring(1).replace(/-/g, ' ');
          const priority = await Priority.findOne({
            projectId: params.id,
            title: { $regex: new RegExp(searchTitle, 'i') }
          }).lean();
          if (priority && !priorityMentionsIds.includes(priority._id.toString())) {
            priorityMentionsIds.push(priority._id.toString());
          }
        }
      }
    } catch (err) {
      console.error('Error detecting priority mentions:', err);
    }

    // Crear mensaje
    const message = await ChannelMessage.create({
      projectId: params.id,
      userId: session.user.id,
      content: content.trim(),
      mentions,
      priorityMentions: priorityMentionsIds,
      parentMessageId: parentMessageId || null,
      reactions: [],
      replyCount: 0,
      isPinned: false,
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
      .populate('priorityMentions', 'title status completionPercentage userId')
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

            // Crear notificación y enviar correo si no es el mismo autor
            if (mentionedUser && mentionedUser._id.toString() !== author._id.toString()) {
              await notifyChannelMention(
                mentionedUser._id.toString(),
                author.name,
                params.id,
                project.name,
                content,
                message._id.toString()
              );
            }
          } catch (err) {
            console.error(`Error creating notification for mention @${username}:`, err);
          }
        }
      }

      // Si es un reply, notificar y enviar correo al autor del mensaje original
      if (parentMessageId && author && project) {
        const parentMessage = await ChannelMessage.findById(parentMessageId)
          .populate('userId', 'name email')
          .lean() as any;

        if (parentMessage && parentMessage.userId._id.toString() !== author._id.toString()) {
          await notifyChannelReply(
            parentMessage.userId._id.toString(),
            author.name,
            params.id,
            project.name,
            content,
            message._id.toString()
          );
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
