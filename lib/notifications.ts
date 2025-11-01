import Notification from '@/models/Notification';
import { sendEmail, emailTemplates } from './email';
import User from '@/models/User';

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
    | 'COMMENT_REPLY';
  title: string;
  message: string;
  priorityId?: string;
  commentId?: string;
  actionUrl?: string;
  sendEmail?: boolean;
}

export async function createNotification(params: CreateNotificationParams) {
  try {
    const notification = await Notification.create({
      userId: params.userId,
      type: params.type,
      title: params.title,
      message: params.message,
      priorityId: params.priorityId,
      commentId: params.commentId,
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
                priorityTitle: params.title.replace(/^Prioridad "(.+)" cambió a .+$/, '$1'),
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
              const priorityTitle = params.title.split('" comentó en "')[1]?.replace('"', '') || 'Prioridad';
              emailContent = emailTemplates.newComment({
                priorityTitle,
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
              const priorityTitle = params.title.split('" te mencionó en "')[1]?.replace('"', '') || 'Prioridad';
              emailContent = emailTemplates.mention({
                mentionerName,
                priorityTitle,
                commentText: params.message,
                priorityUrl
              });
            }
            break;

          case 'COMMENT_REPLY':
            if (user.emailNotifications.newComments) {
              const replierName = params.title.split(' respondió a tu comentario en ')[0];
              const priorityTitle = params.title.split('" respondió a tu comentario en "')[1]?.replace('"', '') || 'Prioridad';
              emailContent = emailTemplates.commentReply({
                replierName,
                priorityTitle,
                replyText: params.message,
                priorityUrl
              });
            }
            break;

          case 'PRIORITY_DUE_SOON':
            emailContent = emailTemplates.priorityDueSoon({
              priorityTitle: params.title.replace(/^⏰ Prioridad "(.+)" vence pronto$/, '$1'),
              completionPercentage: parseInt(params.message.match(/(\d+)%/)?.[1] || '0'),
              priorityUrl
            });
            break;

          case 'COMPLETION_MILESTONE':
            emailContent = emailTemplates.completionMilestone({
              priorityTitle: params.title.match(/"(.+)" alcanzó/)?.[1] || 'Prioridad',
              milestone: parseInt(params.title.match(/(\d+)%/)?.[1] || '0'),
              priorityUrl
            });
            break;

          case 'PRIORITY_INACTIVE':
            emailContent = emailTemplates.priorityInactive({
              priorityTitle: params.title.replace(/^🔔 Prioridad "(.+)" sin actividad$/, '$1'),
              daysInactive: parseInt(params.message.match(/(\d+) días/)?.[1] || '0'),
              priorityUrl
            });
            break;

          case 'PRIORITY_UNBLOCKED':
            const unblockedTitle = params.title.replace(/^✅ ¡Prioridad "(.+)" desbloqueada!$/, '$1');
            const unblockedStatus = params.message.match(/"Bloqueado" a "([^"]+)"/)?.[1] || 'En Tiempo';
            emailContent = emailTemplates.priorityUnblocked({
              priorityTitle: unblockedTitle,
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
