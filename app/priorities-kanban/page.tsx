'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { DragDropContext, Droppable, DropResult } from '@hello-pangea/dnd';
import Navbar from '@/components/Navbar';
import KanbanCard from '@/components/KanbanCard';
import CommentsSection from '@/components/CommentsSection';
import { getWeekDates, getWeekLabel } from '@/lib/utils';
import { trackFeature } from '@/lib/trackFeature';

interface Initiative {
  _id: string;
  name: string;
  color: string;
  isActive: boolean;
}

interface ChecklistItem {
  _id?: string;
  text: string;
  completed: boolean;
  completedHours?: number;
  createdAt?: string;
}

interface EvidenceLink {
  _id?: string;
  title: string;
  url: string;
  createdAt?: string;
}

interface Priority {
  _id?: string;
  title: string;
  description?: string;
  weekStart: string;
  weekEnd: string;
  completionPercentage: number;
  status: 'EN_TIEMPO' | 'EN_RIESGO' | 'BLOQUEADO' | 'COMPLETADO';
  userId: string;
  initiativeId?: string;
  initiativeIds?: string[];
  initiatives?: Initiative[];
  checklist?: ChecklistItem[];
  evidenceLinks?: EvidenceLink[];
  isCarriedOver?: boolean;
}

export default function PrioritiesKanbanPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [initiatives, setInitiatives] = useState<Initiative[]>([]);
  const [currentWeekPriorities, setCurrentWeekPriorities] = useState<Priority[]>([]);
  const [nextWeekPriorities, setNextWeekPriorities] = useState<Priority[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPriorityForComments, setSelectedPriorityForComments] = useState<Priority | null>(null);

  const currentWeek = getWeekDates();
  const nextWeek = getWeekDates(new Date(currentWeek.monday.getTime() + 7 * 24 * 60 * 60 * 1000));

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
    }
    if (status === 'authenticated' && session) {
      loadData();
      // Trackear visita al tablero Kanban
      trackFeature('kanbanViews').catch(err =>
        console.error('Error tracking kanban view:', err)
      );
    }
  }, [status, session, router]);

  const loadData = async () => {
    try {
      setLoading(true);

      const [initiativesRes, currentWeekPrioritiesRes, nextWeekPrioritiesRes] = await Promise.all([
        fetch('/api/initiatives?activeOnly=true'),
        fetch(`/api/priorities?userId=${(session!.user as any).id}&weekStart=${currentWeek.monday.toISOString()}&weekEnd=${currentWeek.friday.toISOString()}`),
        fetch(`/api/priorities?userId=${(session!.user as any).id}&weekStart=${nextWeek.monday.toISOString()}&weekEnd=${nextWeek.friday.toISOString()}`)
      ]);

      const initiativesData = await initiativesRes.json();
      const currentWeekData = await currentWeekPrioritiesRes.json();
      const nextWeekData = await nextWeekPrioritiesRes.json();

      setInitiatives(initiativesData);

      // Add initiatives to priorities
      const enrichPriorities = (priorities: Priority[]) => {
        return priorities.map(p => ({
          ...p,
          initiatives: (p.initiativeIds || (p.initiativeId ? [p.initiativeId] : []))
            .map(id => initiativesData.find((i: Initiative) => i._id === id))
            .filter((init): init is Initiative => init !== undefined)
        }));
      };

      setCurrentWeekPriorities(enrichPriorities(currentWeekData));
      setNextWeekPriorities(enrichPriorities(nextWeekData));
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDragEnd = async (result: DropResult) => {
    // Save scroll position
    const scrollY = window.scrollY;
    const scrollX = window.scrollX;

    const { destination, source, draggableId } = result;

    // No destination or dropped in the same place
    if (!destination || (destination.droppableId === source.droppableId && destination.index === source.index)) {
      return;
    }

    // Parse droppableId format: "weekId-status"
    const [sourceWeek, sourceStatus] = source.droppableId.split('-');
    const [destWeek, destStatus] = destination.droppableId.split('-');

    try {
      const updateData: any = {};
      const changes: string[] = [];

      // Status labels mapping
      const statusLabels: Record<string, string> = {
        'EN_TIEMPO': 'En Tiempo',
        'EN_RIESGO': 'En Riesgo',
        'BLOQUEADO': 'Bloqueado',
        'COMPLETADO': 'Completado',
        'REPROGRAMADO': 'Reprogramado'
      };

      // Check if status changed
      if (sourceStatus !== destStatus) {
        updateData.status = destStatus;
        changes.push(`Estado cambiado de "${statusLabels[sourceStatus]}" a "${statusLabels[destStatus]}"`);
      }

      // Check if week changed
      if (sourceWeek !== destWeek) {
        const targetWeek = destWeek === 'current' ? currentWeek : nextWeek;
        updateData.weekStart = targetWeek.monday.toISOString();
        updateData.weekEnd = targetWeek.friday.toISOString();

        const weekLabels: Record<string, string> = {
          'current': `Semana Actual (${getWeekLabel(currentWeek.monday)})`,
          'next': `Siguiente Semana (${getWeekLabel(nextWeek.monday)})`
        };
        changes.push(`Reprogramado de "${weekLabels[sourceWeek]}" a "${weekLabels[destWeek]}"`);
      }

      // Only update if something changed
      if (Object.keys(updateData).length > 0) {
        const res = await fetch(`/api/priorities/${draggableId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(updateData),
        });

        if (!res.ok) {
          throw new Error('Error al actualizar la prioridad');
        }

        // Create system comment
        if (changes.length > 0) {
          const commentText = `🤖 ${changes.join(' • ')}`;
          await fetch('/api/comments', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              priorityId: draggableId,
              text: commentText,
              isSystemComment: true
            }),
          });
        }

        await loadData();

        // Restore scroll position
        requestAnimationFrame(() => {
          window.scrollTo(scrollX, scrollY);
        });
      }
    } catch (error) {
      console.error('Error updating priority:', error);
      alert('Error al actualizar la prioridad');
      await loadData(); // Reload to reset UI
    }
  };

  const handleDragStart = () => {
    if (window) {
      document.body.style.overflow = 'hidden';
    }
  };

  const handleDragUpdate = () => {
    if (window && document.body.style.overflow !== 'hidden') {
      document.body.style.overflow = 'hidden';
    }
  };

  const resetScroll = () => {
    if (window) {
      document.body.style.overflow = '';
    }
  };

  if (status === 'loading' || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <div className="text-4xl mb-4">⏳</div>
          <div className="text-gray-600 dark:text-gray-400">Cargando...</div>
        </div>
      </div>
    );
  }

  if (!session) return null;

  const columns = [
    { id: 'EN_TIEMPO', title: 'En Tiempo', color: 'bg-green-100 dark:bg-green-900/30', headerColor: 'bg-green-600' },
    { id: 'EN_RIESGO', title: 'En Riesgo', color: 'bg-yellow-100 dark:bg-yellow-900/30', headerColor: 'bg-yellow-600' },
    { id: 'BLOQUEADO', title: 'Bloqueado', color: 'bg-red-100 dark:bg-red-900/30', headerColor: 'bg-red-600' },
    { id: 'COMPLETADO', title: 'Completado', color: 'bg-blue-100 dark:bg-blue-900/30', headerColor: 'bg-blue-600' },
  ];

  const renderWeekBoard = (weekId: string, weekLabel: string, priorities: Priority[]) => {
    return (
      <div key={weekId}>
        <h2 className="text-xl font-bold text-gray-800 dark:text-gray-100 mb-4">
          📅 {weekLabel}
          <span className="ml-3 text-sm font-normal text-gray-600 dark:text-gray-400">
            {priorities.length} {priorities.length === 1 ? 'prioridad' : 'prioridades'}
          </span>
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {columns.map(column => {
            const columnPriorities = priorities.filter(p => p.status === column.id);

            return (
              <div key={column.id} className="flex flex-col">
                <div className={`${column.headerColor} text-white rounded-t-lg px-4 py-3 flex items-center justify-between`}>
                  <h3 className="font-bold text-sm">{column.title}</h3>
                  <span className="bg-white bg-opacity-30 rounded-full px-2 py-1 text-xs font-semibold">
                    {columnPriorities.length}
                  </span>
                </div>

                <Droppable droppableId={`${weekId}-${column.id}`}>
                  {(provided, snapshot) => (
                    <div
                      ref={provided.innerRef}
                      {...provided.droppableProps}
                      className={`
                        ${column.color} rounded-b-lg p-3 min-h-[500px] flex-1
                        ${snapshot.isDraggingOver ? 'ring-2 ring-blue-400 bg-opacity-80' : ''}
                        transition-all duration-200
                      `}
                    >
                      {columnPriorities.map((priority, index) => (
                        <KanbanCard
                          key={priority._id}
                          priority={priority}
                          index={index}
                          onViewDetails={setSelectedPriorityForComments}
                        />
                      ))}
                      {provided.placeholder}

                      {columnPriorities.length === 0 && (
                        <div className="text-center text-gray-400 dark:text-gray-500 text-sm mt-8">
                          No hay prioridades
                        </div>
                      )}
                    </div>
                  )}
                </Droppable>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Navbar />
      <div className="pt-16 main-content px-4 py-6 max-w-7xl mx-auto">
        <DragDropContext
          onDragStart={handleDragStart}
          onDragUpdate={handleDragUpdate}
          onDragEnd={(result) => {
            handleDragEnd(result);
            resetScroll();
          }}
        >
          <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
              <h1 className="text-3xl font-bold text-gray-800 dark:text-gray-100">
                📊 Vista Kanban - Prioridades
              </h1>
              <button
                onClick={() => router.push('/priorities')}
                className="bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-700 transition"
              >
                📋 Ver Lista
              </button>
            </div>

            {/* Current Week Board */}
            {renderWeekBoard('current', `Semana Actual (${getWeekLabel(currentWeek.monday)})`, currentWeekPriorities)}

            {/* Next Week Board */}
            {renderWeekBoard('next', `Siguiente Semana (${getWeekLabel(nextWeek.monday)})`, nextWeekPriorities)}
          </div>
        </DragDropContext>
      </div>

      {/* Modal de Detalles */}
      {selectedPriorityForComments && selectedPriorityForComments._id && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 dark:bg-opacity-70 flex items-center justify-center z-50 p-4"
          onClick={() => setSelectedPriorityForComments(null)}
        >
          <div
            className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-3xl w-full max-h-[80vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6">
              {/* Header */}
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-100 mb-2">
                    {selectedPriorityForComments.title}
                  </h2>
                  <div className="flex items-center gap-3 flex-wrap">
                    <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                      selectedPriorityForComments.status === 'COMPLETADO' ? 'bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300' :
                      selectedPriorityForComments.status === 'EN_TIEMPO' ? 'bg-green-100 dark:bg-green-900/50 text-green-700 dark:text-green-300' :
                      selectedPriorityForComments.status === 'EN_RIESGO' ? 'bg-yellow-100 dark:bg-yellow-900/50 text-yellow-700 dark:text-yellow-300' :
                      'bg-red-100 dark:bg-red-900/50 text-red-700 dark:text-red-300'
                    }`}>
                      {selectedPriorityForComments.status === 'EN_TIEMPO' ? 'En Tiempo' :
                       selectedPriorityForComments.status === 'EN_RIESGO' ? 'En Riesgo' :
                       selectedPriorityForComments.status === 'BLOQUEADO' ? 'Bloqueado' :
                       selectedPriorityForComments.status === 'COMPLETADO' ? 'Completado' :
                       selectedPriorityForComments.status}
                    </span>
                    {selectedPriorityForComments.initiatives && selectedPriorityForComments.initiatives.map((initiative: Initiative) => (
                      <span key={initiative._id} className="text-sm text-gray-500 dark:text-gray-400">
                        <span style={{ color: initiative.color }}>●</span> {initiative.name}
                      </span>
                    ))}
                  </div>
                </div>
                <button
                  onClick={() => setSelectedPriorityForComments(null)}
                  className="text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 text-2xl font-bold"
                >
                  ×
                </button>
              </div>

              {/* Descripción */}
              <div className="mb-6">
                <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Descripción</h3>
                <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                  {selectedPriorityForComments.description ? (
                    <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap">{selectedPriorityForComments.description}</p>
                  ) : (
                    <p className="text-gray-400 dark:text-gray-500 italic">Sin descripción</p>
                  )}
                </div>
              </div>

              {/* Información Adicional */}
              <div className="grid grid-cols-2 gap-4 mb-6">
                <div>
                  <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Iniciativa(s)</h3>
                  <div className="flex flex-wrap gap-2">
                    {selectedPriorityForComments.initiatives && selectedPriorityForComments.initiatives.length > 0 ? (
                      selectedPriorityForComments.initiatives.map((initiative: Initiative) => (
                        <div key={initiative._id} className="flex items-center gap-1 bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded">
                          <div
                            className="w-2 h-2 rounded-full"
                            style={{ backgroundColor: initiative.color }}
                          ></div>
                          <span className="text-gray-800 dark:text-gray-200 text-sm">{initiative.name}</span>
                        </div>
                      ))
                    ) : (
                      <p className="text-gray-600 dark:text-gray-400 text-sm">No especificado</p>
                    )}
                  </div>
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Semana</h3>
                  <p className="text-gray-800 dark:text-gray-200">
                    {new Date(selectedPriorityForComments.weekStart).toLocaleDateString('es-MX')} - {new Date(selectedPriorityForComments.weekEnd).toLocaleDateString('es-MX')}
                  </p>
                </div>
                <div className="col-span-2">
                  <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Avance</h3>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 bg-gray-200 dark:bg-gray-600 rounded-full h-3">
                      <div
                        className="bg-blue-600 dark:bg-blue-500 h-3 rounded-full transition-all"
                        style={{ width: `${selectedPriorityForComments.completionPercentage}%` }}
                      ></div>
                    </div>
                    <span className="font-semibold text-gray-800 dark:text-gray-200">{selectedPriorityForComments.completionPercentage}%</span>
                  </div>
                </div>
              </div>

              {/* Lista de Tareas */}
              {selectedPriorityForComments.checklist && selectedPriorityForComments.checklist.length > 0 && (
                <div className="mb-6">
                  <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3 flex items-center gap-2">
                    ✓ Lista de Tareas
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      ({selectedPriorityForComments.checklist.filter(item => item.completed).length}/{selectedPriorityForComments.checklist.length})
                    </span>
                  </h3>
                  <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                    <div className="space-y-2">
                      {selectedPriorityForComments.checklist.map((item, index) => (
                        <div
                          key={item._id || index}
                          className={`flex items-start gap-3 p-2 rounded ${
                            item.completed ? 'bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800' : 'bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600'
                          }`}
                        >
                          <div className={`mt-0.5 flex-shrink-0 w-5 h-5 rounded border-2 flex items-center justify-center ${
                            item.completed ? 'bg-green-500 dark:bg-green-600 border-green-500 dark:border-green-600' : 'border-gray-300 dark:border-gray-600'
                          }`}>
                            {item.completed && (
                              <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                              </svg>
                            )}
                          </div>
                          <div className="flex-1">
                            <span className={`text-sm ${
                              item.completed ? 'line-through text-gray-500 dark:text-gray-400' : 'text-gray-800 dark:text-gray-200'
                            }`}>
                              {item.text}
                            </span>
                            {item.completed && item.completedHours && (
                              <div className="mt-1 text-xs text-gray-600 dark:text-gray-400">
                                ⏱️ {item.completedHours} hrs trabajadas
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Enlaces de Evidencia */}
              {selectedPriorityForComments.evidenceLinks && selectedPriorityForComments.evidenceLinks.length > 0 && (
                <div className="mb-6">
                  <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3 flex items-center gap-2">
                    🔗 Enlaces de Evidencia
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      ({selectedPriorityForComments.evidenceLinks.length})
                    </span>
                  </h3>
                  <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                    <div className="space-y-2">
                      {selectedPriorityForComments.evidenceLinks.map((link, index) => (
                        <a
                          key={link._id || index}
                          href={link.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-3 p-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/20 hover:border-blue-300 dark:hover:border-blue-700 transition group"
                        >
                          <div className="flex-1 min-w-0">
                            <div className="font-medium text-sm text-gray-800 dark:text-gray-200 group-hover:text-blue-700 dark:group-hover:text-blue-400 truncate">
                              {link.title}
                            </div>
                            <div className="text-xs text-gray-500 dark:text-gray-400 truncate">
                              {link.url}
                            </div>
                          </div>
                          <svg className="w-5 h-5 text-gray-400 dark:text-gray-500 group-hover:text-blue-600 dark:group-hover:text-blue-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                          </svg>
                        </a>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Comments Section */}
              <div className="mb-6">
                <CommentsSection priorityId={selectedPriorityForComments._id} />
              </div>

              {/* Botón Cerrar */}
              <div className="flex justify-end">
                <button
                  onClick={() => setSelectedPriorityForComments(null)}
                  className="bg-blue-600 dark:bg-blue-700 text-white px-6 py-2 rounded-lg hover:bg-blue-700 dark:hover:bg-blue-600 transition font-semibold"
                >
                  Cerrar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
