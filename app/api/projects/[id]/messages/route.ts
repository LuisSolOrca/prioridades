import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import connectDB from '@/lib/mongodb';
import ChannelMessage from '@/models/ChannelMessage';
import User from '@/models/User';
import Project from '@/models/Project';
import Priority from '@/models/Priority';
import UserGroup from '@/models/UserGroup';
import Attachment from '@/models/Attachment'; // Necesario para populate
import { notifyChannelMention, notifyChannelReply, notifyGroupMention } from '@/lib/notifications';
import { triggerPusherEvent } from '@/lib/pusher-server';
import { trackChannelUsage } from '@/lib/gamification';
import { triggerOutgoingWebhooks } from '@/lib/webhooks';
import { notifyMention, sendPushToUsers } from '@/lib/pushNotifications';

/**
 * Extrae hashtags del contenido del mensaje
 * Ignora menciones de prioridades (#P-xxx) y menciones de usuarios (@xxx)
 * @param content - Contenido del mensaje
 * @param priorityMentionsIds - IDs de prioridades ya detectadas (para excluir)
 * @returns Array de tags en lowercase sin el #
 */
function extractHashtags(content: string, priorityMentionsIds: string[] = []): string[] {
  // Patrón para hashtags: # seguido de letras/números/guiones/acentos
  // Excluye #P-{objectId} que son menciones de prioridades
  const hashtagPattern = /#([\wáéíóúñÁÉÍÓÚÑ][\w\-áéíóúñÁÉÍÓÚÑ]*)/gi;
  const matches = content.match(hashtagPattern);

  if (!matches) return [];

  const tags = new Set<string>();

  for (const match of matches) {
    const tag = match.substring(1).toLowerCase(); // Quitar # y lowercase

    // Ignorar si es formato de mención de prioridad #P-{id}
    if (/^p-[a-f0-9]{24}$/i.test(tag)) continue;

    // Ignorar tags muy cortos (menos de 2 caracteres)
    if (tag.length < 2) continue;

    // Ignorar tags muy largos (más de 50 caracteres)
    if (tag.length > 50) continue;

    tags.add(tag);
  }

  return Array.from(tags);
}

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
    const cursor = searchParams.get('cursor'); // Cursor-based pagination
    const parentMessageId = searchParams.get('parentMessageId');
    const rootMessageId = searchParams.get('rootMessageId'); // Para cargar todo el árbol de hilos
    const channelId = searchParams.get('channelId');
    const search = searchParams.get('search') || '';
    const tag = searchParams.get('tag')?.toLowerCase().replace(/^#/, '') || ''; // Filtro por hashtag
    const isDynamic = searchParams.get('isDynamic') === 'true';
    const aroundMessageId = searchParams.get('aroundMessageId'); // Para cargar mensajes alrededor de uno específico

    // Construir query
    const query: any = {
      projectId: params.id,
      isDeleted: false
    };

    // Filtrar por canal si se proporciona
    if (channelId) {
      query.channelId = channelId;
    }

    // Filtrar por hashtag
    if (tag) {
      query.tags = tag;
    }

    // Filtrar solo dinámicas (mensajes con commandType y commandData)
    if (isDynamic) {
      query.commandType = { $ne: null };
      query.commandData = { $ne: null };
    }

    // Si se especifica rootMessageId, obtener TODO el árbol de hilos (para hilos anidados)
    // Si hay búsqueda, buscar en TODOS los mensajes (incluyendo hilos)
    if (search.trim()) {
      const searchRegex = new RegExp(search.trim(), 'i');

      // Buscar usuarios que coincidan
      const matchingUsers = await User.find({
        name: searchRegex,
        isActive: true
      }).select('_id').lean();

      const userIds = matchingUsers.map(u => u._id);

      // Buscar en contenido, por usuario, o por hashtag
      query.$or = [
        { content: searchRegex },
        { tags: { $regex: search.trim(), $options: 'i' } }, // También buscar en tags
        ...(userIds.length > 0 ? [{ userId: { $in: userIds } }] : [])
      ];
    } else if (rootMessageId) {
      // Obtener todos los mensajes que pertenecen a este hilo (incluyendo anidados)
      query.$or = [
        { _id: rootMessageId }, // El mensaje raíz mismo
        { rootMessageId: rootMessageId } // Todos los mensajes del árbol
      ];
    } else if (parentMessageId) {
      // Si se especifica parentMessageId, obtener respuestas directas del hilo
      query.parentMessageId = parentMessageId;
    } else {
      // Solo mensajes principales (no respuestas)
      query.parentMessageId = null;
    }

    // Cursor-based pagination: obtener mensajes más antiguos que el cursor
    if (cursor && !aroundMessageId) {
      query._id = { $lt: cursor };
    }

    // Si se solicita cargar mensajes alrededor de un mensaje específico
    if (aroundMessageId) {
      const mongoose = require('mongoose');
      const halfLimit = Math.floor(limit / 2);

      // First, fetch the target message to get its channelId
      let targetObjectId;
      try {
        targetObjectId = new mongoose.Types.ObjectId(aroundMessageId);
      } catch {
        return NextResponse.json({ error: 'Invalid message ID' }, { status: 400 });
      }

      const targetMessage = await ChannelMessage.findOne({
        _id: targetObjectId,
        projectId: params.id,
        isDeleted: false
      }).lean() as any;

      if (!targetMessage) {
        return NextResponse.json({ error: 'Message not found' }, { status: 404 });
      }

      // Use the target message's channelId for the query
      const targetChannelId = targetMessage.channelId;

      // Base query for around message (only main messages in same channel)
      const baseAroundQuery: any = {
        projectId: params.id,
        isDeleted: false,
        parentMessageId: null,
        channelId: targetChannelId
      };

      // Fetch messages newer than or equal to target (including target)
      const newerQuery = { ...baseAroundQuery, _id: { $gte: targetObjectId } };
      const newerMessages = await ChannelMessage.find(newerQuery)
        .sort({ _id: 1 })
        .limit(halfLimit + 1)
        .populate('userId', 'name email')
        .populate('mentions', 'name email')
        .populate('priorityMentions', 'title status completionPercentage userId')
        .populate('reactions.userId', 'name')
        .populate('pinnedBy', 'name')
        .lean();

      // Fetch messages older than target
      const olderQuery = { ...baseAroundQuery, _id: { $lt: targetObjectId } };
      const olderMessages = await ChannelMessage.find(olderQuery)
        .sort({ _id: -1 })
        .limit(halfLimit)
        .populate('userId', 'name email')
        .populate('mentions', 'name email')
        .populate('priorityMentions', 'title status completionPercentage userId')
        .populate('reactions.userId', 'name')
        .populate('pinnedBy', 'name')
        .lean();

      // Combine: older (reversed) + newer
      // Also ensure target message is included even if it's a thread reply
      let combinedMessages = [...olderMessages.reverse(), ...newerMessages];

      // If target message is not in the combined list (could be a thread message), add it
      const targetInList = combinedMessages.some((m: any) => m._id.toString() === aroundMessageId);
      if (!targetInList) {
        // Add target message and re-sort
        const populatedTarget = await ChannelMessage.findById(targetObjectId)
          .populate('userId', 'name email')
          .populate('mentions', 'name email')
          .populate('priorityMentions', 'title status completionPercentage userId')
          .populate('reactions.userId', 'name')
          .populate('pinnedBy', 'name')
          .lean() as any;
        if (populatedTarget) {
          combinedMessages.push(populatedTarget);
          combinedMessages.sort((a: any, b: any) =>
            new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
          );
        }
      }

      // Process attachments
      const messagesWithAttachments = await Promise.all(combinedMessages.map(async (msg: any) => {
        if (msg.attachments && msg.attachments.length > 0) {
          const attachmentDocs = await Attachment.find({
            _id: { $in: msg.attachments },
            isDeleted: false
          }).select('fileName originalName fileSize mimeType uploadedBy uploadedAt').lean();

          const populatedAttachments = await Promise.all(
            attachmentDocs.map(async (att: any) => {
              const uploader = await User.findById(att.uploadedBy).select('name email').lean();
              return {
                ...att,
                _id: att._id.toString(),
                uploadedBy: uploader ? {
                  ...uploader,
                  _id: uploader._id.toString()
                } : { _id: 'deleted', name: 'Usuario Eliminado', email: 'deleted@system.local' }
              };
            })
          );

          return {
            ...msg,
            _id: msg._id.toString(),
            userId: msg.userId ? { ...msg.userId, _id: msg.userId._id?.toString() || msg.userId._id } : msg.userId,
            attachments: populatedAttachments
          };
        }
        return {
          ...msg,
          _id: msg._id.toString(),
          userId: msg.userId ? { ...msg.userId, _id: msg.userId._id?.toString() || msg.userId._id } : msg.userId,
          attachments: []
        };
      }));

      // Handle deleted users
      const messagesWithDeletedUsers = messagesWithAttachments.map((msg: any) => {
        if (!msg.userId) {
          msg.userId = {
            _id: 'deleted',
            name: 'Usuario Eliminado',
            email: 'deleted@system.local'
          };
        }
        if (msg.reactions && msg.reactions.length > 0) {
          msg.reactions = msg.reactions.map((reaction: any) => {
            if (!reaction.userId) {
              reaction.userId = { _id: 'deleted', name: 'Usuario Eliminado' };
            }
            return reaction;
          });
        }
        return msg;
      });

      // Return with special pagination (sorted oldest to newest for display)
      const lastOlderMessage = olderMessages[olderMessages.length - 1] as any;
      return NextResponse.json({
        messages: messagesWithDeletedUsers.sort((a: any, b: any) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        ),
        pagination: {
          hasMore: olderMessages.length >= halfLimit,
          nextCursor: olderMessages.length > 0 ? lastOlderMessage._id.toString() : null,
          aroundMessageId
        }
      });
    }

    // Obtener mensajes (ordenar por _id descendente que es equivalente a createdAt)
    const messages = await ChannelMessage.find(query)
      .sort({ _id: -1 })
      .limit(limit + 1) // Obtener uno más para saber si hay más páginas
      .populate('userId', 'name email')
      .populate('mentions', 'name email')
      .populate('priorityMentions', 'title status completionPercentage userId')
      .populate('reactions.userId', 'name')
      .populate('pinnedBy', 'name')
      .lean();

    // Poblar attachments manualmente para evitar problemas en serverless
    const messagesWithAttachments = await Promise.all(messages.map(async (msg: any) => {
      if (msg.attachments && msg.attachments.length > 0) {
        const attachmentDocs = await Attachment.find({
          _id: { $in: msg.attachments },
          isDeleted: false
        }).select('fileName originalName fileSize mimeType uploadedBy uploadedAt').lean();

        // Poblar uploadedBy para cada attachment y convertir IDs a strings
        const populatedAttachments = await Promise.all(
          attachmentDocs.map(async (att: any) => {
            const uploader = await User.findById(att.uploadedBy).select('name email').lean();
            return {
              ...att,
              _id: att._id.toString(),
              uploadedBy: uploader ? {
                ...uploader,
                _id: uploader._id.toString()
              } : { _id: 'deleted', name: 'Usuario Eliminado', email: 'deleted@system.local' }
            };
          })
        );

        return {
          ...msg,
          _id: msg._id.toString(),
          userId: msg.userId ? { ...msg.userId, _id: msg.userId._id?.toString() || msg.userId._id } : msg.userId,
          attachments: populatedAttachments
        };
      }
      return {
        ...msg,
        _id: msg._id.toString(),
        userId: msg.userId ? { ...msg.userId, _id: msg.userId._id?.toString() || msg.userId._id } : msg.userId,
        attachments: []
      };
    }));

    // Determinar si hay más mensajes
    const hasMore = messagesWithAttachments.length > limit;
    const messagesToReturn = hasMore ? messagesWithAttachments.slice(0, limit) : messagesWithAttachments;
    const nextCursor = hasMore ? messagesToReturn[messagesToReturn.length - 1]._id : null;

    // Manejar usuarios eliminados - reemplazar con objeto de usuario eliminado
    const messagesWithDeletedUsers = messagesToReturn.map((msg: any) => {
      if (!msg.userId) {
        msg.userId = {
          _id: 'deleted',
          name: 'Usuario Eliminado',
          email: 'deleted@system.local'
        };
      }

      // Manejar reacciones con usuarios eliminados
      if (msg.reactions && msg.reactions.length > 0) {
        msg.reactions = msg.reactions.map((reaction: any) => {
          if (!reaction.userId) {
            reaction.userId = {
              _id: 'deleted',
              name: 'Usuario Eliminado'
            };
          }
          return reaction;
        });
      }

      // Manejar pinnedBy si el usuario fue eliminado
      if (msg.isPinned && !msg.pinnedBy) {
        msg.pinnedBy = {
          _id: 'deleted',
          name: 'Usuario Eliminado'
        };
      }

      return msg;
    });

    return NextResponse.json({
      messages: messagesWithDeletedUsers,
      pagination: {
        hasMore,
        nextCursor,
        limit
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
    const { content, channelId, mentions = [], parentMessageId, commandType, commandData, attachments = [], voiceMessage } = body;

    if (!content || content.trim().length === 0) {
      return NextResponse.json(
        { error: 'El contenido del mensaje es requerido' },
        { status: 400 }
      );
    }

    if (!channelId) {
      return NextResponse.json(
        { error: 'El ID del canal es requerido' },
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

    // Calcular threadDepth y rootMessageId para hilos anidados
    let threadDepth = 0;
    let rootMessageId = null;

    if (parentMessageId) {
      const parentMsg = await ChannelMessage.findById(parentMessageId).lean() as any;
      if (parentMsg) {
        threadDepth = (parentMsg.threadDepth || 0) + 1;
        // El rootMessageId es el del padre, o si el padre es el root (threadDepth=0), es el padre mismo
        rootMessageId = parentMsg.rootMessageId || parentMsg._id;
      }
    }

    // Extraer hashtags del contenido
    const tags = extractHashtags(content, priorityMentionsIds);

    // Crear mensaje
    const message = await ChannelMessage.create({
      projectId: params.id,
      channelId,
      userId: session.user.id,
      content: content.trim(),
      mentions,
      priorityMentions: priorityMentionsIds,
      tags, // Hashtags extraídos
      parentMessageId: parentMessageId || null,
      rootMessageId: rootMessageId,
      threadDepth: threadDepth,
      commandType: commandType || null,
      commandData: commandData || null,
      attachments: attachments || [],
      voiceMessage: voiceMessage || null,
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

    // Poblar el mensaje creado manualmente para evitar problemas en serverless
    const messageDoc = await ChannelMessage.findById(message._id).lean() as any;

    if (!messageDoc) {
      throw new Error('Mensaje no encontrado después de crear');
    }

    // Poblar userId
    const userId = await User.findById(messageDoc.userId).select('name email').lean();

    // Poblar mentions y convertir IDs a strings
    let mentionsPopulated: any[] = [];
    if (messageDoc.mentions && messageDoc.mentions.length > 0) {
      const mentionDocs = await User.find({
        _id: { $in: messageDoc.mentions }
      }).select('name email').lean();
      mentionsPopulated = mentionDocs.map((m: any) => ({
        ...m,
        _id: m._id.toString()
      }));
    }

    // Poblar priorityMentions y convertir IDs a strings
    let priorityMentionsPopulated: any[] = [];
    if (messageDoc.priorityMentions && messageDoc.priorityMentions.length > 0) {
      const priorityDocs = await Priority.find({
        _id: { $in: messageDoc.priorityMentions }
      }).select('title status completionPercentage userId').lean();
      priorityMentionsPopulated = priorityDocs.map((p: any) => ({
        ...p,
        _id: p._id.toString(),
        userId: typeof p.userId === 'string' ? p.userId : p.userId?.toString()
      }));
    }

    // Poblar attachments manualmente
    let populatedAttachments: any[] = [];
    if (messageDoc.attachments && messageDoc.attachments.length > 0) {
      const attachmentDocs = await Attachment.find({
        _id: { $in: messageDoc.attachments },
        isDeleted: false
      }).select('fileName originalName fileSize mimeType uploadedBy uploadedAt').lean();

      // Poblar uploadedBy para cada attachment y convertir IDs a strings
      populatedAttachments = await Promise.all(
        attachmentDocs.map(async (att: any) => {
          const uploader = await User.findById(att.uploadedBy).select('name email').lean();
          return {
            ...att,
            _id: att._id.toString(),
            uploadedBy: uploader ? {
              ...uploader,
              _id: uploader._id.toString()
            } : { _id: 'deleted', name: 'Usuario Eliminado', email: 'deleted@system.local' }
          };
        })
      );
    }

    const populatedMessage = {
      ...messageDoc,
      _id: messageDoc._id.toString(),
      userId: userId ? {
        ...userId,
        _id: userId._id.toString()
      } : {
        _id: 'deleted',
        name: 'Usuario Eliminado',
        email: 'deleted@system.local'
      },
      mentions: mentionsPopulated,
      priorityMentions: priorityMentionsPopulated,
      attachments: populatedAttachments,
      voiceMessage: messageDoc.voiceMessage || null,
      createdAt: messageDoc.createdAt || new Date().toISOString(),
      reactions: messageDoc.reactions || [],
      replyCount: messageDoc.replyCount || 0,
      isPinned: messageDoc.isPinned || false,
      isEdited: messageDoc.isEdited || false,
      isDeleted: messageDoc.isDeleted || false
    };

    // Trackear para gamificación
    try {
      // Trackear envío de mensaje
      await trackChannelUsage(session.user.id, 'messageSent', { channelId });

      // Si es un slash command, trackear uso de comando
      if (commandType) {
        await trackChannelUsage(session.user.id, 'slashCommandUsed', { commandType });

        // Si es un comando interactivo (no exportación, búsqueda, etc), trackear creación
        const interactiveCommands = ['poll', 'brainstorm', 'estimation-poker', 'retrospective',
          'incident', 'vote-points', 'checklist', 'timer', 'wheel', 'mood', 'pros-cons', 'ranking'];
        if (interactiveCommands.includes(commandType)) {
          await trackChannelUsage(session.user.id, 'interactiveCommandCreated');
        }
      }
    } catch (gamificationError) {
      console.error('Error tracking gamification:', gamificationError);
      // No fallar la creación del mensaje si la gamificación falla
    }

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

            // Primero buscar si es un grupo
            const group = await UserGroup.findOne({
              tag: username.toLowerCase(),
              isActive: true
            }).populate('members', '_id name email isActive').lean() as any;

            if (group && group.members && group.members.length > 0) {
              // Es un grupo, notificar a todos los miembros con BCC
              const memberIds = group.members
                .filter((m: any) => m.isActive && m._id.toString() !== author._id.toString())
                .map((m: any) => m._id.toString());

              if (memberIds.length > 0) {
                await notifyGroupMention(
                  memberIds,
                  author.name,
                  group.tag,
                  params.id,
                  project.name,
                  content,
                  message._id.toString()
                );
                // Enviar push notification al grupo
                await sendPushToUsers(memberIds, {
                  title: `🔔 ${author.name} mencionó a @${group.tag}`,
                  body: content.length > 80 ? content.substring(0, 80) + '...' : content,
                  tag: `mention-group-${message._id.toString()}`,
                  data: {
                    type: 'mention',
                    channelId,
                    messageId: message._id.toString()
                  }
                });
              }
            } else {
              // No es un grupo, buscar usuario
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
                // Enviar push notification
                await notifyMention(
                  mentionedUser._id.toString(),
                  author.name,
                  project.name,
                  content.substring(0, 100),
                  channelId,
                  message._id.toString()
                );
              }
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
          // Enviar push notification por respuesta
          await sendPushToUsers([parentMessage.userId._id.toString()], {
            title: `💬 ${author.name} respondió tu mensaje`,
            body: content.length > 80 ? content.substring(0, 80) + '...' : content,
            tag: `reply-${message._id.toString()}`,
            data: {
              type: 'message',
              channelId,
              messageId: message._id.toString()
            }
          });
        }
      }
    } catch (notifError) {
      console.error('Error creating notifications:', notifError);
      // No fallar la creación del mensaje si las notificaciones fallan
    }

    // Triggerar evento de Pusher para tiempo real
    try {
      await triggerPusherEvent(
        `presence-channel-${channelId}`,
        'new-message',
        populatedMessage
      );
    } catch (pusherError) {
      console.error('Error triggering Pusher event:', pusherError);
      // No fallar la creación del mensaje si Pusher falla
    }

    // Triggerar webhooks salientes
    try {
      await triggerOutgoingWebhooks(
        params.id,
        channelId,
        'message.created',
        {
          message: populatedMessage,
          project: { id: params.id },
          channel: { id: channelId },
          timestamp: new Date().toISOString(),
        }
      );
    } catch (webhookError) {
      console.error('Error triggering outgoing webhooks:', webhookError);
      // No fallar la creación del mensaje si los webhooks fallan
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
