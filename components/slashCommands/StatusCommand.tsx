'use client';

import { useEffect, useState } from 'react';
import { CheckCircle, AlertTriangle, XCircle, Clock, TrendingUp } from 'lucide-react';

interface Priority {
  _id: string;
  title: string;
  status: string;
  completionPercentage: number;
}

interface StatusCommandProps {
  projectId: string;
  onClose: () => void;
}

export default function StatusCommand({ projectId, onClose }: StatusCommandProps) {
  const [priorities, setPriorities] = useState<Priority[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadPriorities();
  }, [projectId]);

  const loadPriorities = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/projects/${projectId}/priorities`);
      if (response.ok) {
        const data = await response.json();
        setPriorities(data.priorities || []);
      }
    } catch (error) {
      console.error('Error loading priorities:', error);
    } finally {
      setLoading(false);
    }
  };

  const stats = {
    total: priorities.length,
    enTiempo: priorities.filter(p => p.status === 'EN_TIEMPO').length,
    enRiesgo: priorities.filter(p => p.status === 'EN_RIESGO').length,
    bloqueado: priorities.filter(p => p.status === 'BLOQUEADO').length,
    completado: priorities.filter(p => p.status === 'COMPLETADO').length,
    avgCompletion: priorities.length > 0
      ? Math.round(priorities.reduce((sum, p) => sum + p.completionPercentage, 0) / priorities.length)
      : 0
  };

  if (loading) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 my-2">
        <div className="text-center py-4">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">Cargando estado...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-br from-blue-50 to-purple-50 dark:from-gray-800 dark:to-gray-900 rounded-lg border-2 border-blue-300 dark:border-blue-700 p-6 my-2">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center">
            <TrendingUp className="text-white" size={20} />
          </div>
          <div>
            <h3 className="font-bold text-gray-900 dark:text-gray-100 text-lg">Estado del Proyecto</h3>
            <p className="text-xs text-gray-600 dark:text-gray-400">Resumen de prioridades actuales</p>
          </div>
        </div>
        <button
          onClick={onClose}
          className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
        >
          ✕
        </button>
      </div>

      {/* Métricas principales */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-4">
        <div className="bg-white dark:bg-gray-700 rounded-lg p-3 text-center">
          <div className="text-2xl font-bold text-gray-800 dark:text-gray-100">{stats.total}</div>
          <div className="text-xs text-gray-600 dark:text-gray-400">Total</div>
        </div>
        <div className="bg-green-100 dark:bg-green-900/30 rounded-lg p-3 text-center">
          <div className="text-2xl font-bold text-green-700 dark:text-green-400">{stats.enTiempo}</div>
          <div className="text-xs text-green-700 dark:text-green-400 flex items-center justify-center gap-1">
            <CheckCircle size={12} /> En Tiempo
          </div>
        </div>
        <div className="bg-yellow-100 dark:bg-yellow-900/30 rounded-lg p-3 text-center">
          <div className="text-2xl font-bold text-yellow-700 dark:text-yellow-400">{stats.enRiesgo}</div>
          <div className="text-xs text-yellow-700 dark:text-yellow-400 flex items-center justify-center gap-1">
            <AlertTriangle size={12} /> En Riesgo
          </div>
        </div>
        <div className="bg-red-100 dark:bg-red-900/30 rounded-lg p-3 text-center">
          <div className="text-2xl font-bold text-red-700 dark:text-red-400">{stats.bloqueado}</div>
          <div className="text-xs text-red-700 dark:text-red-400 flex items-center justify-center gap-1">
            <XCircle size={12} /> Bloqueado
          </div>
        </div>
        <div className="bg-blue-100 dark:bg-blue-900/30 rounded-lg p-3 text-center">
          <div className="text-2xl font-bold text-blue-700 dark:text-blue-400">{stats.completado}</div>
          <div className="text-xs text-blue-700 dark:text-blue-400 flex items-center justify-center gap-1">
            <CheckCircle size={12} /> Completado
          </div>
        </div>
      </div>

      {/* Barra de progreso general */}
      <div className="bg-white dark:bg-gray-700 rounded-lg p-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Progreso General</span>
          <span className="text-lg font-bold text-blue-600 dark:text-blue-400">{stats.avgCompletion}%</span>
        </div>
        <div className="w-full bg-gray-200 dark:bg-gray-600 rounded-full h-3">
          <div
            className="bg-gradient-to-r from-blue-500 to-purple-500 h-3 rounded-full transition-all duration-500"
            style={{ width: `${stats.avgCompletion}%` }}
          ></div>
        </div>
      </div>

      {/* Mensaje de estado */}
      {stats.bloqueado > 0 && (
        <div className="mt-4 bg-red-100 dark:bg-red-900/30 border border-red-300 dark:border-red-700 rounded-lg p-3">
          <p className="text-sm text-red-800 dark:text-red-200">
            ⚠️ Hay {stats.bloqueado} {stats.bloqueado === 1 ? 'prioridad bloqueada' : 'prioridades bloqueadas'} que requieren atención
          </p>
        </div>
      )}

      {stats.total === 0 && (
        <div className="mt-4 bg-gray-100 dark:bg-gray-700 rounded-lg p-4 text-center">
          <p className="text-gray-600 dark:text-gray-400">No hay prioridades asignadas a este proyecto</p>
        </div>
      )}

      <div className="mt-4 text-xs text-gray-500 dark:text-gray-400 text-center">
        Comando ejecutado: <code className="bg-gray-200 dark:bg-gray-700 px-2 py-1 rounded">/status</code>
      </div>
    </div>
  );
}
