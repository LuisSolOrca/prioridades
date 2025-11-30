'use client';

import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import {
  ArrowLeft,
  Save,
  Loader2,
  FileText,
  Trash2,
} from 'lucide-react';

const RichTextEditor = dynamic(() => import('@/components/crm/RichTextEditor'), {
  ssr: false,
  loading: () => (
    <div className="border border-gray-300 dark:border-gray-600 rounded-lg p-4 min-h-[250px] bg-gray-50 dark:bg-gray-800 animate-pulse">
      <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4 mb-2"></div>
      <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/2"></div>
    </div>
  ),
});

const CATEGORY_OPTIONS = [
  { value: 'outreach', label: 'Prospección' },
  { value: 'follow_up', label: 'Seguimiento' },
  { value: 'nurture', label: 'Nurturing' },
  { value: 'closing', label: 'Cierre' },
  { value: 'other', label: 'Otro' },
];

export default function EditEmailTemplatePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [form, setForm] = useState({
    name: '',
    description: '',
    category: 'other',
    subject: '',
    body: '',
    isShared: false,
  });

  useEffect(() => {
    loadTemplate();
  }, [id]);

  const loadTemplate = async () => {
    try {
      const res = await fetch(`/api/crm/email-templates/${id}`);
      if (res.ok) {
        const template = await res.json();
        setForm({
          name: template.name || '',
          description: template.description || '',
          category: template.category || 'other',
          subject: template.subject || '',
          body: template.body || '',
          isShared: template.isShared || false,
        });
      } else {
        router.push('/crm/email-templates');
      }
    } catch (error) {
      console.error('Error loading template:', error);
      router.push('/crm/email-templates');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!form.name || !form.subject || !form.body) {
      alert('Por favor completa nombre, asunto y contenido');
      return;
    }

    setSaving(true);
    try {
      const res = await fetch(`/api/crm/email-templates/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });

      if (res.ok) {
        router.push('/crm/email-templates');
      } else {
        const error = await res.json();
        alert(error.error || 'Error al actualizar la plantilla');
      }
    } catch (error) {
      console.error('Error saving template:', error);
      alert('Error al actualizar la plantilla');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      const res = await fetch(`/api/crm/email-templates/${id}`, {
        method: 'DELETE',
      });

      if (res.ok) {
        router.push('/crm/email-templates');
      } else {
        const error = await res.json();
        alert(error.error || 'Error al eliminar la plantilla');
      }
    } catch (error) {
      console.error('Error deleting template:', error);
      alert('Error al eliminar la plantilla');
    } finally {
      setDeleting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <Loader2 className="animate-spin text-emerald-600" size={40} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.push('/crm/email-templates')}
              className="p-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg"
            >
              <ArrowLeft size={20} />
            </button>
            <div>
              <h1 className="text-2xl font-bold text-gray-800 dark:text-white flex items-center gap-2">
                <FileText className="text-emerald-600" size={28} />
                Editar Plantilla
              </h1>
              <p className="text-gray-600 dark:text-gray-400 mt-1">
                Modifica tu plantilla de correo electrónico
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowDeleteModal(true)}
              className="flex items-center gap-2 px-4 py-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition"
            >
              <Trash2 size={20} />
              Eliminar
            </button>
            <button
              onClick={handleSave}
              disabled={saving || !form.name || !form.subject || !form.body}
              className="flex items-center gap-2 bg-emerald-600 text-white px-4 py-2 rounded-lg hover:bg-emerald-700 disabled:opacity-50 transition"
            >
              {saving ? <Loader2 size={20} className="animate-spin" /> : <Save size={20} />}
              Guardar
            </button>
          </div>
        </div>

        {/* Form */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6 space-y-6">
          {/* Name and Category */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Nombre de la plantilla *
              </label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="Ej: Bienvenida nuevos prospectos"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Categoría
              </label>
              <select
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              >
                {CATEGORY_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Descripción (opcional)
            </label>
            <input
              type="text"
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder="Breve descripción del uso de esta plantilla"
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            />
          </div>

          {/* Subject */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Asunto del correo *
            </label>
            <input
              type="text"
              value={form.subject}
              onChange={(e) => setForm({ ...form, subject: e.target.value })}
              placeholder="Ej: Hola {{contact.firstName}}, tenemos algo para ti"
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            />
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              Puedes usar variables como {"{{contact.firstName}}"}, {"{{client.name}}"}, etc.
            </p>
          </div>

          {/* Body */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Contenido del correo *
            </label>
            <RichTextEditor
              content={form.body}
              onChange={(body) => setForm({ ...form, body })}
              placeholder="Escribe el contenido de tu correo aquí..."
              minHeight="300px"
            />
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              Variables disponibles: {"{{contact.firstName}}"}, {"{{contact.lastName}}"}, {"{{contact.fullName}}"}, {"{{client.name}}"}, {"{{deal.title}}"}, {"{{user.name}}"}, {"{{today}}"}
            </p>
          </div>

          {/* Sharing option */}
          <div className="flex items-center gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
            <input
              type="checkbox"
              id="isShared"
              checked={form.isShared}
              onChange={(e) => setForm({ ...form, isShared: e.target.checked })}
              className="w-4 h-4 text-emerald-600 border-gray-300 rounded focus:ring-emerald-500"
            />
            <label htmlFor="isShared" className="text-sm text-gray-700 dark:text-gray-300">
              Compartir con todo el equipo (visible para todos los usuarios)
            </label>
          </div>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-md w-full p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              Eliminar Plantilla
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              ¿Estás seguro de que deseas eliminar esta plantilla? Esta acción no se puede deshacer.
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowDeleteModal(false)}
                className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
              >
                Cancelar
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
              >
                {deleting && <Loader2 size={18} className="animate-spin" />}
                Eliminar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
