import connectDB from '@/lib/mongodb';
import Priority, { IPriority } from '@/models/Priority';
import mongoose from 'mongoose';
import { startOfWeek, endOfWeek, startOfMonth, endOfMonth, subWeeks, subMonths, format } from 'date-fns';
import { es } from 'date-fns/locale';

/**
 * Genera un análisis profesional con IA basado en las estadísticas del usuario
 */
async function generateAIAnalysis(
  userName: string,
  periodType: 'SEMANAL' | 'MENSUAL',
  currentStats: PriorityStats,
  previousStats: PriorityStats,
  comparison: ComparisonMetrics
): Promise<string> {
  const apiKey = process.env.GROQ_API_KEY;

  if (!apiKey) {
    console.warn('GROQ_API_KEY no configurada, análisis IA no disponible');
    return '';
  }

  try {
    const periodLabel = periodType === 'SEMANAL' ? 'esta semana' : 'este mes';
    const previousPeriodLabel = periodType === 'SEMANAL' ? 'la semana anterior' : 'el mes anterior';

    const completionRate = currentStats.totalPriorities > 0
      ? (currentStats.completedPriorities / currentStats.totalPriorities * 100).toFixed(1)
      : '0';

    const previousCompletionRate = previousStats.totalPriorities > 0
      ? (previousStats.completedPriorities / previousStats.totalPriorities * 100).toFixed(1)
      : '0';

    const systemPrompt = `Eres un coach ejecutivo y experto en productividad empresarial. Tu tarea es analizar las métricas de rendimiento de un profesional y proporcionar un análisis breve, directo y accionable.

Características de tu análisis:
- Profesional y motivador, pero directo
- Máximo 3-4 oraciones
- Identifica 1-2 puntos clave (fortalezas o áreas de oportunidad)
- Proporciona 1 consejo específico y accionable
- Usa un tono constructivo y orientado a resultados
- En español

NO uses:
- Listas con bullets o números
- Saltos de línea múltiples
- Felicitaciones genéricas sin sustento
- Consejos vagos o generales`;

    const userPrompt = `Analiza el rendimiento de ${userName} en ${periodLabel}:

MÉTRICAS ACTUALES (${periodLabel}):
- Prioridades atendidas: ${currentStats.totalPriorities}
- Prioridades completadas: ${currentStats.completedPriorities}
- Tasa de completitud: ${completionRate}%
- Prioridades retrasadas: ${currentStats.delayedPriorities}
- Tareas ejecutadas: ${currentStats.completedTasks} de ${currentStats.totalTasks}
- Horas reportadas: ${currentStats.totalHoursReported.toFixed(1)}h

COMPARACIÓN CON ${previousPeriodLabel.toUpperCase()}:
- Cambio en prioridades: ${comparison.prioritiesChange > 0 ? '+' : ''}${comparison.prioritiesChange.toFixed(1)}%
- Cambio en tasa de completitud: ${comparison.completionRateChange > 0 ? '+' : ''}${comparison.completionRateChange.toFixed(1)} puntos
- Cambio en tareas: ${comparison.tasksChange > 0 ? '+' : ''}${comparison.tasksChange.toFixed(1)}%
- Cambio en horas: ${comparison.hoursChange > 0 ? '+' : ''}${comparison.hoursChange.toFixed(1)}%
- Cambio en retrasadas: ${comparison.delayedChange > 0 ? '+' : ''}${comparison.delayedChange.toFixed(1)}%

Proporciona un análisis profesional breve (3-4 oraciones) con un consejo específico para mejorar su productividad.`;

    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.7,
        max_tokens: 300,
      }),
    });

    if (!response.ok) {
      console.error('Error en API de Groq:', await response.text());
      return '';
    }

    const data = await response.json();
    const analysis = data.choices[0]?.message?.content?.trim() || '';

    return analysis;
  } catch (error) {
    console.error('Error generando análisis con IA:', error);
    return '';
  }
}

export interface PriorityStats {
  totalPriorities: number;
  completedPriorities: number;
  delayedPriorities: number; // EN_RIESGO, BLOQUEADO, o REPROGRAMADO
  pendingPriorities: number; // EN_TIEMPO (no completadas pero sin problemas)
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
  aiAnalysis?: string;
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
    pendingPriorities: 0,
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
      stats.pendingPriorities++; // Pendientes son las EN_TIEMPO no completadas
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

  // Generar análisis con IA
  const aiAnalysis = await generateAIAnalysis(
    userName,
    reportType,
    currentStats,
    previousStats,
    comparison
  );

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
    aiAnalysis,
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
