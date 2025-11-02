'use client';

export const dynamic = 'force-dynamic';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Navbar from '@/components/Navbar';
import { exportInitiatives } from '@/lib/exportToExcel';

interface Initiative {
  _id?: string;
  name: string;
  description?: string;
  color: string;
  order: number;
  isActive: boolean;
}

const COLORS = [
  { value: '#10b981', name: 'Verde' },
  { value: '#3b82f6', name: 'Azul' },
  { value: '#f59e0b', name: 'Naranja' },
  { value: '#8b5cf6', name: 'Morado' },
  { value: '#ec4899', name: 'Rosa' },
  { value: '#ef4444', name: 'Rojo' },
  { value: '#06b6d4', name: 'Cyan' },
  { value: '#84cc16', name: 'Lima' },
];

export default function AdminInitiativesPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [initiatives, setInitiatives] = useState<Initiative[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editingInitiative, setEditingInitiative] = useState<Initiative | null>(null);
  const [formData, setFormData] = useState<Initiative>({
    name: '',
    description: '',
    color: '#3B82F6',
    order: 0,
    isActive: true
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
      return;
    }

    if (status === 'authenticated') {
      if ((session.user as any).role !== 'ADMIN') {
        router.push('/dashboard');
        return;
      }
      loadInitiatives();
    }
  }, [status, session, router]);

  const loadInitiatives = async () => {
    try {
      const res = await fetch('/api/initiatives');
      const data = await res.json();
      setInitiatives(data.sort((a: Initiative, b: Initiative) => a.order - b.order));
    } catch (error) {
      console.error('Error loading initiatives:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleNew = () => {
    setFormData({
      name: '',
      description: '',
      color: '#3B82F6',
      order: initiatives.length + 1,
      isActive: true
    });
    setEditingInitiative(null);
    setShowForm(true);
  };

  const handleEdit = (initiative: Initiative) => {
    setFormData(initiative);
    setEditingInitiative(initiative);
    setShowForm(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      if (editingInitiative?._id) {
        const res = await fetch(`/api/initiatives/${editingInitiative._id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(formData)
        });

        if (!res.ok) throw new Error('Error updating initiative');
      } else {
        const res = await fetch('/api/initiatives', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(formData)
        });

        if (!res.ok) throw new Error('Error creating initiative');
      }

      await loadInitiatives();
      setShowForm(false);
      setEditingInitiative(null);
    } catch (error) {
      console.error('Error saving initiative:', error);
      alert('Error al guardar la iniciativa');
    }
  };

  const toggleActive = async (initiative: Initiative) => {
    try {
      const res = await fetch(`/api/initiatives/${initiative._id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...initiative, isActive: !initiative.isActive })
      });

      if (!res.ok) throw new Error('Error updating initiative');

      await loadInitiatives();
    } catch (error) {
      console.error('Error toggling initiative:', error);
      alert('Error al cambiar el estado');
    }
  };

  const handleDelete = async (initiative: Initiative) => {
    if (!confirm(`¿Estás seguro de eliminar la iniciativa ${initiative.name}?`)) return;

    try {
      const res = await fetch(`/api/initiatives/${initiative._id}`, {
        method: 'DELETE'
      });

      if (!res.ok) throw new Error('Error deleting initiative');

      await loadInitiatives();
    } catch (error) {
      console.error('Error deleting initiative:', error);
      alert('Error al eliminar la iniciativa');
    }
  };

  const moveInitiative = async (index: number, direction: 'up' | 'down') => {
    const newInitiatives = [...initiatives];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;

    if (targetIndex < 0 || targetIndex >= newInitiatives.length) return;

    [newInitiatives[index], newInitiatives[targetIndex]] = [newInitiatives[targetIndex], newInitiatives[index]];

    // Update order
    newInitiatives.forEach((init, idx) => {
      init.order = idx + 1;
    });

    // Save all
    try {
      await Promise.all(
        newInitiatives.map(init =>
          fetch(`/api/initiatives/${init._id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(init)
          })
        )
      );

      setInitiatives(newInitiatives);
    } catch (error) {
      console.error('Error reordering initiatives:', error);
      alert('Error al reordenar');
    }
  };

  const handleExport = () => {
    exportInitiatives(initiatives as any, 'Iniciativas_Estrategicas');
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

  if (!session || (session.user as any).role !== 'ADMIN') return null;

  const activeCount = initiatives.filter(i => i.isActive).length;

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="pt-16 main-content px-4 py-6 max-w-7xl mx-auto">
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-800">
                💡 Gestión de Iniciativas Estratégicas
              </h1>
              <p className="text-gray-600 mt-1">
                {activeCount} iniciativas activas • {initiatives.length} total
              </p>
            </div>
            <div className="flex space-x-3">
              <button
                onClick={handleExport}
                className="bg-green-600 text-white px-4 py-3 rounded-lg font-semibold hover:bg-green-700 transition shadow-md"
                title="Exportar a Excel"
              >
                📥 Exportar a Excel
              </button>
              <button
                onClick={handleNew}
                className="bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-700 transition shadow-md"
              >
                + Nueva Iniciativa
              </button>
            </div>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-start">
              <span className="text-2xl mr-3">ℹ️</span>
              <div className="text-sm text-blue-800">
                <strong>¿Qué son las iniciativas estratégicas?</strong>
                <p className="mt-1">
                  Son los ejes de acción principales de la empresa. Todas las prioridades deben estar
                  alineadas a al menos una iniciativa para asegurar que el trabajo está enfocado en lo estratégico.
                  Todas las iniciativas son independientes e igualmente importantes.
                </p>
              </div>
            </div>
          </div>

          {showForm ? (
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-2xl font-bold text-gray-800 mb-6">
                {editingInitiative ? 'Editar Iniciativa' : 'Nueva Iniciativa Estratégica'}
              </h2>
              <form onSubmit={handleSave} className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Nombre de la Iniciativa *
                  </label>
                  <input
                    type="text"
                    required
                    maxLength={100}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Ej: Generación de ingresos"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Descripción
                  </label>
                  <textarea
                    rows={3}
                    maxLength={500}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Describe el objetivo y alcance..."
                  ></textarea>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-3">
                    Color Identificador
                  </label>
                  <div className="grid grid-cols-8 gap-3">
                    {COLORS.map(color => (
                      <button
                        key={color.value}
                        type="button"
                        onClick={() => setFormData({ ...formData, color: color.value })}
                        className={`w-full h-12 rounded-lg transition-all hover:scale-110 ${
                          formData.color === color.value ? 'ring-4 ring-offset-2 ring-blue-500 shadow-lg' : 'shadow-md'
                        }`}
                        style={{ backgroundColor: color.value }}
                        title={color.name}
                      >
                        {formData.color === color.value && <span className="text-white text-lg">✓</span>}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      className="sr-only peer"
                      checked={formData.isActive}
                      onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                    />
                    <div className="w-14 h-7 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-blue-600"></div>
                    <span className="ml-3 text-sm font-medium text-gray-700">
                      {formData.isActive ? '✓ Iniciativa activa' : '✗ Iniciativa inactiva'}
                    </span>
                  </label>
                </div>

                <div className="flex justify-end space-x-4 pt-4 border-t">
                  <button
                    type="button"
                    onClick={() => {
                      setShowForm(false);
                      setEditingInitiative(null);
                    }}
                    className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition shadow-md"
                  >
                    💾 {editingInitiative ? 'Actualizar Iniciativa' : 'Crear Iniciativa'}
                  </button>
                </div>
              </form>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {initiatives.map((initiative, index) => (
                <div
                  key={initiative._id}
                  className="bg-white rounded-lg shadow-md p-6 border-l-4"
                  style={{ borderColor: initiative.color }}
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-start flex-1">
                      <div className="flex-1">
                        <div className="flex items-center space-x-3 mb-2">
                          <div
                            className="w-3 h-3 rounded-full"
                            style={{ backgroundColor: initiative.color }}
                          ></div>
                          <h3 className="text-lg font-bold text-gray-800">{initiative.name}</h3>
                        </div>
                        {initiative.description && (
                          <p className="text-sm text-gray-600 mt-2">{initiative.description}</p>
                        )}
                      </div>

                      <button
                        onClick={() => toggleActive(initiative)}
                        className={`px-3 py-1 rounded-full text-xs font-semibold transition-all ml-3 ${
                          initiative.isActive
                            ? 'bg-green-100 text-green-800 hover:bg-green-200'
                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                        }`}
                      >
                        {initiative.isActive ? 'Activa' : 'Inactiva'}
                      </button>
                    </div>
                  </div>

                  <div className="flex justify-end space-x-2 pt-3 border-t">
                    <button
                      onClick={() => handleEdit(initiative)}
                      className="text-blue-600 hover:bg-blue-50 px-4 py-2 rounded-lg transition"
                    >
                      ✏️ Editar
                    </button>
                    <button
                      onClick={() => handleDelete(initiative)}
                      className="text-red-600 hover:bg-red-50 px-4 py-2 rounded-lg transition"
                    >
                      🗑️ Eliminar
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
