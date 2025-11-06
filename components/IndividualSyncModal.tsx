'use client';

import { useState, useEffect } from 'react';
import { X, RefreshCw, CheckCircle2, Circle, AlertCircle } from 'lucide-react';

interface SyncPreview {
  localState: string;
  azureState: string;
  willUpdateState: boolean;
  tasks: {
    text: string;
    taskId: string;
    localCompleted: boolean;
    azureCompleted: boolean;
    willClose: boolean;
    willReopen: boolean;
    isNew: boolean;
    direction: 'from-ado' | 'to-ado' | 'none' | 'conflict';
    isConflict?: boolean;
  }[];
  fromAzureDevOps: {
    changes: string[];
    willUpdate: boolean;
  };
  toAzureDevOps: {
    changes: string[];
    willUpdate: boolean;
  };
  conflicts: Array<{
    type: 'state_conflict' | 'task_missing_locally';
    text?: string;
    taskId?: string;
    azureCompleted?: boolean;
    localValue?: string;
    azureValue?: string;
    lastSynced?: string;
    message: string;
  }>;
  hasChanges: boolean;
  hasConflicts: boolean;
}

interface IndividualSyncModalProps {
  priority: any; // Usar any para aceptar cualquier tipo de Priority
  onClose: () => void;
  onSyncComplete: () => void;
}

export default function IndividualSyncModal({ priority, onClose, onSyncComplete }: IndividualSyncModalProps) {
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [preview, setPreview] = useState<SyncPreview | null>(null);
  const [taskHours, setTaskHours] = useState<{ [key: string]: number }>({});
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  // Resoluciones de conflictos:
  // - Para tareas: taskId -> 'add' | 'delete'
  // - Para estado: 'state' -> 'local' | 'azure'
  const [conflictResolutions, setConflictResolutions] = useState<{ [key: string]: string }>({});

  useEffect(() => {
    loadPreview();
  }, []);

  const loadPreview = async () => {
    try {
      setLoading(true);

      if (!priority._id) {
        throw new Error('La prioridad no tiene ID');
      }

      const response = await fetch('/api/azure-devops/sync-preview', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ priorityId: priority._id }),
      });

      if (!response.ok) {
        throw new Error('Error al cargar vista previa');
      }

      const data = await response.json();
      setPreview(data.preview);
    } catch (error) {
      setMessage({
        type: 'error',
        text: error instanceof Error ? error.message : 'Error al cargar vista previa'
      });
    } finally {
      setLoading(false);
    }
  };

  // Tareas que necesitan horas (las que se van a cerrar)
  const tasksNeedingHours = preview?.tasks.filter(t => t.willClose) || [];

  const handleSync = async () => {
    if (!priority._id) {
      setMessage({
        type: 'error',
        text: 'La prioridad no tiene ID'
      });
      return;
    }

    // Validar que todos los conflictos estén resueltos
    if (preview?.hasConflicts) {
      const unresolvedConflicts = preview.conflicts.filter(conflict => {
        if (conflict.type === 'state_conflict') {
          return !conflictResolutions['state'];
        } else if (conflict.type === 'task_missing_locally' && conflict.taskId) {
          return !conflictResolutions[conflict.taskId];
        }
        return false;
      });

      if (unresolvedConflicts.length > 0) {
        setMessage({
          type: 'error',
          text: `Debes resolver ${unresolvedConflicts.length} conflicto(s) antes de sincronizar`
        });
        return;
      }
    }

    setSyncing(true);
    setMessage(null);

    try {
      const response = await fetch('/api/azure-devops/sync-one', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          priorityId: priority._id,
          taskHours,
          conflictResolutions
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Error en la sincronización');
      }

      // Construir mensaje de resultado
      const changes = [
        ...(data.result.fromAzureDevOps.changes || []),
        ...(data.result.toAzureDevOps.changes || [])
      ];

      if (changes.length > 0) {
        setMessage({
          type: 'success',
          text: `Sincronizado: ${changes.length} cambio(s)`
        });
      } else {
        setMessage({
          type: 'success',
          text: 'Sin cambios'
        });
      }

      // Llamar callback para refrescar datos
      setTimeout(() => {
        onSyncComplete();
        onClose();
      }, 1500);

    } catch (error) {
      setMessage({
        type: 'error',
        text: error instanceof Error ? error.message : 'Error desconocido'
      });
    } finally {
      setSyncing(false);
    }
  };

  const handleHoursChange = (taskId: string, hours: string) => {
    const numHours = parseFloat(hours) || 0;
    setTaskHours(prev => ({
      ...prev,
      [taskId]: numHours
    }));
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4 flex justify-between items-center">
          <div>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
              Sincronizar con Azure DevOps
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              {priority.title}
            </p>
          </div>
          <button
            onClick={onClose}
            disabled={syncing}
            className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 disabled:opacity-50"
          >
            <X size={24} />
          </button>
        </div>

        {/* Content */}
        <div className="px-6 py-4">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <RefreshCw className="animate-spin text-blue-500" size={24} />
              <span className="ml-2 text-gray-600 dark:text-gray-400">Cargando vista previa...</span>
            </div>
          ) : preview ? (
            <>
              {/* Resumen de cambios */}
              {!preview.hasChanges ? (
                <div className="mb-4 p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg text-center">
                  <CheckCircle2 className="mx-auto text-green-600 dark:text-green-400 mb-2" size={32} />
                  <p className="text-sm font-medium text-green-900 dark:text-green-200">
                    Todo está sincronizado
                  </p>
                  <p className="text-xs text-green-700 dark:text-green-300 mt-1">
                    No hay cambios pendientes entre local y Azure DevOps
                  </p>
                </div>
              ) : (
                <>
                  {/* Cambios desde Azure DevOps (FROM ADO) */}
                  {preview.fromAzureDevOps.willUpdate && (
                    <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                      <p className="text-sm font-medium text-blue-900 dark:text-blue-200 mb-2 flex items-center gap-2">
                        <span>← Desde Azure DevOps</span>
                        <span className="text-xs bg-blue-200 dark:bg-blue-800 px-2 py-0.5 rounded">
                          {preview.fromAzureDevOps.changes.length}
                        </span>
                      </p>
                      <ul className="space-y-1">
                        {preview.fromAzureDevOps.changes.map((change, idx) => (
                          <li key={idx} className="text-xs text-blue-800 dark:text-blue-300 flex items-start gap-1">
                            <span className="mt-0.5">•</span>
                            <span>{change}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Cambios hacia Azure DevOps (TO ADO) */}
                  {preview.toAzureDevOps.willUpdate && (
                    <div className="mb-4 p-3 bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded-lg">
                      <p className="text-sm font-medium text-purple-900 dark:text-purple-200 mb-2 flex items-center gap-2">
                        <span>→ Hacia Azure DevOps</span>
                        <span className="text-xs bg-purple-200 dark:bg-purple-800 px-2 py-0.5 rounded">
                          {preview.toAzureDevOps.changes.length}
                        </span>
                      </p>
                      <ul className="space-y-1">
                        {preview.toAzureDevOps.changes.map((change, idx) => (
                          <li key={idx} className="text-xs text-purple-800 dark:text-purple-300 flex items-start gap-1">
                            <span className="mt-0.5">•</span>
                            <span>{change}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </>
              )}

              {/* Conflictos - Usuario debe resolver */}
              {preview.hasConflicts && preview.conflicts.length > 0 && (
                <div className="mb-4 p-4 bg-orange-50 dark:bg-orange-900/20 border-2 border-orange-300 dark:border-orange-700 rounded-lg">
                  <div className="flex items-start gap-2 mb-3">
                    <AlertCircle className="text-orange-600 dark:text-orange-400 flex-shrink-0 mt-0.5" size={20} />
                    <div className="flex-1">
                      <p className="text-sm font-medium text-orange-900 dark:text-orange-200 mb-1">
                        ⚠️ Conflictos detectados
                      </p>
                      <p className="text-xs text-orange-700 dark:text-orange-300">
                        Se encontraron cambios en ambos lados. Debes resolverlos antes de sincronizar.
                      </p>
                    </div>
                  </div>

                  <div className="space-y-3">
                    {preview.conflicts.map((conflict, idx) => (
                      <div key={idx}>
                        {conflict.type === 'state_conflict' && (
                          <div className="p-3 bg-white dark:bg-gray-800 border border-orange-200 dark:border-orange-800 rounded">
                            <p className="text-sm font-medium text-gray-900 dark:text-white mb-2">
                              🔄 Conflicto de estado de la prioridad
                            </p>
                            <div className="text-xs space-y-1 mb-3 text-gray-700 dark:text-gray-300">
                              <p>• Local: <span className="font-semibold">{conflict.localValue}</span></p>
                              <p>• Azure: <span className="font-semibold">{conflict.azureValue}</span></p>
                              <p className="text-gray-500 dark:text-gray-400">Último sincronizado: {conflict.lastSynced || 'Nunca'}</p>
                            </div>

                            <div className="flex gap-2">
                              <button
                                onClick={() => setConflictResolutions(prev => ({ ...prev, ['state']: 'local' }))}
                                disabled={syncing}
                                className={`flex-1 px-3 py-2 text-sm rounded transition-colors ${
                                  conflictResolutions['state'] === 'local'
                                    ? 'bg-purple-600 text-white border-2 border-purple-700'
                                    : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 hover:bg-purple-50 dark:hover:bg-purple-900/20'
                                }`}
                              >
                                Usar estado local →
                              </button>
                              <button
                                onClick={() => setConflictResolutions(prev => ({ ...prev, ['state']: 'azure' }))}
                                disabled={syncing}
                                className={`flex-1 px-3 py-2 text-sm rounded transition-colors ${
                                  conflictResolutions['state'] === 'azure'
                                    ? 'bg-blue-600 text-white border-2 border-blue-700'
                                    : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 hover:bg-blue-50 dark:hover:bg-blue-900/20'
                                }`}
                              >
                                ← Usar estado de Azure
                              </button>
                            </div>
                          </div>
                        )}

                        {conflict.type === 'task_missing_locally' && conflict.taskId && (
                          <div className="p-3 bg-white dark:bg-gray-800 border border-orange-200 dark:border-orange-800 rounded">
                            <p className="text-sm font-medium text-gray-900 dark:text-white mb-2">
                              📝 {conflict.text}
                              {conflict.azureCompleted && (
                                <span className="ml-2 text-xs text-green-600 dark:text-green-400">(completada en Azure)</span>
                              )}
                            </p>
                            <p className="text-xs text-gray-600 dark:text-gray-400 mb-2">
                              Esta tarea existe en Azure pero no localmente
                            </p>

                            <div className="flex gap-2">
                              <button
                                onClick={() => setConflictResolutions(prev => ({ ...prev, [conflict.taskId!]: 'add' }))}
                                disabled={syncing}
                                className={`flex-1 px-3 py-2 text-sm rounded transition-colors ${
                                  conflictResolutions[conflict.taskId] === 'add'
                                    ? 'bg-blue-600 text-white border-2 border-blue-700'
                                    : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 hover:bg-blue-50 dark:hover:bg-blue-900/20'
                                }`}
                              >
                                ← Agregar desde Azure
                              </button>
                              <button
                                onClick={() => setConflictResolutions(prev => ({ ...prev, [conflict.taskId!]: 'delete' }))}
                                disabled={syncing}
                                className={`flex-1 px-3 py-2 text-sm rounded transition-colors ${
                                  conflictResolutions[conflict.taskId] === 'delete'
                                    ? 'bg-red-600 text-white border-2 border-red-700'
                                    : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 hover:bg-red-50 dark:hover:bg-red-900/20'
                                }`}
                              >
                                Eliminar de Azure →
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Detalle de tareas - Solo mostrar si hay cambios que requieren atención */}
              {tasksNeedingHours.length > 0 && (
                <div className="mb-4">
                  <p className="text-sm font-medium text-gray-900 dark:text-white mb-3">
                    Ingresa las horas trabajadas:
                  </p>

                  <div className="space-y-2">
                    {tasksNeedingHours.map((task) => (
                      <div
                        key={task.taskId}
                        className="p-3 rounded-lg border bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800"
                      >
                        <div className="flex items-start gap-3">
                          <div className="flex-1">
                            <p className="text-sm font-medium text-gray-900 dark:text-white">
                              {task.text}
                            </p>
                            <p className="text-xs text-green-700 dark:text-green-300 mt-1">
                              Se cerrará en Azure DevOps
                            </p>
                          </div>

                          {/* Input de horas */}
                          <div className="flex items-center gap-2">
                            <input
                              type="number"
                              min="0"
                              step="0.5"
                              value={taskHours[task.taskId] || ''}
                              onChange={(e) => handleHoursChange(task.taskId, e.target.value)}
                              placeholder="0"
                              disabled={syncing}
                              className="w-20 px-2 py-1 border border-gray-300 dark:border-gray-600 rounded
                                       bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm
                                       focus:ring-2 focus:ring-green-500 dark:focus:ring-green-400 focus:border-transparent
                                       disabled:opacity-50 disabled:cursor-not-allowed"
                            />
                            <span className="text-xs text-gray-600 dark:text-gray-400 whitespace-nowrap">hrs</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          ) : null}

          {/* Message */}
          {message && (
            <div
              className={`mt-4 p-3 rounded-lg ${
                message.type === 'success'
                  ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200 border border-green-300 dark:border-green-700'
                  : 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-200 border border-red-300 dark:border-red-700'
              }`}
            >
              {message.text}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-gray-50 dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700 px-6 py-4 flex justify-end gap-3">
          <button
            onClick={onClose}
            disabled={syncing}
            className="px-4 py-2 text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={handleSync}
            disabled={syncing || !preview?.hasChanges || (preview?.hasConflicts && preview.conflicts.some(c => {
              if (c.type === 'state_conflict') return !conflictResolutions['state'];
              if (c.type === 'task_missing_locally' && c.taskId) return !conflictResolutions[c.taskId];
              return false;
            }))}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
          >
            {syncing ? (
              <>
                <RefreshCw size={16} className="animate-spin" />
                Sincronizando...
              </>
            ) : (
              <>
                <RefreshCw size={16} />
                {!preview?.hasChanges ? 'Sin cambios' :
                 preview?.hasConflicts && preview.conflicts.some(c => {
                   if (c.type === 'state_conflict') return !conflictResolutions['state'];
                   if (c.type === 'task_missing_locally' && c.taskId) return !conflictResolutions[c.taskId];
                   return false;
                 }) ? 'Resolver conflictos' : 'Sincronizar'}
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
