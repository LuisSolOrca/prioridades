import webpush from 'web-push';
import connectDB from '@/lib/mongodb';
import PushSubscription from '@/models/PushSubscription';

// Configurar VAPID keys
const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || '';
const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY || '';

if (vapidPublicKey && vapidPrivateKey) {
  webpush.setVapidDetails(
    'mailto:admin@prioridades-app.com',
    vapidPublicKey,
    vapidPrivateKey
  );
}

export interface PushNotificationPayload {
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  tag?: string;
  data?: {
    type?: 'message' | 'priority' | 'task' | 'mention' | 'dynamic' | 'system';
    url?: string;
    channelId?: string;
    priorityId?: string;
    messageId?: string;
    [key: string]: any;
  };
  actions?: Array<{
    action: string;
    title: string;
    icon?: string;
  }>;
  requireInteraction?: boolean;
  silent?: boolean;
}

/**
 * Envía una notificación push a un usuario específico
 */
export async function sendPushToUser(
  userId: string,
  payload: PushNotificationPayload
): Promise<{ success: number; failed: number }> {
  await connectDB();

  const subscriptions = await PushSubscription.find({ userId });

  if (subscriptions.length === 0) {
    return { success: 0, failed: 0 };
  }

  let success = 0;
  let failed = 0;

  for (const sub of subscriptions) {
    try {
      await webpush.sendNotification(
        {
          endpoint: sub.endpoint,
          keys: {
            p256dh: sub.keys.p256dh,
            auth: sub.keys.auth
          }
        },
        JSON.stringify(payload)
      );
      success++;
    } catch (error: any) {
      console.error(`Error enviando push a ${sub.endpoint}:`, error.message);
      failed++;

      // Si la suscripción ya no es válida, eliminarla
      if (error.statusCode === 404 || error.statusCode === 410) {
        await PushSubscription.deleteOne({ _id: sub._id });
        console.log(`Suscripción eliminada: ${sub.endpoint}`);
      }
    }
  }

  return { success, failed };
}

/**
 * Envía una notificación push a múltiples usuarios
 */
export async function sendPushToUsers(
  userIds: string[],
  payload: PushNotificationPayload
): Promise<{ success: number; failed: number }> {
  let totalSuccess = 0;
  let totalFailed = 0;

  for (const userId of userIds) {
    const result = await sendPushToUser(userId, payload);
    totalSuccess += result.success;
    totalFailed += result.failed;
  }

  return { success: totalSuccess, failed: totalFailed };
}

/**
 * Envía una notificación push a todos los usuarios excepto los excluidos
 */
export async function sendPushToAll(
  payload: PushNotificationPayload,
  excludeUserIds: string[] = []
): Promise<{ success: number; failed: number }> {
  await connectDB();

  const query = excludeUserIds.length > 0
    ? { userId: { $nin: excludeUserIds } }
    : {};

  const subscriptions = await PushSubscription.find(query);

  let success = 0;
  let failed = 0;

  for (const sub of subscriptions) {
    try {
      await webpush.sendNotification(
        {
          endpoint: sub.endpoint,
          keys: {
            p256dh: sub.keys.p256dh,
            auth: sub.keys.auth
          }
        },
        JSON.stringify(payload)
      );
      success++;
    } catch (error: any) {
      console.error(`Error enviando push a ${sub.endpoint}:`, error.message);
      failed++;

      if (error.statusCode === 404 || error.statusCode === 410) {
        await PushSubscription.deleteOne({ _id: sub._id });
      }
    }
  }

  return { success, failed };
}

// ============================================
// Funciones de conveniencia para tipos comunes
// ============================================

/**
 * Notificación de nuevo mensaje en canal
 */
export async function notifyNewMessage(
  recipientUserIds: string[],
  senderName: string,
  channelName: string,
  messagePreview: string,
  channelId: string,
  messageId: string
): Promise<void> {
  const payload: PushNotificationPayload = {
    title: `💬 ${senderName} en ${channelName}`,
    body: messagePreview.length > 100 ? messagePreview.substring(0, 100) + '...' : messagePreview,
    tag: `message-${channelId}`,
    data: {
      type: 'message',
      channelId,
      messageId
    },
    actions: [
      { action: 'view', title: 'Ver mensaje' },
      { action: 'dismiss', title: 'Cerrar' }
    ]
  };

  await sendPushToUsers(recipientUserIds, payload);
}

/**
 * Notificación de mención
 */
export async function notifyMention(
  mentionedUserId: string,
  mentionerName: string,
  channelName: string,
  messagePreview: string,
  channelId: string,
  messageId: string
): Promise<void> {
  const payload: PushNotificationPayload = {
    title: `🔔 ${mentionerName} te mencionó`,
    body: `En ${channelName}: ${messagePreview.length > 80 ? messagePreview.substring(0, 80) + '...' : messagePreview}`,
    tag: `mention-${messageId}`,
    requireInteraction: true,
    data: {
      type: 'mention',
      channelId,
      messageId
    },
    actions: [
      { action: 'view', title: 'Ver' },
      { action: 'dismiss', title: 'Cerrar' }
    ]
  };

  await sendPushToUser(mentionedUserId, payload);
}

/**
 * Notificación de prioridad asignada
 */
export async function notifyPriorityAssigned(
  userId: string,
  priorityTitle: string,
  assignerName: string,
  priorityId: string
): Promise<void> {
  const payload: PushNotificationPayload = {
    title: '🎯 Nueva prioridad asignada',
    body: `${assignerName} te asignó: ${priorityTitle}`,
    tag: `priority-${priorityId}`,
    data: {
      type: 'priority',
      priorityId
    },
    actions: [
      { action: 'view', title: 'Ver prioridad' }
    ]
  };

  await sendPushToUser(userId, payload);
}

/**
 * Notificación de cambio de estado de prioridad
 */
export async function notifyPriorityStatusChange(
  userId: string,
  priorityTitle: string,
  newStatus: string,
  priorityId: string
): Promise<void> {
  const statusLabels: { [key: string]: string } = {
    EN_TIEMPO: 'En Tiempo ✅',
    EN_RIESGO: 'En Riesgo ⚠️',
    BLOQUEADO: 'Bloqueado 🚫',
    COMPLETADO: 'Completado 🎉'
  };

  const payload: PushNotificationPayload = {
    title: '📊 Estado de prioridad actualizado',
    body: `"${priorityTitle}" ahora está: ${statusLabels[newStatus] || newStatus}`,
    tag: `priority-status-${priorityId}`,
    data: {
      type: 'priority',
      priorityId
    }
  };

  await sendPushToUser(userId, payload);
}

/**
 * Notificación de nueva dinámica colaborativa
 */
export async function notifyNewDynamic(
  recipientUserIds: string[],
  creatorName: string,
  dynamicType: string,
  channelName: string,
  channelId: string
): Promise<void> {
  const dynamicLabels: { [key: string]: string } = {
    poll: '📊 Encuesta',
    brainstorm: '💡 Lluvia de Ideas',
    retro: '🔄 Retrospectiva',
    'decision-matrix': '📋 Matriz de Decisión',
    'five-whys': '❓ 5 Porqués',
    'action-items': '✅ Plan de Acción',
    swot: '📈 Análisis SWOT',
    'risk-matrix': '⚠️ Matriz de Riesgos',
    'dot-voting': '🔵 Votación por Puntos',
    rice: '📊 RICE Scoring',
    standup: '🧍 Daily Standup'
  };

  const payload: PushNotificationPayload = {
    title: `${dynamicLabels[dynamicType] || '🎯 Nueva dinámica'}`,
    body: `${creatorName} inició una dinámica en ${channelName}`,
    tag: `dynamic-${channelId}-${Date.now()}`,
    data: {
      type: 'dynamic',
      channelId
    },
    actions: [
      { action: 'view', title: 'Participar' }
    ]
  };

  await sendPushToUsers(recipientUserIds, payload);
}

/**
 * Notificación de tarea asignada
 */
export async function notifyTaskAssigned(
  userId: string,
  taskTitle: string,
  assignerName: string,
  priorityTitle: string
): Promise<void> {
  const payload: PushNotificationPayload = {
    title: '📝 Nueva tarea asignada',
    body: `${assignerName} te asignó "${taskTitle}" en "${priorityTitle}"`,
    tag: `task-${Date.now()}`,
    data: {
      type: 'task'
    },
    actions: [
      { action: 'view', title: 'Ver tarea' }
    ]
  };

  await sendPushToUser(userId, payload);
}
