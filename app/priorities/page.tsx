'use client';

export const dynamic = 'force-dynamic';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Navbar from '@/components/Navbar';
import StatusBadge from '@/components/StatusBadge';
import CommentsSection from '@/components/CommentsSection';
import PriorityFormModal from '@/components/PriorityFormModal';
import { getWeekDates, getWeekLabel } from '@/lib/utils';
import { exportPriorities } from '@/lib/exportToExcel';

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
  initiativeId?: string; // Mantener para compatibilidad
  initiativeIds?: string[]; // Nuevo campo para múltiples iniciativas
  checklist?: ChecklistItem[];
  evidenceLinks?: EvidenceLink[];
  wasEdited?: boolean;
}

export default function PrioritiesPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [initiatives, setInitiatives] = useState<Initiative[]>([]);
  const [priorities, setPriorities] = useState<Priority[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editingPriority, setEditingPriority] = useState<Priority | null>(null);
  const [formData, setFormData] = useState<Priority>({
    title: '',
    description: '',
    initiativeIds: [],
    completionPercentage: 0,
    status: 'EN_TIEMPO',
    userId: '',
    weekStart: '',
    weekEnd: '',
    checklist: [],
    evidenceLinks: []
  });
  const [loading, setLoading] = useState(true);
  const [selectedWeekOffset, setSelectedWeekOffset] = useState(0); // 0 = current week, 1 = next week
  const [collapsedWeeks, setCollapsedWeeks] = useState<Set<string>>(new Set());
  const [selectedPriorityForComments, setSelectedPriorityForComments] = useState<Priority | null>(null);
  const [commentCounts, setCommentCounts] = useState<{ [key: string]: number }>({});
  const currentWeek = getWeekDates();
  const nextWeek = getWeekDates(new Date(currentWeek.monday.getTime() + 7 * 24 * 60 * 60 * 1000));

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
    }
    if (status === 'authenticated' && session) {
      loadData();
    }
  }, [status, session, router]);

  const loadData = async () => {
    try {
      setLoading(true);

      // Cargar prioridades de la semana actual y la siguiente
      const [initiativesRes, currentWeekPrioritiesRes, nextWeekPrioritiesRes] = await Promise.all([
        fetch('/api/initiatives?activeOnly=true'),
        fetch(`/api/priorities?userId=${(session!.user as any).id}&weekStart=${currentWeek.monday.toISOString()}&weekEnd=${currentWeek.friday.toISOString()}`),
        fetch(`/api/priorities?userId=${(session!.user as any).id}&weekStart=${nextWeek.monday.toISOString()}&weekEnd=${nextWeek.friday.toISOString()}`)
      ]);

      const [initiativesData, currentWeekPriorities, nextWeekPriorities] = await Promise.all([
        initiativesRes.json(),
        currentWeekPrioritiesRes.json(),
        nextWeekPrioritiesRes.json()
      ]);

      setInitiatives(initiativesData);
      // Combinar prioridades de ambas semanas
      const allPriorities = [...currentWeekPriorities, ...nextWeekPriorities];
      setPriorities(allPriorities);

      // Cargar conteos de comentarios
      await loadCommentCounts(allPriorities);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadCommentCounts = async (prioritiesToLoad: Priority[]) => {
    try {
      const priorityIds = prioritiesToLoad
        .filter(p => p._id)
        .map(p => p._id!)
        .join(',');

      if (!priorityIds) {
        setCommentCounts({});
        return;
      }

      const response = await fetch(`/api/comments/counts?priorityIds=${priorityIds}`);
      if (!response.ok) throw new Error('Error loading comment counts');

      const counts = await response.json();
      setCommentCounts(counts);
    } catch (error) {
      console.error('Error loading comment counts:', error);
      setCommentCounts({});
    }
  };

  const handleNew = () => {
    setFormData({
      title: '',
      description: '',
      initiativeIds: [],
      completionPercentage: 0,
      status: 'EN_TIEMPO',
      userId: (session!.user as any).id,
      weekStart: nextWeek.monday.toISOString(),
      weekEnd: nextWeek.friday.toISOString(),
      checklist: [],
      evidenceLinks: []
    });
    setSelectedWeekOffset(1); // Cambiar a siguiente semana por defecto
    setEditingPriority(null);
    setShowForm(true);
  };

  const handleEdit = (priority: Priority) => {
    // Compatibilidad: convertir initiativeId a initiativeIds si existe
    const editFormData = {
      ...priority,
      initiativeIds: priority.initiativeIds || (priority.initiativeId ? [priority.initiativeId] : [])
    };
    setFormData(editFormData);
    setEditingPriority(priority);
    setShowForm(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validar que se haya seleccionado al menos una iniciativa
    if (!formData.initiativeIds || formData.initiativeIds.length === 0) {
      alert('Debes seleccionar al menos una iniciativa estratégica');
      return;
    }

    try {
      if (editingPriority?._id) {
        // Update
        const res = await fetch(`/api/priorities/${editingPriority._id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(formData)
        });

        if (!res.ok) {
          const error = await res.json();
          throw new Error(error.error || 'Error updating priority');
        }
      } else {
        // Create
        const res = await fetch('/api/priorities', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(formData)
        });

        if (!res.ok) {
          const error = await res.json();
          throw new Error(error.error || 'Error creating priority');
        }
      }

      await loadData();
      setShowForm(false);
      setEditingPriority(null);
    } catch (error: any) {
      console.error('Error saving priority:', error);
      alert(error.message || 'Error al guardar la prioridad');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('¿Estás seguro de eliminar esta prioridad?')) return;

    try {
      const res = await fetch(`/api/priorities/${id}`, {
        method: 'DELETE'
      });

      if (!res.ok) throw new Error('Error deleting priority');

      await loadData();
    } catch (error) {
      console.error('Error deleting priority:', error);
      alert('Error al eliminar la prioridad');
    }
  };

  const handleExport = () => {
    const users = [{ _id: (session!.user as any).id, name: session!.user?.name || 'Usuario', email: session!.user?.email || '' }];
    const fileName = `Mis_Prioridades_${getWeekLabel(currentWeek.monday).replace(/\s/g, '_')}_y_Siguiente`;
    exportPriorities(priorities, users, initiatives, fileName);
  };

  const toggleWeekCollapse = (weekKey: string) => {
    setCollapsedWeeks(prev => {
      const newSet = new Set(prev);
      if (newSet.has(weekKey)) {
        newSet.delete(weekKey);
      } else {
        newSet.add(weekKey);
      }
      return newSet;
    });
  };

  if (status === 'loading' || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="text-4xl mb-4">⏳</div>
          <div className="text-gray-600">Cargando...</div>
        </div>
      </div>
    );
  }

  if (!session) return null;

  // Separar prioridades por semana
  const currentWeekPriorities = priorities.filter(p => {
    const pWeekStart = new Date(p.weekStart);
    return pWeekStart >= currentWeek.monday && pWeekStart <= currentWeek.friday;
  });

  const nextWeekPriorities = priorities.filter(p => {
    const pWeekStart = new Date(p.weekStart);
    return pWeekStart >= nextWeek.monday && pWeekStart <= nextWeek.friday;
  });

  const activePriorities = currentWeekPriorities.filter(p => p.status !== 'COMPLETADO');
  const hasMoreThanFive = activePriorities.length > 5;
  const currentWeekTotal = currentWeekPriorities.length;
  const nextWeekTotal = nextWeekPriorities.length;
  const currentWeekAtLimit = currentWeekTotal >= 10;
  const nextWeekAtLimit = nextWeekTotal >= 10;

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="container mx-auto px-4 py-6">
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h1 className="text-3xl font-bold text-gray-800">
              📋 Mis Prioridades
            </h1>
            <div className="flex space-x-3">
              <button
                onClick={handleExport}
                className="bg-green-600 text-white px-4 py-3 rounded-lg font-semibold hover:bg-green-700 transition"
                title="Exportar a Excel"
              >
                📥 Exportar a Excel
              </button>
              <button
                onClick={() => router.push('/priorities-kanban')}
                className="bg-purple-600 text-white px-4 py-3 rounded-lg font-semibold hover:bg-purple-700 transition"
                title="Ver Vista Kanban"
              >
                📊 Vista Kanban
              </button>
              <button
                onClick={handleNew}
                className="bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-700 transition"
              >
                + Nueva Prioridad
              </button>
            </div>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-center">
              <span className="text-2xl mr-3">ℹ️</span>
              <div>
                <div className="font-semibold text-blue-900">Semana actual: {getWeekLabel(currentWeek.monday)}</div>
                <div className="text-sm text-blue-700">
                  {currentWeekPriorities.length}/10 prioridades esta semana • {nextWeekPriorities.length}/10 prioridades siguiente semana
                </div>
              </div>
            </div>
          </div>

          {(currentWeekAtLimit || nextWeekAtLimit) && (
            <div className="bg-red-50 border-l-4 border-red-400 p-4 rounded-lg">
              <div className="flex items-start">
                <span className="text-red-600 text-xl mr-3 mt-1">🚫</span>
                <div>
                  <h3 className="font-bold text-red-900 mb-1">
                    Límite Alcanzado
                  </h3>
                  <p className="text-sm text-red-700">
                    {currentWeekAtLimit && 'Has alcanzado el límite de 10 prioridades para la semana actual.'}
                    {currentWeekAtLimit && nextWeekAtLimit && ' '}
                    {nextWeekAtLimit && 'Has alcanzado el límite de 10 prioridades para la siguiente semana.'}
                    {' '}Para agregar una nueva prioridad, elimina alguna existente.
                  </p>
                </div>
              </div>
            </div>
          )}

          {hasMoreThanFive && !currentWeekAtLimit && (
            <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 rounded-lg">
              <div className="flex items-start">
                <span className="text-yellow-600 text-xl mr-3 mt-1">⚠️</span>
                <div>
                  <h3 className="font-bold text-yellow-900 mb-1">
                    Advertencia: Más de 5 prioridades activas
                  </h3>
                  <p className="text-sm text-yellow-700">
                    Tienes {activePriorities.length} prioridades activas esta semana (sin contar las completadas). Se recomienda mantener máximo 5 para asegurar el foco y cumplimiento. El límite máximo es de 10 prioridades por semana.
                  </p>
                </div>
              </div>
            </div>
          )}

          {!showForm && (
            <div className="space-y-6">
              {/* Semana Actual */}
              <div>
                <div
                  className="flex items-center justify-between mb-4 cursor-pointer hover:bg-gray-100 p-2 rounded-lg transition"
                  onClick={() => toggleWeekCollapse('current')}
                >
                  <h2 className="text-xl font-bold text-gray-800 flex items-center">
                    <span className="mr-2">{collapsedWeeks.has('current') ? '▶' : '▼'}</span>
                    📅 Semana Actual ({getWeekLabel(currentWeek.monday)})
                    <span className="ml-3 text-sm font-normal text-gray-600">
                      {currentWeekPriorities.length} {currentWeekPriorities.length === 1 ? 'prioridad' : 'prioridades'}
                    </span>
                  </h2>
                </div>
                {!collapsedWeeks.has('current') && (
                  <div className="grid grid-cols-1 gap-4">
                    {currentWeekPriorities.length === 0 ? (
                      <div className="bg-white rounded-lg shadow-md p-8 text-center">
                        <div className="text-4xl mb-2">📋</div>
                        <p className="text-gray-500">No tienes prioridades esta semana</p>
                      </div>
                    ) : (
                    currentWeekPriorities.map(priority => {
                      // Obtener iniciativas (compatibilidad con ambos campos)
                      const priorityInitiativeIds = priority.initiativeIds || (priority.initiativeId ? [priority.initiativeId] : []);
                      const priorityInitiatives = priorityInitiativeIds
                        .map(id => initiatives.find(i => i._id === id))
                        .filter((init): init is Initiative => init !== undefined);
                      const primaryInitiative = priorityInitiatives[0];

                      return (
                        <div key={priority._id} className="bg-white rounded-lg shadow-md p-6 border-l-4" style={{ borderColor: primaryInitiative?.color || '#ccc' }}>
                          <div className="flex items-start justify-between mb-4">
                            <div className="flex-1">
                              <div className="flex items-center space-x-2 mb-2">
                                <h3 className="text-lg font-semibold text-gray-800">{priority.title}</h3>
                                {priority.wasEdited && (
                                  <span className="bg-yellow-100 text-yellow-800 text-xs px-2 py-1 rounded">
                                    ✏️ Editado
                                  </span>
                                )}
                              </div>
                              {priority.description && (
                                <p className="text-sm text-gray-600 mb-3">{priority.description}</p>
                              )}
                              <div className="flex items-center flex-wrap gap-2 text-sm mb-2">
                                {priorityInitiatives.map(initiative => (
                                  <span key={initiative._id} className="inline-flex items-center space-x-1 bg-gray-100 px-2 py-1 rounded">
                                    <span style={{ color: initiative.color }}>●</span>
                                    <span className="text-gray-700">{initiative.name}</span>
                                  </span>
                                ))}
                              </div>
                              <div className="flex items-center space-x-4 text-sm">
                                <StatusBadge status={priority.status} />
                              </div>
                            </div>
                            <div className="flex space-x-2 ml-4">
                              <button
                                onClick={() => setSelectedPriorityForComments(priority)}
                                className="text-purple-600 hover:bg-purple-50 w-10 h-10 rounded-lg transition relative"
                                title="Ver comentarios"
                              >
                                💬
                                {priority._id && commentCounts[priority._id] > 0 && (
                                  <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center" style={{ zIndex: 10 }}>
                                    {commentCounts[priority._id]}
                                  </span>
                                )}
                              </button>
                              {priority.status === 'COMPLETADO' ? (
                                <div className="flex items-center space-x-2">
                                  <span className="text-green-600 text-xs font-medium bg-green-50 px-3 py-2 rounded-lg">
                                    ✓ Completado (Solo lectura)
                                  </span>
                                </div>
                              ) : (
                                <>
                                  <button
                                    onClick={() => handleEdit(priority)}
                                    className="text-blue-600 hover:bg-blue-50 w-10 h-10 rounded-lg transition"
                                    title="Editar prioridad"
                                  >
                                    ✏️
                                  </button>
                                  <button
                                    onClick={() => handleDelete(priority._id!)}
                                    className="text-red-600 hover:bg-red-50 w-10 h-10 rounded-lg transition"
                                    title="Eliminar prioridad"
                                  >
                                    🗑️
                                  </button>
                                </>
                              )}
                            </div>
                          </div>

                          <div className="space-y-3">
                            <div>
                              <div className="flex items-center justify-between text-sm text-gray-600 mb-2">
                                <span className="font-medium">Porcentaje de Completado</span>
                                <span className="text-lg font-bold text-gray-800">{priority.completionPercentage}%</span>
                              </div>
                              <div className="w-full bg-gray-200 rounded-full h-3">
                                <div
                                  className="bg-blue-600 h-3 rounded-full transition-all"
                                  style={{ width: `${priority.completionPercentage}%` }}
                                ></div>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                      })
                    )}
                  </div>
                )}
              </div>

              {/* Siguiente Semana */}
              <div>
                <div
                  className="flex items-center justify-between mb-4 cursor-pointer hover:bg-gray-100 p-2 rounded-lg transition"
                  onClick={() => toggleWeekCollapse('next')}
                >
                  <h2 className="text-xl font-bold text-gray-800 flex items-center">
                    <span className="mr-2">{collapsedWeeks.has('next') ? '▶' : '▼'}</span>
                    📅 Siguiente Semana ({getWeekLabel(nextWeek.monday)})
                    <span className="ml-3 text-sm font-normal text-gray-600">
                      {nextWeekPriorities.length} {nextWeekPriorities.length === 1 ? 'prioridad' : 'prioridades'}
                    </span>
                  </h2>
                </div>
                {!collapsedWeeks.has('next') && (
                  <div className="grid grid-cols-1 gap-4">
                    {nextWeekPriorities.length === 0 ? (
                      <div className="bg-white rounded-lg shadow-md p-8 text-center">
                        <div className="text-4xl mb-2">📋</div>
                        <p className="text-gray-500">No tienes prioridades planificadas para la siguiente semana</p>
                      </div>
                    ) : (
                    nextWeekPriorities.map(priority => {
                      // Obtener iniciativas (compatibilidad con ambos campos)
                      const priorityInitiativeIds = priority.initiativeIds || (priority.initiativeId ? [priority.initiativeId] : []);
                      const priorityInitiatives = priorityInitiativeIds
                        .map(id => initiatives.find(i => i._id === id))
                        .filter((init): init is Initiative => init !== undefined);
                      const primaryInitiative = priorityInitiatives[0];

                      return (
                        <div key={priority._id} className="bg-white rounded-lg shadow-md p-6 border-l-4" style={{ borderColor: primaryInitiative?.color || '#ccc' }}>
                          <div className="flex items-start justify-between mb-4">
                            <div className="flex-1">
                              <div className="flex items-center space-x-2 mb-2">
                                <h3 className="text-lg font-semibold text-gray-800">{priority.title}</h3>
                                {priority.wasEdited && (
                                  <span className="bg-yellow-100 text-yellow-800 text-xs px-2 py-1 rounded">
                                    ✏️ Editado
                                  </span>
                                )}
                              </div>
                              {priority.description && (
                                <p className="text-sm text-gray-600 mb-3">{priority.description}</p>
                              )}
                              <div className="flex items-center flex-wrap gap-2 text-sm mb-2">
                                {priorityInitiatives.map(initiative => (
                                  <span key={initiative._id} className="inline-flex items-center space-x-1 bg-gray-100 px-2 py-1 rounded">
                                    <span style={{ color: initiative.color }}>●</span>
                                    <span className="text-gray-700">{initiative.name}</span>
                                  </span>
                                ))}
                              </div>
                              <div className="flex items-center space-x-4 text-sm">
                                <StatusBadge status={priority.status} />
                              </div>
                            </div>
                            <div className="flex space-x-2 ml-4">
                              <button
                                onClick={() => setSelectedPriorityForComments(priority)}
                                className="text-purple-600 hover:bg-purple-50 w-10 h-10 rounded-lg transition relative"
                                title="Ver comentarios"
                              >
                                💬
                                {priority._id && commentCounts[priority._id] > 0 && (
                                  <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center" style={{ zIndex: 10 }}>
                                    {commentCounts[priority._id]}
                                  </span>
                                )}
                              </button>
                              <button
                                onClick={() => handleEdit(priority)}
                                className="text-blue-600 hover:bg-blue-50 w-10 h-10 rounded-lg transition"
                                title="Editar prioridad"
                              >
                                ✏️
                              </button>
                              <button
                                onClick={() => handleDelete(priority._id!)}
                                className="text-red-600 hover:bg-red-50 w-10 h-10 rounded-lg transition"
                                title="Eliminar prioridad"
                              >
                                🗑️
                              </button>
                            </div>
                          </div>

                          <div className="space-y-3">
                            <div>
                              <div className="flex items-center justify-between text-sm text-gray-600 mb-2">
                                <span className="font-medium">Porcentaje de Completado</span>
                                <span className="text-lg font-bold text-gray-800">{priority.completionPercentage}%</span>
                              </div>
                              <div className="w-full bg-gray-200 rounded-full h-3">
                                <div
                                  className="bg-blue-600 h-3 rounded-full transition-all"
                                  style={{ width: `${priority.completionPercentage}%` }}
                                ></div>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                      })
                    )}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Modal de Formulario */}
      <PriorityFormModal
        isOpen={showForm}
        onClose={() => {
          setShowForm(false);
          setEditingPriority(null);
        }}
        formData={{
          title: formData.title,
          description: formData.description,
          initiativeIds: formData.initiativeIds || [],
          completionPercentage: formData.completionPercentage,
          status: formData.status,
          checklist: formData.checklist || [],
          evidenceLinks: formData.evidenceLinks || [],
          weekStart: formData.weekStart,
          weekEnd: formData.weekEnd
        }}
        setFormData={(data) => setFormData({ ...formData, ...data })}
        handleSubmit={handleSave}
        initiatives={initiatives}
        isEditing={!!editingPriority}
        weekLabel={editingPriority
          ? getWeekLabel(new Date(formData.weekStart))
          : selectedWeekOffset === 0
            ? getWeekLabel(currentWeek.monday)
            : getWeekLabel(nextWeek.monday)
        }
        currentWeek={currentWeek}
        nextWeek={nextWeek}
        selectedWeekOffset={selectedWeekOffset}
        setSelectedWeekOffset={setSelectedWeekOffset}
      />

      {/* Modal de Comentarios */}
      {selectedPriorityForComments && selectedPriorityForComments._id && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
          onClick={() => {
            setSelectedPriorityForComments(null);
            loadCommentCounts(priorities);
          }}
        >
          <div
            className="bg-white rounded-lg shadow-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6">
              {/* Header */}
              <div className="flex items-start justify-between mb-4 pb-4 border-b">
                <div className="flex-1">
                  <h2 className="text-2xl font-bold text-gray-800 mb-2">
                    {selectedPriorityForComments.title}
                  </h2>
                  {selectedPriorityForComments.description && (
                    <p className="text-sm text-gray-600 mb-3">
                      {selectedPriorityForComments.description}
                    </p>
                  )}
                  <div className="flex items-center gap-3 flex-wrap">
                    <StatusBadge status={selectedPriorityForComments.status} />
                    {(() => {
                      const priorityInitiativeIds = selectedPriorityForComments.initiativeIds ||
                        (selectedPriorityForComments.initiativeId ? [selectedPriorityForComments.initiativeId] : []);
                      const priorityInitiatives = priorityInitiativeIds
                        .map(id => initiatives.find(i => i._id === id))
                        .filter((init): init is Initiative => init !== undefined);
                      return priorityInitiatives.map(initiative => (
                        <span key={initiative._id} className="text-sm text-gray-500 inline-flex items-center">
                          <span style={{ color: initiative.color }}>●</span> {initiative.name}
                        </span>
                      ));
                    })()}
                  </div>
                </div>
                <button
                  onClick={() => {
                    setSelectedPriorityForComments(null);
                    loadCommentCounts(priorities);
                  }}
                  className="text-gray-400 hover:text-gray-600 text-2xl font-bold ml-4"
                >
                  ×
                </button>
              </div>

              {/* Comments Section */}
              <CommentsSection priorityId={selectedPriorityForComments._id} />

              {/* Close Button */}
              <div className="flex justify-end mt-6 pt-4 border-t">
                <button
                  onClick={() => {
                    setSelectedPriorityForComments(null);
                    loadCommentCounts(priorities);
                  }}
                  className="bg-gray-600 text-white px-6 py-2 rounded-lg hover:bg-gray-700 transition font-semibold"
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
