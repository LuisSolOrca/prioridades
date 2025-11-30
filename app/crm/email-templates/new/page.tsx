'use client';

import { useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import Navbar from '@/components/Navbar';
import {
  ArrowLeft,
  Save,
  Loader2,
  FileText,
  ChevronDown,
  Info,
  Copy,
  Check,
  Sparkles,
  Wand2,
  AlertCircle,
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

const SCOPE_OPTIONS = [
  { value: 'both', label: 'Ambos (Secuencias y Workflows)', description: 'Disponible en secuencias de email y workflows CRM' },
  { value: 'sequences', label: 'Solo Secuencias', description: 'Solo para secuencias de email automatizadas' },
  { value: 'workflows', label: 'Solo Workflows', description: 'Solo para automatizaciones de workflows CRM' },
];

const TONE_OPTIONS = [
  { value: 'professional', label: 'Profesional', description: 'Formal y corporativo' },
  { value: 'friendly', label: 'Amigable', description: 'Cercano pero profesional' },
  { value: 'persuasive', label: 'Persuasivo', description: 'Enfocado en beneficios' },
  { value: 'urgent', label: 'Urgente', description: 'Con sentido de urgencia' },
];

const AVAILABLE_VARIABLES = {
  common: [
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
      { name: '{{deal.value}}', description: 'Valor del negocio (formateado)' },
      { name: '{{deal.stage}}', description: 'Etapa del negocio' },
    ]},
    { category: 'Usuario', variables: [
      { name: '{{user.name}}', description: 'Tu nombre' },
      { name: '{{user.email}}', description: 'Tu email' },
      { name: '{{user.phone}}', description: 'Tu teléfono' },
      { name: '{{user.signature}}', description: 'Tu firma personalizada' },
    ]},
    { category: 'Fecha', variables: [
      { name: '{{today}}', description: 'Fecha de hoy' },
      { name: '{{tomorrow}}', description: 'Fecha de mañana' },
      { name: '{{nextWeek}}', description: 'Fecha en 7 días' },
    ]},
  ],
  workflows: [
    { category: 'Prioridad (Solo Workflows)', variables: [
      { name: '{{priority.title}}', description: 'Título de la prioridad' },
      { name: '{{priority.status}}', description: 'Estado (EN_TIEMPO, EN_RIESGO, etc.)' },
      { name: '{{priority.completion}}', description: '% de completado' },
      { name: '{{priority.owner}}', description: 'Responsable de la prioridad' },
    ]},
  ],
};

export default function NewEmailTemplatePage() {
  const { data: session } = useSession();
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [showVariablesHelp, setShowVariablesHelp] = useState(false);
  const [copiedVariable, setCopiedVariable] = useState<string | null>(null);

  // AI Generation State
  const [showAIPanel, setShowAIPanel] = useState(false);
  const [aiDescription, setAiDescription] = useState('');
  const [aiTone, setAiTone] = useState('professional');
  const [generating, setGenerating] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [variablesUsed, setVariablesUsed] = useState<string[]>([]);

  const copyVariable = (variable: string) => {
    navigator.clipboard.writeText(variable);
    setCopiedVariable(variable);
    setTimeout(() => setCopiedVariable(null), 2000);
  };
  const [form, setForm] = useState({
    name: '',
    description: '',
    category: 'other',
    scope: 'both',
    subject: '',
    body: '',
    isShared: false,
  });

  // Obtener variables según el scope seleccionado
  const getVisibleVariables = () => {
    const vars = [...AVAILABLE_VARIABLES.common];
    if (form.scope === 'workflows' || form.scope === 'both') {
      vars.push(...AVAILABLE_VARIABLES.workflows);
    }
    return vars;
  };

  // Generar plantilla con IA
  const handleAIGenerate = async () => {
    if (!aiDescription.trim() || aiDescription.trim().length < 10) {
      setAiError('Por favor describe con más detalle lo que necesitas (mínimo 10 caracteres)');
      return;
    }

    setGenerating(true);
    setAiError(null);
    setVariablesUsed([]);

    try {
      const res = await fetch('/api/crm/email-templates/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          description: aiDescription,
          scope: form.scope,
          category: form.category,
          tone: aiTone,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setAiError(data.error || 'Error al generar la plantilla');
        return;
      }

      // Actualizar el formulario con el contenido generado
      setForm((prev) => ({
        ...prev,
        subject: data.subject,
        body: data.body,
      }));

      // Mostrar variables utilizadas
      if (data.variablesUsed && data.variablesUsed.length > 0) {
        setVariablesUsed(data.variablesUsed);
      }

      // Cerrar el panel después de generar exitosamente
      setShowAIPanel(false);
      setAiDescription('');
    } catch (error) {
      console.error('Error generating template:', error);
      setAiError('Error de conexión. Por favor intenta de nuevo.');
    } finally {
      setGenerating(false);
    }
  };

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

  if (!session) return null;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Navbar />
      <div className="pt-16 main-content px-4 py-6">
        <div className="max-w-4xl mx-auto">
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
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Uso de la plantilla
              </label>
              <select
                value={form.scope}
                onChange={(e) => setForm({ ...form, scope: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              >
                {SCOPE_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                {SCOPE_OPTIONS.find(o => o.value === form.scope)?.description}
              </p>
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

          {/* AI Generation Panel */}
          <div className="bg-gradient-to-r from-purple-50 to-indigo-50 dark:from-purple-900/20 dark:to-indigo-900/20 border border-purple-200 dark:border-purple-800 rounded-xl overflow-hidden">
            <button
              type="button"
              onClick={() => setShowAIPanel(!showAIPanel)}
              className="w-full flex items-center justify-between p-4 text-left hover:bg-purple-100/50 dark:hover:bg-purple-900/30 transition"
            >
              <div className="flex items-center gap-3">
                <div className="p-2 bg-purple-100 dark:bg-purple-800 rounded-lg">
                  <Sparkles size={20} className="text-purple-600 dark:text-purple-300" />
                </div>
                <div>
                  <span className="font-semibold text-purple-800 dark:text-purple-200 block">
                    Generar con IA
                  </span>
                  <span className="text-sm text-purple-600 dark:text-purple-400">
                    Describe lo que necesitas y la IA creará el contenido
                  </span>
                </div>
              </div>
              <ChevronDown
                size={20}
                className={`text-purple-600 dark:text-purple-400 transition-transform ${showAIPanel ? 'rotate-180' : ''}`}
              />
            </button>

            {showAIPanel && (
              <div className="p-4 border-t border-purple-200 dark:border-purple-800 bg-white dark:bg-gray-800 space-y-4">
                {/* AI Description Textarea */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Describe la plantilla que necesitas
                  </label>
                  <textarea
                    value={aiDescription}
                    onChange={(e) => {
                      setAiDescription(e.target.value);
                      setAiError(null);
                    }}
                    placeholder="Ej: Un email de seguimiento para prospectos que no han respondido en 2 semanas, recordándoles los beneficios de nuestro servicio y proponiendo una llamada breve."
                    rows={4}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 resize-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  />
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    Mientras más detallada sea tu descripción, mejor será el resultado. Mínimo 10 caracteres.
                  </p>
                </div>

                {/* Tone Selection */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Tono del mensaje
                  </label>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                    {TONE_OPTIONS.map((tone) => (
                      <button
                        key={tone.value}
                        type="button"
                        onClick={() => setAiTone(tone.value)}
                        className={`px-3 py-2 rounded-lg border text-sm transition ${
                          aiTone === tone.value
                            ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300'
                            : 'border-gray-300 dark:border-gray-600 hover:border-purple-300 dark:hover:border-purple-700'
                        }`}
                      >
                        <span className="font-medium block">{tone.label}</span>
                        <span className="text-xs text-gray-500 dark:text-gray-400">{tone.description}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Error Message */}
                {aiError && (
                  <div className="flex items-center gap-2 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-700 dark:text-red-300 text-sm">
                    <AlertCircle size={16} className="flex-shrink-0" />
                    {aiError}
                  </div>
                )}

                {/* Generate Button */}
                <div className="flex items-center justify-between pt-2">
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    La IA usará la categoría ({CATEGORY_OPTIONS.find(c => c.value === form.category)?.label}) y scope ({SCOPE_OPTIONS.find(s => s.value === form.scope)?.label}) seleccionados.
                  </p>
                  <button
                    type="button"
                    onClick={handleAIGenerate}
                    disabled={generating || aiDescription.trim().length < 10}
                    className="flex items-center gap-2 bg-gradient-to-r from-purple-600 to-indigo-600 text-white px-5 py-2.5 rounded-lg hover:from-purple-700 hover:to-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition font-medium shadow-sm"
                  >
                    {generating ? (
                      <>
                        <Loader2 size={18} className="animate-spin" />
                        Generando...
                      </>
                    ) : (
                      <>
                        <Wand2 size={18} />
                        Generar Plantilla
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Variables Used Notification */}
          {variablesUsed.length > 0 && (
            <div className="flex items-start gap-3 p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
              <Check size={18} className="text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-green-800 dark:text-green-200">
                  Plantilla generada con éxito
                </p>
                <p className="text-xs text-green-600 dark:text-green-400 mt-1">
                  Variables utilizadas: {variablesUsed.join(', ')}
                </p>
              </div>
            </div>
          )}

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
                  {getVisibleVariables().map((group) => (
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
    </div>
  );
}
