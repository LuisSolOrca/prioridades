'use client';

import { useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import EmailBlockEditor, { IEmailContent } from '@/components/marketing/EmailBlockEditor';
import {
  Save,
  ChevronLeft,
  Loader2,
  Layout,
  Eye,
  Settings,
  X,
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
  blocks: [
    {
      id: 'block-1',
      type: 'text',
      content: '<h1 style="margin: 0; text-align: center;">Tu título aquí</h1>',
      styles: { padding: '30px 20px', backgroundColor: '#ffffff' },
    },
    {
      id: 'block-2',
      type: 'text',
      content: '<p style="margin: 0; line-height: 1.6;">Escribe el contenido de tu email aquí. Puedes personalizarlo con variables como {{firstName}} para el nombre del destinatario.</p>',
      styles: { padding: '20px', backgroundColor: '#ffffff' },
    },
    {
      id: 'block-3',
      type: 'button',
      content: {
        text: 'Llamada a la acción',
        url: '#',
        backgroundColor: '#3B82F6',
        color: '#ffffff',
        borderRadius: '8px',
      },
      styles: { padding: '20px', textAlign: 'center' },
    },
  ],
  globalStyles: {
    backgroundColor: '#f5f5f5',
    contentWidth: 600,
    fontFamily: 'Arial, sans-serif',
    textColor: '#333333',
    linkColor: '#3B82F6',
  },
};

export default function NewEmailTemplatePage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  // Form state
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('other');
  const [subject, setSubject] = useState('');
  const [preheader, setPreheader] = useState('');
  const [isPublic, setIsPublic] = useState(false);
  const [content, setContent] = useState<IEmailContent>(DEFAULT_CONTENT);

  const handleSave = async () => {
    if (!name.trim() || !subject.trim()) {
      alert('Por favor completa el nombre y el asunto del template');
      return;
    }

    setSaving(true);
    try {
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
    } catch (error) {
      console.error('Error saving template:', error);
      alert('Error al guardar el template');
    } finally {
      setSaving(false);
    }
  };

  if (status === 'loading') {
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
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900">
      <div className="pt-16">
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
                  Nuevo Template de Email
                </h1>
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
                Guardar
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
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Asunto del Email *
                </label>
                <input
                  type="text"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder="Ej: {{firstName}}, tenemos novedades para ti"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
                <p className="text-xs text-gray-500 mt-1">Usa variables como {"{{firstName}}"} para personalizar</p>
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
