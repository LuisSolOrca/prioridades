'use client';

import { useState } from 'react';
import { X } from 'lucide-react';

interface Deliverable {
  title: string;
  description?: string;
  isCompleted: boolean;
}

interface MilestoneFormData {
  title: string;
  description: string;
  dueDate: string;
  deliverables: Deliverable[];
}

interface MilestoneFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  formData: MilestoneFormData;
  setFormData: (data: MilestoneFormData) => void;
  handleSubmit: (e: React.FormEvent) => void;
  isEditing: boolean;
}

export default function MilestoneFormModal({
  isOpen,
  onClose,
  formData,
  setFormData,
  handleSubmit,
  isEditing
}: MilestoneFormModalProps) {
  const [newDeliverable, setNewDeliverable] = useState('');

  if (!isOpen) return null;

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
                  className="flex items-center gap-2 p-2 bg-gray-50 dark:bg-gray-700 rounded-lg"
                >
                  <input
                    type="checkbox"
                    checked={deliverable.isCompleted}
                    onChange={() => toggleDeliverable(index)}
                    className="rounded text-blue-600 focus:ring-blue-500"
                  />
                  <span className={`flex-1 text-sm ${deliverable.isCompleted ? 'line-through text-gray-500 dark:text-gray-400' : 'text-gray-800 dark:text-gray-200'}`}>
                    {deliverable.title}
                  </span>
                  <button
                    type="button"
                    onClick={() => removeDeliverable(index)}
                    className="text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300 text-sm"
                  >
                    ✕
                  </button>
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
          <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200 dark:border-gray-700">
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
        </form>
      </div>
    </div>
  );
}
