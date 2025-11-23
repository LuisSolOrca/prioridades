'use client';

import { useState, useEffect } from 'react';
import { Clock, User, Target, MessageSquare, TrendingUp, Calendar, Activity } from 'lucide-react';

interface RecentCommandProps {
  projectId: string;
  userName?: string;
  days?: number;
  onClose: () => void;
}

interface UserActivity {
  user: {
    _id: string;
    name: string;
    email: string;
  };
  priorities: Array<{
    _id: string;
    title: string;
    status: string;
    completionPercentage: number;
    weekStart: string;
    weekEnd: string;
    updatedAt: string;
  }>;
  messages: Array<{
    _id: string;
    content: string;
    createdAt: string;
  }>;
  stats: {
    totalPriorities: number;
    completedPriorities: number;
    inProgressPriorities: number;
    totalMessages: number;
    avgCompletionPercentage: number;
  };
}

export default function RecentCommand({
  projectId,
  userName,
  days = 7,
  onClose
}: RecentCommandProps) {
  const [activity, setActivity] = useState<UserActivity | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState('');
  const [selectedDays, setSelectedDays] = useState(days);
  const [users, setUsers] = useState<any[]>([]);

  useEffect(() => {
    loadUsers();
  }, []);

  useEffect(() => {
    if (selectedUser) {
      loadActivity();
    }
  }, [selectedUser, selectedDays, projectId]);

  const loadUsers = async () => {
    try {
      const response = await fetch('/api/users');
      if (response.ok) {
        const data = await response.json();
        const usersArray = Array.isArray(data) ? data : [];
        setUsers(usersArray);

        // Si se proporcionó userName, buscar el usuario
        if (userName) {
          const user = usersArray.find((u: any) =>
            u.name.toLowerCase().includes(userName.toLowerCase())
          );
          if (user) {
            setSelectedUser(user._id);
          }
        }
      }
    } catch (error) {
      console.error('Error loading users:', error);
    }
  };

  const loadActivity = async () => {
    if (!selectedUser) return;

    try {
      setLoading(true);
      const response = await fetch(
        `/api/projects/${projectId}/activity/user?userId=${selectedUser}&days=${selectedDays}`
      );

      if (!response.ok) throw new Error('Error loading activity');

      const data = await response.json();
      setActivity(data);
    } catch (error) {
      console.error('Error loading activity:', error);
      alert('Error al cargar la actividad del usuario');
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      'EN_TIEMPO': 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
      'EN_RIESGO': 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
      'BLOQUEADO': 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
      'COMPLETADO': 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
      'REPROGRAMADO': 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200'
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  const getTimeAgo = (date: string) => {
    const now = new Date();
    const past = new Date(date);
    const diffMs = now.getTime() - past.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffHours / 24);

    if (diffDays > 0) {
      return `hace ${diffDays} día${diffDays > 1 ? 's' : ''}`;
    } else if (diffHours > 0) {
      return `hace ${diffHours} hora${diffHours > 1 ? 's' : ''}`;
    } else {
      return 'hace menos de 1 hora';
    }
  };

  return (
    <div className="bg-gradient-to-br from-teal-50 to-cyan-50 dark:from-gray-800 dark:to-gray-900 rounded-lg border-2 border-teal-300 dark:border-teal-700 p-6 my-2">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="w-10 h-10 bg-gradient-to-br from-teal-500 to-cyan-600 rounded-full flex items-center justify-center">
            <Activity className="text-white" size={20} />
          </div>
          <div>
            <h3 className="font-bold text-gray-900 dark:text-gray-100 text-lg">Actividad Reciente</h3>
            <p className="text-xs text-gray-600 dark:text-gray-400">
              {activity ? `${activity.user.name} - Últimos ${selectedDays} días` : 'Selecciona un usuario'}
            </p>
          </div>
        </div>
        <button
          onClick={onClose}
          className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
        >
          ✕
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-gray-700 rounded-lg p-4 mb-4 space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              <User size={14} className="inline mr-1" />
              Usuario
            </label>
            <select
              value={selectedUser}
              onChange={(e) => setSelectedUser(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
            >
              <option value="">Seleccionar usuario...</option>
              {users.map((user) => (
                <option key={user._id} value={user._id}>
                  {user.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              <Calendar size={14} className="inline mr-1" />
              Período
            </label>
            <select
              value={selectedDays}
              onChange={(e) => setSelectedDays(Number(e.target.value))}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
            >
              <option value={1}>Últimas 24 horas</option>
              <option value={3}>Últimos 3 días</option>
              <option value={7}>Última semana</option>
              <option value={14}>Últimas 2 semanas</option>
              <option value={30}>Último mes</option>
            </select>
          </div>
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <div className="bg-white dark:bg-gray-700 rounded-lg p-6 text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-600 mx-auto"></div>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">Cargando actividad...</p>
        </div>
      ) : !selectedUser ? (
        <div className="bg-white dark:bg-gray-700 rounded-lg p-8 text-center">
          <User className="mx-auto mb-2 text-gray-400" size={32} />
          <p className="text-gray-600 dark:text-gray-400">Selecciona un usuario para ver su actividad</p>
        </div>
      ) : !activity ? (
        <div className="bg-white dark:bg-gray-700 rounded-lg p-8 text-center">
          <p className="text-gray-600 dark:text-gray-400">No se pudo cargar la actividad del usuario</p>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Stats Cards */}
          <div className="grid grid-cols-4 gap-3">
            <div className="bg-white dark:bg-gray-700 rounded-lg p-3 text-center">
              <div className="text-2xl font-bold text-teal-600 dark:text-teal-400">
                {activity.stats.totalPriorities}
              </div>
              <div className="text-xs text-gray-600 dark:text-gray-400">Prioridades</div>
            </div>
            <div className="bg-white dark:bg-gray-700 rounded-lg p-3 text-center">
              <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                {activity.stats.completedPriorities}
              </div>
              <div className="text-xs text-gray-600 dark:text-gray-400">Completadas</div>
            </div>
            <div className="bg-white dark:bg-gray-700 rounded-lg p-3 text-center">
              <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                {activity.stats.avgCompletionPercentage}%
              </div>
              <div className="text-xs text-gray-600 dark:text-gray-400">Progreso Prom.</div>
            </div>
            <div className="bg-white dark:bg-gray-700 rounded-lg p-3 text-center">
              <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                {activity.stats.totalMessages}
              </div>
              <div className="text-xs text-gray-600 dark:text-gray-400">Mensajes</div>
            </div>
          </div>

          {/* Priorities Worked On */}
          {activity.priorities.length > 0 && (
            <div className="bg-white dark:bg-gray-700 rounded-lg p-4">
              <h4 className="font-semibold text-gray-900 dark:text-gray-100 mb-3 flex items-center gap-2">
                <Target size={16} className="text-teal-600" />
                Prioridades Trabajadas ({activity.priorities.length})
              </h4>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {activity.priorities.map((priority) => (
                  <div
                    key={priority._id}
                    className="border border-gray-200 dark:border-gray-600 rounded-lg p-3"
                  >
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <h5 className="font-medium text-gray-900 dark:text-gray-100 flex-1">
                        {priority.title}
                      </h5>
                      <span className={`text-xs px-2 py-1 rounded-full ${getStatusColor(priority.status)}`}>
                        {priority.status.replace('_', ' ')}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
                      <span>Progreso: {priority.completionPercentage}%</span>
                      <span className="flex items-center gap-1">
                        <Clock size={12} />
                        {getTimeAgo(priority.updatedAt)}
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 dark:bg-gray-600 rounded-full h-1.5 mt-2">
                      <div
                        className="bg-gradient-to-r from-teal-500 to-cyan-500 h-1.5 rounded-full"
                        style={{ width: `${priority.completionPercentage}%` }}
                      ></div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Recent Messages */}
          {activity.messages.length > 0 && (
            <div className="bg-white dark:bg-gray-700 rounded-lg p-4">
              <h4 className="font-semibold text-gray-900 dark:text-gray-100 mb-3 flex items-center gap-2">
                <MessageSquare size={16} className="text-teal-600" />
                Mensajes Recientes ({activity.messages.length})
              </h4>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {activity.messages.slice(0, 5).map((message) => (
                  <div
                    key={message._id}
                    className="border-l-2 border-teal-500 pl-3 py-1"
                  >
                    <p className="text-sm text-gray-900 dark:text-gray-100 line-clamp-2">
                      {message.content}
                    </p>
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      {getTimeAgo(message.createdAt)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* No Activity */}
          {activity.priorities.length === 0 && activity.messages.length === 0 && (
            <div className="bg-white dark:bg-gray-700 rounded-lg p-8 text-center">
              <Activity className="mx-auto mb-2 text-gray-400" size={32} />
              <p className="text-gray-600 dark:text-gray-400">
                No hay actividad registrada en los últimos {selectedDays} días
              </p>
            </div>
          )}
        </div>
      )}

      <div className="mt-4 text-xs text-gray-500 dark:text-gray-400 text-center">
        Comando ejecutado: <code className="bg-gray-200 dark:bg-gray-700 px-2 py-1 rounded">/recent</code>
      </div>
    </div>
  );
}
