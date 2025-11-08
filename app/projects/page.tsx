'use client';

export const dynamic = 'force-dynamic';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Navbar from '@/components/Navbar';

interface Project {
  _id?: string;
  name: string;
  description?: string;
  isActive: boolean;
}

export default function ProjectsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [projects, setProjects] = useState<Project[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [formData, setFormData] = useState<Project>({
    name: '',
    description: '',
    isActive: true
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
      return;
    }

    if (status === 'authenticated') {
      // Solo permitir acceso a administradores
      if ((session?.user as any)?.role !== 'ADMIN') {
        router.push('/dashboard');
        return;
      }
      loadProjects();
    }
  }, [status, router, session]);

  const loadProjects = async () => {
    try {
      const res = await fetch('/api/projects');
      const data = await res.json();
      setProjects(data.sort((a: Project, b: Project) => a.name.localeCompare(b.name)));
    } catch (error) {
      console.error('Error loading projects:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleNew = () => {
    setFormData({
      name: '',
      description: '',
      isActive: true
    });
    setEditingProject(null);
    setShowForm(true);
  };

  const handleEdit = (project: Project) => {
    setFormData(project);
    setEditingProject(project);
    setShowForm(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      if (editingProject?._id) {
        const res = await fetch(`/api/projects/${editingProject._id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(formData)
        });

        if (!res.ok) {
          const error = await res.json();
          throw new Error(error.error || 'Error updating project');
        }
      } else {
        const res = await fetch('/api/projects', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(formData)
        });

        if (!res.ok) {
          const error = await res.json();
          throw new Error(error.error || 'Error creating project');
        }
      }

      await loadProjects();
      setShowForm(false);
      setEditingProject(null);
    } catch (error: any) {
      console.error('Error saving project:', error);
      alert(error.message || 'Error al guardar el proyecto');
    }
  };

  const toggleActive = async (project: Project) => {
    try {
      const res = await fetch(`/api/projects/${project._id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...project, isActive: !project.isActive })
      });

      if (!res.ok) throw new Error('Error updating project');

      await loadProjects();
    } catch (error) {
      console.error('Error toggling project:', error);
      alert('Error al cambiar el estado');
    }
  };

  const handleDelete = async (project: Project) => {
    if (!confirm(`¿Estás seguro de eliminar el proyecto ${project.name}?`)) return;

    try {
      const res = await fetch(`/api/projects/${project._id}`, {
        method: 'DELETE'
      });

      if (!res.ok) throw new Error('Error deleting project');

      await loadProjects();
    } catch (error) {
      console.error('Error deleting project:', error);
      alert('Error al eliminar el proyecto');
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

  // Verificar que el usuario sea admin
  if ((session.user as any)?.role !== 'ADMIN') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <div className="text-4xl mb-4">🔒</div>
          <div className="text-gray-600 dark:text-gray-400">Acceso denegado. Esta página es solo para administradores.</div>
        </div>
      </div>
    );
  }

  const activeCount = projects.filter(p => p.isActive).length;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Navbar />
      <div className="pt-16 main-content px-4 py-6 max-w-7xl mx-auto">
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-800 dark:text-gray-100">
                📁 Gestión de Proyectos
              </h1>
              <p className="text-gray-600 dark:text-gray-400 mt-1">
                {activeCount} proyectos activos • {projects.length} total
              </p>
            </div>
            <div className="flex space-x-3">
              <button
                onClick={handleNew}
                className="bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-700 transition shadow-md"
              >
                + Nuevo Proyecto
              </button>
            </div>
          </div>

          <div className="bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
            <div className="flex items-start">
              <span className="text-2xl mr-3">ℹ️</span>
              <div className="text-sm text-blue-800 dark:text-blue-200">
                <strong>Gestión de Proyectos</strong>
                <p className="mt-1">
                  Los proyectos permiten categorizar las prioridades y mejorar el seguimiento y organización del trabajo.
                  Administra la lista de proyectos para mantener actualizada la estructura organizacional.
                </p>
              </div>
            </div>
          </div>

          {showForm ? (
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
              <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-100 mb-6">
                {editingProject ? 'Editar Proyecto' : 'Nuevo Proyecto'}
              </h2>
              <form onSubmit={handleSave} className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Nombre del Proyecto *
                  </label>
                  <input
                    type="text"
                    required
                    maxLength={100}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Ej: Plataforma E-Commerce"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Descripción
                  </label>
                  <textarea
                    rows={3}
                    maxLength={500}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Información adicional sobre el proyecto..."
                  ></textarea>
                </div>

                <div>
                  <label className="flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      className="sr-only peer"
                      checked={formData.isActive}
                      onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                    />
                    <div className="relative w-14 h-7 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-blue-600 dark:bg-gray-700 dark:peer-checked:bg-blue-600"></div>
                    <span className="ml-3 text-sm font-medium text-gray-700 dark:text-gray-300">
                      {formData.isActive ? '✓ Proyecto activo' : '✗ Proyecto inactivo'}
                    </span>
                  </label>
                </div>

                <div className="flex justify-end space-x-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                  <button
                    type="button"
                    onClick={() => {
                      setShowForm(false);
                      setEditingProject(null);
                    }}
                    className="px-6 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition shadow-md"
                  >
                    💾 {editingProject ? 'Actualizar Proyecto' : 'Crear Proyecto'}
                  </button>
                </div>
              </form>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {projects.map((project) => (
                <div
                  key={project._id}
                  className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 border-l-4 border-purple-500"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-2">
                        <h3 className="text-lg font-bold text-gray-800 dark:text-gray-100">{project.name}</h3>
                      </div>
                      {project.description && (
                        <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">{project.description}</p>
                      )}
                    </div>

                    <button
                      onClick={() => toggleActive(project)}
                      className={`px-3 py-1 rounded-full text-xs font-semibold transition-all ml-3 ${
                        project.isActive
                          ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200 hover:bg-green-200 dark:hover:bg-green-900/50'
                          : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                      }`}
                    >
                      {project.isActive ? 'Activo' : 'Inactivo'}
                    </button>
                  </div>

                  <div className="flex justify-end space-x-2 pt-3 border-t border-gray-200 dark:border-gray-700">
                    <button
                      onClick={() => handleEdit(project)}
                      className="text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 px-4 py-2 rounded-lg transition"
                    >
                      ✏️ Editar
                    </button>
                    <button
                      onClick={() => handleDelete(project)}
                      className="text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 px-4 py-2 rounded-lg transition"
                    >
                      🗑️ Eliminar
                    </button>
                  </div>
                </div>
              ))}

              {projects.length === 0 && (
                <div className="col-span-full text-center py-12 text-gray-500 dark:text-gray-400">
                  No hay proyectos registrados. Crea el primero haciendo clic en "Nuevo Proyecto".
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
