import User from '@/models/User';
import Badge from '@/models/Badge';
import Priority from '@/models/Priority';
import { sendEmail, emailTemplates } from './email';

// Definición de badges
export const BADGE_DEFINITIONS = {
  FIRST_TASK: {
    name: 'Primera Tarea',
    description: 'Registró su primera tarea en el checklist',
    icon: '✅'
  },
  FIRST_COMMENT: {
    name: 'Primer Comentario',
    description: 'Agregó su primer comentario',
    icon: '💬'
  },
  FIRST_MENTION: {
    name: 'Primera Mención',
    description: 'Mencionó a otro usuario por primera vez',
    icon: '@️'
  },
  FIVE_WEEKS_STREAK: {
    name: 'Racha de 5 Semanas',
    description: '5 semanas consecutivas con 100% de prioridades completadas',
    icon: '🔥'
  }
};

// Puntos por acciones
export const POINTS = {
  PRIORITY_COMPLETED: 4,
  PRIORITY_AT_RISK_PENALTY: -6,
  PRIORITY_RESCUED: -2
};

/**
 * Otorga un badge a un usuario si aún no lo tiene
 */
export async function awardBadge(
  userId: string,
  badgeType: keyof typeof BADGE_DEFINITIONS
) {
  try {
    // Verificar si el badge ya existe (excepto FIVE_WEEKS_STREAK que puede repetirse)
    if (badgeType !== 'FIVE_WEEKS_STREAK') {
      const existing = await Badge.findOne({ userId, type: badgeType });
      if (existing) {
        return null; // Ya tiene este badge
      }
    }

    const badgeInfo = BADGE_DEFINITIONS[badgeType];
    const badge = await Badge.create({
      userId,
      type: badgeType,
      name: badgeInfo.name,
      description: badgeInfo.description,
      icon: badgeInfo.icon
    });

    return badge;
  } catch (error) {
    console.error('Error awarding badge:', error);
    return null;
  }
}

/**
 * Calcula y actualiza los puntos de un usuario para la semana actual
 */
export async function calculateWeeklyPoints(
  userId: string,
  weekStart: Date,
  weekEnd: Date
) {
  try {
    const priorities = await Priority.find({
      userId,
      weekStart: { $gte: weekStart },
      weekEnd: { $lte: weekEnd }
    });

    let points = 0;

    // Prioridades completadas: +4 puntos cada una
    const completedPriorities = priorities.filter(p => p.status === 'COMPLETADO');
    points += completedPriorities.length * POINTS.PRIORITY_COMPLETED;

    // Prioridades en riesgo o bloqueadas: -6 puntos cada una
    const atRiskPriorities = priorities.filter(
      p => p.status === 'EN_RIESGO' || p.status === 'BLOQUEADO'
    );
    points += atRiskPriorities.length * POINTS.PRIORITY_AT_RISK_PENALTY;

    return points;
  } catch (error) {
    console.error('Error calculating weekly points:', error);
    return 0;
  }
}

/**
 * Actualiza los puntos del usuario
 */
export async function updateUserPoints(userId: string, pointsToAdd: number) {
  try {
    const user = await User.findById(userId);
    if (!user) return null;

    if (!user.gamification) {
      user.gamification = {
        points: 0,
        currentMonthPoints: 0,
        totalPoints: 0,
        currentStreak: 0,
        longestStreak: 0
      };
    }

    user.gamification.points += pointsToAdd;
    user.gamification.currentMonthPoints += pointsToAdd;
    user.gamification.totalPoints += pointsToAdd;

    await user.save();
    return user;
  } catch (error) {
    console.error('Error updating user points:', error);
    return null;
  }
}

/**
 * Verifica y actualiza la racha de un usuario
 */
export async function checkAndUpdateStreak(userId: string, weekEnd: Date) {
  try {
    const user = await User.findById(userId);
    if (!user) return;

    // Verificar si todas las prioridades de la semana están completadas
    const priorities = await Priority.find({
      userId,
      weekEnd: {
        $gte: new Date(weekEnd.getTime() - 7 * 24 * 60 * 60 * 1000),
        $lte: weekEnd
      }
    });

    if (priorities.length === 0) return;

    const allCompleted = priorities.every(p => p.status === 'COMPLETADO');

    if (!user.gamification) {
      user.gamification = {
        points: 0,
        currentMonthPoints: 0,
        totalPoints: 0,
        currentStreak: 0,
        longestStreak: 0
      };
    }

    if (allCompleted) {
      // Verificar si es consecutiva
      const lastWeek = user.gamification.lastCompletedWeek;
      const isConsecutive = lastWeek &&
        (weekEnd.getTime() - new Date(lastWeek).getTime()) <= 8 * 24 * 60 * 60 * 1000;

      if (isConsecutive) {
        user.gamification.currentStreak += 1;
      } else {
        user.gamification.currentStreak = 1;
      }

      user.gamification.lastCompletedWeek = weekEnd;

      // Actualizar racha más larga
      if (user.gamification.currentStreak > user.gamification.longestStreak) {
        user.gamification.longestStreak = user.gamification.currentStreak;
      }

      // Otorgar badge si alcanza 5 semanas consecutivas
      if (user.gamification.currentStreak === 5) {
        await awardBadge(userId.toString(), 'FIVE_WEEKS_STREAK');
      }
    } else {
      // Romper racha si no completó todas
      user.gamification.currentStreak = 0;
    }

    await user.save();
  } catch (error) {
    console.error('Error checking streak:', error);
  }
}

/**
 * Resetea los puntos mensuales y envía email al ganador
 */
export async function resetMonthlyPointsAndNotifyWinner() {
  try {
    // Obtener el ganador del mes
    const users = await User.find({ isActive: true }).sort({ 'gamification.currentMonthPoints': -1 }).limit(3);

    if (users.length === 0) return;

    const winner = users[0];
    const admins = await User.find({ role: 'ADMIN', isActive: true });

    // Enviar email al ganador con copia a admins
    if (winner.gamification && winner.gamification.currentMonthPoints > 0) {
      const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000';
      const adminEmails = admins.map(admin => admin.email);

      const emailContent = {
        subject: `🏆 ¡Felicitaciones! Ganaste el Leaderboard del mes`,
        html: `
          <!DOCTYPE html>
          <html>
            <head>
              <meta charset="utf-8">
            </head>
            <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
              <div style="background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); color: white; padding: 30px; border-radius: 10px; text-align: center;">
                <h1 style="margin: 0; font-size: 32px;">🏆 ¡Felicitaciones ${winner.name}!</h1>
              </div>
              <div style="padding: 30px; background: #f9fafb;">
                <h2 style="color: #1f2937;">Ganaste el Leaderboard del mes</h2>
                <p style="font-size: 18px; color: #4b5563;">
                  ¡Increíble logro! Has sido el colaborador con más puntos este mes.
                </p>
                <div style="background: white; padding: 20px; border-left: 4px solid #f59e0b; border-radius: 5px; margin: 20px 0;">
                  <p style="font-size: 24px; font-weight: bold; color: #f59e0b; margin: 0;">
                    ${winner.gamification.currentMonthPoints} puntos
                  </p>
                  <p style="color: #6b7280; margin: 10px 0 0 0;">Puntuación total del mes</p>
                </div>
                <p style="color: #4b5563;">
                  Tu dedicación y compromiso con tus prioridades es un ejemplo para todo el equipo.
                  ¡Sigue así!
                </p>
                <a href="${baseUrl}/analytics" style="display: inline-block; background: #f59e0b; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin-top: 20px; font-weight: 600;">
                  Ver Estadísticas
                </a>
              </div>
              <div style="text-align: center; padding: 20px; color: #6b7280; font-size: 12px;">
                <p><strong>Sistema de Prioridades</strong> - Orca GRC</p>
                <p>Este es un correo automático.</p>
              </div>
            </body>
          </html>
        `
      };

      // Enviar al ganador
      await sendEmail({
        to: winner.email,
        subject: emailContent.subject,
        html: emailContent.html
      });

      // Enviar copia a admins
      if (adminEmails.length > 0) {
        await sendEmail({
          to: adminEmails,
          subject: `🏆 ${winner.name} ganó el Leaderboard del mes`,
          html: emailContent.html
        });
      }
    }

    // Resetear puntos mensuales de todos los usuarios
    await User.updateMany(
      { isActive: true },
      { $set: { 'gamification.currentMonthPoints': 0 } }
    );

    return winner;
  } catch (error) {
    console.error('Error resetting monthly points:', error);
    return null;
  }
}

/**
 * Obtiene el leaderboard del mes actual
 */
export async function getMonthlyLeaderboard() {
  try {
    const users = await User.find({ isActive: true })
      .select('name email gamification')
      .sort({ 'gamification.currentMonthPoints': -1 })
      .limit(10);

    return users.map((user, index) => ({
      rank: index + 1,
      userId: user._id,
      name: user.name,
      points: user.gamification?.currentMonthPoints || 0,
      totalPoints: user.gamification?.totalPoints || 0,
      currentStreak: user.gamification?.currentStreak || 0
    }));
  } catch (error) {
    console.error('Error getting leaderboard:', error);
    return [];
  }
}

/**
 * Obtiene los badges de un usuario
 */
export async function getUserBadges(userId: string) {
  try {
    const badges = await Badge.find({ userId }).sort({ earnedAt: -1 });
    return badges;
  } catch (error) {
    console.error('Error getting user badges:', error);
    return [];
  }
}
