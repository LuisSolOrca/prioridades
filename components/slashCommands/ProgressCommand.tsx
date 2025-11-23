'use client';

import { useEffect, useState } from 'react';
import { Target, CheckCircle, Clock, TrendingUp, Calendar } from 'lucide-react';

interface Milestone {
  _id: string;
  title: string;
  description?: string;
  dueDate: string;
  isCompleted: boolean;
  completedAt?: string;
}

interface Priority {
  _id: string;
  title: string;
  status: string;
  completionPercentage: number;
  weekStart: string;
  weekEnd: string;
}

interface ProgressCommandProps {
  projectId: string;
  onClose: () => void;
}

export default function ProgressCommand({ projectId, onClose }: ProgressCommandProps) {
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [priorities, setPriorities] = useState<Priority[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, [projectId]);

  const loadData = async () => {
    try {
      setLoading(true);

      // Cargar milestones
      const milestonesRes = await fetch(`/api/milestones?projectId=${projectId}`);
      if (milestonesRes.ok) {
        const data = await milestonesRes.json();
        // El endpoint retorna un array directamente, no un objeto con milestones
        setMilestones(Array.isArray(data) ? data : []);
      }

      // Cargar prioridades
      const prioritiesRes = await fetch(`/api/projects/${projectId}/priorities`);
      if (prioritiesRes.ok) {
        const data = await prioritiesRes.json();
        setPriorities(data.priorities || []);
      }
    } catch (error) {
      console.error('Error loading progress data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getCompletedMilestones = () => {
    return milestones.filter(m => m.isCompleted).sort((a, b) =>
      new Date(b.completedAt || b.dueDate).getTime() - new Date(a.completedAt || a.dueDate).getTime()
    );
  };

  const getUpcomingMilestones = () => {
    return milestones.filter(m => !m.isCompleted).sort((a, b) =>
      new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime()
    );
  };

  const getVelocityStats = () => {
    const now = new Date();
    const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const twoWeeksAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);

    const completedThisWeek = priorities.filter(p =>
      p.status === 'COMPLETADO' &&
      new Date(p.weekEnd) >= oneWeekAgo
    ).length;

    const completedLastWeek = priorities.filter(p =>
      p.status === 'COMPLETADO' &&
      new Date(p.weekEnd) >= twoWeeksAgo &&
      new Date(p.weekEnd) < oneWeekAgo
    ).length;

    const trend = completedLastWeek > 0
      ? ((completedThisWeek - completedLastWeek) / completedLastWeek) * 100
      : 0;

    return {
      thisWeek: completedThisWeek,
      lastWeek: completedLastWeek,
      trend
    };
  };

  const getProgressPercentage = () => {
    if (priorities.length === 0) return 0;
    const completed = priorities.filter(p => p.status === 'COMPLETADO').length;
    return Math.round((completed / priorities.length) * 100);
  };

  const completedMilestones = getCompletedMilestones();
  const upcomingMilestones = getUpcomingMilestones();
  const velocity = getVelocityStats();
  const overallProgress = getProgressPercentage();

  if (loading) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 my-2">
        <div className="text-center py-4">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-cyan-600 mx-auto"></div>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">Cargando progreso...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-br from-cyan-50 to-blue-50 dark:from-gray-800 dark:to-gray-900 rounded-lg border-2 border-cyan-300 dark:border-cyan-700 p-6 my-2">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="w-10 h-10 bg-cyan-600 rounded-full flex items-center justify-center">
            <Target className="text-white" size={20} />
          </div>
          <div>
            <h3 className="font-bold text-gray-900 dark:text-gray-100 text-lg">Progreso del Proyecto</h3>
            <p className="text-xs text-gray-600 dark:text-gray-400">Estado actual y roadmap</p>
          </div>
        </div>
        <button
          onClick={onClose}
          className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
        >
          ✕
        </button>
      </div>

      {/* Overall Progress */}
      <div className="bg-white dark:bg-gray-700 rounded-lg p-4 mb-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Progreso General</span>
          <span className="text-2xl font-bold text-cyan-600 dark:text-cyan-400">{overallProgress}%</span>
        </div>
        <div className="w-full bg-gray-200 dark:bg-gray-600 rounded-full h-4">
          <div
            className="bg-gradient-to-r from-cyan-500 to-blue-500 h-4 rounded-full transition-all duration-500"
            style={{ width: `${overallProgress}%` }}
          ></div>
        </div>
        <div className="mt-2 text-xs text-gray-500 dark:text-gray-400">
          {priorities.filter(p => p.status === 'COMPLETADO').length} de {priorities.length} prioridades completadas
        </div>
      </div>

      {/* Velocity Stats */}
      <div className="grid grid-cols-3 gap-3 mb-4">
        <div className="bg-white dark:bg-gray-700 rounded-lg p-3 text-center">
          <div className="text-2xl font-bold text-cyan-600 dark:text-cyan-400">{velocity.thisWeek}</div>
          <div className="text-xs text-gray-600 dark:text-gray-400">Esta Semana</div>
        </div>
        <div className="bg-white dark:bg-gray-700 rounded-lg p-3 text-center">
          <div className="text-2xl font-bold text-gray-700 dark:text-gray-300">{velocity.lastWeek}</div>
          <div className="text-xs text-gray-600 dark:text-gray-400">Semana Pasada</div>
        </div>
        <div className={`rounded-lg p-3 text-center ${
          velocity.trend >= 0
            ? 'bg-green-100 dark:bg-green-900/30'
            : 'bg-red-100 dark:bg-red-900/30'
        }`}>
          <div className={`text-2xl font-bold flex items-center justify-center gap-1 ${
            velocity.trend >= 0
              ? 'text-green-700 dark:text-green-400'
              : 'text-red-700 dark:text-red-400'
          }`}>
            {velocity.trend >= 0 ? '↗' : '↘'}
            {Math.abs(Math.round(velocity.trend))}%
          </div>
          <div className={`text-xs ${
            velocity.trend >= 0
              ? 'text-green-700 dark:text-green-400'
              : 'text-red-700 dark:text-red-400'
          }`}>
            Tendencia
          </div>
        </div>
      </div>

      {/* Completed Milestones Timeline */}
      {completedMilestones.length > 0 && (
        <div className="bg-white dark:bg-gray-700 rounded-lg p-4 mb-4">
          <h4 className="font-semibold text-gray-900 dark:text-gray-100 mb-3 flex items-center gap-2">
            <CheckCircle size={16} className="text-green-600" />
            Hitos Completados
          </h4>
          <div className="space-y-3">
            {completedMilestones.slice(0, 3).map((milestone) => (
              <div key={milestone._id} className="flex items-start gap-3 border-l-2 border-green-500 pl-3">
                <div className="flex-1">
                  <div className="font-medium text-gray-900 dark:text-gray-100">{milestone.title}</div>
                  {milestone.description && (
                    <div className="text-sm text-gray-600 dark:text-gray-400">{milestone.description}</div>
                  )}
                  <div className="text-xs text-green-600 dark:text-green-400 mt-1">
                    ✓ Completado {new Date(milestone.completedAt || milestone.dueDate).toLocaleDateString('es-ES', {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric'
                    })}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Upcoming Milestones Roadmap */}
      {upcomingMilestones.length > 0 && (
        <div className="bg-white dark:bg-gray-700 rounded-lg p-4">
          <h4 className="font-semibold text-gray-900 dark:text-gray-100 mb-3 flex items-center gap-2">
            <Calendar size={16} className="text-cyan-600" />
            Próximos Hitos
          </h4>
          <div className="space-y-3">
            {upcomingMilestones.slice(0, 5).map((milestone) => {
              const daysUntil = Math.ceil(
                (new Date(milestone.dueDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
              );
              const isOverdue = daysUntil < 0;
              const isUrgent = daysUntil >= 0 && daysUntil <= 7;

              return (
                <div
                  key={milestone._id}
                  className={`flex items-start gap-3 border-l-2 pl-3 ${
                    isOverdue
                      ? 'border-red-500'
                      : isUrgent
                      ? 'border-yellow-500'
                      : 'border-cyan-500'
                  }`}
                >
                  <div className="flex-1">
                    <div className="font-medium text-gray-900 dark:text-gray-100">{milestone.title}</div>
                    {milestone.description && (
                      <div className="text-sm text-gray-600 dark:text-gray-400">{milestone.description}</div>
                    )}
                    <div className={`text-xs mt-1 flex items-center gap-1 ${
                      isOverdue
                        ? 'text-red-600 dark:text-red-400'
                        : isUrgent
                        ? 'text-yellow-600 dark:text-yellow-400'
                        : 'text-cyan-600 dark:text-cyan-400'
                    }`}>
                      <Clock size={12} />
                      {isOverdue
                        ? `Vencido hace ${Math.abs(daysUntil)} días`
                        : daysUntil === 0
                        ? 'Vence hoy'
                        : `${daysUntil} días restantes`
                      }
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {milestones.length === 0 && (
        <div className="bg-gray-100 dark:bg-gray-700 rounded-lg p-6 text-center">
          <p className="text-gray-600 dark:text-gray-400">
            No hay hitos definidos para este proyecto
          </p>
        </div>
      )}

      <div className="mt-4 text-xs text-gray-500 dark:text-gray-400 text-center">
        Comando ejecutado: <code className="bg-gray-200 dark:bg-gray-700 px-2 py-1 rounded">/progress</code>
      </div>
    </div>
  );
}
