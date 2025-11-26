import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import connectDB from '@/lib/mongodb';
import Comment from '@/models/Comment';
import Priority from '@/models/Priority';
import User from '@/models/User';
import UserGroup from '@/models/UserGroup';
import Attachment from '@/models/Attachment'; // Necesario para populate
import { notifyComment, notifyMention, notifyGroupMentionInPriority } from '@/lib/notifications';
import { trackCommentBadges } from '@/lib/gamification';
import { sendPriorityNotificationToSlack } from '@/lib/slack';
import { logCommentAdded } from '@/lib/projectActivity';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    await connectDB();

    const { searchParams } = new URL(request.url);
    const priorityId = searchParams.get('priorityId');

    if (!priorityId) {
      return NextResponse.json({ error: 'priorityId es requerido' }, { status: 400 });
    }

    const comments = await Comment.find({ priorityId })
      .populate({
        path: 'attachments',
        populate: {
          path: 'uploadedBy',
          select: 'name email'
        }
      })
      .sort({ createdAt: 1 }) // Ordenar del más antiguo al más reciente
      .lean();

    // Poblar manualmente los usuarios para manejar mejor los errores
    const populatedComments = await Promise.all(comments.map(async (comment: any) => {
      if (comment.userId) {
        const user = await User.findById(comment.userId).select('name email').lean();
        if (user) {
          comment.userId = user;
        } else {
          // Usuario no encontrado, dejar el ObjectId pero agregar placeholder
          console.warn(`User not found for comment ${comment._id}, userId: ${comment.userId}`);
          comment.userId = {
            _id: comment.userId,
            name: 'Usuario desconocido',
            email: 'unknown@system.local'
          };
        }
      } else {
        // userId es null
        comment.userId = {
          _id: null,
          name: 'Usuario desconocido',
          email: 'unknown@system.local'
        };
      }
      return comment;
    }));

    return NextResponse.json(populatedComments);
  } catch (error: any) {
    console.error('Error fetching comments:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    await connectDB();

    const body = await request.json();
    const { priorityId, text, isSystemComment, attachments } = body;

    if (!priorityId) {
      return NextResponse.json({
        error: 'priorityId es requerido'
      }, { status: 400 });
    }

    // Permitir comentarios sin texto si hay attachments
    if (!text || text.trim().length === 0) {
      if (!attachments || attachments.length === 0) {
        return NextResponse.json({
          error: 'Debes proporcionar texto o archivos adjuntos'
        }, { status: 400 });
      }
    }

    const comment = await Comment.create({
      priorityId,
      userId: (session.user as any).id,
      text: text ? text.trim() : '', // Permitir texto vacío si hay attachments
      isSystemComment: isSystemComment || false,
      attachments: attachments || []
    });

    // Poblar el usuario y attachments manualmente para evitar problemas en serverless
    const commentDoc = await Comment.findById(comment._id).lean() as any;

    if (!commentDoc) {
      throw new Error('Comentario no encontrado después de crear');
    }

    // Poblar usuario
    const user = await User.findById(commentDoc.userId).select('name email').lean();

    // Poblar attachments si existen
    let populatedAttachments = [];
    if (commentDoc.attachments && commentDoc.attachments.length > 0) {
      const attachmentDocs = await Attachment.find({
        _id: { $in: commentDoc.attachments }
      }).lean();

      // Poblar uploadedBy para cada attachment
      populatedAttachments = await Promise.all(
        attachmentDocs.map(async (att: any) => {
          const uploader = await User.findById(att.uploadedBy).select('name email').lean();
          return {
            ...att,
            uploadedBy: uploader
          };
        })
      );
    }

    const populatedComment = {
      ...commentDoc,
      userId: user,
      attachments: populatedAttachments
    };

    // Variable para trackear si hubo mención
    let hasMention = false;

    // Log activity to project channel (solo para comentarios normales y si la prioridad tiene proyecto)
    if (!isSystemComment) {
      try {
        const priority = await Priority.findById(priorityId).lean();
        if (priority && priority.projectId) {
          const commentText = text ? text.trim() : '📎 Adjuntó archivos';
          await logCommentAdded(
            priority.projectId,
            (session.user as any).id,
            priority._id,
            priority.title,
            commentText.substring(0, 100) // Limitar a 100 caracteres
          );
        }
      } catch (activityError) {
        console.error('Error logging comment activity:', activityError);
      }
    }

    // Crear notificaciones (solo para comentarios normales, no del sistema)
    if (!isSystemComment) {
      try {
        console.log('[NOTIFICATION] Starting notification process for comment');
        const priority = await Priority.findById(priorityId).lean();

        if (!priority) {
          console.log('[NOTIFICATION] Priority not found');
          return NextResponse.json(populatedComment, { status: 201 });
        }

        const priorityOwner = await User.findById(priority.userId).lean();
        const commentAuthor = await User.findById((session.user as any).id).lean();

        // Crear notificación in-app si no es el propio dueño quien comenta
        if (priorityOwner && commentAuthor && priorityOwner._id.toString() !== commentAuthor._id.toString()) {
          const commentText = text ? text.trim() : '📎 Adjuntó archivos';

          // Crear notificación de comentario
          await notifyComment(
            priorityOwner._id.toString(),
            commentAuthor.name,
            priority.title,
            commentText,
            priorityId,
            comment._id.toString()
          ).catch(err => console.error('[NOTIFICATION] Error creating comment notification:', err));

          // Notificar a Slack si el proyecto tiene canal configurado
          if (priority.projectId) {
            const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000';
            const slackMessage = commentText.length > 100 ? commentText.substring(0, 100) + '...' : commentText;
            await sendPriorityNotificationToSlack({
              projectId: priority.projectId,
              userId: priority.userId,
              eventType: 'comment',
              priorityTitle: priority.title,
              message: `${commentAuthor.name} comentó: "${slackMessage}"`,
              priorityUrl: `${baseUrl}/dashboard?priority=${priorityId}`,
            }).catch(err => console.error('[SLACK] Error sending comment notification to Slack:', err));
          }
        }

        // Detectar menciones (@username o @NombreCompleto) y crear notificaciones
        // Regex mejorado para capturar nombres con espacios: @NombreCompleto o @Nombre
        const mentionRegex = /@([\w\s]+?)(?=\s|$|[^\w\s])/g;
        const mentions = text ? text.match(mentionRegex) : null;

        if (mentions && commentAuthor) {
          console.log('[NOTIFICATION] Mentions detected:', mentions);

          // Extraer nombres de usuario únicos y limpiar
          const usernames: string[] = [...new Set<string>(mentions.map((m: string) => m.substring(1).trim()))];

          let mentionedSomeone = false;

          // Buscar usuarios o grupos mencionados
          for (const username of usernames) {
            try {
              // Escapar caracteres especiales de regex
              const escapedUsername = username.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

              // Primero buscar si es un grupo
              const group = await UserGroup.findOne({
                tag: username.toLowerCase(),
                isActive: true
              }).populate('members', '_id name email isActive').lean() as any;

              if (group && group.members && group.members.length > 0) {
                // Es un grupo, notificar a todos los miembros con BCC
                const memberIds = group.members
                  .filter((m: any) => m.isActive && m._id.toString() !== commentAuthor._id.toString())
                  .map((m: any) => m._id.toString());

                if (memberIds.length > 0) {
                  const mentionText = text ? text.trim() : '📎 Adjuntó archivos';
                  await notifyGroupMentionInPriority(
                    memberIds,
                    commentAuthor.name,
                    group.tag,
                    priority.title,
                    mentionText,
                    priorityId,
                    comment._id.toString()
                  ).catch(err => console.error('[NOTIFICATION] Error creating group mention notification:', err));

                  // Notificar a Slack si el proyecto tiene canal configurado
                  if (priority.projectId) {
                    const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000';
                    const slackMentionMessage = mentionText.length > 100 ? mentionText.substring(0, 100) + '...' : mentionText;
                    await sendPriorityNotificationToSlack({
                      projectId: priority.projectId,
                      userId: priority.userId,
                      eventType: 'mention',
                      priorityTitle: priority.title,
                      message: `${commentAuthor.name} mencionó a @${group.tag}: "${slackMentionMessage}"`,
                      priorityUrl: `${baseUrl}/dashboard?priority=${priorityId}`,
                    }).catch(err => console.error('[SLACK] Error sending group mention notification to Slack:', err));
                  }

                  mentionedSomeone = true;
                }
              } else {
                // No es un grupo, buscar usuario individual
                let mentionedUser = await User.findOne({
                  name: { $regex: new RegExp(`^${escapedUsername}$`, 'i') },
                  isActive: true
                }).lean();

                // Si no encuentra, buscar por nombre que contenga el texto
                if (!mentionedUser) {
                  mentionedUser = await User.findOne({
                    name: { $regex: new RegExp(escapedUsername, 'i') },
                    isActive: true
                  }).lean();
                }

                if (mentionedUser && mentionedUser._id.toString() !== commentAuthor._id.toString()) {
                  console.log(`[NOTIFICATION] Creating mention notification for user: ${mentionedUser.name}`);
                  const mentionText = text ? text.trim() : '📎 Adjuntó archivos';
                  await notifyMention(
                    mentionedUser._id.toString(),
                    commentAuthor.name,
                    priority.title,
                    mentionText,
                    priorityId,
                    comment._id.toString()
                  ).catch(err => console.error('[NOTIFICATION] Error creating mention notification:', err));

                  // Notificar a Slack si el proyecto tiene canal configurado
                  if (priority.projectId) {
                    const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000';
                    const slackMentionMessage = mentionText.length > 100 ? mentionText.substring(0, 100) + '...' : mentionText;
                    await sendPriorityNotificationToSlack({
                      projectId: priority.projectId,
                      userId: priority.userId,
                      eventType: 'mention',
                      priorityTitle: priority.title,
                      message: `${commentAuthor.name} mencionó a ${mentionedUser.name}: "${slackMentionMessage}"`,
                      priorityUrl: `${baseUrl}/dashboard?priority=${priorityId}`,
                    }).catch(err => console.error('[SLACK] Error sending mention notification to Slack:', err));
                  }

                  mentionedSomeone = true;
                } else if (!mentionedUser) {
                  console.log(`[NOTIFICATION] User not found for mention: @${username}`);
                } else {
                  console.log(`[NOTIFICATION] Skipping self-mention for: ${mentionedUser.name}`);
                }
              }
            } catch (err) {
              console.error(`[NOTIFICATION] Error finding user/group ${username}:`, err);
            }
          }

          // Marcar que hubo mención
          if (mentionedSomeone) {
            hasMention = true;
          }
        }

        // NOTA: No enviar emails aquí porque las funciones notifyComment() y notifyMention()
        // ya se encargan de crear las notificaciones Y enviar los emails correspondientes.
      } catch (notificationError) {
        // No fallar la creación del comentario si las notificaciones fallan
        console.error('[NOTIFICATION] Error in notification process:', notificationError);
      }
    } else {
      console.log('[NOTIFICATION] Skipping notifications for system comment');
    }

    // Trackear badges de comentarios al final (fuera del bloque try para notificaciones)
    if (!isSystemComment) {
      const userId = (session.user as any).id;
      await trackCommentBadges(userId, hasMention).catch(err =>
        console.error('[BADGE] Error tracking comment badges:', err)
      );
    }

    return NextResponse.json(populatedComment, { status: 201 });
  } catch (error: any) {
    console.error('Error creating comment:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
