import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import connectDB from '@/lib/mongodb';
import Comment from '@/models/Comment';
import Priority from '@/models/Priority';
import User from '@/models/User';
import { sendEmail, emailTemplates } from '@/lib/email';
import { notifyComment, notifyMention } from '@/lib/notifications';
import { trackCommentBadges } from '@/lib/gamification';

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
      .populate('userId', 'name email')
      .sort({ createdAt: 1 }) // Ordenar del más antiguo al más reciente
      .lean();

    return NextResponse.json(comments);
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
    const { priorityId, text, isSystemComment } = body;

    if (!priorityId || !text) {
      return NextResponse.json({
        error: 'priorityId y text son requeridos'
      }, { status: 400 });
    }

    if (text.trim().length === 0) {
      return NextResponse.json({
        error: 'El comentario no puede estar vacío'
      }, { status: 400 });
    }

    const comment = await Comment.create({
      priorityId,
      userId: (session.user as any).id,
      text: text.trim(),
      isSystemComment: isSystemComment || false
    });

    // Poblar el usuario antes de devolver
    const populatedComment = await Comment.findById(comment._id)
      .populate('userId', 'name email')
      .lean();

    // Variable para trackear si hubo mención
    let hasMention = false;

    // Crear notificaciones y enviar emails (solo para comentarios normales, no del sistema)
    if (!isSystemComment) {
      try {
        console.log('[EMAIL] Starting notification process for comment');
        const priority = await Priority.findById(priorityId).lean();

        if (!priority) {
          console.log('[EMAIL] Priority not found');
          return NextResponse.json(populatedComment, { status: 201 });
        }

        const priorityOwner = await User.findById(priority.userId).lean();
        const commentAuthor = await User.findById((session.user as any).id).lean();

        // Crear notificación in-app si no es el propio dueño quien comenta
        if (priorityOwner && commentAuthor && priorityOwner._id.toString() !== commentAuthor._id.toString()) {
          // Crear notificación de comentario
          await notifyComment(
            priorityOwner._id.toString(),
            commentAuthor.name,
            priority.title,
            text.trim(),
            priorityId,
            comment._id.toString()
          ).catch(err => console.error('[NOTIFICATION] Error creating comment notification:', err));
        }

        // Detectar menciones (@username o @NombreCompleto) y crear notificaciones
        // Regex mejorado para capturar nombres con espacios: @NombreCompleto o @Nombre
        const mentionRegex = /@([\w\s]+?)(?=\s|$|[^\w\s])/g;
        const mentions = text.match(mentionRegex);

        if (mentions && commentAuthor) {
          console.log('[NOTIFICATION] Mentions detected:', mentions);

          // Extraer nombres de usuario únicos y limpiar
          const usernames: string[] = [...new Set<string>(mentions.map((m: string) => m.substring(1).trim()))];

          let mentionedSomeone = false;

          // Buscar usuarios mencionados por nombre (case-insensitive, coincidencia exacta o parcial)
          for (const username of usernames) {
            try {
              // Escapar caracteres especiales de regex
              const escapedUsername = username.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

              // Primero intentar coincidencia exacta
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
                await notifyMention(
                  mentionedUser._id.toString(),
                  commentAuthor.name,
                  priority.title,
                  text.trim(),
                  priorityId,
                  comment._id.toString()
                ).catch(err => console.error('[NOTIFICATION] Error creating mention notification:', err));

                mentionedSomeone = true;
              } else if (!mentionedUser) {
                console.log(`[NOTIFICATION] User not found for mention: @${username}`);
              } else {
                console.log(`[NOTIFICATION] Skipping self-mention for: ${mentionedUser.name}`);
              }
            } catch (err) {
              console.error(`[NOTIFICATION] Error finding user ${username}:`, err);
            }
          }

          // Marcar que hubo mención
          if (mentionedSomeone) {
            hasMention = true;
          }
        }

      console.log('[EMAIL] Priority owner:', priorityOwner?.email);
      console.log('[EMAIL] Comment author:', commentAuthor?.email);
      console.log('[EMAIL] Email notifications enabled:', priorityOwner?.emailNotifications?.enabled);
      console.log('[EMAIL] New comments enabled:', priorityOwner?.emailNotifications?.newComments);
      console.log('[EMAIL] EMAIL_USERNAME set:', !!process.env.EMAIL_USERNAME);
      console.log('[EMAIL] EMAIL_PASSWORD set:', !!process.env.EMAIL_PASSWORD);

      // Enviar email SIEMPRE, tanto si es del dueño como si no (para tener registro)
      if (
        priorityOwner &&
        commentAuthor &&
        priorityOwner.emailNotifications?.enabled &&
        priorityOwner.emailNotifications?.newComments
      ) {
        const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000';

        // Determinar si es propio comentario o de otro usuario
        const isOwnComment = priorityOwner._id.toString() === commentAuthor._id.toString();

        console.log('[EMAIL] Is own comment:', isOwnComment);
        console.log('[EMAIL] Sending to:', priorityOwner.email);

        const emailContent = emailTemplates.newComment({
          priorityTitle: priority.title,
          commentAuthor: isOwnComment ? `${commentAuthor.name} (tú)` : commentAuthor.name,
          commentText: text.trim(),
          priorityUrl: `${baseUrl}/priorities`,
        });

        // Enviar email de forma asíncrona sin bloquear la respuesta
        sendEmail({
          to: priorityOwner.email,
          subject: isOwnComment
            ? `📝 Registro de tu comentario: ${priority.title}`
            : emailContent.subject,
          html: emailContent.html,
        })
          .then((result) => {
            console.log('[EMAIL] Email sent successfully:', result);
          })
          .catch(err => {
            console.error('[EMAIL] Error sending notification email:', err);
          });
      } else {
        console.log('[EMAIL] Email not sent - conditions not met');
        if (!priorityOwner) console.log('[EMAIL] - No priority owner');
        if (!commentAuthor) console.log('[EMAIL] - No comment author');
        if (!priorityOwner?.emailNotifications?.enabled) console.log('[EMAIL] - Notifications disabled');
        if (!priorityOwner?.emailNotifications?.newComments) console.log('[EMAIL] - New comments notifications disabled');
      }
      } catch (emailError) {
        // No fallar la creación del comentario si el email falla
        console.error('[EMAIL] Error in email notification process:', emailError);
      }
    } else {
      console.log('[EMAIL] Skipping email notification for system comment');
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
