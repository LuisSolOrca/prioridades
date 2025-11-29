'use client';

import { useState } from 'react';
import { X, Save, Loader2, Mail, Tag, FileText, Share2 } from 'lucide-react';

interface SaveTemplateModalProps {
  subject: string;
  body: string;
  onClose: () => void;
  onSaved: (templateId: string) => void;
}

const CATEGORIES = [
  { value: 'outreach', label: 'Prospección', description: 'Primer contacto con prospectos' },
  { value: 'follow_up', label: 'Seguimiento', description: 'Recordatorios y seguimientos' },
  { value: 'nurture', label: 'Nutrición', description: 'Mantener relación a largo plazo' },
  { value: 'closing', label: 'Cierre', description: 'Cerrar ventas y negociaciones' },
  { value: 'other', label: 'Otros', description: 'Plantillas generales' },
];

export default function SaveTemplateModal({
  subject,
  body,
  onClose,
  onSaved,
}: SaveTemplateModalProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('follow_up');
  const [isShared, setIsShared] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleSave = async () => {
    if (!name.trim()) {
      setError('El nombre es requerido');
      return;
    }
    if (!subject.trim()) {
      setError('El asunto del correo es requerido');
      return;
    }
    if (!body.trim()) {
      setError('El cuerpo del correo es requerido');
      return;
    }

    setSaving(true);
    setError('');

    try {
      const res = await fetch('/api/crm/email-templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          description: description.trim(),
          subject,
          body,
          category,
          isShared,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Error al guardar la plantilla');
      }

      const template = await res.json();
      onSaved(template._id);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-lg">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-lg">
              <Save className="text-blue-600 dark:text-blue-400" size={20} />
            </div>
            <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100">
              Guardar como Plantilla
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg text-gray-500"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 space-y-4">
          {/* Error message */}
          {error && (
            <div className="p-3 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-lg text-red-700 dark:text-red-300 text-sm">
              {error}
            </div>
          )}

          {/* Preview */}
          <div className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg border border-gray-200 dark:border-gray-600">
            <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 mb-2">
              <Mail size={14} />
              <span className="font-medium">Vista previa del correo</span>
            </div>
            <p className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-1 truncate">
              {subject || 'Sin asunto'}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-2">
              {body || 'Sin contenido'}
            </p>
          </div>

          {/* Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Nombre de la plantilla *
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ej: Seguimiento después de demo"
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Descripción (opcional)
            </label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Ej: Usar 2-3 días después de una demostración"
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* Category */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Categoría
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {CATEGORIES.map((cat) => (
                <button
                  key={cat.value}
                  type="button"
                  onClick={() => setCategory(cat.value)}
                  className={`p-2 rounded-lg border text-left transition ${
                    category === cat.value
                      ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/30'
                      : 'border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500'
                  }`}
                >
                  <span className={`block text-sm font-medium ${
                    category === cat.value
                      ? 'text-blue-700 dark:text-blue-300'
                      : 'text-gray-700 dark:text-gray-300'
                  }`}>
                    {cat.label}
                  </span>
                  <span className="block text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                    {cat.description}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Shared toggle */}
          <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
            <div className="flex items-center gap-3">
              <Share2 size={18} className="text-gray-500" />
              <div>
                <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Compartir con el equipo
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Otros usuarios podrán usar esta plantilla
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setIsShared(!isShared)}
              className={`relative w-11 h-6 rounded-full transition ${
                isShared ? 'bg-blue-600' : 'bg-gray-300 dark:bg-gray-600'
              }`}
            >
              <span
                className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform ${
                  isShared ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-200 dark:border-gray-700 flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition"
          >
            {saving ? (
              <Loader2 size={18} className="animate-spin" />
            ) : (
              <Save size={18} />
            )}
            {saving ? 'Guardando...' : 'Guardar Plantilla'}
          </button>
        </div>
      </div>
    </div>
  );
}
