'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Navbar from '@/components/Navbar';
import {
  Plus,
  Search,
  FileText,
  Edit2,
  Trash2,
  Copy,
  Eye,
  MoreVertical,
  Mail,
  Filter,
  Loader2,
  Users,
  Lock,
  Calendar,
  ArrowLeft,
} from 'lucide-react';

interface EmailTemplate {
  _id: string;
  name: string;
  description?: string;
  category: string;
  subject: string;
  body: string;
  usageCount: number;
  lastUsedAt?: string;
  isActive: boolean;
  isShared: boolean;
  createdBy: { _id: string; name: string };
  createdAt: string;
}

const CATEGORY_LABELS: Record<string, string> = {
  outreach: 'Prospección',
  follow_up: 'Seguimiento',
  nurture: 'Nurturing',
  closing: 'Cierre',
  other: 'Otro',
};

const CATEGORY_COLORS: Record<string, string> = {
  outreach: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  follow_up: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
  nurture: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
  closing: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  other: 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300',
};

export default function EmailTemplatesPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [templateToDelete, setTemplateToDelete] = useState<EmailTemplate | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [previewTemplate, setPreviewTemplate] = useState<EmailTemplate | null>(null);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);

  useEffect(() => {
    loadTemplates();
  }, []);

  const loadTemplates = async () => {
    try {
      const res = await fetch('/api/crm/email-templates');
      if (res.ok) {
        const data = await res.json();
        setTemplates(data);
      }
    } catch (error) {
      console.error('Error loading templates:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!templateToDelete) return;

    setDeleting(true);
    try {
      const res = await fetch(`/api/crm/email-templates/${templateToDelete._id}`, {
        method: 'DELETE',
      });

      if (res.ok) {
        setTemplates(templates.filter(t => t._id !== templateToDelete._id));
        setShowDeleteModal(false);
        setTemplateToDelete(null);
      }
    } catch (error) {
      console.error('Error deleting template:', error);
    } finally {
      setDeleting(false);
    }
  };

  const handleDuplicate = async (template: EmailTemplate) => {
    try {
      const res = await fetch('/api/crm/email-templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: `${template.name} (copia)`,
          description: template.description,
          category: template.category,
          subject: template.subject,
          body: template.body,
          isShared: false,
        }),
      });

      if (res.ok) {
        const newTemplate = await res.json();
        setTemplates([newTemplate, ...templates]);
      }
    } catch (error) {
      console.error('Error duplicating template:', error);
    }
    setOpenMenuId(null);
  };

  const filteredTemplates = templates.filter(template => {
    const matchesSearch =
      template.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      template.subject.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (template.description?.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesCategory = !categoryFilter || template.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  if (!session) return null;

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <Navbar />
        <div className="pt-16 main-content flex items-center justify-center min-h-[80vh]">
          <Loader2 className="animate-spin text-emerald-600" size={40} />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Navbar />
      <div className="pt-16 main-content px-4 py-6">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
            <div>
              <h1 className="text-2xl font-bold text-gray-800 dark:text-white flex items-center gap-2">
                <FileText className="text-emerald-600" size={28} />
                Plantillas de Correo
              </h1>
              <p className="text-gray-600 dark:text-gray-400 mt-1">
                Gestiona tus plantillas de email para secuencias y comunicaciones
              </p>
            </div>
          </div>
          <button
            onClick={() => router.push('/crm/email-templates/new')}
            className="flex items-center gap-2 bg-emerald-600 text-white px-4 py-2 rounded-lg hover:bg-emerald-700 transition"
          >
            <Plus size={20} />
            Nueva Plantilla
          </button>
        </div>

        {/* Filters */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4 mb-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
              <input
                type="text"
                placeholder="Buscar plantillas..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
            </div>
            <div className="flex items-center gap-2">
              <Filter size={20} className="text-gray-400" />
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              >
                <option value="">Todas las categorías</option>
                {Object.entries(CATEGORY_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Templates Grid */}
        {filteredTemplates.length === 0 ? (
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-12 text-center">
            <FileText size={48} className="mx-auto text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
              {searchTerm || categoryFilter ? 'No se encontraron plantillas' : 'No hay plantillas aún'}
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              {searchTerm || categoryFilter
                ? 'Intenta con otros filtros de búsqueda'
                : 'Crea tu primera plantilla de correo para empezar'
              }
            </p>
            {!searchTerm && !categoryFilter && (
              <button
                onClick={() => router.push('/crm/email-templates/new')}
                className="inline-flex items-center gap-2 bg-emerald-600 text-white px-4 py-2 rounded-lg hover:bg-emerald-700"
              >
                <Plus size={20} />
                Crear Plantilla
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredTemplates.map((template) => (
              <div
                key={template._id}
                className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4 hover:shadow-md transition group"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`px-2 py-0.5 rounded text-xs font-medium ${CATEGORY_COLORS[template.category]}`}>
                        {CATEGORY_LABELS[template.category]}
                      </span>
                      {template.isShared ? (
                        <span title="Compartida"><Users size={14} className="text-blue-500" /></span>
                      ) : (
                        <span title="Privada"><Lock size={14} className="text-gray-400" /></span>
                      )}
                    </div>
                    <h3 className="font-semibold text-gray-900 dark:text-white line-clamp-1">
                      {template.name}
                    </h3>
                  </div>
                  <div className="relative">
                    <button
                      onClick={() => setOpenMenuId(openMenuId === template._id ? null : template._id)}
                      className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded opacity-0 group-hover:opacity-100 transition"
                    >
                      <MoreVertical size={18} />
                    </button>
                    {openMenuId === template._id && (
                      <div className="absolute right-0 mt-1 w-40 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 py-1 z-10">
                        <button
                          onClick={() => {
                            setPreviewTemplate(template);
                            setShowPreviewModal(true);
                            setOpenMenuId(null);
                          }}
                          className="w-full text-left px-3 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2"
                        >
                          <Eye size={16} /> Vista previa
                        </button>
                        <button
                          onClick={() => {
                            router.push(`/crm/email-templates/${template._id}/edit`);
                            setOpenMenuId(null);
                          }}
                          className="w-full text-left px-3 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2"
                        >
                          <Edit2 size={16} /> Editar
                        </button>
                        <button
                          onClick={() => handleDuplicate(template)}
                          className="w-full text-left px-3 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2"
                        >
                          <Copy size={16} /> Duplicar
                        </button>
                        <button
                          onClick={() => {
                            setTemplateToDelete(template);
                            setShowDeleteModal(true);
                            setOpenMenuId(null);
                          }}
                          className="w-full text-left px-3 py-2 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center gap-2"
                        >
                          <Trash2 size={16} /> Eliminar
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                <p className="text-sm text-gray-600 dark:text-gray-400 mb-3 line-clamp-2">
                  <span className="font-medium">Asunto:</span> {template.subject}
                </p>

                {template.description && (
                  <p className="text-sm text-gray-500 dark:text-gray-500 mb-3 line-clamp-2">
                    {template.description}
                  </p>
                )}

                <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400 pt-3 border-t border-gray-100 dark:border-gray-700">
                  <div className="flex items-center gap-1">
                    <Mail size={14} />
                    <span>{template.usageCount} usos</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Calendar size={14} />
                    <span>{new Date(template.createdAt).toLocaleDateString()}</span>
                  </div>
                </div>

                <button
                  onClick={() => router.push(`/crm/email-templates/${template._id}/edit`)}
                  className="w-full mt-3 py-2 text-sm text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 rounded-lg transition"
                >
                  Editar Plantilla
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Stats Summary */}
        {templates.length > 0 && (
          <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{templates.length}</p>
              <p className="text-sm text-gray-600 dark:text-gray-400">Total Plantillas</p>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {templates.filter(t => t.isShared).length}
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-400">Compartidas</p>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {templates.reduce((sum, t) => sum + t.usageCount, 0)}
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-400">Usos Totales</p>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {Object.keys(CATEGORY_LABELS).filter(cat =>
                  templates.some(t => t.category === cat)
                ).length}
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-400">Categorías</p>
            </div>
          </div>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteModal && templateToDelete && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-md w-full p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              Eliminar Plantilla
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              ¿Estás seguro de que deseas eliminar la plantilla "{templateToDelete.name}"? Esta acción no se puede deshacer.
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => {
                  setShowDeleteModal(false);
                  setTemplateToDelete(null);
                }}
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

      {/* Preview Modal */}
      {showPreviewModal && previewTemplate && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Vista Previa
              </h3>
              <button
                onClick={() => {
                  setShowPreviewModal(false);
                  setPreviewTemplate(null);
                }}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
              >
                <span className="sr-only">Cerrar</span>
                &times;
              </button>
            </div>
            <div className="p-6 overflow-y-auto max-h-[calc(90vh-80px)]">
              <div className="mb-4">
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Asunto:</p>
                <p className="text-lg font-medium text-gray-900 dark:text-white">
                  {previewTemplate.subject}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">Contenido:</p>
                <div
                  className="prose prose-sm dark:prose-invert max-w-none bg-gray-50 dark:bg-gray-900 p-4 rounded-lg border border-gray-200 dark:border-gray-700"
                  dangerouslySetInnerHTML={{ __html: previewTemplate.body }}
                />
              </div>
            </div>
          </div>
        </div>
      )}
      </div>

      {/* Click outside to close menu */}
      {openMenuId && (
        <div
          className="fixed inset-0 z-0"
          onClick={() => setOpenMenuId(null)}
        />
      )}
    </div>
  );
}
