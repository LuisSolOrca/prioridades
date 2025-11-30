'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import dynamic from 'next/dynamic';
import {
  Mail,
  Eye,
  EyeOff,
  Bold,
  Italic,
  Link as LinkIcon,
  List,
  ListOrdered,
  Variable,
  Save,
  FolderOpen,
  X,
  ChevronDown,
  User,
  Building2,
  Briefcase,
  UserCircle,
  Calendar,
  Check,
  Search,
  Plus,
  Sparkles,
  Code,
  Type,
} from 'lucide-react';

// Dynamic import to avoid SSR issues with TipTap
const RichTextEditor = dynamic(() => import('./RichTextEditor'), {
  ssr: false,
  loading: () => (
    <div className="border border-gray-300 dark:border-gray-600 rounded-lg p-4 min-h-[250px] bg-gray-50 dark:bg-gray-800 animate-pulse">
      <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4 mb-2"></div>
      <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/2"></div>
    </div>
  ),
});

interface EmailTemplateEditorProps {
  subject: string;
  body: string;
  onSubjectChange: (subject: string) => void;
  onBodyChange: (body: string) => void;
  onSaveAsTemplate?: () => void;
  onSelectTemplate?: (template: { subject: string; body: string }) => void;
  showTemplateLibrary?: boolean;
  compact?: boolean;
}

interface Template {
  _id: string;
  name: string;
  subject: string;
  body: string;
  category: string;
  usageCount: number;
}

// Available variables grouped by category
const VARIABLE_GROUPS = [
  {
    label: 'Contacto',
    icon: User,
    color: 'blue',
    variables: [
      { key: 'contact.firstName', label: 'Nombre', example: 'Juan' },
      { key: 'contact.lastName', label: 'Apellido', example: 'Pérez' },
      { key: 'contact.fullName', label: 'Nombre completo', example: 'Juan Pérez' },
      { key: 'contact.email', label: 'Email', example: 'juan@empresa.com' },
      { key: 'contact.phone', label: 'Teléfono', example: '+52 55 1234 5678' },
      { key: 'contact.position', label: 'Cargo', example: 'Director de TI' },
    ],
  },
  {
    label: 'Empresa',
    icon: Building2,
    color: 'emerald',
    variables: [
      { key: 'client.name', label: 'Nombre empresa', example: 'Empresa ABC' },
      { key: 'client.industry', label: 'Industria', example: 'Tecnología' },
      { key: 'client.website', label: 'Sitio web', example: 'www.empresa.com' },
    ],
  },
  {
    label: 'Oportunidad',
    icon: Briefcase,
    color: 'purple',
    variables: [
      { key: 'deal.title', label: 'Título deal', example: 'Implementación CRM' },
      { key: 'deal.value', label: 'Valor', example: '$150,000' },
      { key: 'deal.stage', label: 'Etapa', example: 'Propuesta' },
    ],
  },
  {
    label: 'Remitente',
    icon: UserCircle,
    color: 'amber',
    variables: [
      { key: 'user.name', label: 'Tu nombre', example: 'María García' },
      { key: 'user.email', label: 'Tu email', example: 'maria@miempresa.com' },
      { key: 'user.phone', label: 'Tu teléfono', example: '+52 55 9876 5432' },
      { key: 'user.signature', label: 'Tu firma', example: 'María García\nGerente de Ventas' },
    ],
  },
  {
    label: 'Fechas',
    icon: Calendar,
    color: 'rose',
    variables: [
      { key: 'date.today', label: 'Hoy', example: '28 de noviembre, 2025' },
      { key: 'date.tomorrow', label: 'Mañana', example: '29 de noviembre, 2025' },
      { key: 'date.nextWeek', label: 'Próxima semana', example: '5 de diciembre, 2025' },
    ],
  },
];

const CATEGORY_LABELS: Record<string, string> = {
  outreach: 'Prospección',
  follow_up: 'Seguimiento',
  nurture: 'Nutrición',
  closing: 'Cierre',
  other: 'Otros',
};

export default function EmailTemplateEditor({
  subject,
  body,
  onSubjectChange,
  onBodyChange,
  onSaveAsTemplate,
  onSelectTemplate,
  showTemplateLibrary = true,
  compact = false,
}: EmailTemplateEditorProps) {
  const [showPreview, setShowPreview] = useState(false);
  const [showVariables, setShowVariables] = useState(false);
  const [showTemplates, setShowTemplates] = useState(false);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loadingTemplates, setLoadingTemplates] = useState(false);
  const [templateSearch, setTemplateSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [activeField, setActiveField] = useState<'subject' | 'body'>('body');
  const [useRichEditor, setUseRichEditor] = useState(true);

  const subjectRef = useRef<HTMLInputElement>(null);
  const bodyRef = useRef<HTMLTextAreaElement>(null);

  // Load templates when modal opens
  useEffect(() => {
    if (showTemplates && templates.length === 0) {
      loadTemplates();
    }
  }, [showTemplates]);

  const loadTemplates = async () => {
    setLoadingTemplates(true);
    try {
      const res = await fetch('/api/crm/email-templates');
      if (res.ok) {
        const data = await res.json();
        setTemplates(data);
      }
    } catch (error) {
      console.error('Error loading templates:', error);
    } finally {
      setLoadingTemplates(false);
    }
  };

  const insertVariable = useCallback((variableKey: string) => {
    const variable = `{{${variableKey}}}`;

    if (activeField === 'subject' && subjectRef.current) {
      const input = subjectRef.current;
      const start = input.selectionStart || 0;
      const end = input.selectionEnd || 0;
      const newValue = subject.slice(0, start) + variable + subject.slice(end);
      onSubjectChange(newValue);
      // Reset cursor position after React updates
      setTimeout(() => {
        input.focus();
        input.setSelectionRange(start + variable.length, start + variable.length);
      }, 0);
    } else if (activeField === 'body' && bodyRef.current) {
      const textarea = bodyRef.current;
      const start = textarea.selectionStart || 0;
      const end = textarea.selectionEnd || 0;
      const newValue = body.slice(0, start) + variable + body.slice(end);
      onBodyChange(newValue);
      setTimeout(() => {
        textarea.focus();
        textarea.setSelectionRange(start + variable.length, start + variable.length);
      }, 0);
    }

    setShowVariables(false);
  }, [activeField, subject, body, onSubjectChange, onBodyChange]);

  const insertFormatting = (format: 'bold' | 'italic' | 'link' | 'list' | 'ordered') => {
    if (activeField !== 'body' || !bodyRef.current) return;

    const textarea = bodyRef.current;
    const start = textarea.selectionStart || 0;
    const end = textarea.selectionEnd || 0;
    const selectedText = body.slice(start, end);

    let newText = '';
    let cursorOffset = 0;

    switch (format) {
      case 'bold':
        newText = `**${selectedText || 'texto'}**`;
        cursorOffset = selectedText ? newText.length : 2;
        break;
      case 'italic':
        newText = `_${selectedText || 'texto'}_`;
        cursorOffset = selectedText ? newText.length : 1;
        break;
      case 'link':
        newText = `[${selectedText || 'texto'}](url)`;
        cursorOffset = selectedText ? newText.length - 1 : 1;
        break;
      case 'list':
        newText = `\n• ${selectedText || 'elemento'}`;
        cursorOffset = newText.length;
        break;
      case 'ordered':
        newText = `\n1. ${selectedText || 'elemento'}`;
        cursorOffset = newText.length;
        break;
    }

    const newValue = body.slice(0, start) + newText + body.slice(end);
    onBodyChange(newValue);

    setTimeout(() => {
      textarea.focus();
      const newPos = start + cursorOffset;
      textarea.setSelectionRange(newPos, newPos);
    }, 0);
  };

  const applyTemplate = (template: Template) => {
    onSubjectChange(template.subject);
    onBodyChange(template.body);
    setShowTemplates(false);
    onSelectTemplate?.({ subject: template.subject, body: template.body });
  };

  // Preview with variables replaced with example values
  const getPreviewContent = (text: string) => {
    let preview = text;
    VARIABLE_GROUPS.forEach(group => {
      group.variables.forEach(v => {
        const regex = new RegExp(`\\{\\{${v.key}\\}\\}`, 'g');
        preview = preview.replace(regex, `<span class="bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 px-1 rounded">${v.example}</span>`);
      });
    });
    // Convert markdown-like formatting for preview
    preview = preview
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/_(.*?)_/g, '<em>$1</em>')
      .replace(/\[(.*?)\]\((.*?)\)/g, '<a href="$2" class="text-blue-600 underline">$1</a>')
      .replace(/\n/g, '<br>');
    return preview;
  };

  const filteredTemplates = templates.filter(t => {
    const matchesSearch = !templateSearch ||
      t.name.toLowerCase().includes(templateSearch.toLowerCase()) ||
      t.subject.toLowerCase().includes(templateSearch.toLowerCase());
    const matchesCategory = !selectedCategory || t.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="space-y-3">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2 p-2 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
        {/* Editor mode toggle */}
        <div className="flex items-center gap-1 border-r border-gray-300 dark:border-gray-600 pr-2">
          <button
            type="button"
            onClick={() => setUseRichEditor(true)}
            className={`flex items-center gap-1 px-2 py-1 rounded text-sm ${
              useRichEditor
                ? 'bg-indigo-100 dark:bg-indigo-900 text-indigo-700 dark:text-indigo-300'
                : 'text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
            }`}
            title="Editor visual"
          >
            <Type size={14} />
            Visual
          </button>
          <button
            type="button"
            onClick={() => setUseRichEditor(false)}
            className={`flex items-center gap-1 px-2 py-1 rounded text-sm ${
              !useRichEditor
                ? 'bg-indigo-100 dark:bg-indigo-900 text-indigo-700 dark:text-indigo-300'
                : 'text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
            }`}
            title="Editor HTML"
          >
            <Code size={14} />
            HTML
          </button>
        </div>

        {/* Variables button */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setShowVariables(!showVariables)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition ${
              showVariables
                ? 'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300'
                : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600 border border-gray-300 dark:border-gray-600'
            }`}
          >
            <Variable size={16} />
            Variables
            <ChevronDown size={14} className={`transition ${showVariables ? 'rotate-180' : ''}`} />
          </button>

          {/* Variables dropdown */}
          {showVariables && (
            <div className="absolute top-full left-0 mt-1 w-80 bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-gray-200 dark:border-gray-700 z-50 max-h-96 overflow-y-auto">
              <div className="p-2 border-b border-gray-200 dark:border-gray-700">
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Haz clic en una variable para insertarla en {activeField === 'subject' ? 'el asunto' : 'el cuerpo'}
                </p>
              </div>
              {VARIABLE_GROUPS.map((group) => {
                const Icon = group.icon;
                return (
                  <div key={group.label} className="p-2 border-b border-gray-100 dark:border-gray-700 last:border-b-0">
                    <div className="flex items-center gap-2 mb-2">
                      <div className={`p-1 rounded bg-${group.color}-100 dark:bg-${group.color}-900/30`}>
                        <Icon size={14} className={`text-${group.color}-600 dark:text-${group.color}-400`} />
                      </div>
                      <span className="text-xs font-semibold text-gray-700 dark:text-gray-300">
                        {group.label}
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-1">
                      {group.variables.map((v) => (
                        <button
                          key={v.key}
                          type="button"
                          onClick={() => insertVariable(v.key)}
                          className="text-left px-2 py-1.5 text-xs rounded hover:bg-gray-100 dark:hover:bg-gray-700 transition group"
                        >
                          <span className="text-gray-700 dark:text-gray-300 group-hover:text-blue-600 dark:group-hover:text-blue-400">
                            {v.label}
                          </span>
                          <span className="block text-gray-400 dark:text-gray-500 text-[10px] truncate">
                            {v.example}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Template library button */}
        {showTemplateLibrary && (
          <button
            type="button"
            onClick={() => setShowTemplates(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600 border border-gray-300 dark:border-gray-600 rounded-lg text-sm font-medium transition"
          >
            <FolderOpen size={16} />
            Plantillas
          </button>
        )}

        {/* Spacer */}
        <div className="flex-1" />

        {/* Preview toggle */}
        <button
          type="button"
          onClick={() => setShowPreview(!showPreview)}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition ${
            showPreview
              ? 'bg-emerald-100 dark:bg-emerald-900 text-emerald-700 dark:text-emerald-300'
              : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600 border border-gray-300 dark:border-gray-600'
          }`}
        >
          {showPreview ? <EyeOff size={16} /> : <Eye size={16} />}
          Vista previa
        </button>

        {/* Save as template */}
        {onSaveAsTemplate && (
          <button
            type="button"
            onClick={onSaveAsTemplate}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white hover:bg-blue-700 rounded-lg text-sm font-medium transition"
          >
            <Save size={16} />
            Guardar plantilla
          </button>
        )}
      </div>

      {/* Editor / Preview */}
      <div className={`grid gap-4 ${showPreview ? 'grid-cols-2' : 'grid-cols-1'}`}>
        {/* Editor */}
        <div className="space-y-3">
          {/* Subject */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Asunto del correo
            </label>
            <input
              ref={subjectRef}
              type="text"
              value={subject}
              onChange={(e) => onSubjectChange(e.target.value)}
              onFocus={() => setActiveField('subject')}
              placeholder="Ej: Hola {{contact.firstName}}, tenemos una propuesta para ti"
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* Body */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Cuerpo del mensaje
            </label>
            {useRichEditor ? (
              <RichTextEditor
                content={body}
                onChange={onBodyChange}
                placeholder="Escribe tu mensaje aquí... Puedes usar variables como {{contact.firstName}}"
                minHeight={compact ? '200px' : '300px'}
              />
            ) : (
              <>
                <textarea
                  ref={bodyRef}
                  value={body}
                  onChange={(e) => onBodyChange(e.target.value)}
                  onFocus={() => setActiveField('body')}
                  placeholder={`<p>Hola {{contact.firstName}},</p>

<p>Espero que te encuentres bien. Me pongo en contacto contigo porque...</p>

<h3>Beneficios para {{client.name}}:</h3>
<ul>
  <li>Beneficio 1</li>
  <li>Beneficio 2</li>
  <li>Beneficio 3</li>
</ul>

<p>¿Te gustaría agendar una llamada para {{date.nextWeek}}?</p>

<p>Saludos,<br>{{user.signature}}</p>`}
                  rows={compact ? 8 : 12}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono text-sm resize-y"
                />
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  Modo HTML: puedes usar etiquetas HTML como &lt;p&gt;, &lt;strong&gt;, &lt;ul&gt;, &lt;img&gt;, etc.
                </p>
              </>
            )}
          </div>
        </div>

        {/* Preview */}
        {showPreview && (
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Vista previa del asunto
              </label>
              <div
                className="px-3 py-2 bg-gray-100 dark:bg-gray-700 rounded-lg text-gray-900 dark:text-gray-100"
                dangerouslySetInnerHTML={{ __html: getPreviewContent(subject) || '<span class="text-gray-400">Sin asunto</span>' }}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Vista previa del mensaje
              </label>
              <div
                className="px-4 py-3 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-900 dark:text-gray-100 min-h-[200px] overflow-auto"
                style={{ maxHeight: compact ? '250px' : '350px' }}
                dangerouslySetInnerHTML={{ __html: getPreviewContent(body) || '<span class="text-gray-400">Sin contenido</span>' }}
              />
            </div>
          </div>
        )}
      </div>

      {/* Template Library Modal */}
      {showTemplates && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-3xl max-h-[80vh] flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
              <div className="flex items-center gap-2">
                <FolderOpen className="text-blue-500" size={24} />
                <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100">
                  Biblioteca de Plantillas
                </h2>
              </div>
              <button
                onClick={() => setShowTemplates(false)}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg text-gray-500"
              >
                <X size={20} />
              </button>
            </div>

            {/* Filters */}
            <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                <input
                  type="text"
                  value={templateSearch}
                  onChange={(e) => setTemplateSearch(e.target.value)}
                  placeholder="Buscar plantillas..."
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                />
              </div>
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
              >
                <option value="">Todas las categorías</option>
                {Object.entries(CATEGORY_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
            </div>

            {/* Templates list */}
            <div className="flex-1 overflow-y-auto p-4">
              {loadingTemplates ? (
                <div className="flex items-center justify-center py-12">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                </div>
              ) : filteredTemplates.length === 0 ? (
                <div className="text-center py-12 text-gray-500 dark:text-gray-400">
                  <Mail size={48} className="mx-auto mb-3 opacity-50" />
                  <p>No se encontraron plantillas</p>
                  <p className="text-sm mt-1">Puedes crear una nueva guardando tu correo actual</p>
                </div>
              ) : (
                <div className="grid gap-3">
                  {filteredTemplates.map((template) => (
                    <button
                      key={template._id}
                      onClick={() => applyTemplate(template)}
                      className="text-left p-4 border border-gray-200 dark:border-gray-700 rounded-lg hover:border-blue-300 dark:hover:border-blue-700 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition group"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="font-medium text-gray-900 dark:text-gray-100 group-hover:text-blue-600 dark:group-hover:text-blue-400">
                              {template.name}
                            </h3>
                            <span className={`px-2 py-0.5 text-xs rounded-full ${
                              template.category === 'outreach' ? 'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300' :
                              template.category === 'follow_up' ? 'bg-amber-100 dark:bg-amber-900 text-amber-700 dark:text-amber-300' :
                              template.category === 'nurture' ? 'bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300' :
                              template.category === 'closing' ? 'bg-purple-100 dark:bg-purple-900 text-purple-700 dark:text-purple-300' :
                              'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
                            }`}>
                              {CATEGORY_LABELS[template.category] || template.category}
                            </span>
                          </div>
                          <p className="text-sm text-gray-600 dark:text-gray-400 mb-2 truncate">
                            <strong>Asunto:</strong> {template.subject}
                          </p>
                          <p className="text-sm text-gray-500 dark:text-gray-500 line-clamp-2">
                            {template.body}
                          </p>
                        </div>
                        <div className="ml-4 flex items-center gap-1 text-gray-400 group-hover:text-blue-500">
                          <Check size={16} className="opacity-0 group-hover:opacity-100 transition" />
                        </div>
                      </div>
                      {template.usageCount > 0 && (
                        <p className="text-xs text-gray-400 mt-2">
                          Usado {template.usageCount} {template.usageCount === 1 ? 'vez' : 'veces'}
                        </p>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Click outside to close dropdowns */}
      {showVariables && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setShowVariables(false)}
        />
      )}
    </div>
  );
}
