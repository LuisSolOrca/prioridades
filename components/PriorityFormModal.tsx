'use client';

import { useState } from 'react';
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
  status: 'EN_TIEMPO' | 'EN_RIESGO' | 'BLOQUEADO' | 'COMPLETADO' | 'REPROGRAMADO';
  type: 'ESTRATEGICA' | 'OPERATIVA';
  checklist: ChecklistItem[];
  evidenceLinks: EvidenceLink[];
  weekStart?: string;
  weekEnd?: string;
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
  currentWeek?: any;
  nextWeek?: any;
  selectedWeekOffset?: number;
  setSelectedWeekOffset?: (offset: number) => void;
}

export default function PriorityFormModal({
  isOpen,
  onClose,
  formData,
  setFormData,
  handleSubmit,
  initiatives,
  isEditing,
  weekLabel,
  currentWeek,
  nextWeek,
  selectedWeekOffset = 0,
  setSelectedWeekOffset
}: PriorityFormModalProps) {
  const [aiLoading, setAiLoading] = useState<'title' | 'description' | null>(null);
  const [aiSuggestion, setAiSuggestion] = useState<{ type: 'title' | 'description', text: string } | null>(null);

  const handleImproveWithAI = async (type: 'title' | 'description') => {
    const text = type === 'title' ? formData.title : formData.description;

    if (!text || text.trim() === '') {
      alert(`Primero escribe ${type === 'title' ? 'un título' : 'una descripción'} para que la IA pueda mejorarlo`);
      return;
    }

    setAiLoading(type);
    setAiSuggestion(null);

    try {
      const res = await fetch('/api/ai/improve-text', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, type })
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Error al mejorar el texto');
      }

      const data = await res.json();
      setAiSuggestion({ type, text: data.improvedText });

    } catch (error: any) {
      console.error('Error improving text:', error);
      alert(error.message || 'Error al comunicarse con la IA');
    } finally {
      setAiLoading(null);
    }
  };

  const handleAcceptSuggestion = () => {
    if (!aiSuggestion) return;

    if (aiSuggestion.type === 'title') {
      setFormData({ ...formData, title: aiSuggestion.text });
    } else {
      setFormData({ ...formData, description: aiSuggestion.text });
    }

    setAiSuggestion(null);
  };

  const handleRejectSuggestion = () => {
    setAiSuggestion(null);
  };

  const getWeekLabel = (date: Date) => {
    return date.toLocaleDateString('es-MX', { month: 'short', day: 'numeric' });
  };

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
          {/* Selector de Semana (solo cuando se crea) */}
          {!isEditing && currentWeek && nextWeek && setSelectedWeekOffset && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Semana *
              </label>
              <select
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                value={selectedWeekOffset}
                onChange={(e) => {
                  const offset = parseInt(e.target.value);
                  setSelectedWeekOffset(offset);
                  const targetWeek = offset === 0 ? currentWeek : nextWeek;
                  setFormData({
                    ...formData,
                    weekStart: targetWeek.monday.toISOString(),
                    weekEnd: targetWeek.friday.toISOString()
                  });
                }}
              >
                <option value="0">Semana Actual ({getWeekLabel(currentWeek.monday)})</option>
                <option value="1">Siguiente Semana ({getWeekLabel(nextWeek.monday)})</option>
              </select>
            </div>
          )}

          {/* Título con IA */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-medium text-gray-700">
                Título de la Prioridad *
              </label>
              <button
                type="button"
                onClick={() => handleImproveWithAI('title')}
                disabled={aiLoading === 'title' || !formData.title}
                className={`text-xs px-3 py-1 rounded-lg transition flex items-center space-x-1 ${
                  aiLoading === 'title'
                    ? 'bg-gray-300 cursor-not-allowed'
                    : formData.title
                    ? 'bg-purple-100 text-purple-700 hover:bg-purple-200'
                    : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                }`}
                title="Mejorar con IA"
              >
                {aiLoading === 'title' ? (
                  <>
                    <span className="animate-spin">⚙️</span>
                    <span>Mejorando...</span>
                  </>
                ) : (
                  <>
                    <span>✨</span>
                    <span>Mejorar con IA</span>
                  </>
                )}
              </button>
            </div>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
              maxLength={150}
              placeholder="Ej: Aumentar ventas del producto X en 15%"
            />

            {/* Sugerencia de IA para Título */}
            {aiSuggestion && aiSuggestion.type === 'title' && (
              <div className="mt-3 bg-gradient-to-r from-purple-50 to-pink-50 border-2 border-purple-200 rounded-lg p-4">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center space-x-2">
                    <span className="text-xl">✨</span>
                    <h4 className="text-sm font-bold text-purple-900">Sugerencia de IA</h4>
                  </div>
                  <button
                    type="button"
                    onClick={handleRejectSuggestion}
                    className="text-gray-400 hover:text-gray-600 text-lg"
                    title="Cerrar"
                  >
                    ×
                  </button>
                </div>

                <div className="space-y-3">
                  <div>
                    <p className="text-xs font-semibold text-gray-600 uppercase mb-1">Original</p>
                    <div className="bg-white/70 rounded p-2 text-sm text-gray-700">
                      {formData.title}
                    </div>
                  </div>

                  <div>
                    <p className="text-xs font-semibold text-purple-700 uppercase mb-1">Mejorado</p>
                    <div className="bg-white rounded p-2 text-sm text-gray-800 font-medium border-2 border-purple-300">
                      {aiSuggestion.text}
                    </div>
                  </div>

                  <div className="flex space-x-2 pt-1">
                    <button
                      type="button"
                      onClick={handleAcceptSuggestion}
                      className="flex-1 bg-purple-600 text-white px-3 py-2 rounded-lg hover:bg-purple-700 transition text-sm font-medium"
                    >
                      ✓ Usar Esta Versión
                    </button>
                    <button
                      type="button"
                      onClick={handleRejectSuggestion}
                      className="flex-1 bg-gray-200 text-gray-700 px-3 py-2 rounded-lg hover:bg-gray-300 transition text-sm font-medium"
                    >
                      × Mantener Original
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Descripción con IA */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-medium text-gray-700">
                Descripción Detallada
              </label>
              <button
                type="button"
                onClick={() => handleImproveWithAI('description')}
                disabled={aiLoading === 'description' || !formData.description}
                className={`text-xs px-3 py-1 rounded-lg transition flex items-center space-x-1 ${
                  aiLoading === 'description'
                    ? 'bg-gray-300 cursor-not-allowed'
                    : formData.description
                    ? 'bg-purple-100 text-purple-700 hover:bg-purple-200'
                    : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                }`}
                title="Mejorar con IA"
              >
                {aiLoading === 'description' ? (
                  <>
                    <span className="animate-spin">⚙️</span>
                    <span>Mejorando...</span>
                  </>
                ) : (
                  <>
                    <span>✨</span>
                    <span>Mejorar con IA</span>
                  </>
                )}
              </button>
            </div>
            <textarea
              value={formData.description || ''}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
              rows={3}
              placeholder="Describe los objetivos y el alcance de esta prioridad"
            />

            {/* Sugerencia de IA para Descripción */}
            {aiSuggestion && aiSuggestion.type === 'description' && (
              <div className="mt-3 bg-gradient-to-r from-purple-50 to-pink-50 border-2 border-purple-200 rounded-lg p-4">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center space-x-2">
                    <span className="text-xl">✨</span>
                    <h4 className="text-sm font-bold text-purple-900">Sugerencia de IA</h4>
                  </div>
                  <button
                    type="button"
                    onClick={handleRejectSuggestion}
                    className="text-gray-400 hover:text-gray-600 text-lg"
                    title="Cerrar"
                  >
                    ×
                  </button>
                </div>

                <div className="space-y-3">
                  <div>
                    <p className="text-xs font-semibold text-gray-600 uppercase mb-1">Original</p>
                    <div className="bg-white/70 rounded p-2 text-sm text-gray-700">
                      {formData.description}
                    </div>
                  </div>

                  <div>
                    <p className="text-xs font-semibold text-purple-700 uppercase mb-1">Mejorado</p>
                    <div className="bg-white rounded p-2 text-sm text-gray-800 font-medium border-2 border-purple-300">
                      {aiSuggestion.text}
                    </div>
                  </div>

                  <div className="flex space-x-2 pt-1">
                    <button
                      type="button"
                      onClick={handleAcceptSuggestion}
                      className="flex-1 bg-purple-600 text-white px-3 py-2 rounded-lg hover:bg-purple-700 transition text-sm font-medium"
                    >
                      ✓ Usar Esta Versión
                    </button>
                    <button
                      type="button"
                      onClick={handleRejectSuggestion}
                      className="flex-1 bg-gray-200 text-gray-700 px-3 py-2 rounded-lg hover:bg-gray-300 transition text-sm font-medium"
                    >
                      × Mantener Original
                    </button>
                  </div>
                </div>
              </div>
            )}
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

          {/* Tipo de Prioridad */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Tipo de Prioridad *
            </label>
            <select
              value={formData.type}
              onChange={(e) => setFormData({ ...formData, type: e.target.value as 'ESTRATEGICA' | 'OPERATIVA' })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="ESTRATEGICA">Estratégica</option>
              <option value="OPERATIVA">Operativa</option>
            </select>
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
