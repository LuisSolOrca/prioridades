'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter, useParams } from 'next/navigation';
import Navbar from '@/components/Navbar';
import EmailBlockEditor, { IEmailContent } from '@/components/marketing/EmailBlockEditor';
import {
  ArrowLeft,
  Save,
  Loader2,
  FileText,
  Trash2,
  ChevronDown,
  Info,
  Copy,
  Check,
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
  blocks: [],
  globalStyles: {
    backgroundColor: '#f5f5f5',
    contentWidth: 600,
    fontFamily: 'Arial, sans-serif',
    textColor: '#333333',
    linkColor: '#10B981',
  },
};

export default function EditEmailTemplatePage() {
  const { data: session } = useSession();
  const router = useRouter();
  const params = useParams();
  const templateId = params.id as string;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showVariablesHelp, setShowVariablesHelp] = useState(false);
  const [copiedVariable, setCopiedVariable] = useState<string | null>(null);
  const [isSystemTemplate, setIsSystemTemplate] = useState(false);

  // Form state
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('other');
  const [subject, setSubject] = useState('');
  const [isShared, setIsShared] = useState(false);
  const [content, setContent] = useState<IEmailContent>(DEFAULT_CONTENT);

  useEffect(() => {
    if (templateId) {
      loadTemplate();
    }
  }, [templateId]);

  const loadTemplate = async () => {
    try {
      const res = await fetch(`/api/crm/email-templates/${templateId}`);
      if (res.ok) {
        const template = await res.json();
        setName(template.isSystem ? `${template.name} (copia)` : template.name);
        setDescription(template.description || '');
        setCategory(template.category || 'other');
        setSubject(template.subject || '');
        setIsShared(template.isShared || false);
        setIsSystemTemplate(template.isSystem || false);

        // Load blocks if available, otherwise convert body to single block
        if (template.blocks && template.blocks.length > 0) {
          setContent({
            blocks: template.blocks,
            globalStyles: template.globalStyles || DEFAULT_CONTENT.globalStyles,
          });
        } else if (template.body) {
          setContent({
            blocks: [{
              id: `block-${Date.now()}`,
              type: 'text',
              content: template.body,
              styles: { padding: '20px', backgroundColor: '#ffffff' },
            }],
            globalStyles: DEFAULT_CONTENT.globalStyles,
          });
        }
      } else {
        alert('No se pudo cargar el template');
        router.push('/crm/email-templates');
      }
    } catch (error) {
      console.error('Error loading template:', error);
      router.push('/crm/email-templates');
    } finally {
      setLoading(false);
    }
  };

  const copyVariable = (variable: string) => {
    navigator.clipboard.writeText(variable);
    setCopiedVariable(variable);
    setTimeout(() => setCopiedVariable(null), 2000);
  };

  const handleSave = async () => {
    if (!name.trim() || !subject.trim()) {
      alert('Por favor completa nombre y asunto');
      return;
    }

    setSaving(true);
    try {
      // If system template, create a copy
      if (isSystemTemplate) {
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
          alert(error.error || 'Error al guardar');
        }
      } else {
        // Update existing
        const res = await fetch(`/api/crm/email-templates/${templateId}`, {
          method: 'PUT',
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
          alert(error.error || 'Error al actualizar');
        }
      }
    } catch (error) {
      console.error('Error saving template:', error);
      alert('Error al guardar');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      const res = await fetch(`/api/crm/email-templates/${templateId}`, {
        method: 'DELETE',
      });

      if (res.ok) {
        router.push('/crm/email-templates');
      } else {
        const error = await res.json();
        alert(error.error || 'Error al eliminar');
      }
    } catch (error) {
      console.error('Error deleting template:', error);
      alert('Error al eliminar');
    } finally {
      setDeleting(false);
    }
  };

  if (!session) return null;

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <Loader2 className="animate-spin text-emerald-600" size={40} />
      </div>
    );
  }

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
                  {isSystemTemplate ? 'Crear desde Template' : 'Editar Plantilla'}
                </h1>
                {isSystemTemplate && (
                  <p className="text-xs text-emerald-600 mt-0.5">Basado en template de sistema</p>
                )}
              </div>
            </div>
            <div className="flex items-center gap-3">
              {!isSystemTemplate && (
                <button
                  onClick={() => setShowDeleteModal(true)}
                  className="flex items-center gap-2 px-3 py-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg"
                >
                  <Trash2 size={18} />
                </button>
              )}
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
                {isSystemTemplate ? 'Crear Copia' : 'Guardar'}
              </button>
            </div>
          </div>
        </div>

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
