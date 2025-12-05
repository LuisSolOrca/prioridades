'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter, useParams } from 'next/navigation';
import EmailBlockEditor, { IEmailContent } from '@/components/marketing/EmailBlockEditor';
import {
  Save,
  ChevronLeft,
  Loader2,
  Layout,
  Settings,
  X,
  Copy,
  Sparkles,
  RefreshCw,
  Lightbulb,
  FlaskConical,
} from 'lucide-react';
import Link from 'next/link';

const CATEGORY_OPTIONS = [
  { value: 'welcome', label: 'Bienvenida' },
  { value: 'newsletter', label: 'Newsletter' },
  { value: 'promotional', label: 'Promocional' },
  { value: 'announcement', label: 'Anuncio' },
  { value: 'event', label: 'Evento' },
  { value: 'follow_up', label: 'Seguimiento' },
  { value: 'transactional', label: 'Transaccional' },
  { value: 'seasonal', label: 'Temporada' },
  { value: 'other', label: 'Otro' },
];

const DEFAULT_CONTENT: IEmailContent = {
  blocks: [],
  globalStyles: {
    backgroundColor: '#f5f5f5',
    contentWidth: 600,
    fontFamily: 'Arial, sans-serif',
    textColor: '#333333',
    linkColor: '#3B82F6',
  },
};

export default function EditEmailTemplatePage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const params = useParams();
  const templateId = params.id as string;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [isSystemTemplate, setIsSystemTemplate] = useState(false);

  // Form state
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('other');
  const [subject, setSubject] = useState('');
  const [preheader, setPreheader] = useState('');
  const [isPublic, setIsPublic] = useState(false);
  const [content, setContent] = useState<IEmailContent>(DEFAULT_CONTENT);

  // A/B Subject Line Testing
  const [showSubjectAB, setShowSubjectAB] = useState(false);
  const [subjectVariants, setSubjectVariants] = useState<any[]>([]);
  const [generatingVariants, setGeneratingVariants] = useState(false);
  const [variantsError, setVariantsError] = useState('');

  useEffect(() => {
    if (status === 'authenticated' && templateId) {
      loadTemplate();
    }
  }, [status, templateId]);

  const loadTemplate = async () => {
    try {
      // First try to get from the API with action=get
      const res = await fetch('/api/marketing/email-templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ templateId, action: 'get' }),
      });

      if (res.ok) {
        const template = await res.json();
        setName(template.isSystem ? `${template.name} (copia)` : template.name);
        setDescription(template.description || '');
        setCategory(template.category || 'other');
        setSubject(template.subject || '');
        setPreheader(template.preheader || '');
        setIsPublic(template.isPublic || false);
        setIsSystemTemplate(template.isSystem || false);
        setContent({
          blocks: template.blocks || [],
          globalStyles: template.globalStyles || DEFAULT_CONTENT.globalStyles,
        });
      } else {
        alert('No se pudo cargar el template');
        router.push('/marketing/email-templates');
      }
    } catch (error) {
      console.error('Error loading template:', error);
      router.push('/marketing/email-templates');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!name.trim() || !subject.trim()) {
      alert('Por favor completa el nombre y el asunto del template');
      return;
    }

    setSaving(true);
    try {
      // If it's a system template, create a new one based on it
      if (isSystemTemplate) {
        const res = await fetch('/api/marketing/email-templates', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name,
            description,
            category,
            subject,
            preheader,
            blocks: content.blocks,
            globalStyles: content.globalStyles,
            isPublic,
          }),
        });

        if (res.ok) {
          router.push('/marketing/email-templates');
        } else {
          const data = await res.json();
          alert(data.error || 'Error al guardar el template');
        }
      } else {
        // Update existing template
        const res = await fetch(`/api/marketing/email-templates/${templateId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name,
            description,
            category,
            subject,
            preheader,
            blocks: content.blocks,
            globalStyles: content.globalStyles,
            isPublic,
          }),
        });

        if (res.ok) {
          router.push('/marketing/email-templates');
        } else {
          const data = await res.json();
          alert(data.error || 'Error al actualizar el template');
        }
      }
    } catch (error) {
      console.error('Error saving template:', error);
      alert('Error al guardar el template');
    } finally {
      setSaving(false);
    }
  };

  const generateSubjectVariants = async () => {
    setGeneratingVariants(true);
    setVariantsError('');
    setSubjectVariants([]);

    try {
      const response = await fetch('/api/ai/generate-marketing-content', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contentType: 'email-subject-ab',
          context: `Asunto actual: ${subject || 'Sin asunto definido'}. Categoría: ${category}. ${description || ''}`,
          tone: 'professional',
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Error al generar variantes');
      }

      const data = await response.json();
      if (data.content?.variants) {
        setSubjectVariants(data.content.variants);
      }
    } catch (err: any) {
      setVariantsError(err.message);
    } finally {
      setGeneratingVariants(false);
    }
  };

  if (status === 'loading' || loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <Loader2 className="animate-spin text-blue-600" size={40} />
      </div>
    );
  }

  if (status === 'unauthenticated') {
    router.push('/login');
    return null;
  }

  return (
    <div className="bg-gray-100 dark:bg-gray-900 min-h-[calc(100vh-4rem)]">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-4 py-3">
          <div className="max-w-7xl mx-auto flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link
                href="/marketing/email-templates"
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
              >
                <ChevronLeft size={20} className="text-gray-500" />
              </Link>
              <div>
                <h1 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                  <Layout size={20} className="text-blue-600" />
                  {isSystemTemplate ? 'Crear desde Template' : 'Editar Template'}
                </h1>
                {isSystemTemplate && (
                  <p className="text-xs text-blue-600 flex items-center gap-1 mt-0.5">
                    <Copy size={12} />
                    Basado en template de sistema
                  </p>
                )}
              </div>
            </div>
            <div className="flex items-center gap-3">
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
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                {saving ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
                {isSystemTemplate ? 'Crear Copia' : 'Guardar'}
              </button>
            </div>
          </div>
        </div>

      {/* Editor */}
      <div className="p-4">
        <EmailBlockEditor
          value={content}
          onChange={setContent}
        />
      </div>

      {/* Settings Modal */}
      {showSettings && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                Configuración del Template
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
                  Nombre del Template *
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ej: Newsletter Mensual"
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
                  placeholder="Breve descripción del template..."
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
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Asunto del Email *
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      setShowSubjectAB(!showSubjectAB);
                      if (!showSubjectAB && subjectVariants.length === 0) {
                        generateSubjectVariants();
                      }
                    }}
                    className="flex items-center gap-1.5 px-2.5 py-1 text-xs bg-gradient-to-r from-purple-500 to-indigo-500 text-white rounded-md hover:from-purple-600 hover:to-indigo-600 transition-all"
                  >
                    <FlaskConical className="w-3.5 h-3.5" />
                    Test A/B
                  </button>
                </div>
                <input
                  type="text"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder="Ej: {{firstName}}, tenemos novedades para ti"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
                <p className="text-xs text-gray-500 mt-1">Usa variables como {"{{firstName}}"} para personalizar</p>

                {/* A/B Subject Variants Panel */}
                {showSubjectAB && (
                  <div className="mt-3 p-3 bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-700 rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <h5 className="text-sm font-medium text-purple-900 dark:text-purple-300 flex items-center gap-2">
                        <Sparkles className="w-4 h-4" />
                        Variantes para Test A/B
                      </h5>
                      <button
                        onClick={generateSubjectVariants}
                        disabled={generatingVariants}
                        className="p-1 text-purple-600 hover:text-purple-700 disabled:opacity-50"
                        title="Regenerar variantes"
                      >
                        <RefreshCw className={`w-4 h-4 ${generatingVariants ? 'animate-spin' : ''}`} />
                      </button>
                    </div>

                    {generatingVariants && (
                      <div className="flex items-center gap-2 py-4 justify-center text-sm text-purple-600">
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        Generando variantes con IA...
                      </div>
                    )}

                    {variantsError && (
                      <p className="text-sm text-red-600 py-2">{variantsError}</p>
                    )}

                    {!generatingVariants && subjectVariants.length > 0 && (
                      <div className="space-y-2 max-h-60 overflow-y-auto">
                        {subjectVariants.map((variant, idx) => (
                          <button
                            key={idx}
                            onClick={() => setSubject(variant.text)}
                            className="w-full text-left p-2.5 rounded-lg border border-purple-200 dark:border-purple-600 hover:border-purple-400 dark:hover:border-purple-500 hover:bg-white dark:hover:bg-purple-900/30 transition-colors"
                          >
                            <p className="text-sm font-medium text-gray-900 dark:text-white">
                              {variant.text}
                            </p>
                            <div className="flex items-center gap-2 mt-1">
                              <span className="text-xs px-1.5 py-0.5 bg-purple-100 dark:bg-purple-800 text-purple-700 dark:text-purple-300 rounded">
                                {variant.strategy === 'curiosity' ? 'Curiosidad' :
                                 variant.strategy === 'benefit' ? 'Beneficio' :
                                 variant.strategy === 'urgency' ? 'Urgencia' :
                                 variant.strategy === 'personal' ? 'Personal' :
                                 variant.strategy === 'question' ? 'Pregunta' :
                                 variant.strategy === 'number' ? 'Número' : variant.strategy}
                              </span>
                            </div>
                            {variant.explanation && (
                              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 flex items-start gap-1">
                                <Lightbulb className="w-3 h-3 mt-0.5 flex-shrink-0" />
                                {variant.explanation}
                              </p>
                            )}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Preheader
                </label>
                <input
                  type="text"
                  value={preheader}
                  onChange={(e) => setPreheader(e.target.value)}
                  placeholder="Texto que aparece después del asunto en la bandeja"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>

              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="isPublic"
                  checked={isPublic}
                  onChange={(e) => setIsPublic(e.target.checked)}
                  className="w-4 h-4 rounded border-gray-300"
                />
                <label htmlFor="isPublic" className="text-sm text-gray-700 dark:text-gray-300">
                  Compartir con todo el equipo
                </label>
              </div>
            </div>
            <div className="p-4 border-t border-gray-200 dark:border-gray-700 flex justify-end">
              <button
                onClick={() => setShowSettings(false)}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
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
