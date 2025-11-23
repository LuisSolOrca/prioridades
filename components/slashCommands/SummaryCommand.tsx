'use client';

import { useEffect, useState } from 'react';
import { FileText, User, TrendingUp, Clock, Calendar } from 'lucide-react';

interface Activity {
  _id: string;
  activityType: string;
  userId: {
    _id: string;
    name: string;
  };
  createdAt: string;
  metadata: any;
}

interface SummaryCommandProps {
  projectId: string;
  period?: '24h' | 'week' | 'month';
  onClose: () => void;
}

export default function SummaryCommand({ projectId, period = 'week', onClose }: SummaryCommandProps) {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPeriod, setSelectedPeriod] = useState(period);

  useEffect(() => {
    loadActivities();
  }, [selectedPeriod, projectId]);

  const loadActivities = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/projects/${projectId}/activities?limit=500`);
      if (response.ok) {
        const data = await response.json();
        const filtered = filterByPeriod(data.activities || []);
        setActivities(filtered);
      }
    } catch (error) {
      console.error('Error loading activities:', error);
    } finally {
      setLoading(false);
    }
  };

  const filterByPeriod = (allActivities: Activity[]) => {
    const now = new Date();
    let cutoff: Date;

    switch (selectedPeriod) {
      case '24h':
        cutoff = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        break;
      case 'week':
        cutoff = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case 'month':
        cutoff = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      default:
        cutoff = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    }

    return allActivities.filter(a => new Date(a.createdAt) >= cutoff);
  };

  const getActivityStats = () => {
    const stats = {
      prioritiesCreated: activities.filter(a => a.activityType === 'priority_created').length,
      prioritiesCompleted: activities.filter(a => a.activityType === 'priority_completed').length,
      tasksCompleted: activities.filter(a => a.activityType === 'task_completed').length,
      commentsAdded: activities.filter(a => a.activityType === 'comment_added').length,
      statusChanges: activities.filter(a => a.activityType === 'priority_status_changed').length,
      total: activities.length
    };
    return stats;
  };

  const getMostActiveUsers = () => {
    const userCounts: Record<string, { name: string; count: number }> = {};

    activities.forEach(activity => {
      const userId = activity.userId._id;
      const userName = activity.userId.name;

      if (!userCounts[userId]) {
        userCounts[userId] = { name: userName, count: 0 };
      }
      userCounts[userId].count++;
    });

    return Object.entries(userCounts)
      .map(([id, data]) => ({ id, ...data }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);
  };

  const getRecentHighlights = () => {
    const highlights: Activity[] = [];

    // Prioridades completadas
    const completed = activities.filter(a => a.activityType === 'priority_completed').slice(0, 3);
    highlights.push(...completed);

    // Prioridades creadas importantes
    const created = activities.filter(a => a.activityType === 'priority_created').slice(0, 2);
    highlights.push(...created);

    return highlights.slice(0, 5);
  };

  const getPeriodLabel = () => {
    switch (selectedPeriod) {
      case '24h': return 'Últimas 24 horas';
      case 'week': return 'Última semana';
      case 'month': return 'Último mes';
      default: return 'Última semana';
    }
  };

  const getActivityLabel = (activity: Activity) => {
    const userName = activity.userId.name;
    const metadata = activity.metadata;

    switch (activity.activityType) {
      case 'priority_created':
        return `${userName} creó la prioridad "${metadata.priorityTitle}"`;
      case 'priority_completed':
        return `${userName} completó "${metadata.priorityTitle}"`;
      case 'task_completed':
        return `${userName} completó la tarea "${metadata.taskTitle}"`;
      case 'comment_added':
        return `${userName} comentó en una prioridad`;
      case 'priority_status_changed':
        return `${userName} cambió el estado de "${metadata.priorityTitle}" a ${metadata.newStatus}`;
      default:
        return `${userName} realizó una acción`;
    }
  };

  const stats = getActivityStats();
  const topUsers = getMostActiveUsers();
  const highlights = getRecentHighlights();

  if (loading) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 my-2">
        <div className="text-center py-4">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">Analizando actividad...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-br from-indigo-50 to-purple-50 dark:from-gray-800 dark:to-gray-900 rounded-lg border-2 border-indigo-300 dark:border-indigo-700 p-6 my-2">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="w-10 h-10 bg-indigo-600 rounded-full flex items-center justify-center">
            <FileText className="text-white" size={20} />
          </div>
          <div>
            <h3 className="font-bold text-gray-900 dark:text-gray-100 text-lg">Resumen de Actividad</h3>
            <p className="text-xs text-gray-600 dark:text-gray-400">{getPeriodLabel()}</p>
          </div>
        </div>
        <button
          onClick={onClose}
          className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
        >
          ✕
        </button>
      </div>

      {/* Period Selector */}
      <div className="flex gap-2 mb-4">
        <button
          onClick={() => setSelectedPeriod('24h')}
          className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition ${
            selectedPeriod === '24h'
              ? 'bg-indigo-600 text-white'
              : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600'
          }`}
        >
          24h
        </button>
        <button
          onClick={() => setSelectedPeriod('week')}
          className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition ${
            selectedPeriod === 'week'
              ? 'bg-indigo-600 text-white'
              : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600'
          }`}
        >
          Semana
        </button>
        <button
          onClick={() => setSelectedPeriod('month')}
          className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition ${
            selectedPeriod === 'month'
              ? 'bg-indigo-600 text-white'
              : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600'
          }`}
        >
          Mes
        </button>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-3 gap-3 mb-4">
        <div className="bg-white dark:bg-gray-700 rounded-lg p-3 text-center">
          <div className="text-2xl font-bold text-indigo-600 dark:text-indigo-400">{stats.total}</div>
          <div className="text-xs text-gray-600 dark:text-gray-400">Total Actividades</div>
        </div>
        <div className="bg-green-100 dark:bg-green-900/30 rounded-lg p-3 text-center">
          <div className="text-2xl font-bold text-green-700 dark:text-green-400">{stats.prioritiesCompleted}</div>
          <div className="text-xs text-green-700 dark:text-green-400">Completadas</div>
        </div>
        <div className="bg-blue-100 dark:bg-blue-900/30 rounded-lg p-3 text-center">
          <div className="text-2xl font-bold text-blue-700 dark:text-blue-400">{stats.tasksCompleted}</div>
          <div className="text-xs text-blue-700 dark:text-blue-400">Tareas</div>
        </div>
      </div>

      {/* Activity Breakdown */}
      <div className="bg-white dark:bg-gray-700 rounded-lg p-4 mb-4">
        <h4 className="font-semibold text-gray-900 dark:text-gray-100 mb-3 flex items-center gap-2">
          <TrendingUp size={16} />
          Desglose de Actividad
        </h4>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-600 dark:text-gray-400">Prioridades creadas</span>
            <span className="font-semibold text-gray-900 dark:text-gray-100">{stats.prioritiesCreated}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600 dark:text-gray-400">Prioridades completadas</span>
            <span className="font-semibold text-gray-900 dark:text-gray-100">{stats.prioritiesCompleted}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600 dark:text-gray-400">Tareas completadas</span>
            <span className="font-semibold text-gray-900 dark:text-gray-100">{stats.tasksCompleted}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600 dark:text-gray-400">Comentarios</span>
            <span className="font-semibold text-gray-900 dark:text-gray-100">{stats.commentsAdded}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600 dark:text-gray-400">Cambios de estado</span>
            <span className="font-semibold text-gray-900 dark:text-gray-100">{stats.statusChanges}</span>
          </div>
        </div>
      </div>

      {/* Top Users */}
      {topUsers.length > 0 && (
        <div className="bg-white dark:bg-gray-700 rounded-lg p-4 mb-4">
          <h4 className="font-semibold text-gray-900 dark:text-gray-100 mb-3 flex items-center gap-2">
            <User size={16} />
            Usuarios Más Activos
          </h4>
          <div className="space-y-2">
            {topUsers.map((user, index) => (
              <div key={user.id} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-lg">{index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : '👤'}</span>
                  <span className="text-sm font-medium text-gray-900 dark:text-gray-100">{user.name}</span>
                </div>
                <span className="text-sm text-gray-600 dark:text-gray-400">{user.count} acciones</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recent Highlights */}
      {highlights.length > 0 && (
        <div className="bg-white dark:bg-gray-700 rounded-lg p-4">
          <h4 className="font-semibold text-gray-900 dark:text-gray-100 mb-3 flex items-center gap-2">
            <Clock size={16} />
            Actividades Destacadas
          </h4>
          <div className="space-y-2">
            {highlights.map((activity) => (
              <div key={activity._id} className="text-sm text-gray-700 dark:text-gray-300 flex items-start gap-2">
                <span className="text-indigo-500 mt-0.5">•</span>
                <span className="flex-1">{getActivityLabel(activity)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {activities.length === 0 && (
        <div className="bg-gray-100 dark:bg-gray-700 rounded-lg p-6 text-center">
          <p className="text-gray-600 dark:text-gray-400">No hay actividad en este período</p>
        </div>
      )}

      <div className="mt-4 text-xs text-gray-500 dark:text-gray-400 text-center">
        Comando ejecutado: <code className="bg-gray-200 dark:bg-gray-700 px-2 py-1 rounded">/summary {selectedPeriod}</code>
      </div>
    </div>
  );
}
