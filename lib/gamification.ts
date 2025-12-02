import User from '@/models/User';
import Badge from '@/models/Badge';
import Priority from '@/models/Priority';
import SystemSettings from '@/models/SystemSettings';
import { sendEmail, emailTemplates } from './email';
import { DIRECCION_GENERAL_USER_ID } from './direccionGeneralFilter';

// Definición de badges
export const BADGE_DEFINITIONS = {
  // Badges de prioridades y tareas
  PRIMERA_VICTORIA: {
    name: 'Primera Victoria',
    description: 'Completó su primera prioridad',
    icon: '🎯'
  },
  PERFECCIONISTA: {
    name: 'Perfeccionista',
    description: 'Completó una semana al 100%',
    icon: '💯'
  },
  RACHA_FUEGO: {
    name: 'Racha de Fuego',
    description: '5 semanas consecutivas al 100%',
    icon: '🔥'
  },
  VETERANO: {
    name: 'Veterano',
    description: '20 prioridades completadas',
    icon: '⭐'
  },
  IMPARABLE: {
    name: 'Imparable',
    description: '10 prioridades completadas en un mes',
    icon: '🚀'
  },

  // Badges de colaboración
  PRIMER_COMENTARIO: {
    name: 'Primer Comentario',
    description: 'Agregó su primer comentario',
    icon: '💬'
  },
  PRIMERA_MENCION: {
    name: 'Primera Mención',
    description: 'Mencionó a otro usuario por primera vez',
    icon: '@️'
  },
  CONVERSADOR: {
    name: 'Conversador',
    description: 'Realizó 10 comentarios',
    icon: '💭'
  },

  // Badges de IA
  ASISTENTE_IA: {
    name: 'Asistente IA',
    description: 'Usó la mejora de texto con IA por primera vez',
    icon: '🤖'
  },
  POTENCIADO_IA: {
    name: 'Potenciado por IA',
    description: 'Usó la mejora de texto con IA 5 veces',
    icon: '✨'
  },
  ESTRATEGA_IA: {
    name: 'Estratega IA',
    description: 'Generó su primer análisis organizacional con IA',
    icon: '🧠'
  },

  // Badges de reportes y exportación
  REPORTERO: {
    name: 'Reportero',
    description: 'Generó su primer reporte',
    icon: '📄'
  },
  PRESENTADOR: {
    name: 'Presentador',
    description: 'Exportó su primera presentación de PowerPoint',
    icon: '📊'
  },
  ANALISTA_DATOS: {
    name: 'Analista de Datos',
    description: 'Exportó datos a Excel por primera vez',
    icon: '📈'
  },
  EXPORTADOR_PRO: {
    name: 'Exportador Pro',
    description: 'Realizó 10 exportaciones (Excel, PowerPoint, PDF)',
    icon: '💾'
  },

  // Badges de analytics
  CURIOSO: {
    name: 'Curioso',
    description: 'Visitó la página de Analytics por primera vez',
    icon: '🔍'
  },
  ANALISTA: {
    name: 'Analista',
    description: 'Visitó Analytics 10 veces',
    icon: '📉'
  },

  // Badges de visualización
  ORGANIZADOR_VISUAL: {
    name: 'Organizador Visual',
    description: 'Usó el tablero Kanban por primera vez',
    icon: '🗂️'
  },
  MAESTRO_KANBAN: {
    name: 'Maestro Kanban',
    description: 'Usó el tablero Kanban 20 veces',
    icon: '🎴'
  },

  // Badges de canales
  PRIMER_MENSAJE: {
    name: 'Primer Mensaje',
    description: 'Envió su primer mensaje en un canal',
    icon: '💌'
  },
  CONVERSADOR_CANALES: {
    name: 'Conversador de Canales',
    description: 'Envió 50 mensajes en canales',
    icon: '💬'
  },
  COMUNICADOR_ACTIVO: {
    name: 'Comunicador Activo',
    description: 'Envió 200 mensajes en canales',
    icon: '📣'
  },
  PRIMER_COMANDO: {
    name: 'Primer Comando',
    description: 'Usó su primer slash command',
    icon: '⚡'
  },
  MAESTRO_COMANDOS: {
    name: 'Maestro de Comandos',
    description: 'Usó 10 comandos slash diferentes',
    icon: '🎯'
  },
  ORGANIZADOR_CANALES: {
    name: 'Organizador de Canales',
    description: 'Creó su primer canal',
    icon: '📁'
  },
  ARQUITECTO_CANALES: {
    name: 'Arquitecto de Canales',
    description: 'Creó 5 canales',
    icon: '🏗️'
  },
  COLABORADOR_ESTRELLA: {
    name: 'Colaborador Estrella',
    description: 'Participó en 5 canales diferentes',
    icon: '⭐'
  },
  COMUNICADOR_EFECTIVO: {
    name: 'Comunicador Efectivo',
    description: 'Recibió 20 reacciones en sus mensajes',
    icon: '👍'
  },
  VOTANTE_ACTIVO: {
    name: 'Votante Activo',
    description: 'Participó en 5 comandos interactivos',
    icon: '🗳️'
  },
  FACILITADOR: {
    name: 'Facilitador',
    description: 'Creó 10 comandos interactivos',
    icon: '🎪'
  },

  // Badges especiales
  EXPLORADOR: {
    name: 'Explorador',
    description: 'Usó todas las funcionalidades del sistema',
    icon: '🌟'
  },
  POWER_USER: {
    name: 'Power User',
    description: 'Usuario avanzado: más de 50 acciones en funcionalidades premium',
    icon: '💡'
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
    // Verificar si el badge ya existe (excepto RACHA_FUEGO que puede repetirse)
    if (badgeType !== 'RACHA_FUEGO') {
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

    // Prioridades en riesgo, bloqueadas o reprogramadas: -6 puntos cada una
    const atRiskPriorities = priorities.filter(
      p => p.status === 'EN_RIESGO' || p.status === 'BLOQUEADO' || p.status === 'REPROGRAMADO'
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
        await awardBadge(userId.toString(), 'RACHA_FUEGO');
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
 * Resultado del reseteo del leaderboard
 */
export interface LeaderboardResetResult {
  resetCompleted: boolean;
  winners: Array<{ name: string; rank: number; points: number }>;
  emailsSent: number;
  totalUsersNotified: number;
  error?: string;
}

/**
 * Resetea los puntos mensuales y envía emails a los top 3 ganadores con copia a todos
 */
export async function resetMonthlyPointsAndNotifyWinner(): Promise<LeaderboardResetResult> {
  try {
    // Obtener TODOS los usuarios activos
    const allActiveUsers = await User.find({ isActive: true });

    // Filtrar Francisco Puente del leaderboard (igual que en getMonthlyLeaderboard)
    const eligibleUsers = allActiveUsers.filter(u => u._id.toString() !== DIRECCION_GENERAL_USER_ID);

    if (eligibleUsers.length === 0) {
      return {
        resetCompleted: false,
        winners: [],
        emailsSent: 0,
        totalUsersNotified: 0
      };
    }

    // Calcular puntos REALES para cada usuario (basados en prioridades, no en valor almacenado)
    const usersWithCalculatedPoints = await Promise.all(
      eligibleUsers.map(async (user) => {
        const calculatedPoints = await calculateCurrentMonthPoints(user._id.toString());
        return {
          user,
          points: calculatedPoints
        };
      })
    );

    // Ordenar por puntos calculados (descendente) y tomar top 3
    const sortedUsers = usersWithCalculatedPoints
      .filter(u => u.points > 0)
      .sort((a, b) => b.points - a.points);

    const topUsers = sortedUsers.slice(0, 3);

    if (topUsers.length === 0) {
      // No hay usuarios con puntos positivos, solo resetear
      await User.updateMany(
        { isActive: true },
        { $set: { 'gamification.currentMonthPoints': 0 } }
      );
      return {
        resetCompleted: true,
        winners: [],
        emailsSent: 0,
        totalUsersNotified: 0
      };
    }

    const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000';

    // Emojis y colores por posición
    const rankInfo = [
      { emoji: '🥇', medal: 'Oro', color: '#f59e0b', gradient: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)' },
      { emoji: '🥈', medal: 'Plata', color: '#9ca3af', gradient: 'linear-gradient(135deg, #9ca3af 0%, #6b7280 100%)' },
      { emoji: '🥉', medal: 'Bronce', color: '#ea580c', gradient: 'linear-gradient(135deg, #ea580c 0%, #c2410c 100%)' }
    ];

    const winners: Array<{ name: string; rank: number; points: number }> = [];
    let emailsSent = 0;
    let totalUsersNotified = 0;

    // Enviar emails personalizados a cada ganador del top 3
    for (let i = 0; i < topUsers.length; i++) {
      const { user, points } = topUsers[i];
      const rank = i + 1;
      const info = rankInfo[i];

      const emailContent = {
        subject: `${info.emoji} ¡Felicitaciones! Obtuviste el puesto #${rank} del mes`,
        html: `
          <!DOCTYPE html>
          <html>
            <head>
              <meta charset="utf-8">
            </head>
            <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
              <div style="background: ${info.gradient}; color: white; padding: 30px; border-radius: 10px; text-align: center;">
                <h1 style="margin: 0; font-size: 32px;">${info.emoji} ¡Felicitaciones ${user.name}!</h1>
                <p style="font-size: 18px; margin-top: 10px;">Medalla de ${info.medal} - Puesto #${rank}</p>
              </div>
              <div style="padding: 30px; background: #f9fafb;">
                <h2 style="color: #1f2937;">Obtuviste el puesto #${rank} del Leaderboard del mes</h2>
                <p style="font-size: 18px; color: #4b5563;">
                  ${rank === 1 ? '¡Increíble logro! Has sido el colaborador con más puntos este mes.' :
                    rank === 2 ? '¡Excelente desempeño! Quedaste en segundo lugar.' :
                    '¡Gran trabajo! Quedaste en tercer lugar.'}
                </p>

                <!-- Top 3 del mes -->
                <div style="background: white; padding: 20px; border-radius: 10px; margin: 20px 0;">
                  <h3 style="color: #1f2937; margin-top: 0;">🏆 Top 3 del mes</h3>
                  ${topUsers.map((entry, idx) => `
                    <div style="display: flex; align-items: center; justify-content: space-between; padding: 12px; margin: 8px 0; background: ${idx === i ? '#fef3c7' : '#f9fafb'}; border-radius: 8px; border-left: 4px solid ${rankInfo[idx].color};">
                      <div style="display: flex; align-items: center;">
                        <span style="font-size: 24px; margin-right: 12px;">${rankInfo[idx].emoji}</span>
                        <div>
                          <div style="font-weight: bold; color: #1f2937;">${entry.user.name}</div>
                          <div style="font-size: 12px; color: #6b7280;">Puesto #${idx + 1}</div>
                        </div>
                      </div>
                      <div style="text-align: right;">
                        <div style="font-size: 20px; font-weight: bold; color: ${rankInfo[idx].color};">${entry.points}</div>
                        <div style="font-size: 12px; color: #6b7280;">puntos</div>
                      </div>
                    </div>
                  `).join('')}
                </div>

                <p style="color: #4b5563;">
                  Tu dedicación y compromiso con tus prioridades es un ejemplo para todo el equipo.
                  ¡Sigue así!
                </p>
                <a href="${baseUrl}/leaderboard" style="display: inline-block; background: ${info.color}; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin-top: 20px; font-weight: 600;">
                  Ver Leaderboard Completo
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
        to: user.email,
        subject: emailContent.subject,
        html: emailContent.html
      });

      winners.push({ name: user.name, rank, points });
      emailsSent++;
    }

    // Enviar copia a TODOS los usuarios activos (que no sean ganadores)
    const topUserIds = topUsers.map(t => t.user._id.toString());
    const nonWinners = allActiveUsers.filter(u => !topUserIds.includes(u._id.toString()));
    const nonWinnerEmails = nonWinners.map(u => u.email);

    if (nonWinnerEmails.length > 0) {
      const notificationEmail = {
        subject: `🏆 Ganadores del Leaderboard del mes`,
        html: `
          <!DOCTYPE html>
          <html>
            <head>
              <meta charset="utf-8">
            </head>
            <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
              <div style="background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%); color: white; padding: 30px; border-radius: 10px; text-align: center;">
                <h1 style="margin: 0; font-size: 28px;">🏆 Ganadores del Leaderboard</h1>
                <p style="margin-top: 10px; opacity: 0.9;">Conoce a los mejores colaboradores del mes</p>
              </div>
              <div style="padding: 30px; background: #f9fafb;">
                <p style="font-size: 16px; color: #4b5563;">
                  Estos son los colaboradores que más destacaron este mes:
                </p>

                <!-- Top 3 del mes -->
                <div style="background: white; padding: 20px; border-radius: 10px; margin: 20px 0;">
                  ${topUsers.map((entry, idx) => `
                    <div style="display: flex; align-items: center; justify-content: space-between; padding: 12px; margin: 8px 0; background: #f9fafb; border-radius: 8px; border-left: 4px solid ${rankInfo[idx].color};">
                      <div style="display: flex; align-items: center;">
                        <span style="font-size: 24px; margin-right: 12px;">${rankInfo[idx].emoji}</span>
                        <div>
                          <div style="font-weight: bold; color: #1f2937;">${entry.user.name}</div>
                          <div style="font-size: 12px; color: #6b7280;">Medalla de ${rankInfo[idx].medal}</div>
                        </div>
                      </div>
                      <div style="text-align: right;">
                        <div style="font-size: 20px; font-weight: bold; color: ${rankInfo[idx].color};">${entry.points}</div>
                        <div style="font-size: 12px; color: #6b7280;">puntos</div>
                      </div>
                    </div>
                  `).join('')}
                </div>

                <p style="color: #4b5563;">
                  ¡Felicitaciones a los ganadores! Recuerda que completar tus prioridades, mantenerlas al día y evitar bloqueos te ayuda a ganar puntos.
                </p>
                <a href="${baseUrl}/leaderboard" style="display: inline-block; background: #3b82f6; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin-top: 20px; font-weight: 600;">
                  Ver Leaderboard Completo
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

      await sendEmail({
        to: process.env.EMAIL_USERNAME || 'orcaevolution@orcagrc.com',
        bcc: nonWinnerEmails,
        subject: notificationEmail.subject,
        html: notificationEmail.html
      });

      emailsSent++;
      totalUsersNotified = nonWinners.length;
    }

    // Resetear puntos mensuales de todos los usuarios
    await User.updateMany(
      { isActive: true },
      { $set: { 'gamification.currentMonthPoints': 0 } }
    );

    // Guardar la fecha del reset en SystemSettings para que calculateCurrentMonthPoints
    // use esta fecha como inicio del nuevo período
    const resetDate = new Date();
    await SystemSettings.findOneAndUpdate(
      {},
      { $set: { lastLeaderboardReset: resetDate } },
      { upsert: true }
    );

    return {
      resetCompleted: true,
      winners,
      emailsSent,
      totalUsersNotified
    };
  } catch (error: any) {
    console.error('Error resetting monthly points:', error);
    return {
      resetCompleted: false,
      winners: [],
      emailsSent: 0,
      totalUsersNotified: 0,
      error: error.message
    };
  }
}

/**
 * Calcula la próxima fecha de reseteo del leaderboard (primer lunes del próximo mes)
 */
export function getNextResetDate(): Date {
  const now = new Date();
  const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);

  // Encontrar el primer lunes del próximo mes
  const dayOfWeek = nextMonth.getDay();
  const daysUntilMonday = dayOfWeek === 0 ? 1 : dayOfWeek === 1 ? 0 : 8 - dayOfWeek;

  nextMonth.setDate(nextMonth.getDate() + daysUntilMonday);
  nextMonth.setHours(9, 0, 0, 0); // 9 AM hora del servidor

  return nextMonth;
}

/**
 * Calcula los puntos del mes actual para un usuario basándose en sus prioridades
 * Usa la fecha del último reset del leaderboard como punto de inicio
 */
export async function calculateCurrentMonthPoints(userId: string) {
  try {
    // Obtener la fecha del último reset del leaderboard
    const settings = await SystemSettings.findOne();
    let periodStart: Date;

    if (settings?.lastLeaderboardReset) {
      // Usar la fecha del último reset como inicio del período
      periodStart = new Date(settings.lastLeaderboardReset);
    } else {
      // Fallback: usar 4 semanas atrás si no hay reset previo
      const now = new Date();
      const daysAgo = 28;
      periodStart = new Date(now);
      periodStart.setDate(periodStart.getDate() - daysAgo);

      // Ajustar al lunes más cercano
      const dayOfWeek = periodStart.getDay();
      periodStart.setDate(periodStart.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1));
    }
    periodStart.setHours(0, 0, 0, 0);

    // Buscar prioridades cuya semana empiece desde el inicio del período
    const priorities = await Priority.find({
      userId,
      weekStart: { $gte: periodStart }
    });

    let points = 0;

    // Prioridades completadas: +4 puntos cada una
    const completedPriorities = priorities.filter(p => p.status === 'COMPLETADO');
    points += completedPriorities.length * POINTS.PRIORITY_COMPLETED;

    // Prioridades en riesgo, bloqueadas o reprogramadas: -6 puntos cada una
    const atRiskPriorities = priorities.filter(
      p => p.status === 'EN_RIESGO' || p.status === 'BLOQUEADO' || p.status === 'REPROGRAMADO'
    );
    points += atRiskPriorities.length * POINTS.PRIORITY_AT_RISK_PENALTY;

    return points;
  } catch (error) {
    console.error('Error calculating current month points:', error);
    return 0;
  }
}

/**
 * Obtiene el leaderboard del mes actual
 */
export async function getMonthlyLeaderboard() {
  try {
    const users = await User.find({ isActive: true })
      .select('name email gamification');

    // Filtrar Francisco Puente del leaderboard
    const filteredUsers = users.filter(u => u._id.toString() !== DIRECCION_GENERAL_USER_ID);

    // Calcular puntos del mes actual para cada usuario
    const leaderboardData = await Promise.all(
      filteredUsers.map(async (user) => {
        const currentMonthPoints = await calculateCurrentMonthPoints(user._id.toString());
        return {
          userId: user._id,
          name: user.name,
          points: currentMonthPoints,
          totalPoints: user.gamification?.totalPoints || 0,
          currentStreak: user.gamification?.currentStreak || 0
        };
      })
    );

    // Ordenar por puntos del mes actual y agregar rankings
    leaderboardData.sort((a, b) => b.points - a.points);

    return leaderboardData.slice(0, 10).map((entry, index) => ({
      ...entry,
      rank: index + 1
    }));
  } catch (error) {
    console.error('Error getting leaderboard:', error);
    return [];
  }
}

/**
 * Trackea el uso del sistema de canales y otorga badges correspondientes
 */
export async function trackChannelUsage(
  userId: string,
  action: 'messageSent' | 'slashCommandUsed' | 'channelCreated' | 'reactionReceived' | 'interactiveCommandParticipation' | 'interactiveCommandCreated',
  metadata?: {
    channelId?: string;
    commandType?: string;
  }
) {
  try {
    const user = await User.findById(userId);
    if (!user) return null;

    // Inicializar gamification si no existe
    if (!user.gamification) {
      user.gamification = {
        points: 0,
        currentMonthPoints: 0,
        totalPoints: 0,
        currentStreak: 0,
        longestStreak: 0,
        badges: [],
        featureUsage: {
          aiTextImprovements: 0,
          aiOrgAnalysis: 0,
          powerpointExports: 0,
          analyticsVisits: 0,
          reportsGenerated: 0,
          excelExports: 0,
          kanbanViews: 0,
        },
        channelUsage: {
          messagesSent: 0,
          slashCommandsUsed: 0,
          uniqueCommandTypes: [],
          channelsCreated: 0,
          channelsParticipated: [],
          reactionsReceived: 0,
          interactiveCommandsParticipated: 0,
          interactiveCommandsCreated: 0
        }
      };
    }

    if (!user.gamification.channelUsage) {
      user.gamification.channelUsage = {
        messagesSent: 0,
        slashCommandsUsed: 0,
        uniqueCommandTypes: [],
        channelsCreated: 0,
        channelsParticipated: [],
        reactionsReceived: 0,
        interactiveCommandsParticipated: 0,
        interactiveCommandsCreated: 0
      };
    }

    const newBadges: string[] = [];

    // Actualizar contadores según la acción
    switch (action) {
      case 'messageSent':
        user.gamification.channelUsage.messagesSent += 1;

        // Agregar canal a lista de canales participados
        if (metadata?.channelId && !user.gamification.channelUsage.channelsParticipated.includes(metadata.channelId)) {
          user.gamification.channelUsage.channelsParticipated.push(metadata.channelId);
        }

        // Badges por cantidad de mensajes
        if (user.gamification.channelUsage.messagesSent === 1) {
          newBadges.push('PRIMER_MENSAJE');
        }
        if (user.gamification.channelUsage.messagesSent === 50) {
          newBadges.push('CONVERSADOR_CANALES');
        }
        if (user.gamification.channelUsage.messagesSent === 200) {
          newBadges.push('COMUNICADOR_ACTIVO');
        }

        // Badge por participación en canales
        if (user.gamification.channelUsage.channelsParticipated.length === 5) {
          newBadges.push('COLABORADOR_ESTRELLA');
        }
        break;

      case 'slashCommandUsed':
        user.gamification.channelUsage.slashCommandsUsed += 1;

        // Agregar tipo de comando a lista única
        if (metadata?.commandType && !user.gamification.channelUsage.uniqueCommandTypes.includes(metadata.commandType)) {
          user.gamification.channelUsage.uniqueCommandTypes.push(metadata.commandType);
        }

        // Badges por uso de comandos
        if (user.gamification.channelUsage.slashCommandsUsed === 1) {
          newBadges.push('PRIMER_COMANDO');
        }
        if (user.gamification.channelUsage.uniqueCommandTypes.length === 10) {
          newBadges.push('MAESTRO_COMANDOS');
        }
        break;

      case 'channelCreated':
        user.gamification.channelUsage.channelsCreated += 1;

        // Badges por creación de canales
        if (user.gamification.channelUsage.channelsCreated === 1) {
          newBadges.push('ORGANIZADOR_CANALES');
        }
        if (user.gamification.channelUsage.channelsCreated === 5) {
          newBadges.push('ARQUITECTO_CANALES');
        }
        break;

      case 'reactionReceived':
        user.gamification.channelUsage.reactionsReceived += 1;

        // Badge por reacciones recibidas
        if (user.gamification.channelUsage.reactionsReceived === 20) {
          newBadges.push('COMUNICADOR_EFECTIVO');
        }
        break;

      case 'interactiveCommandParticipation':
        user.gamification.channelUsage.interactiveCommandsParticipated += 1;

        // Badge por participación en comandos interactivos
        if (user.gamification.channelUsage.interactiveCommandsParticipated === 5) {
          newBadges.push('VOTANTE_ACTIVO');
        }
        break;

      case 'interactiveCommandCreated':
        user.gamification.channelUsage.interactiveCommandsCreated += 1;

        // Badge por creación de comandos interactivos
        if (user.gamification.channelUsage.interactiveCommandsCreated === 10) {
          newBadges.push('FACILITADOR');
        }
        break;
    }

    // Otorgar badges nuevos
    for (const badgeId of newBadges) {
      const alreadyHas = user.gamification.badges?.some(b => b.badgeId === badgeId);
      if (!alreadyHas) {
        if (!user.gamification.badges) user.gamification.badges = [];
        user.gamification.badges.push({
          badgeId,
          earnedAt: new Date()
        });
      }
    }

    await user.save();
    return { user, newBadges };
  } catch (error) {
    console.error('Error tracking channel usage:', error);
    return null;
  }
}

/**
 * Trackea el uso de una funcionalidad y otorga badges correspondientes
 */
export async function trackFeatureUsage(
  userId: string,
  feature: 'aiTextImprovements' | 'aiOrgAnalysis' | 'powerpointExports' | 'analyticsVisits' | 'reportsGenerated' | 'excelExports' | 'kanbanViews'
) {
  try {
    const user = await User.findById(userId);
    if (!user) return null;

    // Inicializar gamification si no existe
    if (!user.gamification) {
      user.gamification = {
        points: 0,
        currentMonthPoints: 0,
        totalPoints: 0,
        currentStreak: 0,
        longestStreak: 0,
        badges: [],
        featureUsage: {
          aiTextImprovements: 0,
          aiOrgAnalysis: 0,
          powerpointExports: 0,
          analyticsVisits: 0,
          reportsGenerated: 0,
          excelExports: 0,
          kanbanViews: 0,
        }
      };
    }

    if (!user.gamification.featureUsage) {
      user.gamification.featureUsage = {
        aiTextImprovements: 0,
        aiOrgAnalysis: 0,
        powerpointExports: 0,
        analyticsVisits: 0,
        reportsGenerated: 0,
        excelExports: 0,
        kanbanViews: 0,
      };
    }

    // Verificar si esta acción ya fue trackeada recientemente (prevenir duplicados en React Strict Mode)
    const lastAction = (user.gamification as any)[`last_${feature}`];
    const now = new Date();
    if (lastAction && (now.getTime() - new Date(lastAction).getTime()) < 5000) {
      // Si se trackeó hace menos de 5 segundos, ignorar (probablemente duplicado)
      return { user, newBadges: [] };
    }

    // Actualizar timestamp de última acción
    (user.gamification as any)[`last_${feature}`] = now;

    // Incrementar contador
    user.gamification.featureUsage[feature] += 1;
    const count = user.gamification.featureUsage[feature];

    // Determinar y otorgar badges según la funcionalidad y el contador
    const newBadges: string[] = [];

    switch (feature) {
      case 'aiTextImprovements':
        if (count === 1) newBadges.push('ASISTENTE_IA');
        if (count === 5) newBadges.push('POTENCIADO_IA');
        break;

      case 'aiOrgAnalysis':
        if (count === 1) newBadges.push('ESTRATEGA_IA');
        break;

      case 'powerpointExports':
        if (count === 1) newBadges.push('PRESENTADOR');
        break;

      case 'reportsGenerated':
        if (count === 1) newBadges.push('REPORTERO');
        break;

      case 'excelExports':
        if (count === 1) newBadges.push('ANALISTA_DATOS');
        break;

      case 'analyticsVisits':
        if (count === 1) newBadges.push('CURIOSO');
        if (count === 10) newBadges.push('ANALISTA');
        break;

      case 'kanbanViews':
        if (count === 1) newBadges.push('ORGANIZADOR_VISUAL');
        if (count === 20) newBadges.push('MAESTRO_KANBAN');
        break;
    }

    // Badge de exportador pro (10 exportaciones combinadas)
    const totalExports =
      (user.gamification.featureUsage.powerpointExports || 0) +
      (user.gamification.featureUsage.reportsGenerated || 0) +
      (user.gamification.featureUsage.excelExports || 0);

    if (totalExports === 10) {
      newBadges.push('EXPORTADOR_PRO');
    }

    // Badge de explorador (usó todas las funcionalidades al menos una vez)
    const allFeatures = Object.values(user.gamification.featureUsage || {});
    if (allFeatures.every(v => v > 0)) {
      newBadges.push('EXPLORADOR');
    }

    // Badge de power user (más de 50 acciones en total)
    const totalActions = allFeatures.reduce((sum, v) => sum + v, 0);
    if (totalActions >= 50) {
      newBadges.push('POWER_USER');
    }

    // Otorgar badges nuevos
    for (const badgeId of newBadges) {
      const alreadyHas = user.gamification.badges?.some(b => b.badgeId === badgeId);
      if (!alreadyHas) {
        if (!user.gamification.badges) user.gamification.badges = [];
        user.gamification.badges.push({
          badgeId,
          earnedAt: new Date()
        });
      }
    }

    await user.save();
    return { user, newBadges };
  } catch (error) {
    console.error('Error tracking feature usage:', error);
    return null;
  }
}

/**
 * Trackea comentarios y otorga badges correspondientes
 */
export async function trackCommentBadges(userId: string, hasMention: boolean = false) {
  try {
    const Comment = (await import('@/models/Comment')).default;

    const userComments = await Comment.countDocuments({
      userId,
      isSystemComment: false
    });

    const newBadges: string[] = [];

    if (userComments === 1) {
      await awardBadge(userId, 'PRIMER_COMENTARIO');
      newBadges.push('PRIMER_COMENTARIO');
    }

    if (userComments === 10) {
      await awardBadge(userId, 'CONVERSADOR');
      newBadges.push('CONVERSADOR');
    }

    if (hasMention) {
      const user = await User.findById(userId);
      const alreadyHasMention = user?.gamification?.badges?.some(b => b.badgeId === 'PRIMERA_MENCION');
      if (!alreadyHasMention) {
        await awardBadge(userId, 'PRIMERA_MENCION');
        newBadges.push('PRIMERA_MENCION');
      }
    }

    return newBadges;
  } catch (error) {
    console.error('Error tracking comment badges:', error);
    return [];
  }
}

/**
 * Obtiene los badges de un usuario
 */
export async function getUserBadges(userId: string) {
  try {
    // Primero intentar obtener desde user.gamification.badges
    const user = await User.findById(userId).select('gamification.badges');
    if (user?.gamification?.badges && user.gamification.badges.length > 0) {
      // Mapear badges del usuario a un formato más completo
      const badgeDefinitions: any = BADGE_DEFINITIONS;

      return user.gamification.badges.map((badge: any) => ({
        ...badgeDefinitions[badge.badgeId],
        badgeId: badge.badgeId,
        earnedAt: badge.earnedAt
      }));
    }

    // Fallback: buscar en la tabla de badges (legacy)
    const badges = await Badge.find({ userId }).sort({ earnedAt: -1 });
    return badges;
  } catch (error) {
    console.error('Error getting user badges:', error);
    return [];
  }
}
