'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import {
  ArrowLeft,
  Save,
  Loader2,
  FileText,
  ChevronDown,
  Info,
  Copy,
  Check,
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

const AVAILABLE_VARIABLES = [
  { category: 'Contacto', variables: [
    { name: '{{contact.firstName}}', description: 'Nombre del contacto' },
    { name: '{{contact.lastName}}', description: 'Apellido del contacto' },
    { name: '{{contact.fullName}}', description: 'Nombre completo del contacto' },
    { name: '{{contact.email}}', description: 'Email del contacto' },
    { name: '{{contact.phone}}', description: 'Teléfono del contacto' },
    { name: '{{contact.position}}', description: 'Cargo del contacto' },
  ]},
  { category: 'Cliente/Empresa', variables: [
    { name: '{{client.name}}', description: 'Nombre de la empresa' },
    { name: '{{client.industry}}', description: 'Industria de la empresa' },
    { name: '{{client.website}}', description: 'Sitio web de la empresa' },
  ]},
  { category: 'Negocio', variables: [
    { name: '{{deal.title}}', description: 'Título del negocio' },
    { name: '{{deal.value}}', description: 'Valor del negocio' },
    { name: '{{deal.stage}}', description: 'Etapa del negocio' },
  ]},
  { category: 'Usuario', variables: [
    { name: '{{user.name}}', description: 'Tu nombre' },
    { name: '{{user.email}}', description: 'Tu email' },
  ]},
  { category: 'Fecha', variables: [
    { name: '{{today}}', description: 'Fecha de hoy' },
    { name: '{{tomorrow}}', description: 'Fecha de mañana' },
  ]},
];

export default function NewEmailTemplatePage() {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [showVariablesHelp, setShowVariablesHelp] = useState(false);
  const [copiedVariable, setCopiedVariable] = useState<string | null>(null);

  const copyVariable = (variable: string) => {
    navigator.clipboard.writeText(variable);
    setCopiedVariable(variable);
    setTimeout(() => setCopiedVariable(null), 2000);
  };
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
          </div>

          {/* Variables Help Section */}
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg overflow-hidden">
            <button
              type="button"
              onClick={() => setShowVariablesHelp(!showVariablesHelp)}
              className="w-full flex items-center justify-between p-3 text-left hover:bg-blue-100 dark:hover:bg-blue-900/30 transition"
            >
              <div className="flex items-center gap-2 text-blue-700 dark:text-blue-300">
                <Info size={18} />
                <span className="font-medium">Variables disponibles para personalización</span>
              </div>
              <ChevronDown
                size={18}
                className={`text-blue-600 dark:text-blue-400 transition-transform ${showVariablesHelp ? 'rotate-180' : ''}`}
              />
            </button>
            {showVariablesHelp && (
              <div className="p-4 border-t border-blue-200 dark:border-blue-800 bg-white dark:bg-gray-800">
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                  Haz clic en una variable para copiarla. Luego pégala en el asunto o contenido del correo.
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {AVAILABLE_VARIABLES.map((group) => (
                    <div key={group.category}>
                      <h4 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">
                        {group.category}
                      </h4>
                      <div className="space-y-1">
                        {group.variables.map((v) => (
                          <button
                            key={v.name}
                            type="button"
                            onClick={() => copyVariable(v.name)}
                            className="w-full flex items-center justify-between gap-2 px-2 py-1.5 rounded text-left hover:bg-gray-100 dark:hover:bg-gray-700 transition group"
                          >
                            <div className="min-w-0">
                              <code className="text-xs font-mono text-emerald-600 dark:text-emerald-400 block truncate">
                                {v.name}
                              </code>
                              <span className="text-xs text-gray-500 dark:text-gray-400 truncate block">
                                {v.description}
                              </span>
                            </div>
                            {copiedVariable === v.name ? (
                              <Check size={14} className="text-green-500 flex-shrink-0" />
                            ) : (
                              <Copy size={14} className="text-gray-400 opacity-0 group-hover:opacity-100 flex-shrink-0" />
                            )}
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
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
