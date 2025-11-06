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

  // Estado para sincronización
  const [showSyncModal, setShowSyncModal] = useState(false);
  const [syncItems, setSyncItems] = useState<any[]>([]);
  const [syncModalError, setSyncModalError] = useState<string | null>(null);
  const [unlinkedPriorities, setUnlinkedPriorities] = useState<any[]>([]);
  const [areaPaths, setAreaPaths] = useState<any[]>([]);
  const [selectedAreaPaths, setSelectedAreaPaths] = useState<Map<string, string>>(new Map());
  const [loadingSync, setLoadingSync] = useState(false);
  const [selectedSyncItems, setSelectedSyncItems] = useState<Set<number>>(new Set());
  const [taskHours, setTaskHours] = useState<Map<number | string, number>>(new Map());
  const [loadingAutoSync, setLoadingAutoSync] = useState(false);
  const [lastSyncDate, setLastSyncDate] = useState<Date | null>(null);
  const [showFromAdoModal, setShowFromAdoModal] = useState(false);
  const [fromAdoItems, setFromAdoItems] = useState<any[]>([]);
  const [selectedFromAdoItems, setSelectedFromAdoItems] = useState<Set<number>>(new Set());

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

  const handleShowSyncModal = async () => {
    setLoadingSync(true);
    setMessage(null);
    setSyncModalError(null); // Limpiar errores previos del modal

    try {
      const res = await fetch('/api/azure-devops/sync-preview');
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Error al obtener preview de sincronización');
      }

      console.log('Sync preview data:', data);
      console.log('Unlinked priorities:', data.unlinkedPriorities);
      console.log('Area paths:', data.areaPaths);

      setSyncItems(data.items || []);
      setUnlinkedPriorities(data.unlinkedPriorities || []);
      setAreaPaths(data.areaPaths || []);
      setShowSyncModal(true);

      // Pre-seleccionar items con cambios
      const itemsWithChanges = data.items.filter((item: any) => item.changes?.hasChanges);
      setSelectedSyncItems(new Set(itemsWithChanges.map((item: any) => item.workItemId)));

    } catch (error) {
      setMessage({
        type: 'error',
        text: error instanceof Error ? error.message : 'Error al cargar sincronización'
      });
    } finally {
      setLoadingSync(false);
    }
  };

  const handleConfirmSync = async () => {
    setImporting(true);
    setMessage(null);

    try {
      // Validar que todas las tareas completadas tengan horas ingresadas
      const missingHours: string[] = [];

      // Validar tareas de items vinculados
      for (const item of syncItems) {
        if (selectedSyncItems.has(item.workItemId)) {
          const completedTasks = item.changes?.details?.filter(
            (d: any) => d.direction === 'to-ado' && d.type === 'tarea_completada_local'
          ) || [];

          for (const task of completedTasks) {
            if (!taskHours.has(task.taskId) || taskHours.get(task.taskId) === 0) {
              missingHours.push(`${item.title} - ${task.taskTitle}`);
            }
          }
        }
      }

      // Validar tareas de prioridades no vinculadas (nuevas)
      for (const priority of unlinkedPriorities) {
        if (selectedAreaPaths.has(priority.priorityId)) {
          const completedTasks = priority.checklistItems?.filter((item: any) => item.completed) || [];

          for (let idx = 0; idx < priority.checklistItems?.length || 0; idx++) {
            const checklistItem = priority.checklistItems[idx];
            if (checklistItem.completed) {
              const hoursKey = `${priority.priorityId}-${idx}`;
              if (!taskHours.has(hoursKey) || taskHours.get(hoursKey) === 0) {
                missingHours.push(`${priority.title} - ${checklistItem.text}`);
              }
            }
          }
        }
      }

      // Si hay tareas sin horas, mostrar error y no continuar
      if (missingHours.length > 0) {
        setImporting(false);
        setSyncModalError(`⚠️ Debes ingresar las horas para todas las tareas completadas. Faltan horas en: ${missingHours.slice(0, 3).join(', ')}${missingHours.length > 3 ? ` y ${missingHours.length - 3} más` : ''}`);
        return;
      }

      // Limpiar error si la validación pasó
      setSyncModalError(null);

      // Convertir taskHours Map a objeto
      // Separar horas para tareas vinculadas (taskId numérico) y no vinculadas (priorityId-idx)
      const taskHoursObj: any = {};
      const unlinkedTaskHours: any = {};

      taskHours.forEach((hours, key) => {
        if (typeof key === 'string' && key.includes('-')) {
          // Formato: priorityId-taskIndex para tareas no vinculadas
          unlinkedTaskHours[key] = hours;
        } else {
          // taskId numérico para tareas ya vinculadas
          taskHoursObj[key] = hours;
        }
      });

      // Convertir selectedAreaPaths Map a objeto
      const areaPathsObj: any = {};
      selectedAreaPaths.forEach((areaPath, priorityId) => {
        areaPathsObj[priorityId] = areaPath;
      });

      const res = await fetch('/api/azure-devops/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          direction: 'both',
          selectedItems: Array.from(selectedSyncItems),
          taskHours: taskHoursObj,
          exportUnlinked: unlinkedPriorities.length > 0, // Exportar prioridades no vinculadas si existen
          workItemType: 'User Story', // Por defecto
          areaPaths: areaPathsObj, // Áreas seleccionadas para cada prioridad
          unlinkedTaskHours: unlinkedTaskHours // Horas para tareas de prioridades no vinculadas
        })
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Error al sincronizar');
      }

      const { results } = data;
      const fromAdo = results.fromAzureDevOps.updated;
      const toAdo = results.toAzureDevOps.updated;
      const exported = results.exported?.created || 0;

      let messageText = `✅ Sincronización completada: ${fromAdo} actualizados desde Azure DevOps, ${toAdo} actualizados hacia Azure DevOps`;
      if (exported > 0) {
        messageText += `, ${exported} prioridades exportadas a Azure DevOps`;
      }

      setMessage({
        type: 'success',
        text: messageText
      });

      // Actualizar fecha de última sincronización
      setLastSyncDate(new Date());

      // Cerrar modal y limpiar
      setShowSyncModal(false);
      setSelectedSyncItems(new Set());
      setTaskHours(new Map());
      setUnlinkedPriorities([]);
      setSelectedAreaPaths(new Map());
      setAreaPaths([]);
    } catch (error) {
      setMessage({
        type: 'error',
        text: error instanceof Error ? error.message : 'Error al sincronizar'
      });
    } finally {
      setImporting(false);
    }
  };

  // Mostrar preview de sincronización desde Azure DevOps
  const handleShowFromAdoModal = async () => {
    setLoadingAutoSync(true);
    setMessage(null);

    try {
      const res = await fetch('/api/azure-devops/sync-preview');
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Error al obtener preview');
      }

      // Filtrar items con cualquier tipo de cambio (estado o tareas)
      const itemsWithChanges = data.items.filter((item: any) => item.changes?.hasChanges);

      if (itemsWithChanges.length === 0) {
        setMessage({
          type: 'success',
          text: '✅ No hay cambios pendientes de sincronización'
        });
        setLoadingAutoSync(false);
        return;
      }

      setFromAdoItems(itemsWithChanges);
      setSelectedFromAdoItems(new Set(itemsWithChanges.map((item: any) => item.workItemId)));
      setShowFromAdoModal(true);
    } catch (error) {
      setMessage({
        type: 'error',
        text: error instanceof Error ? error.message : 'Error al obtener preview'
      });
    } finally {
      setLoadingAutoSync(false);
    }
  };

  // Confirmar sincronización desde Azure DevOps
  const handleConfirmFromAdo = async () => {
    setImporting(true);
    setMessage(null);

    try {
      // Llamar directamente al endpoint auto-sync que solo sincroniza desde ADO hacia la app
      const res = await fetch('/api/azure-devops/auto-sync');
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Error al sincronizar');
      }

      const { results } = data;
      const updated = results.updated;

      setMessage({
        type: 'success',
        text: `✅ Sincronización completada: ${updated} prioridades actualizadas desde Azure DevOps`
      });

      // Actualizar fecha de última sincronización
      setLastSyncDate(new Date());

      // Cerrar modal y limpiar
      setShowFromAdoModal(false);
      setSelectedFromAdoItems(new Set());

      // Refrescar work items
      const workItemsRes = await fetch('/api/azure-devops/work-items');
      if (workItemsRes.ok) {
        const workItemsData = await workItemsRes.json();
        setWorkItems(workItemsData.workItems || []);
      }
    } catch (error) {
      setMessage({
        type: 'error',
        text: error instanceof Error ? error.message : 'Error al sincronizar desde Azure DevOps'
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

          {/* Mensaje informativo */}
          <div className="mb-4 p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-300 dark:border-amber-700 rounded-lg">
            <div className="flex items-start gap-3">
              <span className="text-2xl">ℹ️</span>
              <div>
                <p className="text-sm font-semibold text-amber-900 dark:text-amber-100 mb-1">
                  Work Items de Azure DevOps
                </p>
                <p className="text-xs text-amber-800 dark:text-amber-200 mb-2">
                  Los work items mostrados a continuación están asignados a ti en Azure DevOps pero <strong>aún NO están en el sistema de prioridades</strong>. Selecciona los que deseas importar como prioridades semanales.
                </p>
                <p className="text-xs text-amber-900 dark:text-amber-100 font-semibold">
                  👉 Después de seleccionar, haz clic en el botón "Vista Previa" para continuar con la importación.
                </p>
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
                {workItems.length} work items disponibles en Azure DevOps
              </p>
              <p className="text-xs text-blue-700 dark:text-blue-300 mt-1">
                {selectedIds.size} seleccionados • Estos work items aún NO están en el sistema de prioridades
              </p>
            </div>
            <div className="flex gap-3 items-center">
              <button
                onClick={handleSelectAll}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition text-sm"
              >
                {selectedIds.size === workItems.length ? 'Deseleccionar todos' : 'Seleccionar todos'}
              </button>
              <button
                onClick={handleShowFromAdoModal}
                disabled={loadingAutoSync}
                className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                title="Sincronizar cambios desde Azure DevOps hacia Prioridades"
              >
                {loadingAutoSync ? 'Cargando...' : '⬇️ Desde Azure DevOps'}
              </button>
              <button
                onClick={handleShowSyncModal}
                disabled={loadingSync}
                className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                title="Actualizar cambios locales hacia Azure DevOps"
              >
                {loadingSync ? 'Cargando...' : '⬆️ Actualizar DevOps'}
              </button>
              <button
                onClick={handleShowPreview}
                disabled={loadingPreview || selectedIds.size === 0}
                className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition text-sm disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loadingPreview ? 'Cargando preview...' : `Vista Previa (${selectedIds.size})`}
              </button>
              {lastSyncDate && (
                <span className="text-xs text-gray-500 dark:text-gray-400 ml-2">
                  Última sync: {lastSyncDate.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })}
                </span>
              )}
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
            <div className="flex gap-6">
              {/* Lista de work items - columna izquierda */}
              <div className="flex-1 space-y-3">
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

              {/* Card informativa - columna derecha */}
              <div className="w-80 flex-shrink-0">
                <div className="sticky top-20 bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-5 shadow-lg">
                  <div className="flex items-center gap-2 mb-4">
                    <span className="text-2xl">💡</span>
                    <h3 className="text-lg font-bold text-blue-900 dark:text-blue-100">
                      Guía de Uso
                    </h3>
                  </div>

                  <div className="space-y-4 text-sm">
                    {/* Importación inicial */}
                    <div>
                      <h4 className="font-semibold text-blue-800 dark:text-blue-200 mb-2 flex items-center gap-2">
                        <span className="text-lg">📥</span>
                        Importación Inicial
                      </h4>
                      <p className="text-blue-700 dark:text-blue-300 text-xs leading-relaxed">
                        Selecciona work items y usa <strong>Vista Previa</strong> para importarlos como prioridades. Se importan automáticamente:
                      </p>
                      <ul className="mt-2 space-y-1 text-xs text-blue-600 dark:text-blue-300">
                        <li className="flex items-start gap-2">
                          <span className="text-green-600 dark:text-green-400 mt-0.5">✓</span>
                          <span>Título y descripción</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <span className="text-green-600 dark:text-green-400 mt-0.5">✓</span>
                          <span>Estado mapeado a tu sistema</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <span className="text-green-600 dark:text-green-400 mt-0.5">✓</span>
                          <span>Child Tasks como checklist</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <span className="text-green-600 dark:text-green-400 mt-0.5">✓</span>
                          <span>Story Points y metadata</span>
                        </li>
                      </ul>
                    </div>

                    {/* Desde Azure DevOps */}
                    <div className="pt-3 border-t border-blue-200 dark:border-blue-700">
                      <h4 className="font-semibold text-indigo-800 dark:text-indigo-200 mb-2 flex items-center gap-2">
                        <span className="text-lg">⬇️</span>
                        Desde Azure DevOps
                      </h4>
                      <p className="text-indigo-700 dark:text-indigo-300 text-xs leading-relaxed">
                        Sincroniza <strong>cambios de Azure DevOps hacia Prioridades</strong>. Úsalo cuando:
                      </p>
                      <ul className="mt-2 space-y-1 text-xs text-indigo-600 dark:text-indigo-300">
                        <li className="flex items-start gap-2">
                          <span className="mr-1">•</span>
                          <span>Cambien estados en Azure DevOps</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <span className="mr-1">•</span>
                          <span>Se completen tareas en Azure DevOps</span>
                        </li>
                      </ul>
                    </div>

                    {/* Actualizar DevOps */}
                    <div className="pt-3 border-t border-blue-200 dark:border-blue-700">
                      <h4 className="font-semibold text-purple-800 dark:text-purple-200 mb-2 flex items-center gap-2">
                        <span className="text-lg">⬆️</span>
                        Actualizar DevOps
                      </h4>
                      <p className="text-purple-700 dark:text-purple-300 text-xs leading-relaxed">
                        Sincroniza <strong>cambios de Prioridades hacia Azure DevOps</strong>. Úsalo cuando:
                      </p>
                      <ul className="mt-2 space-y-1 text-xs text-purple-600 dark:text-purple-300">
                        <li className="flex items-start gap-2">
                          <span className="mr-1">•</span>
                          <span>Cambies estados en Prioridades</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <span className="mr-1">•</span>
                          <span>Completes tareas del checklist</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <span className="mr-1">•</span>
                          <span>Exportes prioridades nuevas a Azure DevOps</span>
                        </li>
                      </ul>
                      <div className="mt-2 p-2 bg-purple-100 dark:bg-purple-900/30 rounded text-xs text-purple-800 dark:text-purple-200">
                        <strong>⚠️ Importante:</strong> Debes ingresar las horas trabajadas para cada tarea completada.
                      </div>
                    </div>

                    {/* Nota final */}
                    <div className="pt-3 border-t border-blue-200 dark:border-blue-700">
                      <p className="text-xs text-blue-600 dark:text-blue-400 italic">
                        💡 <strong>Tip:</strong> Usa los botones de sincronización regularmente para mantener ambos sistemas actualizados.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
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

      {/* Modal de Sincronización Interactiva */}
      {showSyncModal && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 dark:bg-opacity-70 flex items-center justify-center z-50 p-4"
          onClick={() => {
            if (!importing) {
              setShowSyncModal(false);
              setSyncModalError(null);
            }
          }}
        >
          <div
            className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-6xl w-full max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6">
              <div className="flex items-start justify-between mb-6">
                <div>
                  <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-100">
                    🔄 Sincronización Bidireccional
                  </h2>
                  <p className="text-gray-600 dark:text-gray-400 mt-2">
                    {syncItems.length} prioridades vinculadas con Azure DevOps
                  </p>
                  <p className="text-sm text-gray-500 dark:text-gray-500 mt-1">
                    Selecciona las prioridades que deseas sincronizar e ingresa las horas trabajadas en tareas completadas
                  </p>
                </div>
                {!importing && (
                  <button
                    onClick={() => {
                      setShowSyncModal(false);
                      setSyncModalError(null);
                    }}
                    className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 text-2xl"
                  >
                    ×
                  </button>
                )}
              </div>

              {/* Mensaje de error de validación */}
              {syncModalError && (
                <div className="mb-6 p-4 bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-200 rounded-lg border border-red-300 dark:border-red-700">
                  {syncModalError}
                </div>
              )}

              {/* Lista de items de sincronización */}
              {syncItems.length === 0 ? (
                <div className="text-center py-12">
                  <div className="text-6xl mb-4">📭</div>
                  <p className="text-gray-600 dark:text-gray-400 text-lg">
                    No hay prioridades vinculadas con Azure DevOps
                  </p>
                </div>
              ) : (
                <div className="space-y-4 mb-6">
                  {syncItems.map((item) => (
                    <div
                      key={item.workItemId}
                      className={`border rounded-lg p-4 ${
                        selectedSyncItems.has(item.workItemId)
                          ? 'border-blue-500 dark:border-blue-400 bg-blue-50 dark:bg-blue-900/20'
                          : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-700/50'
                      }`}
                    >
                      {item.error ? (
                        <div className="text-red-600 dark:text-red-400">
                          ❌ Error: {item.error}
                        </div>
                      ) : (
                        <>
                          <div className="flex items-start gap-4">
                            <input
                              type="checkbox"
                              checked={selectedSyncItems.has(item.workItemId)}
                              onChange={() => {
                                const newSelected = new Set(selectedSyncItems);
                                if (newSelected.has(item.workItemId)) {
                                  newSelected.delete(item.workItemId);
                                } else {
                                  newSelected.add(item.workItemId);
                                }
                                setSelectedSyncItems(newSelected);
                              }}
                              className="mt-1 w-5 h-5 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600"
                            />
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-2">
                                <span className="text-sm font-mono text-gray-500 dark:text-gray-400">
                                  #{item.workItemId}
                                </span>
                                <span className="px-2 py-1 rounded text-xs font-semibold bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300">
                                  {item.workItemType}
                                </span>
                                {item.localStatus && (
                                  <span className={`px-2 py-1 rounded text-xs font-semibold ${
                                    item.localStatus === 'COMPLETADO'
                                      ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300'
                                      : item.localStatus === 'EN_TIEMPO'
                                      ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300'
                                      : item.localStatus === 'BLOQUEADO'
                                      ? 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300'
                                      : item.localStatus === 'EN_RIESGO'
                                      ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300'
                                      : 'bg-gray-100 dark:bg-gray-900/30 text-gray-800 dark:text-gray-300'
                                  }`}>
                                    Local: {item.localStatus}
                                  </span>
                                )}
                                {item.remoteStatus && (
                                  <span className={`px-2 py-1 rounded text-xs font-semibold ${
                                    item.remoteStatus === 'Closed' || item.remoteStatus === 'Done'
                                      ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300'
                                      : item.remoteStatus === 'Active' || item.remoteStatus === 'New'
                                      ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300'
                                      : item.remoteStatus === 'Removed'
                                      ? 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300'
                                      : 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300'
                                  }`}>
                                    Azure: {item.remoteStatus}
                                  </span>
                                )}
                              </div>

                              <h3 className="font-bold text-gray-800 dark:text-gray-100 mb-2">
                                {item.title}
                              </h3>

                              {/* Mostrar cambios detectados */}
                              {item.changes && item.changes.hasChanges && (
                                <div className="mb-3 p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded border border-yellow-300 dark:border-yellow-700">
                                  <h4 className="text-sm font-semibold text-yellow-900 dark:text-yellow-200 mb-2">
                                    ⚠️ Cambios Detectados
                                  </h4>
                                  <ul className="space-y-1 text-sm">
                                    {item.changes.details.map((detail: any, idx: number) => (
                                      <li key={idx} className="text-yellow-800 dark:text-yellow-300">
                                        {detail.type === 'estado' && (
                                          <>Estado: {detail.local} (Local) → {detail.remoto} (Azure)</>
                                        )}
                                        {detail.type === 'tarea_completada_local' && (
                                          <>
                                            ✅ Tarea "{detail.taskTitle}": Completada localmente, se cerrará en Azure ({detail.remoteStatus})
                                          </>
                                        )}
                                        {detail.type === 'tarea_reabierta_local' && (
                                          <>
                                            🔄 Tarea "{detail.taskTitle}": Reabierta localmente, se reabrirá en Azure ({detail.remoteStatus} → Active)
                                          </>
                                        )}
                                        {detail.type === 'tarea_nueva_local' && (
                                          <>
                                            ✨ Tarea nueva "{detail.taskTitle}": Se creará en Azure DevOps {detail.localStatus === 'completada' ? '(completada)' : ''}
                                          </>
                                        )}
                                        {detail.type === 'tarea_nueva_remota' && (
                                          <>
                                            ⬇️ Tarea "{detail.taskTitle}": Existe en Azure, se agregará al checklist local ({detail.remoteStatus})
                                          </>
                                        )}
                                      </li>
                                    ))}
                                  </ul>
                                </div>
                              )}

                              {/* Tareas con input de horas */}
                              {item.childTasks && item.childTasks.length > 0 && (
                                <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded border border-gray-200 dark:border-gray-600">
                                  <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                                    📋 Tareas ({item.childTasks.length})
                                  </h4>
                                  <div className="space-y-2">
                                    {item.childTasks.map((task: any) => (
                                      <div key={task.id} className="flex items-center gap-3">
                                        <span className={`text-sm ${
                                          task.localCompleted
                                            ? 'text-green-600 dark:text-green-400'
                                            : 'text-gray-600 dark:text-gray-400'
                                        }`}>
                                          {task.localCompleted ? '✓' : '○'}
                                        </span>
                                        <span className="flex-1 text-sm text-gray-700 dark:text-gray-300">
                                          {task.title}
                                          {task.isLocalOnly && (
                                            <span className="ml-2 text-xs px-2 py-0.5 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded">
                                              Nueva (local)
                                            </span>
                                          )}
                                          {task.isRemoteOnly && (
                                            <span className="ml-2 text-xs px-2 py-0.5 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 rounded">
                                              De Azure
                                            </span>
                                          )}
                                        </span>
                                        <span className={`text-xs ${
                                          task.state === 'Local'
                                            ? 'text-blue-600 dark:text-blue-400 font-medium'
                                            : 'text-gray-500 dark:text-gray-400'
                                        }`}>
                                          {task.state}
                                        </span>
                                        {/* Mostrar input de horas si:
                                            1. La tarea está completada localmente Y
                                            2. (Es una tarea local O no está cerrada en Azure) */}
                                        {task.localCompleted && (task.isLocalOnly || (task.state !== 'Done' && task.state !== 'Closed')) && (
                                          <input
                                            type="number"
                                            min="0"
                                            step="0.5"
                                            placeholder="Horas"
                                            value={taskHours.get(task.id) || ''}
                                            onChange={(e) => {
                                              const newHours = new Map(taskHours);
                                              const value = parseFloat(e.target.value);
                                              if (value > 0) {
                                                newHours.set(task.id, value);
                                              } else {
                                                newHours.delete(task.id);
                                              }
                                              setTaskHours(newHours);
                                            }}
                                            className="w-20 px-2 py-1 border border-gray-300 dark:border-gray-600 rounded text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                                          />
                                        )}
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        </>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* Prioridades no vinculadas para exportar */}
              {unlinkedPriorities.length > 0 && (
                <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
                  <div className="mb-4">
                    <h3 className="text-lg font-bold text-gray-800 dark:text-gray-100 mb-2">
                      📤 Prioridades sin vincular ({unlinkedPriorities.length})
                    </h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Las siguientes prioridades se crearán como nuevos work items en Azure DevOps (User Stories) en el sprint actual
                    </p>
                  </div>

                  <div className="space-y-3">
                    {unlinkedPriorities.map((priority) => (
                      <div
                        key={priority.priorityId}
                        className="border border-green-300 dark:border-green-700 rounded-lg p-4 bg-green-50 dark:bg-green-900/20"
                      >
                        <div className="flex items-start gap-3">
                          <span className="text-green-600 dark:text-green-400 text-xl mt-1">✨</span>
                          <div className="flex-1">
                            <h4 className="font-bold text-gray-800 dark:text-gray-100 mb-2">
                              {priority.title}
                            </h4>
                            {priority.description && (
                              <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                                {priority.description}
                              </p>
                            )}

                            <div className="flex items-center gap-4 text-xs text-gray-500 dark:text-gray-400 mb-3">
                              <span className="px-2 py-1 rounded bg-gray-200 dark:bg-gray-700">
                                Estado: {priority.status}
                              </span>
                              {priority.checklistCount > 0 && (
                                <span className="px-2 py-1 rounded bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200">
                                  ✓ {priority.checklistCount} tareas
                                </span>
                              )}
                              {priority.evidenceLinksCount > 0 && (
                                <span className="px-2 py-1 rounded bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-200">
                                  🔗 {priority.evidenceLinksCount} enlaces
                                </span>
                              )}
                            </div>

                            {/* Selector de Área/Team */}
                            <div className="mb-3 p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded border border-yellow-300 dark:border-yellow-700">
                              <h5 className="text-xs font-semibold text-yellow-900 dark:text-yellow-200 mb-2">
                                🎯 Área/Team (Requerido)
                              </h5>
                              <select
                                value={selectedAreaPaths.get(priority.priorityId) || ''}
                                onChange={(e) => {
                                  const newMap = new Map(selectedAreaPaths);
                                  if (e.target.value) {
                                    newMap.set(priority.priorityId, e.target.value);
                                  } else {
                                    newMap.delete(priority.priorityId);
                                  }
                                  setSelectedAreaPaths(newMap);
                                }}
                                className="w-full px-3 py-2 border border-yellow-300 dark:border-yellow-700 rounded-lg focus:ring-2 focus:ring-yellow-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-sm"
                              >
                                <option value="">Seleccionar área/team...</option>
                                {areaPaths.map((area) => (
                                  <option key={area.path} value={area.path}>
                                    {area.path}
                                  </option>
                                ))}
                              </select>
                              {!selectedAreaPaths.has(priority.priorityId) && (
                                <p className="text-xs text-red-600 dark:text-red-400 mt-1 font-semibold">
                                  ⚠️ Debes seleccionar un área/team
                                </p>
                              )}
                            </div>

                            {/* Checklist Preview con input de horas */}
                            {priority.checklistItems.length > 0 && (
                              <div className="mb-3 p-3 bg-gray-50 dark:bg-gray-800 rounded border border-gray-200 dark:border-gray-600">
                                <h5 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                                  📋 Tareas ({priority.checklistItems.length})
                                </h5>
                                <div className="space-y-2">
                                  {priority.checklistItems.map((item: any, idx: number) => (
                                    <div key={idx} className="flex items-center gap-3">
                                      <span className={`text-sm ${item.completed ? 'text-green-600 dark:text-green-400' : 'text-gray-600 dark:text-gray-400'}`}>
                                        {item.completed ? '✓' : '○'}
                                      </span>
                                      <span className={`flex-1 text-sm ${item.completed ? 'text-gray-700 dark:text-gray-300' : 'text-gray-700 dark:text-gray-300'}`}>
                                        {item.text}
                                      </span>
                                      <span className="text-xs text-gray-500 dark:text-gray-400">
                                        {item.completed ? 'Completada' : 'Pendiente'}
                                      </span>
                                      {item.completed && (
                                        <input
                                          type="number"
                                          min="0"
                                          step="0.5"
                                          placeholder="Horas"
                                          value={taskHours.get(`${priority.priorityId}-${idx}`) || ''}
                                          onChange={(e) => {
                                            const newHours = new Map(taskHours);
                                            const value = parseFloat(e.target.value);
                                            if (value > 0) {
                                              newHours.set(`${priority.priorityId}-${idx}`, value);
                                            } else {
                                              newHours.delete(`${priority.priorityId}-${idx}`);
                                            }
                                            setTaskHours(newHours);
                                          }}
                                          className="w-20 px-2 py-1 border border-gray-300 dark:border-gray-600 rounded text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                                        />
                                      )}
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}

                            {/* Evidence Links Preview */}
                            {priority.evidenceLinks.length > 0 && (
                              <div className="p-3 bg-white dark:bg-gray-800 rounded border border-gray-200 dark:border-gray-600">
                                <h5 className="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-2">
                                  Enlaces de evidencia:
                                </h5>
                                <div className="space-y-1">
                                  {priority.evidenceLinks.map((link: any, idx: number) => (
                                    <a
                                      key={idx}
                                      href={link.url}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="text-xs text-blue-600 dark:text-blue-400 hover:underline block"
                                    >
                                      {link.title}
                                    </a>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Botones de acción */}
              <div className="flex justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
                <button
                  onClick={() => setShowSyncModal(false)}
                  disabled={importing}
                  className="bg-gray-600 text-white px-6 py-3 rounded-lg hover:bg-gray-700 transition font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleConfirmSync}
                  disabled={
                    importing ||
                    (selectedSyncItems.size === 0 && unlinkedPriorities.length === 0) ||
                    (unlinkedPriorities.length > 0 && unlinkedPriorities.some(p => !selectedAreaPaths.has(p.priorityId)))
                  }
                  className="bg-purple-600 text-white px-6 py-3 rounded-lg hover:bg-purple-700 transition font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {importing ? 'Sincronizando...' : unlinkedPriorities.length > 0 ? `✓ Sincronizar y Exportar (${selectedSyncItems.size + unlinkedPriorities.length})` : `✓ Sincronizar (${selectedSyncItems.size})`}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Sincronización desde Azure DevOps */}
      {showFromAdoModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
            {/* Header */}
            <div className="p-6 border-b border-gray-200 dark:border-gray-700">
              <div className="flex justify-between items-start">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                    🔄 Preview de Sincronización
                  </h2>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                    Se detectaron cambios pendientes. Selecciona las prioridades que deseas sincronizar.
                  </p>
                </div>
                <button
                  onClick={() => setShowFromAdoModal(false)}
                  className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                >
                  <span className="text-2xl">×</span>
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-6">
              <div className="space-y-4">
                {fromAdoItems.map((item) => (
                  <div
                    key={item.workItemId}
                    className={`border rounded-lg p-4 ${
                      selectedFromAdoItems.has(item.workItemId)
                        ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20'
                        : 'border-gray-300 dark:border-gray-600'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <input
                        type="checkbox"
                        checked={selectedFromAdoItems.has(item.workItemId)}
                        onChange={(e) => {
                          const newSet = new Set(selectedFromAdoItems);
                          if (e.target.checked) {
                            newSet.add(item.workItemId);
                          } else {
                            newSet.delete(item.workItemId);
                          }
                          setSelectedFromAdoItems(newSet);
                        }}
                        className="mt-1 h-5 w-5 text-indigo-600 rounded"
                      />
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-xs font-mono text-gray-500 dark:text-gray-400">
                            WI #{item.workItemId}
                          </span>
                          <span className={`text-xs px-2 py-0.5 rounded-full ${getStateColor(item.workItemType)}`}>
                            {item.workItemType}
                          </span>
                        </div>
                        <h3 className="font-semibold text-gray-900 dark:text-white mb-2">
                          {item.title}
                        </h3>

                        {/* Cambio de estado */}
                        {item.changes.stateChanged && (
                          <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-3 mb-2">
                            <p className="text-sm font-semibold text-yellow-900 dark:text-yellow-200 mb-1">
                              🔄 Cambio de estado detectado
                            </p>
                            <div className="flex items-center gap-3 text-sm">
                              <div>
                                <span className="text-gray-600 dark:text-gray-400">Local: </span>
                                <span className={`px-2 py-0.5 rounded text-xs font-semibold ${getStateColor(item.localStatus)}`}>
                                  {item.localStatus}
                                </span>
                              </div>
                              <span className="text-gray-400">→</span>
                              <div>
                                <span className="text-gray-600 dark:text-gray-400">Azure DevOps: </span>
                                <span className={`px-2 py-0.5 rounded text-xs font-semibold ${getStateColor(item.remoteStatus)}`}>
                                  {item.remoteStatus}
                                </span>
                                <span className="text-gray-400 mx-1">→</span>
                                <span className={`px-2 py-0.5 rounded text-xs font-semibold ${getStateColor(item.remoteStatusMapped)}`}>
                                  {item.remoteStatusMapped}
                                </span>
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Tareas completadas remotamente (desde Azure DevOps) */}
                        {item.changes.details?.filter((d: any) => d.direction === 'from-ado').length > 0 && (
                          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3 mb-2">
                            <p className="text-sm font-semibold text-blue-900 dark:text-blue-200 mb-2">
                              ⬇️ Tareas completadas en Azure DevOps
                            </p>
                            <div className="space-y-1">
                              {item.changes.details
                                .filter((d: any) => d.direction === 'from-ado')
                                .map((detail: any, idx: number) => (
                                  <div key={idx} className="flex items-center gap-2 text-sm">
                                    <span className="text-blue-600 dark:text-blue-400">✓</span>
                                    <span className="text-gray-700 dark:text-gray-300">{detail.taskTitle}</span>
                                    <span className="text-xs text-gray-500 dark:text-gray-400">
                                      ({detail.remoteStatus})
                                    </span>
                                  </div>
                                ))}
                            </div>
                          </div>
                        )}

                        {/* Tareas completadas localmente (hacia Azure DevOps) */}
                        {item.changes.details?.filter((d: any) => d.direction === 'to-ado').length > 0 && (
                          <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-3 mb-2">
                            <p className="text-sm font-semibold text-green-900 dark:text-green-200 mb-2">
                              ⬆️ Tareas completadas localmente
                            </p>
                            <div className="space-y-1">
                              {item.changes.details
                                .filter((d: any) => d.direction === 'to-ado')
                                .map((detail: any, idx: number) => (
                                  <div key={idx} className="flex items-center gap-2 text-sm">
                                    <span className="text-green-600 dark:text-green-400">✓</span>
                                    <span className="text-gray-700 dark:text-gray-300">{detail.taskTitle}</span>
                                    <span className="text-xs text-gray-500 dark:text-gray-400">
                                      (pendiente en ADO: {detail.remoteStatus})
                                    </span>
                                  </div>
                                ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Footer */}
            <div className="p-6 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50">
              <div className="flex justify-between items-center">
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {selectedFromAdoItems.size} de {fromAdoItems.length} seleccionados
                </p>
                <div className="flex gap-3">
                  <button
                    onClick={() => setShowFromAdoModal(false)}
                    className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={handleConfirmFromAdo}
                    disabled={importing || selectedFromAdoItems.size === 0}
                    className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {importing ? 'Sincronizando...' : `Sincronizar ${selectedFromAdoItems.size} prioridades`}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
