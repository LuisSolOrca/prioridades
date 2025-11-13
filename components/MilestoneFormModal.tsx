'use client';

import { useState } from 'react';
import { X } from 'lucide-react';

interface Deliverable {
  title: string;
  description?: string;
  successCriteria?: string;
  isCompleted: boolean;
}

interface Project {
  _id: string;
  name: string;
  description?: string;
  isActive: boolean;
}

interface MilestoneFormData {
  title: string;
  description: string;
  dueDate: string;
  deliverables: Deliverable[];
  projectId?: string;
}

interface MilestoneFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  formData: MilestoneFormData;
  setFormData: (data: MilestoneFormData) => void;
  handleSubmit: (e: React.FormEvent) => void;
  handleDelete?: () => void;
  isEditing: boolean;
  projects?: Project[];
  onProjectCreated?: (project: Project) => void;
}

export default function MilestoneFormModal({
  isOpen,
  onClose,
  formData,
  setFormData,
  handleSubmit,
  handleDelete,
  isEditing,
  projects = [],
  onProjectCreated
}: MilestoneFormModalProps) {
  const [newDeliverable, setNewDeliverable] = useState('');
  const [expandedDeliverable, setExpandedDeliverable] = useState<number | null>(null);
  const [isCreatingNewProject, setIsCreatingNewProject] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');
  const [projectCreating, setProjectCreating] = useState(false);

  if (!isOpen) return null;

  const handleCreateProject = async () => {
    if (!newProjectName.trim()) {
      alert('Por favor ingresa el nombre del proyecto');
      return;
    }

    setProjectCreating(true);
    try {
      const res = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newProjectName.trim(),
          isActive: true
        })
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Error al crear el proyecto');
      }

      const newProject = await res.json();

      // Actualizar formData con el nuevo proyecto
      setFormData({ ...formData, projectId: newProject._id });

      // Resetear estados
      setIsCreatingNewProject(false);
      setNewProjectName('');

      // Notificar al componente padre para actualizar la lista de proyectos
      if (onProjectCreated) {
        onProjectCreated(newProject);
      }

    } catch (error: any) {
      console.error('Error creating project:', error);
      alert(error.message || 'Error al crear el proyecto');
    } finally {
      setProjectCreating(false);
    }
  };

  const addDeliverable = () => {
    if (!newDeliverable.trim()) return;

    setFormData({
      ...formData,
      deliverables: [...formData.deliverables, { title: newDeliverable.trim(), isCompleted: false }]
    });
    setNewDeliverable('');
  };

  const removeDeliverable = (index: number) => {
    setFormData({
      ...formData,
      deliverables: formData.deliverables.filter((_, i) => i !== index)
    });
  };

  const toggleDeliverable = (index: number) => {
    const updated = [...formData.deliverables];
    updated[index].isCompleted = !updated[index].isCompleted;
    setFormData({ ...formData, deliverables: updated });
  };

  const updateDeliverable = (index: number, field: keyof Deliverable, value: any) => {
    const updated = [...formData.deliverables];
    updated[index] = { ...updated[index], [field]: value };
    setFormData({ ...formData, deliverables: updated });
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 dark:bg-opacity-70 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4 flex items-center justify-between">
          <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-100 flex items-center gap-2">
            <span className="text-3xl">💎</span>
            {isEditing ? 'Editar Hito' : 'Nuevo Hito'}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
          >
            <X size={24} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Título */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Título del Hito *
            </label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
              required
              maxLength={200}
              placeholder="Ej: Lanzamiento del producto"
            />
          </div>

          {/* Descripción */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Descripción
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
              rows={3}
              maxLength={1000}
              placeholder="Describe el hito y su importancia"
            />
          </div>

          {/* Selector de Proyecto */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Proyecto (opcional)
            </label>
            {!isCreatingNewProject ? (
              <div className="flex gap-2">
                <select
                  value={formData.projectId || ''}
                  onChange={(e) => setFormData({ ...formData, projectId: e.target.value || undefined })}
                  className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                >
                  <option value="">Sin proyecto</option>
                  {projects.filter(p => p.isActive).map((project) => (
                    <option key={project._id} value={project._id}>
                      {project.name}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={() => setIsCreatingNewProject(true)}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition text-sm font-medium whitespace-nowrap"
                >
                  + Nuevo
                </button>
              </div>
            ) : (
              <div className="space-y-2">
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newProjectName}
                    onChange={(e) => setNewProjectName(e.target.value)}
                    onKeyPress={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleCreateProject();
                      }
                    }}
                    className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                    placeholder="Nombre del proyecto"
                    maxLength={100}
                    autoFocus
                  />
                  <button
                    type="button"
                    onClick={handleCreateProject}
                    disabled={projectCreating}
                    className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition text-sm font-medium disabled:bg-gray-400 disabled:cursor-not-allowed"
                  >
                    {projectCreating ? '...' : '✓'}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setIsCreatingNewProject(false);
                      setNewProjectName('');
                    }}
                    className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition text-sm font-medium"
                  >
                    ✕
                  </button>
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Presiona Enter o ✓ para crear el proyecto
                </p>
              </div>
            )}
          </div>

          {/* Fecha */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Fecha del Hito *
            </label>
            <input
              type="date"
              value={formData.dueDate}
              onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
              required
            />
          </div>

          {/* Entregables */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Entregables
            </label>
            <div className="space-y-3">
              {/* Lista de entregables */}
              {formData.deliverables.map((deliverable, index) => (
                <div
                  key={index}
                  className="border border-gray-200 dark:border-gray-600 rounded-lg overflow-hidden"
                >
                  {/* Encabezado del entregable */}
                  <div className="flex items-center gap-2 p-3 bg-gray-50 dark:bg-gray-700">
                    <input
                      type="checkbox"
                      checked={deliverable.isCompleted}
                      onChange={() => toggleDeliverable(index)}
                      className="rounded text-blue-600 focus:ring-blue-500"
                    />
                    <span className={`flex-1 text-sm font-medium ${deliverable.isCompleted ? 'line-through text-gray-500 dark:text-gray-400' : 'text-gray-800 dark:text-gray-200'}`}>
                      {deliverable.title}
                    </span>
                    <button
                      type="button"
                      onClick={() => setExpandedDeliverable(expandedDeliverable === index ? null : index)}
                      className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 text-sm px-2"
                      title="Ver detalles"
                    >
                      {expandedDeliverable === index ? '▲' : '▼'}
                    </button>
                    <button
                      type="button"
                      onClick={() => removeDeliverable(index)}
                      className="text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300 text-sm"
                    >
                      ✕
                    </button>
                  </div>

                  {/* Detalles expandidos */}
                  {expandedDeliverable === index && (
                    <div className="p-3 space-y-3 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-600">
                      {/* Descripción */}
                      <div>
                        <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                          Descripción
                        </label>
                        <textarea
                          value={deliverable.description || ''}
                          onChange={(e) => updateDeliverable(index, 'description', e.target.value)}
                          className="w-full px-2 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                          rows={2}
                          maxLength={500}
                          placeholder="Describe el entregable..."
                        />
                      </div>

                      {/* Criterios de Éxito */}
                      <div>
                        <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                          Criterios de Éxito
                        </label>
                        <textarea
                          value={deliverable.successCriteria || ''}
                          onChange={(e) => updateDeliverable(index, 'successCriteria', e.target.value)}
                          className="w-full px-2 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                          rows={2}
                          maxLength={500}
                          placeholder="Define cómo se medirá el éxito de este entregable..."
                        />
                      </div>
                    </div>
                  )}
                </div>
              ))}

              {/* Agregar nuevo entregable */}
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newDeliverable}
                  onChange={(e) => setNewDeliverable(e.target.value)}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      addDeliverable();
                    }
                  }}
                  className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-sm"
                  placeholder="Agregar nuevo entregable..."
                  maxLength={200}
                />
                <button
                  type="button"
                  onClick={addDeliverable}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition text-sm font-medium"
                >
                  + Agregar
                </button>
              </div>
            </div>
          </div>

          {/* Buttons */}
          <div className="flex justify-between items-center pt-4 border-t border-gray-200 dark:border-gray-700">
            {isEditing && handleDelete ? (
              <button
                type="button"
                onClick={handleDelete}
                className="px-4 py-2 text-red-700 dark:text-red-300 bg-red-100 dark:bg-red-900/20 rounded-lg hover:bg-red-200 dark:hover:bg-red-900/40 transition font-medium"
              >
                🗑️ Eliminar Hito
              </button>
            ) : (
              <div></div>
            )}
            <div className="flex space-x-3">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-gray-700 dark:text-gray-300 bg-gray-200 dark:bg-gray-700 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
              >
                {isEditing ? 'Guardar Cambios' : 'Crear Hito'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
