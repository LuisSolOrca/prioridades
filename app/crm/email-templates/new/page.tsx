'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import {
  ArrowLeft,
  Save,
  Loader2,
  FileText,
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

export default function NewEmailTemplatePage() {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    name: '',
    description: '',
    category: 'other',
    subject: '',
    body: '',
    isShared: false,
  });

  const handleSave = async () => {
    if (!form.name || !form.subject || !form.body) {
      alert('Por favor completa nombre, asunto y contenido');
      return;
    }

    setSaving(true);
    try {
      const res = await fetch('/api/crm/email-templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });

      if (res.ok) {
        router.push('/crm/email-templates');
      } else {
        const error = await res.json();
        alert(error.error || 'Error al crear la plantilla');
      }
    } catch (error) {
      console.error('Error saving template:', error);
      alert('Error al crear la plantilla');
    } finally {
      setSaving(false);
    }
  };

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
                Nueva Plantilla
              </h1>
              <p className="text-gray-600 dark:text-gray-400 mt-1">
                Crea una nueva plantilla de correo electrónico
              </p>
            </div>
          </div>
          <button
            onClick={handleSave}
            disabled={saving || !form.name || !form.subject || !form.body}
            className="flex items-center gap-2 bg-emerald-600 text-white px-4 py-2 rounded-lg hover:bg-emerald-700 disabled:opacity-50 transition"
          >
            {saving ? <Loader2 size={20} className="animate-spin" /> : <Save size={20} />}
            Guardar
          </button>
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
    </div>
  );
}
