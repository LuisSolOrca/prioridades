'use client';

import { useState, useEffect } from 'react';
import {
  TrendingUp,
  TrendingDown,
  Target,
  CheckCircle,
  Clock,
  AlertCircle,
  Users,
  Calendar,
  Activity
} from 'lucide-react';

interface Priority {
  _id: string;
  title: string;
  status: string;
  completionPercentage: number;
  projectId?: string;
  userId: {
    _id: string;
    name: string;
  };
  weekStart: string;
  weekEnd: string;
  createdAt: string;
}

interface Milestone {
  _id: string;
  title: string;
  isCompleted: boolean;
  dueDate: string;
  deliverables: Array<{ isCompleted: boolean }>;
}

interface ChannelMetricsProps {
  projectId: string;
}

export default function ChannelMetrics({ projectId }: ChannelMetricsProps) {
  const [priorities, setPriorities] = useState<Priority[]>([]);
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, [projectId]);

  const loadData = async () => {
    try {
      setLoading(true);

      const [prioritiesRes, milestonesRes] = await Promise.all([
        fetch('/api/priorities?forDashboard=true'),
        fetch(`/api/milestones?projectId=${projectId}`)
      ]);

      if (prioritiesRes.ok) {
        const data = await prioritiesRes.json();
        const projectPriorities = data.filter((p: Priority) => p.projectId === projectId);
        setPriorities(projectPriorities);
      }

      if (milestonesRes.ok) {
        const data = await milestonesRes.json();
        const projectMilestones = Array.isArray(data) ? data : [];
        setMilestones(projectMilestones);
      }
    } catch (error) {
      console.error('Error loading metrics:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Cargando métricas...</p>
        </div>
      </div>
    );
  }

  // Calculate statistics
  const totalPriorities = priorities.length;
  const completedPriorities = priorities.filter(p => p.status === 'COMPLETADO').length;
  const inProgressPriorities = priorities.filter(p => p.status === 'EN_TIEMPO').length;
  const atRiskPriorities = priorities.filter(p => p.status === 'EN_RIESGO').length;
  const blockedPriorities = priorities.filter(p => p.status === 'BLOQUEADO').length;

  const completionRate = totalPriorities > 0
    ? Math.round((completedPriorities / totalPriorities) * 100)
    : 0;

  const avgProgress = totalPriorities > 0
    ? Math.round(priorities.reduce((sum, p) => sum + p.completionPercentage, 0) / totalPriorities)
    : 0;

  // Milestone statistics
  const totalMilestones = milestones.length;
  const completedMilestones = milestones.filter(m => m.isCompleted).length;
  const milestonesCompletionRate = totalMilestones > 0
    ? Math.round((completedMilestones / totalMilestones) * 100)
    : 0;

  // Deliverables statistics
  const totalDeliverables = milestones.reduce((sum, m) => sum + m.deliverables.length, 0);
  const completedDeliverables = milestones.reduce(
    (sum, m) => sum + m.deliverables.filter(d => d.isCompleted).length,
    0
  );
  const deliverablesCompletionRate = totalDeliverables > 0
    ? Math.round((completedDeliverables / totalDeliverables) * 100)
    : 0;

  // Team activity
  const userActivity = priorities.reduce((acc: any, p) => {
    const userId = p.userId._id;
    const userName = p.userId.name;
    if (!acc[userId]) {
      acc[userId] = {
        name: userName,
        total: 0,
        completed: 0,
        inProgress: 0
      };
    }
    acc[userId].total++;
    if (p.status === 'COMPLETADO') acc[userId].completed++;
    if (p.status === 'EN_TIEMPO') acc[userId].inProgress++;
    return acc;
  }, {});

  const topContributors = Object.values(userActivity)
    .sort((a: any, b: any) => b.completed - a.completed)
    .slice(0, 5);

  // Weekly trend
  const getWeekKey = (date: string) => {
    const d = new Date(date);
    const weekStart = new Date(d);
    weekStart.setDate(d.getDate() - d.getDay() + 1);
    return weekStart.toISOString().split('T')[0];
  };

  const weeklyData = priorities.reduce((acc: any, p) => {
    const weekKey = getWeekKey(p.weekStart);
    if (!acc[weekKey]) {
      acc[weekKey] = { total: 0, completed: 0 };
    }
    acc[weekKey].total++;
    if (p.status === 'COMPLETADO') acc[weekKey].completed++;
    return acc;
  }, {});

  const weeklyTrend = Object.entries(weeklyData)
    .map(([week, data]: [string, any]) => ({
      week,
      total: data.total,
      completed: data.completed,
      rate: Math.round((data.completed / data.total) * 100)
    }))
    .sort((a, b) => a.week.localeCompare(b.week))
    .slice(-8); // Last 8 weeks

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-100 flex items-center gap-2">
            <Activity size={28} />
            Métricas del Proyecto
          </h2>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            Estadísticas y análisis de rendimiento
          </p>
        </div>
        <button
          onClick={loadData}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition text-sm font-medium"
        >
          Actualizar
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Priorities */}
        <div className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/30 dark:to-blue-800/30 border border-blue-200 dark:border-blue-700 rounded-lg p-4">
          <div className="flex items-center justify-between mb-2">
            <Target className="text-blue-600 dark:text-blue-400" size={24} />
            <span className="text-3xl font-bold text-blue-900 dark:text-blue-100">
              {totalPriorities}
            </span>
          </div>
          <p className="text-sm font-medium text-blue-800 dark:text-blue-200">
            Prioridades Totales
          </p>
          <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">
            {inProgressPriorities} en progreso
          </p>
        </div>

        {/* Completion Rate */}
        <div className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/30 dark:to-green-800/30 border border-green-200 dark:border-green-700 rounded-lg p-4">
          <div className="flex items-center justify-between mb-2">
            <CheckCircle className="text-green-600 dark:text-green-400" size={24} />
            <span className="text-3xl font-bold text-green-900 dark:text-green-100">
              {completionRate}%
            </span>
          </div>
          <p className="text-sm font-medium text-green-800 dark:text-green-200">
            Tasa de Completitud
          </p>
          <p className="text-xs text-green-600 dark:text-green-400 mt-1">
            {completedPriorities} de {totalPriorities} completadas
          </p>
        </div>

        {/* Average Progress */}
        <div className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/30 dark:to-purple-800/30 border border-purple-200 dark:border-purple-700 rounded-lg p-4">
          <div className="flex items-center justify-between mb-2">
            <TrendingUp className="text-purple-600 dark:text-purple-400" size={24} />
            <span className="text-3xl font-bold text-purple-900 dark:text-purple-100">
              {avgProgress}%
            </span>
          </div>
          <p className="text-sm font-medium text-purple-800 dark:text-purple-200">
            Progreso Promedio
          </p>
          <p className="text-xs text-purple-600 dark:text-purple-400 mt-1">
            Todas las prioridades
          </p>
        </div>

        {/* Milestones */}
        <div className="bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-900/30 dark:to-orange-800/30 border border-orange-200 dark:border-orange-700 rounded-lg p-4">
          <div className="flex items-center justify-between mb-2">
            <Calendar className="text-orange-600 dark:text-orange-400" size={24} />
            <span className="text-3xl font-bold text-orange-900 dark:text-orange-100">
              {completedMilestones}/{totalMilestones}
            </span>
          </div>
          <p className="text-sm font-medium text-orange-800 dark:text-orange-200">
            Hitos Completados
          </p>
          <p className="text-xs text-orange-600 dark:text-orange-400 mt-1">
            {milestonesCompletionRate}% del total
          </p>
        </div>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Status Distribution Chart */}
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
          <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-100 mb-4">
            Distribución por Estado
          </h3>
          <div className="space-y-3">
            {/* Completed */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center gap-2">
                  <CheckCircle size={16} className="text-green-600" />
                  Completado
                </span>
                <span className="text-sm font-bold text-gray-900 dark:text-gray-100">
                  {completedPriorities}
                </span>
              </div>
              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                <div
                  className="bg-green-600 h-2 rounded-full transition-all"
                  style={{ width: `${totalPriorities > 0 ? (completedPriorities / totalPriorities) * 100 : 0}%` }}
                ></div>
              </div>
            </div>

            {/* In Progress */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center gap-2">
                  <Clock size={16} className="text-blue-600" />
                  En Tiempo
                </span>
                <span className="text-sm font-bold text-gray-900 dark:text-gray-100">
                  {inProgressPriorities}
                </span>
              </div>
              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                <div
                  className="bg-blue-600 h-2 rounded-full transition-all"
                  style={{ width: `${totalPriorities > 0 ? (inProgressPriorities / totalPriorities) * 100 : 0}%` }}
                ></div>
              </div>
            </div>

            {/* At Risk */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center gap-2">
                  <AlertCircle size={16} className="text-yellow-600" />
                  En Riesgo
                </span>
                <span className="text-sm font-bold text-gray-900 dark:text-gray-100">
                  {atRiskPriorities}
                </span>
              </div>
              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                <div
                  className="bg-yellow-600 h-2 rounded-full transition-all"
                  style={{ width: `${totalPriorities > 0 ? (atRiskPriorities / totalPriorities) * 100 : 0}%` }}
                ></div>
              </div>
            </div>

            {/* Blocked */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center gap-2">
                  <AlertCircle size={16} className="text-red-600" />
                  Bloqueado
                </span>
                <span className="text-sm font-bold text-gray-900 dark:text-gray-100">
                  {blockedPriorities}
                </span>
              </div>
              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                <div
                  className="bg-red-600 h-2 rounded-full transition-all"
                  style={{ width: `${totalPriorities > 0 ? (blockedPriorities / totalPriorities) * 100 : 0}%` }}
                ></div>
              </div>
            </div>
          </div>

          {/* Pie Chart Visual */}
          <div className="mt-6 flex justify-center">
            <svg width="200" height="200" viewBox="0 0 200 200">
              {(() => {
                let currentAngle = 0;
                const cx = 100;
                const cy = 100;
                const radius = 80;

                const createSlice = (percentage: number, color: string) => {
                  const angle = (percentage / 100) * 360;
                  const startAngle = currentAngle;
                  const endAngle = currentAngle + angle;
                  currentAngle = endAngle;

                  const startX = cx + radius * Math.cos((startAngle - 90) * Math.PI / 180);
                  const startY = cy + radius * Math.sin((startAngle - 90) * Math.PI / 180);
                  const endX = cx + radius * Math.cos((endAngle - 90) * Math.PI / 180);
                  const endY = cy + radius * Math.sin((endAngle - 90) * Math.PI / 180);
                  const largeArc = angle > 180 ? 1 : 0;

                  return percentage > 0 ? (
                    <path
                      d={`M ${cx} ${cy} L ${startX} ${startY} A ${radius} ${radius} 0 ${largeArc} 1 ${endX} ${endY} Z`}
                      fill={color}
                    />
                  ) : null;
                };

                const completedPct = totalPriorities > 0 ? (completedPriorities / totalPriorities) * 100 : 0;
                const inProgressPct = totalPriorities > 0 ? (inProgressPriorities / totalPriorities) * 100 : 0;
                const atRiskPct = totalPriorities > 0 ? (atRiskPriorities / totalPriorities) * 100 : 0;
                const blockedPct = totalPriorities > 0 ? (blockedPriorities / totalPriorities) * 100 : 0;

                return (
                  <>
                    {createSlice(completedPct, '#16a34a')}
                    {createSlice(inProgressPct, '#2563eb')}
                    {createSlice(atRiskPct, '#ca8a04')}
                    {createSlice(blockedPct, '#dc2626')}
                  </>
                );
              })()}
            </svg>
          </div>
        </div>

        {/* Top Contributors */}
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
          <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-100 mb-4 flex items-center gap-2">
            <Users size={20} />
            Top Colaboradores
          </h3>
          {topContributors.length > 0 ? (
            <div className="space-y-3">
              {topContributors.map((user: any, index: number) => (
                <div key={index} className="flex items-center gap-3">
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center text-white font-semibold text-sm">
                    {user.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                        {user.name}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {user.completed}/{user.total}
                      </p>
                    </div>
                    <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                      <div
                        className="bg-gradient-to-r from-blue-600 to-purple-600 h-2 rounded-full transition-all"
                        style={{ width: `${(user.completed / user.total) * 100}%` }}
                      ></div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500 dark:text-gray-400">
              <Users className="mx-auto mb-2" size={32} />
              <p>No hay actividad de colaboradores</p>
            </div>
          )}

          {/* Deliverables Progress */}
          <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
            <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
              Progreso de Entregables
            </h4>
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600 dark:text-gray-400">Total:</span>
                <span className="font-bold text-gray-900 dark:text-gray-100">
                  {completedDeliverables}/{totalDeliverables}
                </span>
              </div>
              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3">
                <div
                  className="bg-gradient-to-r from-green-500 to-emerald-600 h-3 rounded-full transition-all"
                  style={{ width: `${deliverablesCompletionRate}%` }}
                ></div>
              </div>
              <p className="text-xs text-center text-gray-500 dark:text-gray-400">
                {deliverablesCompletionRate}% completado
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Weekly Trend Chart */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
        <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-100 mb-4 flex items-center gap-2">
          <TrendingUp size={20} />
          Tendencia Semanal de Completitud
        </h3>
        {weeklyTrend.length > 0 ? (
          <div className="overflow-x-auto">
            <div className="min-w-[600px]">
              {/* Chart */}
              <svg width="100%" height="200" className="mb-4">
                <defs>
                  <linearGradient id="trendGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.3" />
                    <stop offset="100%" stopColor="#3b82f6" stopOpacity="0" />
                  </linearGradient>
                </defs>

                {/* Grid lines */}
                {[0, 25, 50, 75, 100].map((y) => (
                  <line
                    key={y}
                    x1="0"
                    y1={180 - (y * 1.6)}
                    x2="100%"
                    y2={180 - (y * 1.6)}
                    stroke="currentColor"
                    className="text-gray-300 dark:text-gray-600"
                    strokeWidth="1"
                    opacity="0.3"
                  />
                ))}

                {/* Area */}
                <path
                  d={`M 0,180 ${weeklyTrend.map((w, i) => {
                    const x = (i / (weeklyTrend.length - 1)) * 100;
                    const y = 180 - (w.rate * 1.6);
                    return `L ${x}%,${y}`;
                  }).join(' ')} L 100%,180 Z`}
                  fill="url(#trendGradient)"
                />

                {/* Line */}
                <polyline
                  points={weeklyTrend.map((w, i) => {
                    const x = (i / (weeklyTrend.length - 1)) * 100;
                    const y = 180 - (w.rate * 1.6);
                    return `${x}%,${y}`;
                  }).join(' ')}
                  fill="none"
                  stroke="#3b82f6"
                  strokeWidth="2"
                />

                {/* Points */}
                {weeklyTrend.map((w, i) => {
                  const x = (i / (weeklyTrend.length - 1)) * 100;
                  const y = 180 - (w.rate * 1.6);
                  return (
                    <circle
                      key={i}
                      cx={`${x}%`}
                      cy={y}
                      r="4"
                      fill="#3b82f6"
                      className="hover:r-6 transition-all cursor-pointer"
                    >
                      <title>{`Semana ${w.week}: ${w.rate}% (${w.completed}/${w.total})`}</title>
                    </circle>
                  );
                })}
              </svg>

              {/* Labels */}
              <div className="flex justify-between text-xs text-gray-600 dark:text-gray-400">
                {weeklyTrend.map((w, i) => (
                  <div key={i} className="text-center">
                    <div>{new Date(w.week).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}</div>
                    <div className="font-bold text-gray-900 dark:text-gray-100">{w.rate}%</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <div className="text-center py-8 text-gray-500 dark:text-gray-400">
            <TrendingDown className="mx-auto mb-2" size={32} />
            <p>No hay datos de tendencia disponibles</p>
          </div>
        )}
      </div>

      {/* Summary */}
      {totalPriorities === 0 && (
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-6 text-center">
          <Activity className="mx-auto mb-3 text-blue-600 dark:text-blue-400" size={48} />
          <h3 className="text-lg font-semibold text-blue-900 dark:text-blue-100 mb-2">
            No hay métricas disponibles
          </h3>
          <p className="text-sm text-blue-700 dark:text-blue-300">
            Este proyecto aún no tiene prioridades asociadas. Crea algunas prioridades para comenzar a ver las métricas del proyecto.
          </p>
        </div>
      )}
    </div>
  );
}
