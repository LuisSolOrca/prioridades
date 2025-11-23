'use client';

import { useState, useEffect } from 'react';
import {
  CheckCircle,
  Circle,
  MessageSquare,
  Flag,
  Trash2,
  UserPlus,
  UserMinus,
  Clock,
  RefreshCw,
  Search,
  X
} from 'lucide-react';

interface Activity {
  _id: string;
  activityType: string;
  userId: {
    _id: string;
    name: string;
    email: string;
  };
  metadata: {
    priorityTitle?: string;
    taskTitle?: string;
    oldStatus?: string;
    newStatus?: string;
    commentText?: string;
    milestoneTitle?: string;
    assignedUserName?: string;
  };
  createdAt: string;
}

interface ActivityFeedProps {
  projectId: string;
}

export default function ActivityFeed({ projectId }: ActivityFeedProps) {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [offset, setOffset] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState('');

  useEffect(() => {
    loadActivities();
  }, [projectId]);

  // Debouncing: esperar 500ms después de que el usuario deje de escribir
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery);
    }, 500);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Cuando cambia la búsqueda debounced, recargar actividades
  useEffect(() => {
    setOffset(0);
    loadActivities(false, debouncedSearchQuery);
  }, [debouncedSearchQuery]);

  const loadActivities = async (loadMore = false, search = debouncedSearchQuery) => {
    try {
      if (!loadMore) {
        setLoading(true);
        setError(null);
      }

      const currentOffset = loadMore ? offset : 0;
      const searchParam = search.trim() ? `&search=${encodeURIComponent(search.trim())}` : '';
      const response = await fetch(
        `/api/projects/${projectId}/activities?limit=20&offset=${currentOffset}${searchParam}`
      );

      if (!response.ok) {
        throw new Error('Error al cargar actividades');
      }

      const data = await response.json();

      if (loadMore) {
        setActivities((prev) => [...prev, ...(data.activities || [])]);
      } else {
        setActivities(data.activities || []);
      }

      setHasMore(data.pagination?.hasMore || false);
      setOffset(currentOffset + (data.activities?.length || 0));
    } catch (err: any) {
      console.error('Error loading activities:', err);
      setError(err.message || 'Error al cargar actividades');
    } finally {
      setLoading(false);
    }
  };

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'priority_created':
        return <Flag className="text-blue-600" size={20} />;
      case 'priority_completed':
        return <CheckCircle className="text-green-600" size={20} />;
      case 'priority_status_changed':
        return <RefreshCw className="text-orange-600" size={20} />;
      case 'task_created':
        return <Circle className="text-blue-500" size={16} />;
      case 'task_completed':
        return <CheckCircle className="text-green-500" size={16} />;
      case 'comment_added':
        return <MessageSquare className="text-purple-600" size={20} />;
      case 'milestone_created':
        return <Flag className="text-yellow-600" size={20} />;
      case 'user_assigned':
        return <UserPlus className="text-indigo-600" size={20} />;
      case 'user_unassigned':
        return <UserMinus className="text-gray-600" size={20} />;
      default:
        return <Circle className="text-gray-400" size={20} />;
    }
  };

  const getActivityMessage = (activity: Activity) => {
    const { activityType, userId, metadata } = activity;
    const userName = userId?.name || 'Usuario';

    switch (activityType) {
      case 'priority_created':
        return (
          <>
            <strong>{userName}</strong> creó la prioridad{' '}
            <span className="font-semibold text-blue-600">
              {metadata.priorityTitle}
            </span>
          </>
        );
      case 'priority_completed':
        return (
          <>
            <strong>{userName}</strong> completó la prioridad{' '}
            <span className="font-semibold text-green-600">
              {metadata.priorityTitle}
            </span>
          </>
        );
      case 'priority_status_changed':
        return (
          <>
            <strong>{userName}</strong> cambió el estado de{' '}
            <span className="font-semibold">{metadata.priorityTitle}</span> de{' '}
            <span className="text-orange-600">{metadata.oldStatus}</span> a{' '}
            <span className="text-blue-600">{metadata.newStatus}</span>
          </>
        );
      case 'task_created':
        return (
          <>
            <strong>{userName}</strong> creó la tarea{' '}
            <span className="font-semibold">{metadata.taskTitle}</span>
            {metadata.priorityTitle && (
              <> en {metadata.priorityTitle}</>
            )}
          </>
        );
      case 'task_completed':
        return (
          <>
            <strong>{userName}</strong> completó la tarea{' '}
            <span className="font-semibold text-green-600">
              {metadata.taskTitle}
            </span>
          </>
        );
      case 'comment_added':
        return (
          <>
            <strong>{userName}</strong> comentó en{' '}
            <span className="font-semibold">{metadata.priorityTitle}</span>
            {metadata.commentText && (
              <div className="mt-1 text-sm text-gray-600 dark:text-gray-400 italic">
                "{metadata.commentText}"
              </div>
            )}
          </>
        );
      case 'milestone_created':
        return (
          <>
            <strong>{userName}</strong> creó el hito{' '}
            <span className="font-semibold text-yellow-600">
              {metadata.milestoneTitle}
            </span>
          </>
        );
      case 'user_assigned':
        return (
          <>
            <strong>{userName}</strong> asignó a{' '}
            <span className="font-semibold">{metadata.assignedUserName}</span>
          </>
        );
      default:
        return (
          <>
            <strong>{userName}</strong> realizó una acción
          </>
        );
    }
  };

  const getRelativeTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Hace un momento';
    if (diffMins < 60) return `Hace ${diffMins} min`;
    if (diffHours < 24) return `Hace ${diffHours}h`;
    if (diffDays < 7) return `Hace ${diffDays}d`;
    return date.toLocaleDateString('es-MX', { month: 'short', day: 'numeric' });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <RefreshCw className="animate-spin mx-auto mb-3 text-gray-400" size={32} />
          <p className="text-gray-500 dark:text-gray-400">Cargando actividades...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-lg p-6 text-center">
        <p className="text-red-700 dark:text-red-200">{error}</p>
        <button
          onClick={() => loadActivities()}
          className="mt-3 text-sm text-red-600 dark:text-red-400 hover:underline"
        >
          Reintentar
        </button>
      </div>
    );
  }

  if (activities.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="text-6xl mb-4">📋</div>
        <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-100 mb-2">
          Sin actividad aún
        </h3>
        <p className="text-gray-600 dark:text-gray-400">
          Las actividades del proyecto aparecerán aquí cuando se creen prioridades, tareas o comentarios.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Search Bar */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Buscar en actividades... (usuario, prioridad, tarea, comentario)"
          className="w-full pl-10 pr-10 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        {searchQuery && (
          <button
            onClick={() => setSearchQuery('')}
            className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
          >
            <X size={18} />
          </button>
        )}
      </div>

      {/* Results Count */}
      {debouncedSearchQuery && (
        <div className="text-sm text-gray-600 dark:text-gray-400">
          {activities.length} {activities.length === 1 ? 'resultado' : 'resultados'} encontrados
        </div>
      )}

      {/* Empty State for Search */}
      {debouncedSearchQuery && activities.length === 0 && (
        <div className="text-center py-12">
          <Search className="mx-auto mb-3 text-gray-400" size={48} />
          <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-100 mb-2">
            No se encontraron resultados
          </h3>
          <p className="text-gray-600 dark:text-gray-400">
            Intenta con otro término de búsqueda
          </p>
        </div>
      )}

      {/* Timeline */}
      {activities.length > 0 && (
        <div className="relative">
          {activities.map((activity, index) => (
          <div key={activity._id} className="relative flex gap-4 pb-6">
            {/* Timeline line */}
            {index < activities.length - 1 && (
              <div className="absolute left-5 top-10 bottom-0 w-0.5 bg-gray-200 dark:bg-gray-700" />
            )}

            {/* Avatar */}
            <div className="flex-shrink-0 relative">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center text-white font-semibold text-sm relative z-10">
                {activity.userId?.name?.charAt(0).toUpperCase() || 'U'}
              </div>
              {/* Icon badge */}
              <div className="absolute -bottom-1 -right-1 bg-white dark:bg-gray-800 rounded-full p-1 border-2 border-white dark:border-gray-800">
                {getActivityIcon(activity.activityType)}
              </div>
            </div>

            {/* Content */}
            <div className="flex-1 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4 hover:shadow-md transition">
              <div className="text-sm text-gray-700 dark:text-gray-300 mb-2">
                {getActivityMessage(activity)}
              </div>
              <div className="flex items-center text-xs text-gray-500 dark:text-gray-400">
                <Clock size={12} className="mr-1" />
                {getRelativeTime(activity.createdAt)}
              </div>
            </div>
          </div>
        ))}

        {/* Load More */}
        {!debouncedSearchQuery && hasMore && (
          <div className="text-center pt-4">
            <button
              onClick={() => loadActivities(true)}
              className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
            >
              Cargar más actividades
            </button>
          </div>
        )}
      </div>
      )}
    </div>
  );
}
