'use client';

import { useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Navbar from '@/components/Navbar';
import EmailBlockEditor, { IEmailContent } from '@/components/marketing/EmailBlockEditor';
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
  Settings,
  X,
} from 'lucide-react';

const CATEGORY_OPTIONS = [
  { value: 'outreach', label: 'Prospección' },
  { value: 'follow_up', label: 'Seguimiento' },
  { value: 'nurture', label: 'Nurturing' },
  { value: 'closing', label: 'Cierre' },
  { value: 'meeting', label: 'Reuniones' },
  { value: 'quote', label: 'Cotizaciones' },
  { value: 'other', label: 'Otro' },
];

const TONE_OPTIONS = [
  { value: 'professional', label: 'Profesional', description: 'Formal y corporativo' },
  { value: 'friendly', label: 'Amigable', description: 'Cercano pero profesional' },
  { value: 'persuasive', label: 'Persuasivo', description: 'Enfocado en beneficios' },
  { value: 'urgent', label: 'Urgente', description: 'Con sentido de urgencia' },
];

const AVAILABLE_VARIABLES = [
  { category: 'Contacto', variables: [
    { name: '{{contact.firstName}}', description: 'Nombre del contacto' },
    { name: '{{contact.lastName}}', description: 'Apellido del contacto' },
    { name: '{{contact.fullName}}', description: 'Nombre completo' },
    { name: '{{contact.email}}', description: 'Email del contacto' },
    { name: '{{contact.phone}}', description: 'Teléfono' },
    { name: '{{contact.position}}', description: 'Cargo' },
  ]},
  { category: 'Cliente/Empresa', variables: [
    { name: '{{client.name}}', description: 'Nombre de la empresa' },
    { name: '{{client.industry}}', description: 'Industria' },
    { name: '{{client.website}}', description: 'Sitio web' },
  ]},
  { category: 'Negocio', variables: [
    { name: '{{deal.title}}', description: 'Título del negocio' },
    { name: '{{deal.value}}', description: 'Valor formateado' },
    { name: '{{deal.stage}}', description: 'Etapa actual' },
  ]},
  { category: 'Usuario', variables: [
    { name: '{{user.name}}', description: 'Tu nombre' },
    { name: '{{user.email}}', description: 'Tu email' },
    { name: '{{user.phone}}', description: 'Tu teléfono' },
    { name: '{{user.signature}}', description: 'Tu firma' },
  ]},
  { category: 'Fecha', variables: [
    { name: '{{today}}', description: 'Fecha de hoy' },
    { name: '{{tomorrow}}', description: 'Mañana' },
    { name: '{{nextWeek}}', description: 'En 7 días' },
  ]},
];

const DEFAULT_CONTENT: IEmailContent = {
  blocks: [
    {
      id: 'block-1',
      type: 'text',
      content: '<p style="margin: 0;">Hola {{contact.firstName}},</p>',
      styles: { padding: '20px', backgroundColor: '#ffffff' },
    },
    {
      id: 'block-2',
      type: 'text',
      content: '<p style="margin: 0; line-height: 1.6;">Escribe el contenido de tu correo aquí...</p>',
      styles: { padding: '20px', backgroundColor: '#ffffff' },
    },
    {
      id: 'block-3',
      type: 'text',
      content: '<p style="margin: 0;">Saludos,<br/>{{user.name}}</p>',
      styles: { padding: '20px', backgroundColor: '#ffffff' },
    },
  ],
  globalStyles: {
    backgroundColor: '#f5f5f5',
    contentWidth: 600,
    fontFamily: 'Arial, sans-serif',
    textColor: '#333333',
    linkColor: '#10B981',
  },
};

export default function NewEmailTemplatePage() {
  const { data: session } = useSession();
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showVariablesHelp, setShowVariablesHelp] = useState(false);
  const [copiedVariable, setCopiedVariable] = useState<string | null>(null);

  // AI Generation State
  const [showAIPanel, setShowAIPanel] = useState(false);
  const [aiDescription, setAiDescription] = useState('');
  const [aiTone, setAiTone] = useState('professional');
  const [generating, setGenerating] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);

  // Form state
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('other');
  const [subject, setSubject] = useState('');
  const [isShared, setIsShared] = useState(false);
  const [content, setContent] = useState<IEmailContent>(DEFAULT_CONTENT);

  const copyVariable = (variable: string) => {
    navigator.clipboard.writeText(variable);
    setCopiedVariable(variable);
    setTimeout(() => setCopiedVariable(null), 2000);
  };

  // Generar plantilla con IA
  const handleAIGenerate = async () => {
    if (!aiDescription.trim() || aiDescription.trim().length < 10) {
      setAiError('Por favor describe con más detalle lo que necesitas (mínimo 10 caracteres)');
      return;
    }

    setGenerating(true);
    setAiError(null);

    try {
      const res = await fetch('/api/crm/email-templates/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          description: aiDescription,
          category,
          tone: aiTone,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setAiError(data.error || 'Error al generar la plantilla');
        return;
      }

      // Update subject
      if (data.subject) {
        setSubject(data.subject);
      }

      // Convert body to visual blocks
      if (data.body) {
        const newContent: IEmailContent = {
          blocks: [
            {
              id: `block-${Date.now()}`,
              type: 'text',
              content: data.body,
              styles: { padding: '20px', backgroundColor: '#ffffff' },
            },
          ],
          globalStyles: content.globalStyles,
        };
        setContent(newContent);
      }

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
    if (!name.trim() || !subject.trim()) {
      alert('Por favor completa nombre y asunto');
      return;
    }

    setSaving(true);
    try {
      const res = await fetch('/api/crm/email-templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          description,
          category,
          subject,
          blocks: content.blocks,
          globalStyles: content.globalStyles,
          isShared,
        }),
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
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900">
      <Navbar />
      <div className="pt-16 main-content">
        {/* Header */}
        <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-4 py-3">
          <div className="max-w-7xl mx-auto flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={() => router.push('/crm/email-templates')}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
              >
                <ArrowLeft size={20} className="text-gray-500" />
              </button>
              <div>
                <h1 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                  <FileText size={20} className="text-emerald-600" />
                  Nueva Plantilla CRM
                </h1>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setShowAIPanel(!showAIPanel)}
                className="flex items-center gap-2 px-3 py-2 text-purple-700 dark:text-purple-300 bg-purple-50 dark:bg-purple-900/30 hover:bg-purple-100 dark:hover:bg-purple-900/50 rounded-lg border border-purple-200 dark:border-purple-700"
              >
                <Sparkles size={18} />
                Generar con IA
              </button>
              <button
                onClick={() => setShowSettings(true)}
                className="flex items-center gap-2 px-3 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
              >
                <Settings size={18} />
                Configuración
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50"
              >
                {saving ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
                Guardar
              </button>
            </div>
          </div>
        </div>

        {/* AI Panel */}
        {showAIPanel && (
          <div className="bg-gradient-to-r from-purple-50 to-indigo-50 dark:from-purple-900/20 dark:to-indigo-900/20 border-b border-purple-200 dark:border-purple-800 px-4 py-4">
            <div className="max-w-3xl mx-auto space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-purple-800 dark:text-purple-200 flex items-center gap-2">
                  <Wand2 size={18} />
                  Generar plantilla con IA
                </h3>
                <button onClick={() => setShowAIPanel(false)} className="text-purple-600 hover:text-purple-800">
                  <X size={18} />
                </button>
              </div>

              <textarea
                value={aiDescription}
                onChange={(e) => { setAiDescription(e.target.value); setAiError(null); }}
                placeholder="Ej: Un email de seguimiento para prospectos que no han respondido en 2 semanas..."
                rows={3}
                className="w-full px-3 py-2 border border-purple-300 dark:border-purple-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
              />

              <div className="flex flex-wrap gap-2">
                {TONE_OPTIONS.map((tone) => (
                  <button
                    key={tone.value}
                    onClick={() => setAiTone(tone.value)}
                    className={`px-3 py-1.5 rounded-lg text-sm transition ${
                      aiTone === tone.value
                        ? 'bg-purple-600 text-white'
                        : 'bg-white dark:bg-gray-800 border border-purple-300 dark:border-purple-700 text-purple-700 dark:text-purple-300'
                    }`}
                  >
                    {tone.label}
                  </button>
                ))}
              </div>

              {aiError && (
                <div className="flex items-center gap-2 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-700 dark:text-red-300 text-sm">
                  <AlertCircle size={16} />
                  {aiError}
                </div>
              )}

              <button
                onClick={handleAIGenerate}
                disabled={generating || aiDescription.trim().length < 10}
                className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50"
              >
                {generating ? <Loader2 size={18} className="animate-spin" /> : <Wand2 size={18} />}
                {generating ? 'Generando...' : 'Generar'}
              </button>
            </div>
          </div>
        )}

        {/* Variables Help */}
        <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-4">
          <div className="max-w-7xl mx-auto">
            <button
              onClick={() => setShowVariablesHelp(!showVariablesHelp)}
              className="w-full flex items-center justify-between py-3 text-left"
            >
              <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                <Info size={16} className="text-emerald-600" />
                Variables disponibles para personalización
              </div>
              <ChevronDown size={16} className={`text-gray-400 transition-transform ${showVariablesHelp ? 'rotate-180' : ''}`} />
            </button>

            {showVariablesHelp && (
              <div className="pb-4 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
                {AVAILABLE_VARIABLES.map((group) => (
                  <div key={group.category}>
                    <h4 className="text-xs font-semibold text-gray-500 uppercase mb-2">{group.category}</h4>
                    <div className="space-y-1">
                      {group.variables.map((v) => (
                        <button
                          key={v.name}
                          onClick={() => copyVariable(v.name)}
                          className="w-full flex items-center justify-between gap-1 px-2 py-1 rounded text-left hover:bg-gray-100 dark:hover:bg-gray-700 group"
                        >
                          <code className="text-xs text-emerald-600 dark:text-emerald-400 truncate">{v.name}</code>
                          {copiedVariable === v.name ? (
                            <Check size={12} className="text-green-500 flex-shrink-0" />
                          ) : (
                            <Copy size={12} className="text-gray-400 opacity-0 group-hover:opacity-100 flex-shrink-0" />
                          )}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Editor */}
        <div className="p-4">
          <EmailBlockEditor
            value={content}
            onChange={setContent}
          />
        </div>
      </div>

      {/* Settings Modal */}
      {showSettings && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                Configuración de la Plantilla
              </h2>
              <button
                onClick={() => setShowSettings(false)}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
              >
                <X size={20} />
              </button>
            </div>
            <div className="p-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Nombre de la Plantilla *
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ej: Seguimiento de propuesta"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Descripción
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Breve descripción del uso..."
                  rows={2}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Categoría
                </label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                >
                  {CATEGORY_OPTIONS.map(opt => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Asunto del Correo *
                </label>
                <input
                  type="text"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder="Ej: {{contact.firstName}}, seguimiento de nuestra conversación"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
                <p className="text-xs text-gray-500 mt-1">Usa variables como {'{{contact.firstName}}'}</p>
              </div>

              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="isShared"
                  checked={isShared}
                  onChange={(e) => setIsShared(e.target.checked)}
                  className="w-4 h-4 rounded border-gray-300"
                />
                <label htmlFor="isShared" className="text-sm text-gray-700 dark:text-gray-300">
                  Compartir con todo el equipo
                </label>
              </div>
            </div>
            <div className="p-4 border-t border-gray-200 dark:border-gray-700 flex justify-end">
              <button
                onClick={() => setShowSettings(false)}
                className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700"
              >
                Listo
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
