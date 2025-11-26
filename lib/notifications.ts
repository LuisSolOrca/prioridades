import Notification from '@/models/Notification';
import { sendEmail, emailTemplates } from './email';
import User from '@/models/User';
import Priority from '@/models/Priority';

interface CreateNotificationParams {
  userId: string;
  type:
    | 'STATUS_CHANGE'
    | 'COMMENT'
    | 'MENTION'
    | 'WEEKEND_REMINDER'
    | 'PRIORITY_ASSIGNED'
    | 'PRIORITY_DUE_SOON'
    | 'COMPLETION_MILESTONE'
    | 'PRIORITY_INACTIVE'
    | 'PRIORITY_UNBLOCKED'
    | 'WEEKLY_SUMMARY'
    | 'INITIATIVE_AT_RISK'
    | 'WEEK_COMPLETED'
    | 'WEEK_START_REMINDER'
    | 'COMMENT_REPLY'
    | 'CHANNEL_MENTION'
    | 'CHANNEL_REPLY'
    | 'QUESTION';
  title: string;
  message: string;
  priorityId?: string;
  priorityTitle?: string; // Título de la prioridad para usar en emails
  commentId?: string;
  projectId?: string; // ID del proyecto para menciones en canales
  projectName?: string; // Nombre del proyecto para emails
  messageId?: string; // ID del mensaje de canal
  actionUrl?: string;
  sendEmail?: boolean;
}

export async function createNotification(params: CreateNotificationParams) {
  try {
    // Si hay priorityId pero no priorityTitle, buscar el título
    let priorityTitle = params.priorityTitle;
    if (params.priorityId && !priorityTitle) {
      const priority = await Priority.findById(params.priorityId).select('title').lean();
      if (priority) {
        priorityTitle = priority.title;
      }
    }

    const notification = await Notification.create({
      userId: params.userId,
      type: params.type,
      title: params.title,
      message: params.message,
      priorityId: params.priorityId,
      commentId: params.commentId,
      projectId: params.projectId,
      messageId: params.messageId,
      actionUrl: params.actionUrl
    });

    // Enviar email si está habilitado
    if (params.sendEmail) {
      const user = await User.findById(params.userId).lean();
      if (user && user.emailNotifications?.enabled) {
        const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000';
        const priorityUrl = `${baseUrl}${params.actionUrl || '/priorities'}`;

        let emailContent;
        switch (params.type) {
          case 'STATUS_CHANGE':
            if (user.emailNotifications.statusChanges) {
              // Extraer oldStatus y newStatus del mensaje
              const statusMatch = params.message.match(/"([^"]+)" a "([^"]+)"/);
              const oldStatus = statusMatch ? statusMatch[1] : 'Estado anterior';
              const newStatus = statusMatch ? statusMatch[2] : 'Nuevo estado';
              emailContent = emailTemplates.statusChange({
                priorityTitle: priorityTitle || 'Prioridad',
                oldStatus,
                newStatus,
                priorityUrl
              });
            }
            break;

          case 'COMMENT':
            if (user.emailNotifications.newComments) {
              // Extraer nombre del comentarista del título
              const commenterName = params.title.split(' comentó en ')[0];
              emailContent = emailTemplates.newComment({
                priorityTitle: priorityTitle || 'Prioridad',
                commentAuthor: commenterName,
                commentText: params.message,
                priorityUrl
              });
            }
            break;

          case 'MENTION':
            if (user.emailNotifications.newComments) {
              // Extraer nombre del mencionador del título
              const mentionerName = params.title.split(' te mencionó en ')[0];
              emailContent = emailTemplates.mention({
                mentionerName,
                priorityTitle: priorityTitle || 'Prioridad',
                commentText: params.message,
                priorityUrl
              });
            }
            break;

          case 'COMMENT_REPLY':
            if (user.emailNotifications.newComments) {
              const replierName = params.title.split(' respondió a tu comentario en ')[0];
              emailContent = emailTemplates.commentReply({
                replierName,
                priorityTitle: priorityTitle || 'Prioridad',
                replyText: params.message,
                priorityUrl
              });
            }
            break;

          case 'PRIORITY_DUE_SOON':
            emailContent = emailTemplates.priorityDueSoon({
              priorityTitle: priorityTitle || 'Prioridad',
              completionPercentage: parseInt(params.message.match(/(\d+)%/)?.[1] || '0'),
              priorityUrl
            });
            break;

          case 'COMPLETION_MILESTONE':
            emailContent = emailTemplates.completionMilestone({
              priorityTitle: priorityTitle || 'Prioridad',
              milestone: parseInt(params.title.match(/(\d+)%/)?.[1] || '0'),
              priorityUrl
            });
            break;

          case 'PRIORITY_INACTIVE':
            emailContent = emailTemplates.priorityInactive({
              priorityTitle: priorityTitle || 'Prioridad',
              daysInactive: parseInt(params.message.match(/(\d+) días/)?.[1] || '0'),
              priorityUrl
            });
            break;

          case 'PRIORITY_UNBLOCKED':
            const unblockedStatus = params.message.match(/"Bloqueado" a "([^"]+)"/)?.[1] || 'En Tiempo';
            emailContent = emailTemplates.priorityUnblocked({
              priorityTitle: priorityTitle || 'Prioridad',
              newStatus: unblockedStatus,
              priorityUrl
            });
            break;

          case 'WEEK_COMPLETED':
            const weekMatch = params.message.match(/semana (.+)\./);
            emailContent = emailTemplates.weekCompleted({
              weekStr: weekMatch ? weekMatch[1] : 'actual',
              priorityUrl
            });
            break;

          case 'WEEK_START_REMINDER':
            emailContent = emailTemplates.weekStartReminder({
              priorityUrl
            });
            break;

          case 'WEEKEND_REMINDER':
            emailContent = emailTemplates.weekendReminder({
              priorityUrl
            });
            break;

          case 'CHANNEL_MENTION':
            if (user.emailNotifications?.newComments) {
              const mentionerName = params.title.split(' te mencionó en ')[0];
              emailContent = emailTemplates.channelMention({
                mentionerName,
                projectName: params.projectName || 'Proyecto',
                messageText: params.message,
                channelUrl: `${baseUrl}${params.actionUrl || '/channels'}`
              });
            }
            break;

          case 'CHANNEL_REPLY':
            if (user.emailNotifications?.newComments) {
              const replierName = params.title.split(' respondió a tu mensaje en ')[0];
              emailContent = emailTemplates.channelReply({
                replierName,
                projectName: params.projectName || 'Proyecto',
                replyText: params.message,
                channelUrl: `${baseUrl}${params.actionUrl || '/channels'}`
              });
            }
            break;

          case 'QUESTION':
            if (user.emailNotifications?.newComments) {
              const askerName = params.title.split(' te hizo una pregunta importante en ')[0];
              emailContent = emailTemplates.question({
                askerName,
                projectName: params.projectName || 'Proyecto',
                questionText: params.message,
                channelUrl: `${baseUrl}${params.actionUrl || '/channels'}`
              });
            }
            break;
        }

        if (emailContent) {
          await sendEmail({
            to: user.email,
            subject: emailContent.subject,
            html: emailContent.html
          }).catch(err => console.error('[NOTIFICATION] Error sending email:', err));
        }
      }
    }

    return notification;
  } catch (error) {
    console.error('Error creating notification:', error);
    throw error;
  }
}

export async function notifyStatusChange(
  userId: string,
  priorityTitle: string,
  oldStatus: string,
  newStatus: string,
  priorityId: string
) {
  // Solo notificar si cambia a EN_RIESGO o BLOQUEADO
  if (newStatus === 'EN_RIESGO' || newStatus === 'BLOQUEADO') {
    const statusLabels: Record<string, string> = {
      'EN_TIEMPO': 'En Tiempo',
      'EN_RIESGO': 'En Riesgo',
      'BLOQUEADO': 'Bloqueado',
      'COMPLETADO': 'Completado'
    };

    await createNotification({
      userId,
      type: 'STATUS_CHANGE',
      title: `Prioridad "${priorityTitle}" cambió a ${statusLabels[newStatus]}`,
      message: `El estado cambió de "${statusLabels[oldStatus]}" a "${statusLabels[newStatus]}"`,
      priorityId,
      actionUrl: `/priorities`,
      sendEmail: true
    });
  }
}

export async function notifyComment(
  userId: string,
  commenterName: string,
  priorityTitle: string,
  commentText: string,
  priorityId: string,
  commentId: string
) {
  await createNotification({
    userId,
    type: 'COMMENT',
    title: `${commenterName} comentó en "${priorityTitle}"`,
    message: commentText.substring(0, 100) + (commentText.length > 100 ? '...' : ''),
    priorityId,
    commentId,
    actionUrl: `/priorities`,
    sendEmail: true
  });
}

export async function notifyMention(
  userId: string,
  mentionerName: string,
  priorityTitle: string,
  commentText: string,
  priorityId: string,
  commentId: string
) {
  await createNotification({
    userId,
    type: 'MENTION',
    title: `${mentionerName} te mencionó en "${priorityTitle}"`,
    message: commentText.substring(0, 100) + (commentText.length > 100 ? '...' : ''),
    priorityId,
    commentId,
    actionUrl: `/priorities`,
    sendEmail: true
  });
}

// Notificación: Prioridad próxima a vencer
export async function notifyPriorityDueSoon(
  userId: string,
  priorityTitle: string,
  completionPercentage: number,
  priorityId: string
) {
  await createNotification({
    userId,
    type: 'PRIORITY_DUE_SOON',
    title: `⏰ Prioridad "${priorityTitle}" vence pronto`,
    message: `Esta prioridad vence mañana y está al ${completionPercentage}% de completado. ¿Necesitas ayuda para terminarla?`,
    priorityId,
    actionUrl: `/priorities`,
    sendEmail: true
  });
}

// Notificación: Hito de % completado alcanzado
export async function notifyCompletionMilestone(
  userId: string,
  priorityTitle: string,
  milestone: number,
  priorityId: string
) {
  const emojis: Record<number, string> = {
    25: '🎯',
    50: '⚡',
    75: '🚀',
    100: '🎉'
  };

  await createNotification({
    userId,
    type: 'COMPLETION_MILESTONE',
    title: `${emojis[milestone]} Prioridad "${priorityTitle}" alcanzó ${milestone}%`,
    message: `¡Excelente progreso! Has completado el ${milestone}% de esta prioridad.`,
    priorityId,
    actionUrl: `/priorities`,
    sendEmail: true // Enviar email para celebrar el progreso
  });
}

// Notificación: Prioridad sin actualizaciones
export async function notifyPriorityInactive(
  userId: string,
  priorityTitle: string,
  daysInactive: number,
  priorityId: string
) {
  await createNotification({
    userId,
    type: 'PRIORITY_INACTIVE',
    title: `🔔 Prioridad "${priorityTitle}" sin actividad`,
    message: `Esta prioridad no ha tenido actualizaciones en ${daysInactive} días. ¿Está bloqueada o necesitas ayuda?`,
    priorityId,
    actionUrl: `/priorities`,
    sendEmail: true
  });
}

// Notificación: Prioridad desbloqueada
export async function notifyPriorityUnblocked(
  userId: string,
  priorityTitle: string,
  newStatus: string,
  priorityId: string
) {
  const statusLabels: Record<string, string> = {
    'EN_TIEMPO': 'En Tiempo',
    'EN_RIESGO': 'En Riesgo',
    'COMPLETADO': 'Completado'
  };

  await createNotification({
    userId,
    type: 'PRIORITY_UNBLOCKED',
    title: `✅ ¡Prioridad "${priorityTitle}" desbloqueada!`,
    message: `La prioridad cambió de "Bloqueado" a "${statusLabels[newStatus]}". ¡Sigue adelante!`,
    priorityId,
    actionUrl: `/priorities`,
    sendEmail: true
  });
}

// Notificación: Todas las prioridades de la semana completadas
export async function notifyWeekCompleted(
  userId: string,
  weekStart: Date,
  weekEnd: Date
) {
  const weekStr = `${weekStart.toLocaleDateString('es-MX')} - ${weekEnd.toLocaleDateString('es-MX')}`;

  await createNotification({
    userId,
    type: 'WEEK_COMPLETED',
    title: `🎉 ¡Felicitaciones! Completaste todas tus prioridades`,
    message: `Has completado todas tus prioridades de la semana ${weekStr}. ¡Excelente trabajo!`,
    actionUrl: `/analytics`,
    sendEmail: true
  });
}

// Notificación: Recordatorio de inicio de semana
export async function notifyWeekStartReminder(userId: string) {
  await createNotification({
    userId,
    type: 'WEEK_START_REMINDER',
    title: `📅 Nueva semana - Define tus prioridades`,
    message: `Es lunes, momento perfecto para definir tus 5 prioridades de esta semana. ¡Comienza con el pie derecho!`,
    actionUrl: `/priorities`,
    sendEmail: true
  });
}

// Notificación: Respuesta a comentario
export async function notifyCommentReply(
  userId: string,
  replierName: string,
  priorityTitle: string,
  replyText: string,
  priorityId: string,
  commentId: string
) {
  await createNotification({
    userId,
    type: 'COMMENT_REPLY',
    title: `${replierName} respondió a tu comentario en "${priorityTitle}"`,
    message: replyText.substring(0, 100) + (replyText.length > 100 ? '...' : ''),
    priorityId,
    commentId,
    actionUrl: `/priorities`,
    sendEmail: true
  });
}

// Notificación: Mención en canal de proyecto
export async function notifyChannelMention(
  userId: string,
  mentionerName: string,
  projectId: string,
  projectName: string,
  messageText: string,
  messageId: string
) {
  await createNotification({
    userId,
    type: 'CHANNEL_MENTION',
    title: `${mentionerName} te mencionó en #${projectName}`,
    message: messageText.substring(0, 100) + (messageText.length > 100 ? '...' : ''),
    projectId,
    projectName,
    messageId,
    actionUrl: `/channels/${projectId}?message=${messageId}`,
    sendEmail: true
  });
}

// Notificación: Mención de grupo en prioridad (optimizado con BCC)
export async function notifyGroupMentionInPriority(
  userIds: string[],
  mentionerName: string,
  groupName: string,
  priorityTitle: string,
  commentText: string,
  priorityId: string,
  commentId: string
) {
  try {
    const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000';
    const priorityUrl = `${baseUrl}/priorities?id=${priorityId}`;
    const title = `${mentionerName} mencionó a @${groupName} en "${priorityTitle}"`;
    const message = commentText.substring(0, 100) + (commentText.length > 100 ? '...' : '');

    // Obtener usuarios activos
    const users = await User.find({
      _id: { $in: userIds },
      isActive: true
    }).select('_id email name emailNotifications').lean();

    // Crear notificaciones internas para cada usuario
    const notificationPromises = users.map(async (user: any) => {
      try {
        await Notification.create({
          userId: user._id,
          type: 'MENTION',
          title,
          message,
          priorityId,
          commentId,
          actionUrl: `/priorities`
        });
      } catch (err) {
        console.error(`Error creating group mention notification for user ${user._id}:`, err);
      }
    });

    await Promise.all(notificationPromises);

    // Obtener emails de usuarios que no han deshabilitado notificaciones
    const emailRecipients = users
      .filter((user: any) => user.emailNotifications?.enabled !== false && user.email)
      .map((user: any) => user.email);

    // Enviar un solo email con BCC
    if (emailRecipients.length > 0) {
      const emailContent = emailTemplates.mention({
        mentionerName,
        priorityTitle,
        commentText,
        priorityUrl
      });

      await sendEmail({
        to: process.env.EMAIL_USERNAME || 'orcaevolution@orcagrc.com',
        bcc: emailRecipients,
        subject: emailContent.subject,
        html: emailContent.html
      });

      console.log(`[GROUP_MENTION_PRIORITY] Email sent to ${emailRecipients.length} members of @${groupName}`);
    }

    console.log(`[GROUP_MENTION_PRIORITY] Notified ${users.length} members of @${groupName} in priority "${priorityTitle}"`);
  } catch (error) {
    console.error('[GROUP_MENTION_PRIORITY] Error:', error);
  }
}

// Notificación: Mención de grupo en canal (optimizado con BCC)
export async function notifyGroupMention(
  userIds: string[],
  mentionerName: string,
  groupName: string,
  projectId: string,
  projectName: string,
  messageText: string,
  messageId: string
) {
  try {
    const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000';
    const channelUrl = `${baseUrl}/channels/${projectId}?message=${messageId}`;
    const title = `${mentionerName} mencionó a @${groupName} en #${projectName}`;
    const message = messageText.substring(0, 100) + (messageText.length > 100 ? '...' : '');

    // Obtener usuarios activos
    const users = await User.find({
      _id: { $in: userIds },
      isActive: true
    }).select('_id email name emailNotifications').lean();

    // Crear notificaciones internas para cada usuario
    const notificationPromises = users.map(async (user: any) => {
      try {
        await Notification.create({
          userId: user._id,
          type: 'CHANNEL_MENTION',
          title,
          message,
          projectId,
          messageId,
          actionUrl: `/channels/${projectId}?message=${messageId}`
        });
      } catch (err) {
        console.error(`Error creating group mention notification for user ${user._id}:`, err);
      }
    });

    await Promise.all(notificationPromises);

    // Obtener emails de usuarios que no han deshabilitado notificaciones
    const emailRecipients = users
      .filter((user: any) => user.emailNotifications?.enabled !== false && user.email)
      .map((user: any) => user.email);

    // Enviar un solo email con BCC
    if (emailRecipients.length > 0) {
      const emailContent = emailTemplates.channelMention({
        mentionerName,
        projectName,
        messageText,
        channelUrl
      });

      await sendEmail({
        to: process.env.EMAIL_USERNAME || 'orcaevolution@orcagrc.com',
        bcc: emailRecipients,
        subject: emailContent.subject,
        html: emailContent.html
      });

      console.log(`[GROUP_MENTION] Email sent to ${emailRecipients.length} members of @${groupName}`);
    }

    console.log(`[GROUP_MENTION] Notified ${users.length} members of @${groupName}`);
  } catch (error) {
    console.error('[GROUP_MENTION] Error:', error);
  }
}

// Notificación: Respuesta en hilo de canal
export async function notifyChannelReply(
  userId: string,
  replierName: string,
  projectId: string,
  projectName: string,
  replyText: string,
  messageId: string
) {
  await createNotification({
    userId,
    type: 'CHANNEL_REPLY',
    title: `${replierName} respondió a tu mensaje en #${projectName}`,
    message: replyText.substring(0, 100) + (replyText.length > 100 ? '...' : ''),
    projectId,
    projectName,
    messageId,
    actionUrl: `/channels/${projectId}?message=${messageId}`,
    sendEmail: true
  });
}

// Notificación: Pregunta en canal
export async function notifyQuestion(
  userId: string,
  askerName: string,
  questionText: string,
  projectId: string,
  projectName: string,
  messageId: string
) {
  await createNotification({
    userId,
    type: 'QUESTION',
    title: `${askerName} te hizo una pregunta importante en #${projectName}`,
    message: questionText.substring(0, 150) + (questionText.length > 150 ? '...' : ''),
    projectId,
    projectName,
    messageId,
    actionUrl: `/channels/${projectId}?message=${messageId}`,
    sendEmail: true
  });
}
