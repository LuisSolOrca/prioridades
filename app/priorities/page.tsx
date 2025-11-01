'use client';

export const dynamic = 'force-dynamic';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Navbar from '@/components/Navbar';
import StatusBadge from '@/components/StatusBadge';
import { getWeekDates, getWeekLabel } from '@/lib/utils';

interface Initiative {
  _id: string;
  name: string;
  color: string;
  isActive: boolean;
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
  initiativeId: string;
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
    initiativeId: '',
    completionPercentage: 0,
    status: 'EN_TIEMPO',
    userId: '',
    weekStart: '',
    weekEnd: ''
  });
  const [loading, setLoading] = useState(true);
  const currentWeek = getWeekDates();

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
      const [initiativesRes, prioritiesRes] = await Promise.all([
        fetch('/api/initiatives?activeOnly=true'),
        fetch(`/api/priorities?userId=${(session!.user as any).id}&weekStart=${currentWeek.monday.toISOString()}&weekEnd=${currentWeek.friday.toISOString()}`)
      ]);

      const [initiativesData, prioritiesData] = await Promise.all([
        initiativesRes.json(),
        prioritiesRes.json()
      ]);

      setInitiatives(initiativesData);
      setPriorities(prioritiesData);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleNew = () => {
    setFormData({
      title: '',
      description: '',
      initiativeId: '',
      completionPercentage: 0,
      status: 'EN_TIEMPO',
      userId: (session!.user as any).id,
      weekStart: currentWeek.monday.toISOString(),
      weekEnd: currentWeek.friday.toISOString()
    });
    setEditingPriority(null);
    setShowForm(true);
  };

  const handleEdit = (priority: Priority) => {
    setFormData(priority);
    setEditingPriority(priority);
    setShowForm(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      if (editingPriority?._id) {
        // Update
        const res = await fetch(`/api/priorities/${editingPriority._id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(formData)
        });

        if (!res.ok) throw new Error('Error updating priority');
      } else {
        // Create
        const res = await fetch('/api/priorities', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(formData)
        });

        if (!res.ok) throw new Error('Error creating priority');
      }

      await loadData();
      setShowForm(false);
      setEditingPriority(null);
    } catch (error) {
      console.error('Error saving priority:', error);
      alert('Error al guardar la prioridad');
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

  const hasMoreThanFive = priorities.length > 5;

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="container mx-auto px-4 py-6">
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h1 className="text-3xl font-bold text-gray-800">
              📋 Mis Prioridades
            </h1>
            <button
              onClick={handleNew}
              className="bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-700 transition"
            >
              + Nueva Prioridad
            </button>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-center">
              <span className="text-2xl mr-3">ℹ️</span>
              <div>
                <div className="font-semibold text-blue-900">Semana actual: {getWeekLabel(currentWeek.monday)}</div>
                <div className="text-sm text-blue-700">
                  {priorities.length} prioridades asignadas
                </div>
              </div>
            </div>
          </div>

          {hasMoreThanFive && (
            <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 rounded-lg">
              <div className="flex items-start">
                <span className="text-yellow-600 text-xl mr-3 mt-1">⚠️</span>
                <div>
                  <h3 className="font-bold text-yellow-900 mb-1">
                    Advertencia: Más de 5 prioridades
                  </h3>
                  <p className="text-sm text-yellow-700">
                    Tienes {priorities.length} prioridades esta semana. Se recomienda mantener máximo 5 para asegurar el foco y cumplimiento.
                  </p>
                </div>
              </div>
            </div>
          )}

          {showForm ? (
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-2xl font-bold text-gray-800 mb-6">
                {editingPriority ? 'Editar Prioridad' : 'Nueva Prioridad'}
              </h2>
              <form onSubmit={handleSave} className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Título de la Prioridad *
                  </label>
                  <input
                    type="text"
                    required
                    maxLength={150}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    placeholder="Ej: Aumentar ventas del producto X en 15%"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Descripción Detallada
                  </label>
                  <textarea
                    rows={4}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Describe los pasos específicos y resultados esperados..."
                  ></textarea>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Iniciativa Estratégica *
                  </label>
                  <select
                    required
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    value={formData.initiativeId}
                    onChange={(e) => setFormData({ ...formData, initiativeId: e.target.value })}
                  >
                    <option value="">-- Seleccionar Iniciativa --</option>
                    {initiatives.map(initiative => (
                      <option key={initiative._id} value={initiative._id}>
                        {initiative.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Estado
                    </label>
                    <select
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      value={formData.status}
                      onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                    >
                      <option value="EN_TIEMPO">En Tiempo</option>
                      <option value="EN_RIESGO">En Riesgo</option>
                      <option value="BLOQUEADO">Bloqueado</option>
                      <option value="COMPLETADO">Completado</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Porcentaje Completado: {formData.completionPercentage}%
                    </label>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      step="5"
                      className="w-full"
                      value={formData.completionPercentage}
                      onChange={(e) => {
                        const percentage = parseInt(e.target.value);
                        setFormData({
                          ...formData,
                          completionPercentage: percentage,
                          status: percentage === 100 ? 'COMPLETADO' : formData.status
                        });
                      }}
                    />
                  </div>
                </div>

                <div className="flex justify-end space-x-4 pt-4">
                  <button
                    type="button"
                    onClick={() => {
                      setShowForm(false);
                      setEditingPriority(null);
                    }}
                    className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
                  >
                    💾 Guardar Prioridad
                  </button>
                </div>
              </form>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4">
              {priorities.length === 0 ? (
                <div className="bg-white rounded-lg shadow-md p-12 text-center">
                  <div className="text-6xl mb-4">📋</div>
                  <h3 className="text-xl font-semibold text-gray-600 mb-2">No tienes prioridades esta semana</h3>
                  <p className="text-gray-500">Comienza agregando tu primera prioridad</p>
                </div>
              ) : (
                priorities.map(priority => {
                  const initiative = initiatives.find(i => i._id === priority.initiativeId);
                  return (
                    <div key={priority._id} className="bg-white rounded-lg shadow-md p-6 border-l-4" style={{ borderColor: initiative?.color }}>
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
                          <div className="flex items-center space-x-4 text-sm">
                            <span className="text-gray-600">
                              <span style={{ color: initiative?.color }}>●</span> {initiative?.name}
                            </span>
                            <StatusBadge status={priority.status} />
                          </div>
                        </div>
                        <div className="flex space-x-2 ml-4">
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
      </div>
    </div>
  );
}
