/**
 * Script para calcular y asignar badges y puntos retroactivamente
 * a usuarios que ya tienen prioridades en el sistema
 *
 * Uso: npx tsx scripts/backfill-gamification.ts
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';

// Cargar variables de entorno
dotenv.config({ path: path.join(__dirname, '..', '.env') });

// Importar modelos
import '../models/User';
import '../models/Priority';
import '../models/Comment';

const User = mongoose.models.User || mongoose.model('User');
const Priority = mongoose.models.Priority || mongoose.model('Priority');
const Comment = mongoose.models.Comment || mongoose.model('Comment');

interface WeekData {
  weekStart: Date;
  weekEnd: Date;
  priorities: any[];
  completed: number;
  atRisk: number;
  blocked: number;
  completionRate: number;
}

async function connectDB() {
  if (mongoose.connection.readyState === 0) {
    await mongoose.connect(process.env.MONGODB_URI!);
    console.log('✅ Conectado a MongoDB');
  }
}

/**
 * Obtener todas las semanas únicas del sistema
 */
function getUniqueWeeks(priorities: any[]): WeekData[] {
  const weekMap = new Map<string, any[]>();

  // Agrupar prioridades por semana
  priorities.forEach(priority => {
    const weekKey = `${priority.weekStart.toISOString()}_${priority.weekEnd.toISOString()}`;
    if (!weekMap.has(weekKey)) {
      weekMap.set(weekKey, []);
    }
    weekMap.get(weekKey)!.push(priority);
  });

  // Convertir a array de WeekData
  const weeks: WeekData[] = [];
  weekMap.forEach((prios, key) => {
    const [weekStart, weekEnd] = key.split('_');
    const completed = prios.filter(p => p.status === 'COMPLETADO').length;
    const atRisk = prios.filter(p => p.status === 'EN_RIESGO').length;
    const blocked = prios.filter(p => p.status === 'BLOQUEADO').length;

    weeks.push({
      weekStart: new Date(weekStart),
      weekEnd: new Date(weekEnd),
      priorities: prios,
      completed,
      atRisk,
      blocked,
      completionRate: prios.length > 0 ? (completed / prios.length) * 100 : 0
    });
  });

  // Ordenar por fecha
  return weeks.sort((a, b) => a.weekStart.getTime() - b.weekStart.getTime());
}

/**
 * Calcular racha actual y más larga
 */
function calculateStreaks(weeks: WeekData[]): { currentStreak: number; longestStreak: number } {
  let currentStreak = 0;
  let longestStreak = 0;
  let tempStreak = 0;

  // Verificar desde la semana más reciente hacia atrás para racha actual
  for (let i = weeks.length - 1; i >= 0; i--) {
    if (weeks[i].completionRate === 100) {
      currentStreak++;
    } else {
      break;
    }
  }

  // Calcular racha más larga
  weeks.forEach(week => {
    if (week.completionRate === 100) {
      tempStreak++;
      longestStreak = Math.max(longestStreak, tempStreak);
    } else {
      tempStreak = 0;
    }
  });

  return { currentStreak, longestStreak };
}

/**
 * Calcular puntos totales basados en historial
 */
function calculatePoints(priorities: any[]): { totalPoints: number; currentMonthPoints: number } {
  let totalPoints = 0;
  // Define the start of "current month" tracking as Oct 27, 2025
  // This is the first week that should count for the current tracking period
  const currentPeriodStart = new Date('2025-10-27T00:00:00.000Z');
  let currentMonthPoints = 0;

  // Agrupar por semana para calcular penalizaciones
  const weeks = getUniqueWeeks(priorities);

  weeks.forEach(week => {
    const isCurrentPeriod = week.weekStart >= currentPeriodStart;

    // +4 puntos por cada prioridad completada
    const completedPoints = week.completed * 4;
    totalPoints += completedPoints;
    if (isCurrentPeriod) {
      currentMonthPoints += completedPoints;
    }

    // -6 puntos por cada prioridad en riesgo o bloqueada por semana
    const penaltyPoints = (week.atRisk + week.blocked) * -6;
    totalPoints += penaltyPoints;
    if (isCurrentPeriod) {
      currentMonthPoints += penaltyPoints;
    }
  });

  return { totalPoints, currentMonthPoints };
}

/**
 * Determinar qué badges debe tener el usuario
 */
function determineBadges(
  weeks: WeekData[],
  streaks: { currentStreak: number; longestStreak: number },
  totalCompleted: number,
  hasComments: boolean,
  hasMentions: boolean
): string[] {
  const badges: string[] = [];
  const { currentStreak, longestStreak } = streaks;

  // Primera Victoria: Completar la primera prioridad
  if (totalCompleted >= 1) {
    badges.push('PRIMERA_VICTORIA');
  }

  // Primer Comentario: Agregó su primer comentario
  if (hasComments) {
    badges.push('PRIMER_COMENTARIO');
  }

  // Primera Mención: Mencionó a otro usuario por primera vez
  if (hasMentions) {
    badges.push('PRIMERA_MENCION');
  }

  // Racha de Fuego: 5 semanas consecutivas al 100%
  if (currentStreak >= 5 || longestStreak >= 5) {
    badges.push('RACHA_FUEGO');
  }

  // Veterano: 20 prioridades completadas
  if (totalCompleted >= 20) {
    badges.push('VETERANO');
  }

  // Perfectionist a: Una semana al 100%
  const hasPerfectWeek = weeks.some(w => w.completionRate === 100 && w.priorities.length > 0);
  if (hasPerfectWeek) {
    badges.push('PERFECCIONISTA');
  }

  // Imparable: 10 prioridades completadas en un mes
  const monthlyCompleted = new Map<string, number>();
  weeks.forEach(week => {
    const monthKey = `${week.weekStart.getFullYear()}-${week.weekStart.getMonth()}`;
    monthlyCompleted.set(monthKey, (monthlyCompleted.get(monthKey) || 0) + week.completed);
  });
  const hasMonthWith10 = Array.from(monthlyCompleted.values()).some(count => count >= 10);
  if (hasMonthWith10) {
    badges.push('IMPARABLE');
  }

  return badges;
}

/**
 * Procesar un usuario
 */
async function processUser(user: any) {
  console.log(`\n📊 Procesando usuario: ${user.name} (${user.email})`);

  // Obtener todas las prioridades del usuario
  const priorities = await Priority.find({ userId: user._id }).lean();

  if (priorities.length === 0) {
    console.log('   ⚠️  No tiene prioridades, omitiendo...');
    return;
  }

  console.log(`   📋 Total de prioridades: ${priorities.length}`);

  // Verificar comentarios (excluyendo comentarios del sistema)
  const userComments = await Comment.find({
    userId: user._id,
    isSystemComment: false
  }).lean();
  const hasComments = userComments.length > 0;
  console.log(`   💬 Comentarios realizados: ${userComments.length}`);

  // Verificar menciones (comentarios que contienen @)
  const hasMentions = userComments.some(comment => comment.text.includes('@'));
  console.log(`   @️  Ha mencionado usuarios: ${hasMentions ? 'Sí' : 'No'}`);

  // Agrupar por semanas
  const weeks = getUniqueWeeks(priorities);
  console.log(`   📅 Semanas trabajadas: ${weeks.length}`);

  // Calcular rachas
  const streaks = calculateStreaks(weeks);
  console.log(`   🔥 Racha actual: ${streaks.currentStreak} semanas`);
  console.log(`   🏆 Racha más larga: ${streaks.longestStreak} semanas`);

  // Calcular puntos
  const totalCompleted = priorities.filter(p => p.status === 'COMPLETADO').length;
  const points = calculatePoints(priorities);
  console.log(`   ✅ Prioridades completadas: ${totalCompleted}`);
  console.log(`   💰 Puntos totales: ${points.totalPoints}`);
  console.log(`   📊 Puntos del mes actual: ${points.currentMonthPoints}`);

  // Determinar badges
  const badgeIds = determineBadges(weeks, streaks, totalCompleted, hasComments, hasMentions);
  const badgesWithDates = badgeIds.map(badgeId => ({
    badgeId,
    earnedAt: new Date()
  }));
  console.log(`   🎖️  Badges otorgados: ${badgeIds.length} - [${badgeIds.join(', ')}]`);

  // Actualizar usuario
  user.gamification = {
    points: points.totalPoints,
    currentMonthPoints: points.currentMonthPoints,
    totalPoints: points.totalPoints,
    currentStreak: streaks.currentStreak,
    longestStreak: streaks.longestStreak,
    badges: badgesWithDates,
    lastStreakUpdate: new Date()
  };

  await user.save();
  console.log('   ✅ Usuario actualizado exitosamente');
}

/**
 * Función principal
 */
async function main() {
  try {
    console.log('🚀 Iniciando backfill de gamificación...\n');

    await connectDB();

    // Obtener todos los usuarios activos (excluyendo admins si lo deseas)
    const users = await User.find({ isActive: true });
    console.log(`📊 Total de usuarios a procesar: ${users.length}\n`);

    // Procesar cada usuario
    for (const user of users) {
      await processUser(user);
    }

    console.log('\n✅ ¡Backfill completado exitosamente!');
    console.log('\n📊 Resumen:');
    console.log(`   - Usuarios procesados: ${users.length}`);
    console.log('   - Puntos y badges asignados según historial');
    console.log('   - Rachas calculadas correctamente\n');

  } catch (error) {
    console.error('❌ Error durante el backfill:', error);
    process.exit(1);
  } finally {
    await mongoose.connection.close();
    console.log('👋 Conexión cerrada');
    process.exit(0);
  }
}

// Ejecutar
main();
