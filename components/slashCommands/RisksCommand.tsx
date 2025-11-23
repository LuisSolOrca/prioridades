'use client';

import { useEffect, useState } from 'react';
import { AlertTriangle, TrendingDown, User, Calendar, CheckCircle } from 'lucide-react';
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

interface RisksCommandProps {
  projectId: string;
  onClose: () => void;
}

export default function RisksCommand({ projectId, onClose }: RisksCommandProps) {
  const [atRiskPriorities, setAtRiskPriorities] = useState<Priority[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAtRiskPriorities();
  }, [projectId]);

  const loadAtRiskPriorities = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/projects/${projectId}/priorities`);
      if (response.ok) {
        const data = await response.json();
        const atRisk = (data.priorities || []).filter(
          (p: Priority) => p.status === 'EN_RIESGO'
        );
        // Sort by completion percentage (lowest first = highest risk)
        atRisk.sort((a: Priority, b: Priority) =>
          a.completionPercentage - b.completionPercentage
        );
        setAtRiskPriorities(atRisk);
      }
    } catch (error) {
      console.error('Error loading at-risk priorities:', error);
    } finally {
      setLoading(false);
    }
  };

  const getRiskLevel = (completionPercentage: number, weekEnd: string): string => {
    const daysUntilEnd = Math.ceil(
      (new Date(weekEnd).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
    );

    if (completionPercentage < 30 && daysUntilEnd <= 2) return 'Crítico';
    if (completionPercentage < 50 && daysUntilEnd <= 3) return 'Alto';
    if (completionPercentage < 70) return 'Moderado';
    return 'Bajo';
  };

  const getRiskColor = (level: string) => {
    switch (level) {
      case 'Crítico': return 'text-red-600 dark:text-red-400 bg-red-100 dark:bg-red-900/30';
      case 'Alto': return 'text-orange-600 dark:text-orange-400 bg-orange-100 dark:bg-orange-900/30';
      case 'Moderado': return 'text-yellow-600 dark:text-yellow-400 bg-yellow-100 dark:bg-yellow-900/30';
      default: return 'text-yellow-600 dark:text-yellow-400 bg-yellow-100 dark:bg-yellow-900/30';
    }
  };

  const getTimeRemaining = (weekEnd: string) => {
    try {
      const daysUntilEnd = Math.ceil(
        (new Date(weekEnd).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
      );
      if (daysUntilEnd < 0) return 'Vencida';
      if (daysUntilEnd === 0) return 'Hoy';
      if (daysUntilEnd === 1) return 'Mañana';
      return `${daysUntilEnd} días`;
    } catch {
      return 'N/A';
    }
  };

  if (loading) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 my-2">
        <div className="text-center py-4">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-yellow-600 mx-auto"></div>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">Analizando riesgos...</p>
        </div>
      </div>
    );
  }

  const criticalRisks = atRiskPriorities.filter(p => getRiskLevel(p.completionPercentage, p.weekEnd) === 'Crítico').length;
  const highRisks = atRiskPriorities.filter(p => getRiskLevel(p.completionPercentage, p.weekEnd) === 'Alto').length;
  const avgCompletion = atRiskPriorities.length > 0
    ? Math.round(atRiskPriorities.reduce((sum, p) => sum + p.completionPercentage, 0) / atRiskPriorities.length)
    : 0;

  return (
    <div className="bg-gradient-to-br from-yellow-50 to-orange-50 dark:from-gray-800 dark:to-gray-900 rounded-lg border-2 border-yellow-300 dark:border-yellow-700 p-6 my-2">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="w-10 h-10 bg-yellow-600 rounded-full flex items-center justify-center">
            <AlertTriangle className="text-white" size={20} />
          </div>
          <div>
            <h3 className="font-bold text-gray-900 dark:text-gray-100 text-lg">Prioridades en Riesgo</h3>
            <p className="text-xs text-gray-600 dark:text-gray-400">
              {atRiskPriorities.length} {atRiskPriorities.length === 1 ? 'prioridad en riesgo' : 'prioridades en riesgo'}
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
      <div className="grid grid-cols-3 gap-3 mb-4">
        <div className="bg-red-100 dark:bg-red-900/30 rounded-lg p-3 text-center">
          <div className="text-2xl font-bold text-red-700 dark:text-red-400">
            {criticalRisks}
          </div>
          <div className="text-xs text-red-700 dark:text-red-400">Críticos</div>
        </div>
        <div className="bg-orange-100 dark:bg-orange-900/30 rounded-lg p-3 text-center">
          <div className="text-2xl font-bold text-orange-700 dark:text-orange-400">
            {highRisks}
          </div>
          <div className="text-xs text-orange-700 dark:text-orange-400">Altos</div>
        </div>
        <div className="bg-white dark:bg-gray-700 rounded-lg p-3 text-center">
          <div className="text-2xl font-bold text-gray-800 dark:text-gray-100">
            {avgCompletion}%
          </div>
          <div className="text-xs text-gray-600 dark:text-gray-400">Progreso Promedio</div>
        </div>
      </div>

      {/* At-Risk Priorities List */}
      {atRiskPriorities.length > 0 ? (
        <div className="space-y-3">
          {atRiskPriorities.map((priority) => {
            const riskLevel = getRiskLevel(priority.completionPercentage, priority.weekEnd);
            const timeRemaining = getTimeRemaining(priority.weekEnd);

            return (
              <div
                key={priority._id}
                className="bg-white dark:bg-gray-700 rounded-lg p-4 border-l-4 border-yellow-500"
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="font-semibold text-gray-900 dark:text-gray-100">
                        {priority.title}
                      </h4>
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${getRiskColor(riskLevel)}`}>
                        {riskLevel}
                      </span>
                    </div>
                    {priority.description && (
                      <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                        {priority.description}
                      </p>
                    )}
                  </div>
                </div>

                {/* Metadata */}
                <div className="grid grid-cols-2 gap-2 text-xs mb-3">
                  <div className="flex items-center gap-1 text-gray-600 dark:text-gray-400">
                    <TrendingDown size={12} />
                    <span>{priority.completionPercentage}% completado</span>
                  </div>
                  <div className="flex items-center gap-1 text-gray-600 dark:text-gray-400">
                    <Calendar size={12} />
                    <span className={timeRemaining === 'Vencida' || timeRemaining === 'Hoy' ? 'text-red-600 dark:text-red-400 font-semibold' : ''}>
                      {timeRemaining} restantes
                    </span>
                  </div>
                  <div className="flex items-center gap-1 text-gray-600 dark:text-gray-400">
                    <User size={12} />
                    <span>{priority.userId.name}</span>
                  </div>
                  <div className="text-right text-gray-500 dark:text-gray-400">
                    {new Date(priority.weekStart).toLocaleDateString('es-ES', {
                      month: 'short',
                      day: 'numeric'
                    })} - {new Date(priority.weekEnd).toLocaleDateString('es-ES', {
                      month: 'short',
                      day: 'numeric'
                    })}
                  </div>
                </div>

                {/* Progress Bar */}
                <div className="w-full bg-gray-200 dark:bg-gray-600 rounded-full h-2">
                  <div
                    className={`h-2 rounded-full transition-all duration-300 ${
                      priority.completionPercentage < 30
                        ? 'bg-red-500'
                        : priority.completionPercentage < 60
                        ? 'bg-orange-500'
                        : 'bg-yellow-500'
                    }`}
                    style={{ width: `${priority.completionPercentage}%` }}
                  ></div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="bg-green-100 dark:bg-green-900/30 border border-green-300 dark:border-green-700 rounded-lg p-6 text-center">
          <CheckCircle className="text-green-600 dark:text-green-400 mx-auto mb-2" size={32} />
          <p className="text-green-800 dark:text-green-200 font-medium">
            ¡Todo bajo control!
          </p>
          <p className="text-sm text-green-700 dark:text-green-300 mt-1">
            No hay prioridades en riesgo en este momento
          </p>
        </div>
      )}

      {/* Action Suggestions */}
      {atRiskPriorities.length > 0 && (
        <div className="mt-4 bg-blue-100 dark:bg-blue-900/30 border border-blue-300 dark:border-blue-700 rounded-lg p-3">
          <p className="text-sm text-blue-800 dark:text-blue-200 font-medium mb-2">
            💡 Recomendaciones:
          </p>
          <ul className="text-xs text-blue-700 dark:text-blue-300 space-y-1 ml-4 list-disc">
            <li>Priorizar recursos en tareas con riesgo crítico o alto</li>
            <li>Revisar impedimentos y bloqueos que estén ralentizando el progreso</li>
            <li>Considerar reprogramar o ajustar alcance si es necesario</li>
            <li>Coordinar sincronización con responsables de prioridades críticas</li>
            {criticalRisks > 0 && (
              <li className="text-red-600 dark:text-red-400 font-semibold">
                ⚠️ Atención inmediata requerida en {criticalRisks} {criticalRisks === 1 ? 'prioridad crítica' : 'prioridades críticas'}
              </li>
            )}
          </ul>
        </div>
      )}

      <div className="mt-4 text-xs text-gray-500 dark:text-gray-400 text-center">
        Comando ejecutado: <code className="bg-gray-200 dark:bg-gray-700 px-2 py-1 rounded">/risks</code>
      </div>
    </div>
  );
}
