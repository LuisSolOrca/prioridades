'use client';

import { X } from 'lucide-react';
import ChecklistManager, { ChecklistItem } from './ChecklistManager';
import EvidenceLinksManager, { EvidenceLink } from './EvidenceLinksManager';

interface Initiative {
  _id: string;
  name: string;
  color: string;
}

interface PriorityFormData {
  title: string;
  description?: string;
  initiativeIds: string[];
  completionPercentage: number;
  status: 'EN_TIEMPO' | 'EN_RIESGO' | 'BLOQUEADO' | 'COMPLETADO';
  checklist: ChecklistItem[];
  evidenceLinks: EvidenceLink[];
}

interface PriorityFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  formData: PriorityFormData;
  setFormData: (data: PriorityFormData) => void;
  handleSubmit: (e: React.FormEvent) => void;
  initiatives: Initiative[];
  isEditing: boolean;
  weekLabel: string;
}

export default function PriorityFormModal({
  isOpen,
  onClose,
  formData,
  setFormData,
  handleSubmit,
  initiatives,
  isEditing,
  weekLabel
}: PriorityFormModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <h2 className="text-2xl font-bold text-gray-800">
            {isEditing ? 'Editar Prioridad' : 'Nueva Prioridad'} - {weekLabel}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
          >
            <X size={24} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Título */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Título *
            </label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
              maxLength={150}
            />
          </div>

          {/* Descripción */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Descripción
            </label>
            <textarea
              value={formData.description || ''}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
              rows={3}
            />
          </div>

          {/* Iniciativas */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Iniciativas Estratégicas *
            </label>
            <div className="space-y-2">
              {initiatives.map((initiative) => (
                <label
                  key={initiative._id}
                  className="flex items-center space-x-2 cursor-pointer hover:bg-gray-50 p-2 rounded"
                >
                  <input
                    type="checkbox"
                    checked={formData.initiativeIds.includes(initiative._id)}
                    onChange={(e) => {
                      const checked = e.target.checked;
                      setFormData({
                        ...formData,
                        initiativeIds: checked
                          ? [...formData.initiativeIds, initiative._id]
                          : formData.initiativeIds.filter(id => id !== initiative._id)
                      });
                    }}
                    className="rounded text-blue-600 focus:ring-blue-500"
                  />
                  <span style={{ color: initiative.color }}>●</span>
                  <span className="text-gray-700">{initiative.name}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Estado */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Estado
            </label>
            <select
              value={formData.status}
              onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="EN_TIEMPO">En Tiempo</option>
              <option value="EN_RIESGO">En Riesgo</option>
              <option value="BLOQUEADO">Bloqueado</option>
              <option value="COMPLETADO">Completado</option>
            </select>
          </div>

          {/* Porcentaje de completado */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Porcentaje de Completado: {formData.completionPercentage}%
            </label>
            <input
              type="range"
              min="0"
              max="100"
              step="5"
              value={formData.completionPercentage}
              onChange={(e) => setFormData({ ...formData, completionPercentage: parseInt(e.target.value) })}
              className="w-full"
            />
          </div>

          {/* Divider */}
          <div className="border-t border-gray-200"></div>

          {/* Checklist */}
          <ChecklistManager
            checklist={formData.checklist}
            onChange={(checklist) => setFormData({ ...formData, checklist })}
          />

          {/* Divider */}
          <div className="border-t border-gray-200"></div>

          {/* Enlaces de Evidencia */}
          <EvidenceLinksManager
            evidenceLinks={formData.evidenceLinks}
            onChange={(evidenceLinks) => setFormData({ ...formData, evidenceLinks })}
          />

          {/* Buttons */}
          <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-700 bg-gray-200 rounded-lg hover:bg-gray-300 transition"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
            >
              {isEditing ? 'Guardar Cambios' : 'Crear Prioridad'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
