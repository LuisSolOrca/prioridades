'use client';

import { useState, useEffect } from 'react';
import { TrendingDown, AlertTriangle, CheckCircle2, Calendar, Target } from 'lucide-react';

interface BurndownCommandProps {
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
  userId: {
    _id: string;
    name: string;
  };
}

interface DayData {
  day: string;
  date: Date;
  ideal: number;
  actual: number;
  completed: number;
}

export default function BurndownCommand({ projectId, onClose }: BurndownCommandProps) {
  const [priorities, setPriorities] = useState<Priority[]>([]);
  const [loading, setLoading] = useState(true);
  const [burndownData, setBurndownData] = useState<DayData[]>([]);
  const [totalWork, setTotalWork] = useState(0);
  const [currentWork, setCurrentWork] = useState(0);
  const [projection, setProjection] = useState<string>('');
  const [isOnTrack, setIsOnTrack] = useState(true);

  useEffect(() => {
    loadPriorities();
  }, [projectId]);

  const loadPriorities = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/projects/${projectId}/priorities`);
      if (!response.ok) throw new Error('Error loading priorities');

      const data = await response.json();

      // Filtrar prioridades de la semana actual
      const currentWeekPriorities = getCurrentWeekPriorities(data.priorities || []);
      setPriorities(currentWeekPriorities);

      // Calcular burndown
      calculateBurndown(currentWeekPriorities);
    } catch (error) {
      console.error('Error loading priorities:', error);
    } finally {
      setLoading(false);
    }
  };

  const getCurrentWeekPriorities = (allPriorities: Priority[]): Priority[] => {
    const now = new Date();
    const currentMonday = getMonday(now);
    const currentFriday = new Date(currentMonday);
    currentFriday.setDate(currentMonday.getDate() + 4);

    return allPriorities.filter(p => {
      const weekStart = new Date(p.weekStart);
      return weekStart >= currentMonday && weekStart <= currentFriday;
    });
  };

  const getMonday = (date: Date): Date => {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    const monday = new Date(d.setDate(diff));
    monday.setHours(0, 0, 0, 0);
    return monday;
  };

  const calculateBurndown = (weekPriorities: Priority[]) => {
    const total = weekPriorities.length;
    setTotalWork(total);

    if (total === 0) {
      setCurrentWork(0);
      setBurndownData([]);
      return;
    }

    const now = new Date();
    const monday = getMonday(now);
    const days: DayData[] = [];

    // Días de la semana (Lun-Vie)
    const dayNames = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie'];

    for (let i = 0; i < 5; i++) {
      const currentDay = new Date(monday);
      currentDay.setDate(monday.getDate() + i);
      currentDay.setHours(23, 59, 59, 999);

      // Línea ideal: decremento lineal
      const idealRemaining = total - (total / 5) * (i + 1);

      // Línea real: contar completadas hasta este día
      const completedByDay = weekPriorities.filter(p => {
        if (p.status !== 'COMPLETADO') return false;
        const updatedDate = new Date(p.updatedAt);
        return updatedDate <= currentDay;
      }).length;

      const actualRemaining = total - completedByDay;

      days.push({
        day: dayNames[i],
        date: currentDay,
        ideal: Math.max(0, idealRemaining),
        actual: actualRemaining,
        completed: completedByDay
      });
    }

    setBurndownData(days);

    // Trabajo actual restante
    const completed = weekPriorities.filter(p => p.status === 'COMPLETADO').length;
    const remaining = total - completed;
    setCurrentWork(remaining);

    // Verificar si está on track
    const today = new Date();
    const dayOfWeek = today.getDay(); // 0=Dom, 1=Lun, ..., 5=Vie
    const workDayIndex = dayOfWeek === 0 ? 4 : dayOfWeek - 1; // Convertir a índice 0-4

    if (workDayIndex >= 0 && workDayIndex < days.length) {
      const todayData = days[workDayIndex];
      setIsOnTrack(todayData.actual <= todayData.ideal);
    }

    // Proyección
    calculateProjection(days, total, completed);
  };

  const calculateProjection = (days: DayData[], total: number, completed: number) => {
    if (completed === total) {
      setProjection('¡Trabajo completado! 🎉');
      return;
    }

    // Calcular velocidad actual (prioridades por día)
    const today = new Date();
    const monday = getMonday(today);
    const daysElapsed = Math.floor((today.getTime() - monday.getTime()) / (1000 * 60 * 60 * 24)) + 1;

    if (daysElapsed <= 0 || completed === 0) {
      setProjection('Insuficientes datos para proyección');
      return;
    }

    const velocity = completed / daysElapsed;
    const remaining = total - completed;
    const daysNeeded = Math.ceil(remaining / velocity);

    const completionDate = new Date(today);
    completionDate.setDate(today.getDate() + daysNeeded);

    const friday = new Date(monday);
    friday.setDate(monday.getDate() + 4);

    if (completionDate <= friday) {
      setProjection(`Proyección: Finalización ${completionDate.toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric', month: 'short' })}`);
    } else {
      setProjection(`⚠️ Proyección: Se necesitan ${daysNeeded} días (fuera de plazo)`);
    }
  };

  const getMaxValue = () => {
    return Math.max(totalWork, ...burndownData.map(d => Math.max(d.ideal, d.actual)));
  };

  const getYPosition = (value: number, maxValue: number, height: number) => {
    return height - (value / maxValue) * height;
  };

  if (loading) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-lg">
        <p className="text-gray-600 dark:text-gray-400">Cargando gráfico burndown...</p>
      </div>
    );
  }

  const chartHeight = 200;
  const chartWidth = 400;
  const maxValue = getMaxValue();

  return (
    <div className="bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 dark:from-gray-800 dark:to-gray-900 rounded-lg border-2 border-blue-300 dark:border-blue-700 p-6 my-2">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center">
            <TrendingDown className="text-white" size={20} />
          </div>
          <div>
            <h3 className="font-bold text-gray-900 dark:text-gray-100 text-lg">Burndown Chart</h3>
            <p className="text-xs text-gray-600 dark:text-gray-400">Semana actual</p>
          </div>
        </div>
        <button
          onClick={onClose}
          className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
        >
          ✕
        </button>
      </div>

      {/* Alert Banner */}
      {!isOnTrack && currentWork > 0 && (
        <div className="mb-4 bg-yellow-100 dark:bg-yellow-900/30 border border-yellow-400 dark:border-yellow-700 rounded-lg p-3 flex items-center gap-2">
          <AlertTriangle className="text-yellow-600 dark:text-yellow-500" size={20} />
          <span className="text-sm text-yellow-800 dark:text-yellow-300 font-medium">
            ⚠️ El equipo va por detrás del ritmo ideal
          </span>
        </div>
      )}

      {isOnTrack && currentWork > 0 && (
        <div className="mb-4 bg-green-100 dark:bg-green-900/30 border border-green-400 dark:border-green-700 rounded-lg p-3 flex items-center gap-2">
          <CheckCircle2 className="text-green-600 dark:text-green-500" size={20} />
          <span className="text-sm text-green-800 dark:text-green-300 font-medium">
            ✓ El equipo va on track con el plan
          </span>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        <div className="bg-white dark:bg-gray-700 rounded-lg p-3 text-center">
          <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">{totalWork}</div>
          <div className="text-xs text-gray-600 dark:text-gray-400">Total Prioridades</div>
        </div>
        <div className="bg-white dark:bg-gray-700 rounded-lg p-3 text-center">
          <div className="text-2xl font-bold text-green-600 dark:text-green-400">
            {totalWork - currentWork}
          </div>
          <div className="text-xs text-gray-600 dark:text-gray-400">Completadas</div>
        </div>
        <div className="bg-white dark:bg-gray-700 rounded-lg p-3 text-center">
          <div className="text-2xl font-bold text-orange-600 dark:text-orange-400">{currentWork}</div>
          <div className="text-xs text-gray-600 dark:text-gray-400">Restantes</div>
        </div>
      </div>

      {/* Burndown Chart */}
      {burndownData.length > 0 ? (
        <div className="bg-white dark:bg-gray-700 rounded-lg p-4 mb-4">
          <svg width="100%" height={chartHeight} viewBox={`0 0 ${chartWidth} ${chartHeight}`}>
            {/* Grid lines */}
            {[0, 1, 2, 3, 4].map(i => {
              const y = (chartHeight / 4) * i;
              return (
                <line
                  key={`grid-${i}`}
                  x1="0"
                  y1={y}
                  x2={chartWidth}
                  y2={y}
                  stroke="currentColor"
                  strokeWidth="1"
                  className="text-gray-200 dark:text-gray-600"
                  strokeDasharray="4"
                />
              );
            })}

            {/* Ideal line (gray dashed) */}
            <polyline
              points={burndownData.map((d, i) => {
                const x = (chartWidth / 6) + (i * (chartWidth / 6));
                const y = getYPosition(d.ideal, maxValue, chartHeight - 20);
                return `${x},${y}`;
              }).join(' ')}
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeDasharray="5,5"
              className="text-gray-400 dark:text-gray-500"
            />

            {/* Actual line (blue solid) */}
            <polyline
              points={burndownData.map((d, i) => {
                const x = (chartWidth / 6) + (i * (chartWidth / 6));
                const y = getYPosition(d.actual, maxValue, chartHeight - 20);
                return `${x},${y}`;
              }).join(' ')}
              fill="none"
              stroke="currentColor"
              strokeWidth="3"
              className={isOnTrack ? 'text-green-500' : 'text-red-500'}
            />

            {/* Data points */}
            {burndownData.map((d, i) => {
              const x = (chartWidth / 6) + (i * (chartWidth / 6));
              const y = getYPosition(d.actual, maxValue, chartHeight - 20);
              return (
                <circle
                  key={`point-${i}`}
                  cx={x}
                  cy={y}
                  r="4"
                  fill="currentColor"
                  className={isOnTrack ? 'text-green-500' : 'text-red-500'}
                />
              );
            })}

            {/* X-axis labels */}
            {burndownData.map((d, i) => {
              const x = (chartWidth / 6) + (i * (chartWidth / 6));
              return (
                <text
                  key={`label-${i}`}
                  x={x}
                  y={chartHeight - 5}
                  textAnchor="middle"
                  className="text-xs fill-gray-600 dark:fill-gray-400"
                >
                  {d.day}
                </text>
              );
            })}
          </svg>

          {/* Legend */}
          <div className="flex items-center justify-center gap-6 mt-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-0.5 bg-gray-400 dark:bg-gray-500" style={{ borderTop: '2px dashed' }}></div>
              <span className="text-xs text-gray-600 dark:text-gray-400">Línea Ideal</span>
            </div>
            <div className="flex items-center gap-2">
              <div className={`w-8 h-0.5 ${isOnTrack ? 'bg-green-500' : 'bg-red-500'}`}></div>
              <span className="text-xs text-gray-600 dark:text-gray-400">Línea Real</span>
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-white dark:bg-gray-700 rounded-lg p-8 text-center mb-4">
          <Calendar className="mx-auto mb-2 text-gray-400" size={32} />
          <p className="text-gray-600 dark:text-gray-400">No hay prioridades para la semana actual</p>
        </div>
      )}

      {/* Projection */}
      <div className="bg-white dark:bg-gray-700 rounded-lg p-4 mb-4">
        <div className="flex items-center gap-2 mb-2">
          <Target className="text-indigo-600 dark:text-indigo-400" size={20} />
          <h4 className="font-semibold text-gray-900 dark:text-gray-100">Proyección</h4>
        </div>
        <p className="text-sm text-gray-700 dark:text-gray-300">{projection}</p>
      </div>

      <div className="text-xs text-gray-500 dark:text-gray-400 text-center">
        Comando ejecutado: <code className="bg-gray-200 dark:bg-gray-700 px-2 py-1 rounded">/burndown</code>
      </div>
    </div>
  );
}
