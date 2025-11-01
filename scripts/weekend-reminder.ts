import connectDB from '../lib/mongodb';
import Priority from '../models/Priority';
import User from '../models/User';
import { createNotification } from '../lib/notifications';

/**
 * Script para enviar recordatorios de fin de semana sobre prioridades incompletas
 * Debe ejecutarse los viernes por la tarde/noche
 */
async function sendWeekendReminders() {
  try {
    console.log('[WEEKEND_REMINDER] Starting weekend reminder process...');

    await connectDB();

    // Obtener el viernes de la semana actual
    const now = new Date();
    const dayOfWeek = now.getDay(); // 0 = Domingo, 5 = Viernes

    // Calcular el lunes de esta semana
    const daysFromMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
    const monday = new Date(now);
    monday.setDate(now.getDate() - daysFromMonday);
    monday.setHours(0, 0, 0, 0);

    // Calcular el viernes de esta semana
    const friday = new Date(monday);
    friday.setDate(monday.getDate() + 4);
    friday.setHours(23, 59, 59, 999);

    console.log('[WEEKEND_REMINDER] Week range:', {
      monday: monday.toISOString(),
      friday: friday.toISOString()
    });

    // Buscar prioridades de la semana actual que no estén completadas
    const incompletePriorities = await Priority.find({
      weekStart: { $gte: monday },
      weekEnd: { $lte: friday },
      status: { $ne: 'COMPLETADO' }
    })
      .populate('userId', 'name email emailNotifications')
      .lean();

    console.log(`[WEEKEND_REMINDER] Found ${incompletePriorities.length} incomplete priorities`);

    // Agrupar prioridades por usuario
    const prioritiesByUser = new Map<string, any[]>();

    for (const priority of incompletePriorities) {
      const userId = priority.userId._id.toString();
      if (!prioritiesByUser.has(userId)) {
        prioritiesByUser.set(userId, []);
      }
      prioritiesByUser.get(userId)!.push(priority);
    }

    console.log(`[WEEKEND_REMINDER] Found ${prioritiesByUser.size} users with incomplete priorities`);

    // Enviar notificaciones a cada usuario
    let notificationsSent = 0;
    for (const [userId, priorities] of prioritiesByUser) {
      const user = priorities[0].userId;

      const priorityTitles = priorities
        .map(p => `• ${p.title}`)
        .join('\n');

      const message = `Tienes ${priorities.length} prioridad${priorities.length > 1 ? 'es' : ''} pendiente${priorities.length > 1 ? 's' : ''} para esta semana:\n\n${priorityTitles}`;

      try {
        await createNotification({
          userId,
          type: 'WEEKEND_REMINDER',
          title: `📅 Recordatorio de fin de semana`,
          message,
          actionUrl: '/priorities',
          sendEmail: true // Esto enviará email si el usuario tiene las notificaciones habilitadas
        });

        notificationsSent++;
        console.log(`[WEEKEND_REMINDER] Notification sent to user ${user.name}`);
      } catch (error) {
        console.error(`[WEEKEND_REMINDER] Error sending notification to user ${userId}:`, error);
      }
    }

    console.log(`[WEEKEND_REMINDER] Process completed. Sent ${notificationsSent} notifications`);

    return {
      success: true,
      totalIncompletePriorities: incompletePriorities.length,
      usersNotified: notificationsSent
    };
  } catch (error) {
    console.error('[WEEKEND_REMINDER] Error:', error);
    throw error;
  }
}

// Si se ejecuta directamente
if (require.main === module) {
  sendWeekendReminders()
    .then((result) => {
      console.log('[WEEKEND_REMINDER] Result:', result);
      process.exit(0);
    })
    .catch((error) => {
      console.error('[WEEKEND_REMINDER] Fatal error:', error);
      process.exit(1);
    });
}

export default sendWeekendReminders;
