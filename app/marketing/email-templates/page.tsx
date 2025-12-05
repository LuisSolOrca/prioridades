'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
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
  Calendar,
  Tag,
  Star,
  Layout,
  ChevronLeft,
} from 'lucide-react';
import Link from 'next/link';

interface EmailTemplate {
  _id: string;
  id?: string;
  name: string;
  description?: string;
  category: string;
  subject: string;
  preheader?: string;
  blocks: any[];
  globalStyles: {
    backgroundColor: string;
    contentWidth: number;
    fontFamily: string;
    textColor: string;
    linkColor: string;
  };
  thumbnail?: string;
  usageCount: number;
  isPublic: boolean;
  isSystem?: boolean;
  createdBy?: { name: string };
  createdAt: string;
}

const CATEGORY_LABELS: Record<string, string> = {
  welcome: 'Bienvenida',
  newsletter: 'Newsletter',
  promotional: 'Promocional',
  announcement: 'Anuncio',
  event: 'Evento',
  follow_up: 'Seguimiento',
  transactional: 'Transaccional',
  seasonal: 'Temporada',
  other: 'Otro',
};

const CATEGORY_COLORS: Record<string, string> = {
  welcome: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  newsletter: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  promotional: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
  announcement: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
  event: 'bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-400',
  follow_up: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
  transactional: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-400',
  seasonal: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  other: 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300',
};

export default function MarketingEmailTemplatesPage() {
  const { data: session, status } = useSession();
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
    if (status === 'unauthenticated') {
      router.push('/login');
    }
    if (status === 'authenticated') {
      loadTemplates();
    }
  }, [status, router]);

  const loadTemplates = async () => {
    try {
      const params = new URLSearchParams();
      if (categoryFilter) params.set('category', categoryFilter);

      const res = await fetch(`/api/marketing/email-templates?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setTemplates(data.templates || []);
      }
    } catch (error) {
      console.error('Error loading templates:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (status === 'authenticated') {
      loadTemplates();
    }
  }, [categoryFilter]);

  const handleDelete = async () => {
    if (!templateToDelete || templateToDelete.isSystem) return;

    setDeleting(true);
    try {
      const res = await fetch(`/api/marketing/email-templates/${templateToDelete._id}`, {
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
      const res = await fetch('/api/marketing/email-templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: `${template.name} (copia)`,
          description: template.description,
          category: template.category,
          subject: template.subject,
          preheader: template.preheader,
          blocks: template.blocks,
          globalStyles: template.globalStyles,
          isPublic: false,
        }),
      });

      if (res.ok) {
        await loadTemplates();
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
    return matchesSearch;
  });

  const systemTemplates = filteredTemplates.filter(t => t.isSystem);
  const userTemplates = filteredTemplates.filter(t => !t.isSystem);

  if (status === 'loading' || loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <div className="pt-16 flex items-center justify-center min-h-[80vh]">
          <Loader2 className="animate-spin text-blue-600" size={40} />
        </div>
      </div>
    );
  }

  if (!session) return null;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="pt-16 main-content px-4 py-6">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
            <div>
              <Link
                href="/marketing"
                className="text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300 flex items-center gap-1 mb-2"
              >
                <ChevronLeft size={16} />
                Volver a Marketing
              </Link>
              <h1 className="text-2xl font-bold text-gray-800 dark:text-white flex items-center gap-3">
                <div className="p-2 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl text-white shadow-lg">
                  <Layout size={24} />
                </div>
                Templates de Email
              </h1>
              <p className="text-gray-600 dark:text-gray-400 mt-1">
                Plantillas visuales para campañas de email marketing
              </p>
            </div>
            <button
              onClick={() => router.push('/marketing/email-templates/new')}
              className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2.5 rounded-lg hover:bg-blue-700 transition shadow-lg"
            >
              <Plus size={20} />
              Nuevo Template
            </button>
          </div>

          {/* Filters */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4 mb-6">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                <input
                  type="text"
                  placeholder="Buscar templates..."
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

          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{templates.length}</p>
              <p className="text-sm text-gray-600 dark:text-gray-400">Total Templates</p>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
              <p className="text-2xl font-bold text-blue-600">{systemTemplates.length}</p>
              <p className="text-sm text-gray-600 dark:text-gray-400">De Sistema</p>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
              <p className="text-2xl font-bold text-green-600">{userTemplates.length}</p>
              <p className="text-sm text-gray-600 dark:text-gray-400">Personalizados</p>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
              <p className="text-2xl font-bold text-purple-600">
                {templates.reduce((sum, t) => sum + (t.usageCount || 0), 0)}
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-400">Usos Totales</p>
            </div>
          </div>

          {/* Templates Grid */}
          {filteredTemplates.length === 0 ? (
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-12 text-center">
              <Layout size={48} className="mx-auto text-gray-400 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                {searchTerm || categoryFilter ? 'No se encontraron templates' : 'No hay templates aún'}
              </h3>
              <p className="text-gray-600 dark:text-gray-400 mb-4">
                {searchTerm || categoryFilter
                  ? 'Intenta con otros filtros de búsqueda'
                  : 'Crea tu primer template de email para empezar'
                }
              </p>
              {!searchTerm && !categoryFilter && (
                <button
                  onClick={() => router.push('/marketing/email-templates/new')}
                  className="inline-flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
                >
                  <Plus size={20} />
                  Crear Template
                </button>
              )}
            </div>
          ) : (
            <>
              {/* System Templates Section */}
              {systemTemplates.length > 0 && (
                <div className="mb-8">
                  <h2 className="text-lg font-semibold text-gray-800 dark:text-white mb-4 flex items-center gap-2">
                    <Star className="text-blue-500" size={20} />
                    Templates de Sistema
                  </h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {systemTemplates.map((template) => (
                      <TemplateCard
                        key={template._id}
                        template={template}
                        onPreview={() => {
                          setPreviewTemplate(template);
                          setShowPreviewModal(true);
                        }}
                        onEdit={() => router.push(`/marketing/email-templates/${template._id}/edit`)}
                        onDuplicate={() => handleDuplicate(template)}
                        onDelete={null}
                        openMenuId={openMenuId}
                        setOpenMenuId={setOpenMenuId}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* User Templates Section */}
              {userTemplates.length > 0 && (
                <div>
                  <h2 className="text-lg font-semibold text-gray-800 dark:text-white mb-4 flex items-center gap-2">
                    <FileText className="text-green-500" size={20} />
                    Mis Templates
                  </h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {userTemplates.map((template) => (
                      <TemplateCard
                        key={template._id}
                        template={template}
                        onPreview={() => {
                          setPreviewTemplate(template);
                          setShowPreviewModal(true);
                        }}
                        onEdit={() => router.push(`/marketing/email-templates/${template._id}/edit`)}
                        onDuplicate={() => handleDuplicate(template)}
                        onDelete={() => {
                          setTemplateToDelete(template);
                          setShowDeleteModal(true);
                        }}
                        openMenuId={openMenuId}
                        setOpenMenuId={setOpenMenuId}
                      />
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteModal && templateToDelete && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-md w-full p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              Eliminar Template
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              ¿Estás seguro de que deseas eliminar "{templateToDelete.name}"? Esta acción no se puede deshacer.
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
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  {previewTemplate.name}
                </h3>
                <p className="text-sm text-gray-500">{previewTemplate.subject}</p>
              </div>
              <button
                onClick={() => {
                  setShowPreviewModal(false);
                  setPreviewTemplate(null);
                }}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg text-2xl leading-none"
              >
                &times;
              </button>
            </div>
            <div className="p-6 overflow-y-auto max-h-[calc(90vh-140px)]" style={{ backgroundColor: previewTemplate.globalStyles?.backgroundColor || '#f5f5f5' }}>
              <div
                className="mx-auto bg-white rounded-lg shadow-sm overflow-hidden"
                style={{ maxWidth: previewTemplate.globalStyles?.contentWidth || 600 }}
              >
                {previewTemplate.blocks?.length > 0 ? (
                  previewTemplate.blocks.map((block, idx) => (
                    <div key={idx} className="p-4 border-b border-gray-100 last:border-b-0">
                      {block.type === 'text' && (
                        <div dangerouslySetInnerHTML={{ __html: block.content?.html || '' }} />
                      )}
                      {block.type === 'image' && (
                        <div className="text-center">
                          {block.content?.src ? (
                            <img src={block.content.src} alt={block.content.alt || ''} className="max-w-full h-auto mx-auto" />
                          ) : (
                            <div className="bg-gray-200 h-32 flex items-center justify-center text-gray-400">
                              Imagen
                            </div>
                          )}
                        </div>
                      )}
                      {block.type === 'button' && (
                        <div className="text-center">
                          <button
                            className="px-6 py-3 rounded-lg text-white"
                            style={{ backgroundColor: block.styles?.buttonColor || '#3B82F6' }}
                          >
                            {block.content?.text || 'Botón'}
                          </button>
                        </div>
                      )}
                      {block.type === 'divider' && (
                        <hr className="border-gray-200" />
                      )}
                    </div>
                  ))
                ) : (
                  <div className="p-8 text-center text-gray-400">
                    Sin contenido de bloques
                  </div>
                )}
              </div>
            </div>
            <div className="p-4 border-t border-gray-200 dark:border-gray-700 flex justify-end gap-3">
              <button
                onClick={() => {
                  setShowPreviewModal(false);
                  router.push(`/marketing/email-templates/${previewTemplate._id}/edit`);
                }}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
              >
                <Edit2 size={18} />
                Editar Template
              </button>
            </div>
          </div>
        </div>
      )}

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

// Template Card Component
function TemplateCard({
  template,
  onPreview,
  onEdit,
  onDuplicate,
  onDelete,
  openMenuId,
  setOpenMenuId,
}: {
  template: EmailTemplate;
  onPreview: () => void;
  onEdit: () => void;
  onDuplicate: () => void;
  onDelete: (() => void) | null;
  openMenuId: string | null;
  setOpenMenuId: (id: string | null) => void;
}) {
  const categoryColor = CATEGORY_COLORS[template.category] || CATEGORY_COLORS.other;
  const categoryLabel = CATEGORY_LABELS[template.category] || 'Otro';

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden hover:shadow-md transition group">
      {/* Thumbnail/Preview */}
      <div
        className="h-32 relative cursor-pointer"
        style={{ backgroundColor: template.globalStyles?.backgroundColor || '#f5f5f5' }}
        onClick={onPreview}
      >
        <div className="absolute inset-0 flex items-center justify-center">
          <div
            className="w-4/5 h-4/5 bg-white rounded shadow-sm flex items-center justify-center"
            style={{ maxWidth: '200px' }}
          >
            <Mail className="text-gray-300" size={32} />
          </div>
        </div>
        <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onPreview();
            }}
            className="p-1.5 bg-black/50 text-white rounded-lg hover:bg-black/70"
          >
            <Eye size={16} />
          </button>
        </div>
        {template.isSystem && (
          <div className="absolute top-2 left-2">
            <span className="px-2 py-0.5 bg-blue-600 text-white text-xs rounded-full font-medium">
              Sistema
            </span>
          </div>
        )}
      </div>

      <div className="p-4">
        <div className="flex items-start justify-between mb-2">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className={`px-2 py-0.5 rounded text-xs font-medium ${categoryColor}`}>
                {categoryLabel}
              </span>
            </div>
            <h3 className="font-semibold text-gray-900 dark:text-white truncate">
              {template.name}
            </h3>
          </div>
          <div className="relative">
            <button
              onClick={() => setOpenMenuId(openMenuId === template._id ? null : template._id)}
              className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded opacity-0 group-hover:opacity-100 transition"
            >
              <MoreVertical size={18} className="text-gray-500" />
            </button>
            {openMenuId === template._id && (
              <div className="absolute right-0 mt-1 w-40 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 py-1 z-10">
                <button
                  onClick={() => {
                    onPreview();
                    setOpenMenuId(null);
                  }}
                  className="w-full text-left px-3 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2"
                >
                  <Eye size={16} /> Vista previa
                </button>
                <button
                  onClick={() => {
                    onEdit();
                    setOpenMenuId(null);
                  }}
                  className="w-full text-left px-3 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2"
                >
                  <Edit2 size={16} /> {template.isSystem ? 'Usar como base' : 'Editar'}
                </button>
                <button
                  onClick={() => {
                    onDuplicate();
                  }}
                  className="w-full text-left px-3 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2"
                >
                  <Copy size={16} /> Duplicar
                </button>
                {onDelete && (
                  <button
                    onClick={() => {
                      onDelete();
                      setOpenMenuId(null);
                    }}
                    className="w-full text-left px-3 py-2 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center gap-2"
                  >
                    <Trash2 size={16} /> Eliminar
                  </button>
                )}
              </div>
            )}
          </div>
        </div>

        <p className="text-sm text-gray-600 dark:text-gray-400 mb-3 line-clamp-1">
          <span className="font-medium">Asunto:</span> {template.subject}
        </p>

        {template.description && (
          <p className="text-xs text-gray-500 mb-3 line-clamp-2">
            {template.description}
          </p>
        )}

        <div className="flex items-center justify-between text-xs text-gray-500 pt-3 border-t border-gray-100 dark:border-gray-700">
          <div className="flex items-center gap-1">
            <Mail size={14} />
            <span>{template.usageCount || 0} usos</span>
          </div>
          <div className="flex items-center gap-1">
            <Calendar size={14} />
            <span>
              {template.createdBy?.name === 'Sistema'
                ? 'Sistema'
                : new Date(template.createdAt).toLocaleDateString('es-MX')}
            </span>
          </div>
        </div>

        <button
          onClick={onEdit}
          className="w-full mt-3 py-2 text-sm text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition"
        >
          {template.isSystem ? 'Usar como base' : 'Editar Template'}
        </button>
      </div>
    </div>
  );
}
