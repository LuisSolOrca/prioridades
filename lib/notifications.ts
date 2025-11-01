import Notification from '@/models/Notification';
import { sendEmail, emailTemplates } from './email';
import User from '@/models/User';

interface CreateNotificationParams {
  userId: string;
  type: 'STATUS_CHANGE' | 'COMMENT' | 'MENTION' | 'WEEKEND_REMINDER' | 'PRIORITY_ASSIGNED';
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

        let emailContent;
        switch (params.type) {
          case 'STATUS_CHANGE':
            if (user.emailNotifications.statusChanges) {
              emailContent = {
                subject: `⚠️ ${params.title}`,
                html: `
                  <h2>${params.title}</h2>
                  <p>${params.message}</p>
                  <p><a href="${baseUrl}${params.actionUrl || '/priorities'}" style="background-color: #3b82f6; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block;">Ver Prioridad</a></p>
                `
              };
            }
            break;

          case 'COMMENT':
          case 'MENTION':
            if (user.emailNotifications.newComments) {
              emailContent = {
                subject: `💬 ${params.title}`,
                html: `
                  <h2>${params.title}</h2>
                  <p>${params.message}</p>
                  <p><a href="${baseUrl}${params.actionUrl || '/priorities'}" style="background-color: #3b82f6; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block;">Ver Comentario</a></p>
                `
              };
            }
            break;

          case 'WEEKEND_REMINDER':
            emailContent = {
              subject: `📅 ${params.title}`,
              html: `
                <h2>${params.title}</h2>
                <p>${params.message}</p>
                <p><a href="${baseUrl}/priorities" style="background-color: #3b82f6; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block;">Ver Prioridades</a></p>
              `
            };
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
