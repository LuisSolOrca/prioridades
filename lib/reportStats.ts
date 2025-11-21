import connectDB from '@/lib/mongodb';
import Priority, { IPriority } from '@/models/Priority';
import mongoose from 'mongoose';
import { startOfWeek, endOfWeek, startOfMonth, endOfMonth, subWeeks, subMonths, format } from 'date-fns';
import { es } from 'date-fns/locale';

export interface PriorityStats {
  totalPriorities: number;
  completedPriorities: number;
  delayedPriorities: number; // EN_RIESGO, BLOQUEADO, o REPROGRAMADO
  inTimePriorities: number; // EN_TIEMPO o COMPLETADO
  totalTasks: number;
  completedTasks: number;
  totalHoursReported: number;
  averageCompletionPercentage: number;
  prioritiesByStatus: {
    EN_TIEMPO: number;
    EN_RIESGO: number;
    BLOQUEADO: number;
    COMPLETADO: number;
    REPROGRAMADO: number;
  };
}

export interface ComparisonMetrics {
  prioritiesChange: number; // % cambio
  completionRateChange: number; // % cambio en tasa de completitud
  tasksChange: number; // % cambio
  hoursChange: number; // % cambio
  delayedChange: number; // % cambio en prioridades retrasadas
}

export interface ReportData {
  userId: mongoose.Types.ObjectId;
  userName: string;
  userEmail: string;
  period: {
    start: Date;
    end: Date;
    type: 'SEMANAL' | 'MENSUAL';
    label: string;
  };
  currentStats: PriorityStats;
  previousStats: PriorityStats;
  comparison: ComparisonMetrics;
  topPriorities: Array<{
    title: string;
    status: string;
    completionPercentage: number;
    tasksCompleted: number;
    totalTasks: number;
  }>;
}

/**
 * Calcula estadísticas de prioridades para un usuario en un rango de fechas
 */
async function calculateStats(
  userId: mongoose.Types.ObjectId,
  startDate: Date,
  endDate: Date
): Promise<PriorityStats> {
  await connectDB();

  const priorities = await Priority.find({
    userId,
    weekStart: { $lte: endDate },
    weekEnd: { $gte: startDate },
  }).lean<IPriority[]>();

  const stats: PriorityStats = {
    totalPriorities: priorities.length,
    completedPriorities: 0,
    delayedPriorities: 0,
    inTimePriorities: 0,
    totalTasks: 0,
    completedTasks: 0,
    totalHoursReported: 0,
    averageCompletionPercentage: 0,
    prioritiesByStatus: {
      EN_TIEMPO: 0,
      EN_RIESGO: 0,
      BLOQUEADO: 0,
      COMPLETADO: 0,
      REPROGRAMADO: 0,
    },
  };

  if (priorities.length === 0) {
    return stats;
  }

  let totalCompletion = 0;

  for (const priority of priorities) {
    // Contar por status
    stats.prioritiesByStatus[priority.status]++;

    // Completadas
    if (priority.status === 'COMPLETADO') {
      stats.completedPriorities++;
      stats.inTimePriorities++;
    }

    // En tiempo (EN_TIEMPO o COMPLETADO)
    if (priority.status === 'EN_TIEMPO') {
      stats.inTimePriorities++;
    }

    // Retrasadas (EN_RIESGO, BLOQUEADO, REPROGRAMADO)
    if (['EN_RIESGO', 'BLOQUEADO', 'REPROGRAMADO'].includes(priority.status)) {
      stats.delayedPriorities++;
    }

    // Checklist stats
    if (priority.checklist && priority.checklist.length > 0) {
      stats.totalTasks += priority.checklist.length;

      for (const task of priority.checklist) {
        if (task.completed) {
          stats.completedTasks++;
        }
        if (task.completedHours) {
          stats.totalHoursReported += task.completedHours;
        }
      }
    }

    totalCompletion += priority.completionPercentage;
  }

  stats.averageCompletionPercentage = totalCompletion / priorities.length;

  return stats;
}

/**
 * Calcula la comparación entre dos periodos de estadísticas
 */
function calculateComparison(
  current: PriorityStats,
  previous: PriorityStats
): ComparisonMetrics {
  const calculateChange = (current: number, previous: number): number => {
    if (previous === 0) return current > 0 ? 100 : 0;
    return ((current - previous) / previous) * 100;
  };

  const currentCompletionRate = current.totalPriorities > 0
    ? (current.completedPriorities / current.totalPriorities) * 100
    : 0;

  const previousCompletionRate = previous.totalPriorities > 0
    ? (previous.completedPriorities / previous.totalPriorities) * 100
    : 0;

  return {
    prioritiesChange: calculateChange(current.totalPriorities, previous.totalPriorities),
    completionRateChange: currentCompletionRate - previousCompletionRate, // Cambio absoluto, no porcentual
    tasksChange: calculateChange(current.totalTasks, previous.totalTasks),
    hoursChange: calculateChange(current.totalHoursReported, previous.totalHoursReported),
    delayedChange: calculateChange(current.delayedPriorities, previous.delayedPriorities),
  };
}

/**
 * Genera el reporte completo para un usuario
 */
export async function generateUserReport(
  userId: mongoose.Types.ObjectId,
  userEmail: string,
  userName: string,
  reportType: 'SEMANAL' | 'MENSUAL'
): Promise<ReportData> {
  await connectDB();

  let currentStart: Date, currentEnd: Date, previousStart: Date, previousEnd: Date, label: string;

  if (reportType === 'SEMANAL') {
    // Semana anterior (lunes a viernes)
    currentEnd = new Date();
    currentStart = startOfWeek(subWeeks(currentEnd, 1), { weekStartsOn: 1 }); // Lunes
    currentEnd = endOfWeek(subWeeks(new Date(), 1), { weekStartsOn: 1 }); // Domingo

    // Semana previa para comparación
    previousStart = startOfWeek(subWeeks(currentStart, 1), { weekStartsOn: 1 });
    previousEnd = endOfWeek(subWeeks(currentStart, 1), { weekStartsOn: 1 });

    label = `Semana del ${format(currentStart, 'd MMM', { locale: es })} al ${format(currentEnd, 'd MMM yyyy', { locale: es })}`;
  } else {
    // Mes anterior
    const lastMonth = subMonths(new Date(), 1);
    currentStart = startOfMonth(lastMonth);
    currentEnd = endOfMonth(lastMonth);

    // Mes previo para comparación
    const twoMonthsAgo = subMonths(new Date(), 2);
    previousStart = startOfMonth(twoMonthsAgo);
    previousEnd = endOfMonth(twoMonthsAgo);

    label = format(currentStart, 'MMMM yyyy', { locale: es });
  }

  // Calcular estadísticas
  const currentStats = await calculateStats(userId, currentStart, currentEnd);
  const previousStats = await calculateStats(userId, previousStart, previousEnd);
  const comparison = calculateComparison(currentStats, previousStats);

  // Obtener top prioridades del periodo actual
  const topPrioritiesData = await Priority.find({
    userId,
    weekStart: { $lte: currentEnd },
    weekEnd: { $gte: currentStart },
  })
    .sort({ completionPercentage: -1, status: 1 })
    .limit(5)
    .lean<IPriority[]>();

  const topPriorities = topPrioritiesData.map(p => ({
    title: p.title,
    status: p.status,
    completionPercentage: p.completionPercentage,
    tasksCompleted: p.checklist?.filter(t => t.completed).length || 0,
    totalTasks: p.checklist?.length || 0,
  }));

  return {
    userId,
    userName,
    userEmail,
    period: {
      start: currentStart,
      end: currentEnd,
      type: reportType,
      label,
    },
    currentStats,
    previousStats,
    comparison,
    topPriorities,
  };
}

/**
 * Genera reportes para todos los usuarios activos
 */
export async function generateAllUsersReports(
  reportType: 'SEMANAL' | 'MENSUAL'
): Promise<ReportData[]> {
  await connectDB();

  // Importar User aquí para evitar circular dependency
  const User = (await import('@/models/User')).default;

  const users = await User.find({ isActive: true }).lean();

  const reports: ReportData[] = [];

  for (const user of users) {
    const report = await generateUserReport(
      user._id,
      user.email,
      user.name,
      reportType
    );
    reports.push(report);
  }

  return reports;
}
