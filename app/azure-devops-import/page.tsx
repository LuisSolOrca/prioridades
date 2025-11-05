'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Navbar from '@/components/Navbar';
import { getWeekDates, getWeekLabel } from '@/lib/utils';

interface WorkItem {
  id: number;
  title: string;
  description?: string;
  state: string;
  type: string;
  assignedTo?: string;
  storyPoints?: number;
  iterationPath?: string;
  areaPath?: string;
  url: string;
}

interface PreviewItem {
  workItemId: number;
  title: string;
  description: string;
  type: string;
  state: string;
  appState: string;
  checklist: { text: string; completed: boolean }[];
  evidenceLinks: { title: string; url: string }[];
  storyPoints?: number;
  error?: string;
}

interface Initiative {
  _id: string;
  name: string;
  color: string;
}

export default function AzureDevOpsImportPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [importing, setImporting] = useState(false);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [workItems, setWorkItems] = useState<WorkItem[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [selectedWeek, setSelectedWeek] = useState<'current' | 'next'>('current');
  const [showPreview, setShowPreview] = useState(false);
  const [previewItems, setPreviewItems] = useState<PreviewItem[]>([]);
  const [initiatives, setInitiatives] = useState<Initiative[]>([]);
  const [selectedInitiatives, setSelectedInitiatives] = useState<Map<number, string[]>>(new Map());
  const [importResults, setImportResults] = useState<any>(null);

  const currentWeek = getWeekDates();
  const nextWeek = getWeekDates(new Date(currentWeek.monday.getTime() + 7 * 24 * 60 * 60 * 1000));

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
      return;
    }
    if (status === 'authenticated') {
      // Verificar que el usuario sea del área Tecnología
      if ((session.user as any).area !== 'Tecnología') {
        router.push('/priorities');
        return;
      }
      loadWorkItems();
    }
  }, [status, session, router]);

  const loadWorkItems = async () => {
    try {
      setLoading(true);
      setMessage(null);

      const [workItemsRes, initiativesRes] = await Promise.all([
        fetch('/api/azure-devops/work-items'),
        fetch('/api/initiatives?activeOnly=true')
      ]);

      if (!workItemsRes.ok) {
        const data = await workItemsRes.json();
        throw new Error(data.error || 'Error al cargar work items');
      }

      const workItemsData = await workItemsRes.json();
      const initiativesData = await initiativesRes.json();

      setWorkItems(workItemsData.workItems || []);
      setInitiatives(initiativesData || []);
    } catch (error) {
      setMessage({
        type: 'error',
        text: error instanceof Error ? error.message : 'Error al cargar work items'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleToggleSelect = (id: number) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedIds(newSelected);
  };

  const handleSelectAll = () => {
    if (selectedIds.size === workItems.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(workItems.map(wi => wi.id)));
    }
  };

  const handleShowPreview = async () => {
    if (selectedIds.size === 0) {
      setMessage({
        type: 'error',
        text: 'Debes seleccionar al menos un work item'
      });
      return;
    }

    setLoadingPreview(true);
    setMessage(null);

    try {
      const res = await fetch('/api/azure-devops/preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          workItemIds: Array.from(selectedIds)
        })
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Error al obtener preview');
      }

      setPreviewItems(data.previews);
      setShowPreview(true);
    } catch (error) {
      setMessage({
        type: 'error',
        text: error instanceof Error ? error.message : 'Error al obtener preview'
      });
    } finally {
      setLoadingPreview(false);
    }
  };

  const handleConfirmImport = async () => {
    // Validar que todos los work items tengan al menos una iniciativa
    const missingInitiatives = previewItems.filter(item =>
      !item.error && (!selectedInitiatives.has(item.workItemId) || selectedInitiatives.get(item.workItemId)!.length === 0)
    );

    if (missingInitiatives.length > 0) {
      setMessage({
        type: 'error',
        text: `Debes seleccionar al menos una iniciativa para: ${missingInitiatives.map(i => i.title).join(', ')}`
      });
      return;
    }

    setImporting(true);
    setMessage(null);

    try {
      const targetWeek = selectedWeek === 'current' ? currentWeek : nextWeek;

      // Crear objeto con iniciativas por work item
      const workItemsWithInitiatives = Array.from(selectedIds).map(workItemId => ({
        workItemId,
        initiativeIds: selectedInitiatives.get(workItemId) || []
      }));

      const res = await fetch('/api/azure-devops/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          workItems: workItemsWithInitiatives,
          weekStart: targetWeek.monday.toISOString(),
          weekEnd: targetWeek.friday.toISOString()
        })
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Error al importar work items');
      }

      const { results } = data;
      const totalImported = results.success.length;
      const totalSkipped = results.skipped.length;
      const totalErrors = results.errors.length;
      const totalChildTasks = results.success.reduce((sum: number, item: any) => sum + (item.childTasksCount || 0), 0);

      let messageText = `✅ ${totalImported} work items importados`;
      if (totalChildTasks > 0) {
        messageText += ` con ${totalChildTasks} tareas en checklist`;
      }
      if (totalSkipped > 0) {
        messageText += `, ${totalSkipped} omitidos (ya existían)`;
      }
      if (totalErrors > 0) {
        messageText += `, ${totalErrors} con errores`;
      }

      setMessage({
        type: totalErrors > 0 ? 'error' : 'success',
        text: messageText
      });

      // Guardar resultados detallados para mostrar
      setImportResults(results);

      // Cerrar modal, limpiar selección y recargar
      setShowPreview(false);
      setSelectedIds(new Set());
      setSelectedInitiatives(new Map());
      await loadWorkItems();
    } catch (error) {
      setMessage({
        type: 'error',
        text: error instanceof Error ? error.message : 'Error al importar work items'
      });
    } finally {
      setImporting(false);
    }
  };

  const handleSync = async () => {
    setImporting(true);
    setMessage(null);

    try {
      const res = await fetch('/api/azure-devops/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ direction: 'both' })
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Error al sincronizar');
      }

      const { results } = data;
      const fromAdo = results.fromAzureDevOps.updated;
      const toAdo = results.toAzureDevOps.updated;

      setMessage({
        type: 'success',
        text: `✅ Sincronización completada: ${fromAdo} actualizados desde Azure DevOps, ${toAdo} actualizados hacia Azure DevOps`
      });
    } catch (error) {
      setMessage({
        type: 'error',
        text: error instanceof Error ? error.message : 'Error al sincronizar'
      });
    } finally {
      setImporting(false);
    }
  };

  const getStateColor = (state: string) => {
    const stateColors: Record<string, string> = {
      'New': 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-200',
      'Active': 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-200',
      'Resolved': 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-200',
      'Closed': 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200',
      'Removed': 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-200'
    };
    return stateColors[state] || 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200';
  };

  const getTypeIcon = (type: string) => {
    const icons: Record<string, string> = {
      'User Story': '📖',
      'Bug': '🐛',
      'Task': '✓',
      'Feature': '🎯'
    };
    return icons[type] || '📄';
  };

  if (status === 'loading' || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <div className="text-4xl mb-4">⏳</div>
          <div className="text-gray-600 dark:text-gray-400">Cargando work items...</div>
        </div>
      </div>
    );
  }

  if (!session) return null;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Navbar />
      <div className="pt-16 main-content px-4 py-6 max-w-7xl mx-auto">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
          <div className="mb-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold text-gray-800 dark:text-gray-100">
                  📥 Importar Work Items de Azure DevOps
                </h1>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => router.push('/azure-devops-config')}
                  className="bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700 transition"
                >
                  ⚙️ Configuración
                </button>
                <button
                  onClick={() => router.push('/priorities')}
                  className="bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700 transition"
                >
                  Volver
                </button>
              </div>
            </div>

            {/* Selector de semana */}
            <div className="mt-4 flex items-center gap-4">
              <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                Importar para la semana:
              </label>
              <div className="flex gap-2">
                <button
                  onClick={() => setSelectedWeek('current')}
                  className={`px-4 py-2 rounded-lg font-medium transition ${
                    selectedWeek === 'current'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
                  }`}
                >
                  📅 Semana Actual ({getWeekLabel(currentWeek.monday)})
                </button>
                <button
                  onClick={() => setSelectedWeek('next')}
                  className={`px-4 py-2 rounded-lg font-medium transition ${
                    selectedWeek === 'next'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
                  }`}
                >
                  📅 Siguiente Semana ({getWeekLabel(nextWeek.monday)})
                </button>
              </div>
            </div>
          </div>

          {message && (
            <div
              className={`mb-6 p-4 rounded-lg ${
                message.type === 'success'
                  ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200'
                  : 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-200'
              }`}
            >
              {message.text}
            </div>
          )}

          {/* Resultados detallados de la importación */}
          {importResults && (
            <div className="mb-6 space-y-4">
              {/* Work items importados exitosamente */}
              {importResults.success.length > 0 && (
                <div className="bg-green-50 dark:bg-green-900/20 border border-green-300 dark:border-green-700 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-2xl">✅</span>
                    <h3 className="text-lg font-bold text-green-900 dark:text-green-100">
                      Work Items Importados ({importResults.success.length})
                    </h3>
                  </div>
                  <div className="space-y-3">
                    {importResults.success.map((item: any, idx: number) => (
                      <div
                        key={idx}
                        className="bg-white dark:bg-gray-800 rounded-lg p-3 border border-green-200 dark:border-green-800"
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <span className="text-sm font-mono text-gray-500 dark:text-gray-400">
                                #{item.workItemId}
                              </span>
                              <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                                {item.title}
                              </span>
                            </div>
                            {item.childTasksCount > 0 && (
                              <p className="text-sm text-gray-600 dark:text-gray-400">
                                📋 {item.childTasksCount} tareas importadas al checklist
                              </p>
                            )}
                          </div>
                          <a
                            href={`/priorities`}
                            className="bg-blue-600 text-white px-3 py-1.5 rounded-lg hover:bg-blue-700 transition text-sm whitespace-nowrap"
                            onClick={() => setImportResults(null)}
                          >
                            Ver Prioridad →
                          </a>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Work items omitidos */}
              {importResults.skipped.length > 0 && (
                <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-300 dark:border-yellow-700 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-2xl">⚠️</span>
                    <h3 className="text-lg font-bold text-yellow-900 dark:text-yellow-100">
                      Work Items Omitidos ({importResults.skipped.length})
                    </h3>
                  </div>
                  <div className="space-y-2">
                    {importResults.skipped.map((item: any, idx: number) => (
                      <div
                        key={idx}
                        className="bg-white dark:bg-gray-800 rounded-lg p-3 border border-yellow-200 dark:border-yellow-800"
                      >
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-mono text-gray-500 dark:text-gray-400">
                            #{item.workItemId}
                          </span>
                          <span className="text-sm text-gray-600 dark:text-gray-400">
                            {item.reason}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Work items con errores */}
              {importResults.errors.length > 0 && (
                <div className="bg-red-50 dark:bg-red-900/20 border border-red-300 dark:border-red-700 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-2xl">❌</span>
                    <h3 className="text-lg font-bold text-red-900 dark:text-red-100">
                      Errores ({importResults.errors.length})
                    </h3>
                  </div>
                  <div className="space-y-2">
                    {importResults.errors.map((item: any, idx: number) => (
                      <div
                        key={idx}
                        className="bg-white dark:bg-gray-800 rounded-lg p-3 border border-red-200 dark:border-red-800"
                      >
                        <div className="flex items-start gap-2">
                          <span className="text-sm font-mono text-gray-500 dark:text-gray-400">
                            #{item.workItemId}:
                          </span>
                          <span className="text-sm text-red-600 dark:text-red-400">
                            {item.error}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <button
                onClick={() => setImportResults(null)}
                className="w-full bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700 transition"
              >
                Cerrar Resultados
              </button>
            </div>
          )}

          <div className="flex items-center justify-between mb-6 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
            <div>
              <p className="text-sm font-semibold text-blue-900 dark:text-blue-200">
                {workItems.length} work items disponibles
              </p>
              <p className="text-xs text-blue-700 dark:text-blue-300 mt-1">
                {selectedIds.size} seleccionados
              </p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={handleSelectAll}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition text-sm"
              >
                {selectedIds.size === workItems.length ? 'Deseleccionar todos' : 'Seleccionar todos'}
              </button>
              <button
                onClick={handleSync}
                disabled={importing}
                className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition text-sm disabled:opacity-50 disabled:cursor-not-allowed"
              >
                🔄 Sincronizar Estados
              </button>
              <button
                onClick={handleShowPreview}
                disabled={loadingPreview || selectedIds.size === 0}
                className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition text-sm disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loadingPreview ? 'Cargando preview...' : `Vista Previa (${selectedIds.size})`}
              </button>
            </div>
          </div>

          {workItems.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-6xl mb-4">📭</div>
              <p className="text-gray-600 dark:text-gray-400 text-lg">
                No hay work items asignados a ti en Azure DevOps
              </p>
              <p className="text-gray-500 dark:text-gray-500 text-sm mt-2">
                Verifica que tu configuración sea correcta y que tengas work items asignados
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {workItems.map((item) => (
                <div
                  key={item.id}
                  className={`border rounded-lg p-4 transition cursor-pointer ${
                    selectedIds.has(item.id)
                      ? 'border-blue-500 dark:border-blue-400 bg-blue-50 dark:bg-blue-900/20'
                      : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-700/50 hover:border-blue-300 dark:hover:border-blue-600'
                  }`}
                  onClick={() => handleToggleSelect(item.id)}
                >
                  <div className="flex items-start gap-4">
                    <input
                      type="checkbox"
                      checked={selectedIds.has(item.id)}
                      onChange={() => handleToggleSelect(item.id)}
                      className="mt-1 w-5 h-5 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600"
                      onClick={(e) => e.stopPropagation()}
                    />

                    <div className="flex-1">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <span className="text-2xl">{getTypeIcon(item.type)}</span>
                            <span className="text-sm font-mono text-gray-500 dark:text-gray-400">#{item.id}</span>
                            <span className={`px-2 py-1 rounded text-xs font-semibold ${getStateColor(item.state)}`}>
                              {item.state}
                            </span>
                            <span className="px-2 py-1 rounded text-xs font-semibold bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300">
                              {item.type}
                            </span>
                            {item.storyPoints && (
                              <span className="px-2 py-1 rounded text-xs font-semibold bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-200">
                                {item.storyPoints} pts
                              </span>
                            )}
                          </div>
                          <h3 className="font-semibold text-gray-800 dark:text-gray-100 mb-2">
                            {item.title}
                          </h3>
                          {item.description && (
                            <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2 mb-2">
                              {item.description.replace(/<[^>]*>/g, '')}
                            </p>
                          )}
                          <div className="flex gap-4 text-xs text-gray-500 dark:text-gray-400">
                            {item.iterationPath && (
                              <span>📅 {item.iterationPath}</span>
                            )}
                            {item.areaPath && (
                              <span>📁 {item.areaPath}</span>
                            )}
                          </div>
                        </div>
                        <a
                          href={item.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 dark:text-blue-400 hover:underline text-sm"
                          onClick={(e) => e.stopPropagation()}
                        >
                          Ver en Azure DevOps →
                        </a>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Modal de Preview */}
      {showPreview && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 dark:bg-opacity-70 flex items-center justify-center z-50 p-4"
          onClick={() => !importing && setShowPreview(false)}
        >
          <div
            className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-6xl w-full max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6">
              <div className="flex items-start justify-between mb-6">
                <div>
                  <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-100">
                    📋 Preview de Importación
                  </h2>
                  <p className="text-gray-600 dark:text-gray-400 mt-2">
                    Se importarán {previewItems.length} work items a la{' '}
                    <span className="font-semibold text-blue-600 dark:text-blue-400">
                      {selectedWeek === 'current'
                        ? `Semana Actual (${getWeekLabel(currentWeek.monday)})`
                        : `Siguiente Semana (${getWeekLabel(nextWeek.monday)})`
                      }
                    </span>
                  </p>
                </div>
                {!importing && (
                  <button
                    onClick={() => setShowPreview(false)}
                    className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 text-2xl"
                  >
                    ×
                  </button>
                )}
              </div>

              {/* Preview Items */}
              <div className="space-y-4 mb-6">
                {previewItems.map((item, index) => (
                  <div
                    key={item.workItemId}
                    className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 bg-gray-50 dark:bg-gray-700/50"
                  >
                    {item.error ? (
                      <div className="text-red-600 dark:text-red-400">
                        ❌ Error al obtener work item #{item.workItemId}: {item.error}
                      </div>
                    ) : (
                      <>
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <span className="text-sm font-mono text-gray-500 dark:text-gray-400">#{item.workItemId}</span>
                              <span className="px-2 py-1 rounded text-xs font-semibold bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200">
                                {item.type}
                              </span>
                              <span className="px-2 py-1 rounded text-xs font-semibold bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300">
                                {item.state} → {item.appState}
                              </span>
                              {item.storyPoints && (
                                <span className="px-2 py-1 rounded text-xs font-semibold bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-200">
                                  {item.storyPoints} pts
                                </span>
                              )}
                            </div>
                            <h3 className="font-bold text-gray-800 dark:text-gray-100 text-lg mb-2">
                              {item.title}
                            </h3>
                            {item.description && (
                              <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                                {item.description.replace(/<[^>]*>/g, '').substring(0, 200)}
                                {item.description.length > 200 && '...'}
                              </p>
                            )}
                          </div>
                        </div>

                        {/* Selector de Iniciativa Estratégica */}
                        <div className="mb-3 p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded border border-yellow-300 dark:border-yellow-700">
                          <h4 className="text-sm font-semibold text-yellow-900 dark:text-yellow-200 mb-2">
                            ⭐ Iniciativa Estratégica (Requerido)
                          </h4>
                          <select
                            multiple
                            value={selectedInitiatives.get(item.workItemId) || []}
                            onChange={(e) => {
                              const selected = Array.from(e.target.selectedOptions, option => option.value);
                              const newMap = new Map(selectedInitiatives);
                              if (selected.length > 0) {
                                newMap.set(item.workItemId, selected);
                              } else {
                                newMap.delete(item.workItemId);
                              }
                              setSelectedInitiatives(newMap);
                            }}
                            className="w-full px-3 py-2 border border-yellow-300 dark:border-yellow-700 rounded-lg focus:ring-2 focus:ring-yellow-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                            size={Math.min(initiatives.length, 4)}
                          >
                            {initiatives.map((initiative) => (
                              <option key={initiative._id} value={initiative._id}>
                                {initiative.name}
                              </option>
                            ))}
                          </select>
                          <p className="text-xs text-yellow-800 dark:text-yellow-300 mt-1">
                            Mantén presionado Ctrl/Cmd para seleccionar múltiples iniciativas
                          </p>
                          {(!selectedInitiatives.has(item.workItemId) || selectedInitiatives.get(item.workItemId)!.length === 0) && (
                            <p className="text-xs text-red-600 dark:text-red-400 mt-1 font-semibold">
                              ⚠️ Debes seleccionar al menos una iniciativa
                            </p>
                          )}
                        </div>

                        {/* Checklist Preview */}
                        {item.checklist.length > 0 && (
                          <div className="mb-3 p-3 bg-white dark:bg-gray-800 rounded border border-gray-200 dark:border-gray-600">
                            <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                              ✓ Checklist ({item.checklist.length} tareas)
                            </h4>
                            <ul className="space-y-1">
                              {item.checklist.map((task, idx) => (
                                <li key={idx} className="text-sm flex items-center gap-2">
                                  <span>{task.completed ? '☑' : '☐'}</span>
                                  <span className={task.completed ? 'text-gray-500 dark:text-gray-400 line-through' : 'text-gray-700 dark:text-gray-300'}>
                                    {task.text}
                                  </span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}

                        {/* Evidence Links Preview */}
                        {item.evidenceLinks.length > 0 && (
                          <div className="p-3 bg-white dark:bg-gray-800 rounded border border-gray-200 dark:border-gray-600">
                            <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                              🔗 Enlaces de Evidencia
                            </h4>
                            {item.evidenceLinks.map((link, idx) => (
                              <a
                                key={idx}
                                href={link.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-sm text-blue-600 dark:text-blue-400 hover:underline block"
                              >
                                {link.title}
                              </a>
                            ))}
                          </div>
                        )}
                      </>
                    )}
                  </div>
                ))}
              </div>

              {/* Action Buttons */}
              <div className="flex justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
                <button
                  onClick={() => setShowPreview(false)}
                  disabled={importing}
                  className="bg-gray-600 text-white px-6 py-3 rounded-lg hover:bg-gray-700 transition font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleConfirmImport}
                  disabled={importing}
                  className="bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 transition font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {importing ? 'Importando...' : `✓ Confirmar Importación`}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
