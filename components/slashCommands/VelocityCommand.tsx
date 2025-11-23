'use client';

import { useState, useEffect } from 'react';
import { TrendingUp, TrendingDown, Minus, Zap, Calendar, Target, AlertCircle, CheckCircle2 } from 'lucide-react';

interface VelocityCommandProps {
  projectId: string;
  onClose: () => void;
}

interface Priority {
  _id: string;
  title: string;
  status: 'EN_TIEMPO' | 'EN_RIESGO' | 'BLOQUEADO' | 'COMPLETADO' | 'REPROGRAMADO';
  completionPercentage: number;
  weekStart: string;
  weekEnd: string;
  updatedAt: string;
}

interface WeekData {
  weekNumber: number;
  weekLabel: string;
  completed: number;
  total: number;
  startDate: Date;
  endDate: Date;
}

type TrendType = 'increasing' | 'decreasing' | 'stable';

export default function VelocityCommand({ projectId, onClose }: VelocityCommandProps) {
  const [loading, setLoading] = useState(true);
  const [weekData, setWeekData] = useState<WeekData[]>([]);
  const [avgVelocity, setAvgVelocity] = useState(0);
  const [trend, setTrend] = useState<TrendType>('stable');
  const [prediction, setPrediction] = useState(0);
  const [trendPercentage, setTrendPercentage] = useState(0);

  useEffect(() => {
    loadVelocityData();
  }, [projectId]);

  const getMonday = (date: Date): Date => {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    const monday = new Date(d.setDate(diff));
    monday.setHours(0, 0, 0, 0);
    return monday;
  };

  const getFriday = (monday: Date): Date => {
    const friday = new Date(monday);
    friday.setDate(monday.getDate() + 4);
    friday.setHours(23, 59, 59, 999);
    return friday;
  };

  const getWeekLabel = (monday: Date): string => {
    const day = monday.getDate();
    const month = monday.toLocaleDateString('es-ES', { month: 'short' });
    return `${day} ${month}`;
  };

  const loadVelocityData = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/projects/${projectId}/priorities`);
      if (!response.ok) throw new Error('Error loading priorities');

      const data = await response.json();
      const allPriorities: Priority[] = data.priorities || [];

      // Calcular datos de las últimas 6 semanas
      const weeksData: WeekData[] = [];
      const now = new Date();

      for (let i = 5; i >= 0; i--) {
        const weekStart = getMonday(now);
        weekStart.setDate(weekStart.getDate() - (i * 7));
        const weekEnd = getFriday(weekStart);

        // Filtrar prioridades de esta semana
        const weekPriorities = allPriorities.filter(p => {
          const pStart = new Date(p.weekStart);
          return pStart >= weekStart && pStart <= weekEnd;
        });

        // Contar completadas
        const completed = weekPriorities.filter(p => p.status === 'COMPLETADO').length;

        weeksData.push({
          weekNumber: i,
          weekLabel: getWeekLabel(weekStart),
          completed,
          total: weekPriorities.length,
          startDate: weekStart,
          endDate: weekEnd
        });
      }

      setWeekData(weeksData);

      // Calcular velocidad promedio (últimas 4 semanas con datos)
      const recentWeeks = weeksData.slice(-4).filter(w => w.total > 0);
      const totalCompleted = recentWeeks.reduce((sum, w) => sum + w.completed, 0);
      const avg = recentWeeks.length > 0 ? totalCompleted / recentWeeks.length : 0;
      setAvgVelocity(Math.round(avg * 10) / 10);

      // Calcular tendencia
      calculateTrend(weeksData);

      // Calcular predicción para próxima semana
      calculatePrediction(weeksData);

    } catch (error) {
      console.error('Error loading velocity data:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculateTrend = (weeks: WeekData[]) => {
    // Comparar últimas 2 semanas con las 2 anteriores
    if (weeks.length < 4) {
      setTrend('stable');
      setTrendPercentage(0);
      return;
    }

    const recent = weeks.slice(-2);
    const previous = weeks.slice(-4, -2);

    const recentAvg = recent.reduce((sum, w) => sum + w.completed, 0) / recent.length;
    const previousAvg = previous.reduce((sum, w) => sum + w.completed, 0) / previous.length;

    if (previousAvg === 0) {
      setTrend('stable');
      setTrendPercentage(0);
      return;
    }

    const change = ((recentAvg - previousAvg) / previousAvg) * 100;
    setTrendPercentage(Math.round(Math.abs(change)));

    if (change > 10) {
      setTrend('increasing');
    } else if (change < -10) {
      setTrend('decreasing');
    } else {
      setTrend('stable');
    }
  };

  const calculatePrediction = (weeks: WeekData[]) => {
    if (weeks.length < 3) {
      setPrediction(0);
      return;
    }

    // Regresión lineal simple con las últimas 4 semanas
    const recentWeeks = weeks.slice(-4);
    const n = recentWeeks.length;

    let sumX = 0;
    let sumY = 0;
    let sumXY = 0;
    let sumX2 = 0;

    recentWeeks.forEach((week, i) => {
      const x = i;
      const y = week.completed;
      sumX += x;
      sumY += y;
      sumXY += x * y;
      sumX2 += x * x;
    });

    const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
    const intercept = (sumY - slope * sumX) / n;

    // Predicción para la próxima semana (x = n)
    const nextWeekPrediction = slope * n + intercept;
    setPrediction(Math.max(0, Math.round(nextWeekPrediction)));
  };

  const getTrendIcon = () => {
    switch (trend) {
      case 'increasing':
        return <TrendingUp className="text-green-600 dark:text-green-400" size={24} />;
      case 'decreasing':
        return <TrendingDown className="text-red-600 dark:text-red-400" size={24} />;
      case 'stable':
        return <Minus className="text-blue-600 dark:text-blue-400" size={24} />;
    }
  };

  const getTrendText = () => {
    switch (trend) {
      case 'increasing':
        return `Tendencia al alza (+${trendPercentage}%)`;
      case 'decreasing':
        return `Tendencia a la baja (-${trendPercentage}%)`;
      case 'stable':
        return 'Velocidad estable';
    }
  };

  const getTrendColor = () => {
    switch (trend) {
      case 'increasing':
        return 'text-green-600 dark:text-green-400';
      case 'decreasing':
        return 'text-red-600 dark:text-red-400';
      case 'stable':
        return 'text-blue-600 dark:text-blue-400';
    }
  };

  const getMaxCompleted = () => {
    return Math.max(...weekData.map(w => w.completed), prediction);
  };

  const getBarHeight = (value: number) => {
    const max = getMaxCompleted();
    if (max === 0) return 0;
    return (value / max) * 100;
  };

  if (loading) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-lg">
        <p className="text-gray-600 dark:text-gray-400">Calculando velocidad del equipo...</p>
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-br from-purple-50 via-pink-50 to-red-50 dark:from-gray-800 dark:to-gray-900 rounded-lg border-2 border-purple-300 dark:border-purple-700 p-6 my-2">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-600 rounded-full flex items-center justify-center">
            <Zap className="text-white" size={20} />
          </div>
          <div>
            <h3 className="font-bold text-gray-900 dark:text-gray-100 text-lg">Velocidad del Equipo</h3>
            <p className="text-xs text-gray-600 dark:text-gray-400">Últimas 6 semanas</p>
          </div>
        </div>
        <button
          onClick={onClose}
          className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
        >
          ✕
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        <div className="bg-white dark:bg-gray-700 rounded-lg p-3 text-center">
          <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">
            {avgVelocity}
          </div>
          <div className="text-xs text-gray-600 dark:text-gray-400">Promedio/Semana</div>
        </div>

        <div className="bg-white dark:bg-gray-700 rounded-lg p-3 text-center">
          <div className="flex items-center justify-center gap-1 mb-1">
            {getTrendIcon()}
          </div>
          <div className={`text-xs font-semibold ${getTrendColor()}`}>
            {getTrendText()}
          </div>
        </div>

        <div className="bg-white dark:bg-gray-700 rounded-lg p-3 text-center">
          <div className="text-2xl font-bold text-indigo-600 dark:text-indigo-400">
            {prediction}
          </div>
          <div className="text-xs text-gray-600 dark:text-gray-400">Predicción Próx. Sem.</div>
        </div>
      </div>

      {/* Bar Chart */}
      <div className="bg-white dark:bg-gray-700 rounded-lg p-4 mb-4">
        <h4 className="font-semibold text-gray-900 dark:text-gray-100 mb-3 text-sm">
          Prioridades Completadas por Semana
        </h4>

        <div className="flex items-end justify-between gap-2" style={{ height: '180px' }}>
          {weekData.map((week, index) => {
            const height = getBarHeight(week.completed);
            const isCurrentWeek = index === weekData.length - 1;

            return (
              <div key={index} className="flex-1 flex flex-col items-center justify-end">
                <div className="relative w-full group">
                  {/* Tooltip */}
                  <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
                    <div className="bg-gray-900 text-white text-xs rounded px-2 py-1 whitespace-nowrap">
                      {week.completed} completadas
                      {week.total > 0 && ` de ${week.total}`}
                    </div>
                  </div>

                  {/* Bar */}
                  <div
                    className={`w-full rounded-t transition-all ${
                      isCurrentWeek
                        ? 'bg-gradient-to-t from-purple-500 to-pink-500'
                        : 'bg-gradient-to-t from-purple-400 to-purple-300 dark:from-purple-600 dark:to-purple-500'
                    }`}
                    style={{ height: `${height}%`, minHeight: week.completed > 0 ? '20px' : '0' }}
                  >
                    {week.completed > 0 && (
                      <div className="text-white text-xs font-bold text-center pt-1">
                        {week.completed}
                      </div>
                    )}
                  </div>
                </div>

                {/* Label */}
                <div className="mt-2 text-xs text-gray-600 dark:text-gray-400 text-center">
                  {week.weekLabel}
                  {isCurrentWeek && (
                    <div className="text-purple-600 dark:text-purple-400 font-semibold">Actual</div>
                  )}
                </div>
              </div>
            );
          })}

          {/* Prediction Bar */}
          <div className="flex-1 flex flex-col items-center justify-end">
            <div className="relative w-full group">
              {/* Tooltip */}
              <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
                <div className="bg-gray-900 text-white text-xs rounded px-2 py-1 whitespace-nowrap">
                  Predicción: {prediction}
                </div>
              </div>

              {/* Bar */}
              <div
                className="w-full rounded-t bg-gradient-to-t from-indigo-400 to-indigo-300 dark:from-indigo-600 dark:to-indigo-500 opacity-70 border-2 border-dashed border-indigo-500"
                style={{ height: `${getBarHeight(prediction)}%`, minHeight: prediction > 0 ? '20px' : '0' }}
              >
                {prediction > 0 && (
                  <div className="text-white text-xs font-bold text-center pt-1">
                    {prediction}
                  </div>
                )}
              </div>
            </div>

            {/* Label */}
            <div className="mt-2 text-xs text-indigo-600 dark:text-indigo-400 text-center font-semibold">
              Predicción
            </div>
          </div>
        </div>
      </div>

      {/* Insights */}
      <div className="bg-white dark:bg-gray-700 rounded-lg p-4 mb-4">
        <div className="flex items-center gap-2 mb-3">
          <Target className="text-purple-600 dark:text-purple-400" size={20} />
          <h4 className="font-semibold text-gray-900 dark:text-gray-100">Análisis</h4>
        </div>

        <div className="space-y-2">
          {trend === 'increasing' && (
            <div className="flex items-start gap-2 text-sm">
              <CheckCircle2 className="text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" size={16} />
              <p className="text-gray-700 dark:text-gray-300">
                <span className="font-semibold text-green-600 dark:text-green-400">Excelente:</span> La velocidad del equipo está aumentando. El equipo está completando más prioridades cada semana.
              </p>
            </div>
          )}

          {trend === 'decreasing' && (
            <div className="flex items-start gap-2 text-sm">
              <AlertCircle className="text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" size={16} />
              <p className="text-gray-700 dark:text-gray-300">
                <span className="font-semibold text-red-600 dark:text-red-400">Atención:</span> La velocidad está disminuyendo. Considera revisar si hay bloqueadores o sobrecarga de trabajo.
              </p>
            </div>
          )}

          {trend === 'stable' && (
            <div className="flex items-start gap-2 text-sm">
              <CheckCircle2 className="text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" size={16} />
              <p className="text-gray-700 dark:text-gray-300">
                <span className="font-semibold text-blue-600 dark:text-blue-400">Consistente:</span> La velocidad se mantiene estable. El equipo tiene un ritmo predecible.
              </p>
            </div>
          )}

          <div className="flex items-start gap-2 text-sm">
            <Calendar className="text-gray-500 dark:text-gray-400 flex-shrink-0 mt-0.5" size={16} />
            <p className="text-gray-700 dark:text-gray-300">
              Basado en la tendencia actual, se espera que el equipo complete aproximadamente <span className="font-bold text-purple-600 dark:text-purple-400">{prediction} prioridades</span> la próxima semana.
            </p>
          </div>
        </div>
      </div>

      <div className="text-xs text-gray-500 dark:text-gray-400 text-center">
        Comando ejecutado: <code className="bg-gray-200 dark:bg-gray-700 px-2 py-1 rounded">/velocity</code>
      </div>
    </div>
  );
}
