import connectDB from '../lib/mongodb';
import Priority from '../models/Priority';
import User from '../models/User';
import Comment from '../models/Comment';
import StrategicInitiative from '../models/StrategicInitiative';
import {
  notifyPriorityDueSoon,
  notifyPriorityInactive,
  createNotification
} from '../lib/notifications';

/**
 * Script para ejecutar notificaciones diarias
 * Ejecutar todos los días a las 9 AM
 */
export async function sendDailyNotifications() {
  try {
    console.log('[DAILY_NOTIFICATIONS] Starting daily notifications process...');

    await connectDB();

    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(23, 59, 59, 999);

    const results = {
      dueSoon: 0,
      inactive: 0,
      initiativesAtRisk: 0
    };

    // 1. Prioridades próximas a vencer (vencen mañana y no están completadas)
    console.log('[DAILY_NOTIFICATIONS] Checking priorities due soon...');
    const prioritiesDueSoon = await Priority.find({
      weekEnd: { $lte: tomorrow, $gte: now },
      status: { $ne: 'COMPLETADO' },
      completionPercentage: { $lt: 100 }
    }).lean();

    for (const priority of prioritiesDueSoon) {
      try {
        await notifyPriorityDueSoon(
          priority.userId.toString(),
          priority.title,
          priority.completionPercentage,
          priority._id.toString()
        );
        results.dueSoon++;
      } catch (error) {
        console.error(`[DAILY_NOTIFICATIONS] Error notifying due soon for priority ${priority._id}:`, error);
      }
    }

    // 2. Prioridades sin actividad (sin actualizaciones en 3+ días)
    console.log('[DAILY_NOTIFICATIONS] Checking inactive priorities...');
    const threeDaysAgo = new Date(now);
    threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);

    const allActivePriorities = await Priority.find({
      status: { $nin: ['COMPLETADO'] },
      weekEnd: { $gte: now }
    }).lean();

    for (const priority of allActivePriorities) {
      // Verificar última actividad (comentarios o ediciones)
      const lastComment = await Comment.findOne({
        priorityId: priority._id
      })
        .sort({ createdAt: -1 })
        .lean();

      const lastActivity = lastComment
        ? new Date(lastComment.createdAt)
        : new Date(priority.lastEditedAt || priority.createdAt);

      if (lastActivity < threeDaysAgo) {
        const daysInactive = Math.floor((now.getTime() - lastActivity.getTime()) / (1000 * 60 * 60 * 24));
        try {
          await notifyPriorityInactive(
            priority.userId.toString(),
            priority.title,
            daysInactive,
            priority._id.toString()
          );
          results.inactive++;
        } catch (error) {
          console.error(`[DAILY_NOTIFICATIONS] Error notifying inactive for priority ${priority._id}:`, error);
        }
      }
    }

    // 3. Iniciativas en riesgo (múltiples prioridades en riesgo/bloqueadas)
    console.log('[DAILY_NOTIFICATIONS] Checking initiatives at risk...');
    const initiatives = await StrategicInitiative.find({ isActive: true }).lean();

    for (const initiative of initiatives) {
      const prioritiesInInitiative = await Priority.find({
        initiativeIds: initiative._id,
        weekEnd: { $gte: now },
        status: { $in: ['EN_RIESGO', 'BLOQUEADO'] }
      }).lean();

      // Si 2 o más prioridades están en riesgo/bloqueadas
      if (prioritiesInInitiative.length >= 2) {
        // Obtener todos los usuarios únicos de esas prioridades
        const userIds = [...new Set(prioritiesInInitiative.map(p => p.userId.toString()))];

        for (const userId of userIds) {
          try {
            const userPriorities = prioritiesInInitiative.filter(
              p => p.userId.toString() === userId
            );

            await createNotification({
              userId,
              type: 'INITIATIVE_AT_RISK',
              title: `⚠️ Iniciativa "${initiative.name}" en riesgo`,
              message: `Tienes ${userPriorities.length} prioridades en riesgo/bloqueadas en esta iniciativa. ¿Necesitas apoyo del equipo?`,
              actionUrl: '/priorities',
              sendEmail: true
            });

            results.initiativesAtRisk++;
          } catch (error) {
            console.error(`[DAILY_NOTIFICATIONS] Error notifying initiative at risk for user ${userId}:`, error);
          }
        }
      }
    }

    console.log('[DAILY_NOTIFICATIONS] Daily notifications completed:', results);
    return {
      success: true,
      ...results
    };
  } catch (error) {
    console.error('[DAILY_NOTIFICATIONS] Error:', error);
    throw error;
  }
}

// Si se ejecuta directamente
if (require.main === module) {
  sendDailyNotifications()
    .then((result) => {
      console.log('[DAILY_NOTIFICATIONS] Result:', result);
      process.exit(0);
    })
    .catch((error) => {
      console.error('[DAILY_NOTIFICATIONS] Fatal error:', error);
      process.exit(1);
    });
}

export default sendDailyNotifications;
