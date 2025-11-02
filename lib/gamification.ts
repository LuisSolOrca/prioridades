import User from '@/models/User';
import Badge from '@/models/Badge';
import Priority from '@/models/Priority';
import { sendEmail, emailTemplates } from './email';

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

  // Badges especiales
  EXPLORADOR: {
    name: 'Explorador',
    description: 'Usó todas las funcionalidades del sistema',
    icon: '🌟'
  },
  POWER_USER: {
    name: 'Power User',
    description: 'Usuario avanzado: más de 50 acciones en funcionalidades premium',
    icon: '⚡'
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
