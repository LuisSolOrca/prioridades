'use client';

import { useEffect, useState } from 'react';
import { AlertOctagon, Clock, User, Calendar, XCircle } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';

interface Priority {
  _id: string;
  title: string;
  status: string;
  completionPercentage: number;
  weekStart: string;
  weekEnd: string;
  userId: {
    _id: string;
    name: string;
    email: string;
  };
  updatedAt: string;
  description?: string;
}

interface BlockersCommandProps {
  projectId: string;
  onClose: () => void;
}

export default function BlockersCommand({ projectId, onClose }: BlockersCommandProps) {
  const [blockedPriorities, setBlockedPriorities] = useState<Priority[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadBlockedPriorities();
  }, [projectId]);

  const loadBlockedPriorities = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/projects/${projectId}/priorities`);
      if (response.ok) {
        const data = await response.json();
        const blocked = (data.priorities || []).filter(
          (p: Priority) => p.status === 'BLOQUEADO'
        );
        // Sort by most recently updated (newest blockers first)
        blocked.sort((a: Priority, b: Priority) =>
          new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
        );
        setBlockedPriorities(blocked);
      }
    } catch (error) {
      console.error('Error loading blocked priorities:', error);
    } finally {
      setLoading(false);
    }
  };

  const getBlockedDuration = (updatedAt: string) => {
    try {
      return formatDistanceToNow(new Date(updatedAt), {
        addSuffix: true,
        locale: es
      });
    } catch {
      return 'hace tiempo';
    }
  };

  if (loading) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 my-2">
        <div className="text-center py-4">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-600 mx-auto"></div>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">Cargando bloqueos...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-br from-red-50 to-orange-50 dark:from-gray-800 dark:to-gray-900 rounded-lg border-2 border-red-300 dark:border-red-700 p-6 my-2">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="w-10 h-10 bg-red-600 rounded-full flex items-center justify-center">
            <AlertOctagon className="text-white" size={20} />
          </div>
          <div>
            <h3 className="font-bold text-gray-900 dark:text-gray-100 text-lg">Prioridades Bloqueadas</h3>
            <p className="text-xs text-gray-600 dark:text-gray-400">
              {blockedPriorities.length} {blockedPriorities.length === 1 ? 'prioridad bloqueada' : 'prioridades bloqueadas'}
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

      {/* Summary Stats */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="bg-white dark:bg-gray-700 rounded-lg p-3 text-center">
          <div className="text-2xl font-bold text-red-700 dark:text-red-400">
            {blockedPriorities.length}
          </div>
          <div className="text-xs text-gray-600 dark:text-gray-400">Total Bloqueadas</div>
        </div>
        <div className="bg-orange-100 dark:bg-orange-900/30 rounded-lg p-3 text-center">
          <div className="text-2xl font-bold text-orange-700 dark:text-orange-400">
            {blockedPriorities.reduce((sum, p) => sum + p.completionPercentage, 0) / (blockedPriorities.length || 1)}%
          </div>
          <div className="text-xs text-orange-700 dark:text-orange-400">Progreso Promedio</div>
        </div>
      </div>

      {/* Blocked Priorities List */}
      {blockedPriorities.length > 0 ? (
        <div className="space-y-3">
          {blockedPriorities.map((priority) => (
            <div
              key={priority._id}
              className="bg-white dark:bg-gray-700 rounded-lg p-4 border-l-4 border-red-500"
            >
              <div className="flex items-start justify-between mb-2">
                <div className="flex-1">
                  <h4 className="font-semibold text-gray-900 dark:text-gray-100 mb-1">
                    {priority.title}
                  </h4>
                  {priority.description && (
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                      {priority.description}
                    </p>
                  )}
                </div>
              </div>

              {/* Metadata */}
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="flex items-center gap-1 text-gray-600 dark:text-gray-400">
                  <Clock size={12} />
                  <span>Bloqueado {getBlockedDuration(priority.updatedAt)}</span>
                </div>
                <div className="flex items-center gap-1 text-gray-600 dark:text-gray-400">
                  <User size={12} />
                  <span>{priority.userId.name}</span>
                </div>
                <div className="flex items-center gap-1 text-gray-600 dark:text-gray-400">
                  <Calendar size={12} />
                  <span>
                    {new Date(priority.weekStart).toLocaleDateString('es-ES', {
                      month: 'short',
                      day: 'numeric'
                    })} - {new Date(priority.weekEnd).toLocaleDateString('es-ES', {
                      month: 'short',
                      day: 'numeric'
                    })}
                  </span>
                </div>
                <div className="text-right">
                  <span className="font-semibold text-red-600 dark:text-red-400">
                    {priority.completionPercentage}% completado
                  </span>
                </div>
              </div>

              {/* Progress Bar */}
              <div className="mt-3">
                <div className="w-full bg-gray-200 dark:bg-gray-600 rounded-full h-2">
                  <div
                    className="bg-red-500 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${priority.completionPercentage}%` }}
                  ></div>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-green-100 dark:bg-green-900/30 border border-green-300 dark:border-green-700 rounded-lg p-6 text-center">
          <XCircle className="text-green-600 dark:text-green-400 mx-auto mb-2" size={32} />
          <p className="text-green-800 dark:text-green-200 font-medium">
            ¡Excelente! No hay prioridades bloqueadas
          </p>
          <p className="text-sm text-green-700 dark:text-green-300 mt-1">
            Todo el equipo está trabajando sin impedimentos
          </p>
        </div>
      )}

      {/* Action Suggestions */}
      {blockedPriorities.length > 0 && (
        <div className="mt-4 bg-yellow-100 dark:bg-yellow-900/30 border border-yellow-300 dark:border-yellow-700 rounded-lg p-3">
          <p className="text-sm text-yellow-800 dark:text-yellow-200 font-medium mb-2">
            💡 Acciones sugeridas:
          </p>
          <ul className="text-xs text-yellow-700 dark:text-yellow-300 space-y-1 ml-4 list-disc">
            <li>Revisar cada bloqueo y actualizar su estado si se resolvió</li>
            <li>Coordinar con los responsables para desbloquear tareas</li>
            <li>Considerar reasignar recursos para resolver impedimentos</li>
            <li>Documentar los bloqueos en los comentarios de cada prioridad</li>
          </ul>
        </div>
      )}

      <div className="mt-4 text-xs text-gray-500 dark:text-gray-400 text-center">
        Comando ejecutado: <code className="bg-gray-200 dark:bg-gray-700 px-2 py-1 rounded">/blockers</code>
      </div>
    </div>
  );
}
