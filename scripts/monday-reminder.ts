import connectDB from '../lib/mongodb';
import User from '../models/User';
import Priority from '../models/Priority';
import { notifyWeekStartReminder, createNotification } from '../lib/notifications';

/**
 * Script para enviar recordatorios los lunes
 * Ejecutar todos los lunes a las 8 AM
 */
export async function sendMondayReminders() {
  try {
    console.log('[MONDAY_REMINDER] Starting Monday reminder process...');

    await connectDB();

    const now = new Date();

    // Calcular el lunes de esta semana
    const dayOfWeek = now.getDay();
    const daysFromMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
    const monday = new Date(now);
    monday.setDate(now.getDate() - daysFromMonday);
    monday.setHours(0, 0, 0, 0);

    // Calcular el viernes de esta semana
    const friday = new Date(monday);
    friday.setDate(monday.getDate() + 4);
    friday.setHours(23, 59, 59, 999);

    // Calcular el lunes de la semana pasada
    const lastMonday = new Date(monday);
    lastMonday.setDate(monday.getDate() - 7);

    // Calcular el viernes de la semana pasada
    const lastFriday = new Date(lastMonday);
    lastFriday.setDate(lastMonday.getDate() + 4);
    lastFriday.setHours(23, 59, 59, 999);

    const results = {
      weekStartReminders: 0,
      weeklySummaries: 0
    };

    // Obtener todos los usuarios activos
    const users = await User.find({ isActive: true }).lean();

    for (const user of users) {
      try {
        // 1. Recordatorio de inicio de semana
        await notifyWeekStartReminder(user._id.toString());
        results.weekStartReminders++;

        // 2. Resumen de la semana anterior
        const lastWeekPriorities = await Priority.find({
          userId: user._id,
          weekStart: { $gte: lastMonday, $lte: lastMonday },
          weekEnd: { $gte: lastFriday, $lte: lastFriday }
        }).lean();

        if (lastWeekPriorities.length > 0) {
          const completed = lastWeekPriorities.filter(
            p => p.status === 'COMPLETADO' || p.completionPercentage === 100
          ).length;

          const inProgress = lastWeekPriorities.filter(
            p => p.status === 'EN_TIEMPO' || p.status === 'EN_RIESGO'
          ).length;

          const blocked = lastWeekPriorities.filter(
            p => p.status === 'BLOQUEADO'
          ).length;

          const avgCompletion = Math.round(
            lastWeekPriorities.reduce((sum, p) => sum + p.completionPercentage, 0) /
            lastWeekPriorities.length
          );

          let summaryMessage = `Resumen de la semana pasada:\n\n`;
          summaryMessage += `📊 Total de prioridades: ${lastWeekPriorities.length}\n`;
          summaryMessage += `✅ Completadas: ${completed}\n`;
          summaryMessage += `🔄 En progreso: ${inProgress}\n`;
          if (blocked > 0) summaryMessage += `🚫 Bloqueadas: ${blocked}\n`;
          summaryMessage += `📈 Completado promedio: ${avgCompletion}%`;

          await createNotification({
            userId: user._id.toString(),
            type: 'WEEKLY_SUMMARY',
            title: `📊 Resumen Semanal (${lastMonday.toLocaleDateString('es-MX')} - ${lastFriday.toLocaleDateString('es-MX')})`,
            message: summaryMessage,
            actionUrl: '/history',
            sendEmail: true
          });

          results.weeklySummaries++;
        }
      } catch (error) {
        console.error(`[MONDAY_REMINDER] Error sending reminders to user ${user._id}:`, error);
      }
    }

    console.log('[MONDAY_REMINDER] Monday reminders completed:', results);
    return {
      success: true,
      ...results
    };
  } catch (error) {
    console.error('[MONDAY_REMINDER] Error:', error);
    throw error;
  }
}

// Si se ejecuta directamente
if (require.main === module) {
  sendMondayReminders()
    .then((result) => {
      console.log('[MONDAY_REMINDER] Result:', result);
      process.exit(0);
    })
    .catch((error) => {
      console.error('[MONDAY_REMINDER] Fatal error:', error);
      process.exit(1);
    });
}

export default sendMondayReminders;
