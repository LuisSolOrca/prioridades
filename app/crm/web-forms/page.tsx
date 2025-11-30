'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Plus,
  Search,
  FileText,
  Eye,
  EyeOff,
  Edit,
  Trash2,
  Code,
  BarChart3,
  Copy,
  Check,
  ExternalLink,
  MoreVertical,
  Globe,
  Users,
  TrendingUp,
} from 'lucide-react';

interface WebForm {
  _id: string;
  name: string;
  description?: string;
  fields: any[];
  isActive: boolean;
  isPublished: boolean;
  submissions: number;
  lastSubmissionAt?: string;
  formKey: string;
  createdBy: {
    _id: string;
    name: string;
  };
  createdAt: string;
}

export default function WebFormsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [forms, setForms] = useState<WebForm[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'all' | 'active' | 'published'>('all');
  const [showNewModal, setShowNewModal] = useState(false);
  const [newFormName, setNewFormName] = useState('');
  const [creating, setCreating] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [menuOpen, setMenuOpen] = useState<string | null>(null);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
    }
  }, [status, router]);

  useEffect(() => {
    fetchForms();
  }, [filter]);

  const fetchForms = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (filter !== 'all') {
        params.set('status', filter);
      }

      const res = await fetch(`/api/crm/web-forms?${params}`);
      if (res.ok) {
        const data = await res.json();
        setForms(data);
      }
    } catch (error) {
      console.error('Error fetching forms:', error);
    } finally {
      setLoading(false);
    }
  };

  const createForm = async () => {
    if (!newFormName.trim()) return;

    try {
      setCreating(true);
      const res = await fetch('/api/crm/web-forms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newFormName.trim() }),
      });

      if (res.ok) {
        const newForm = await res.json();
        router.push(`/crm/web-forms/${newForm._id}`);
      }
    } catch (error) {
      console.error('Error creating form:', error);
    } finally {
      setCreating(false);
    }
  };

  const togglePublish = async (form: WebForm) => {
    try {
      await fetch(`/api/crm/web-forms/${form._id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isPublished: !form.isPublished }),
      });
      fetchForms();
    } catch (error) {
      console.error('Error toggling publish:', error);
    }
  };

  const deleteForm = async (formId: string) => {
    if (!confirm('¿Estás seguro de eliminar este formulario?')) return;

    try {
      await fetch(`/api/crm/web-forms/${formId}`, { method: 'DELETE' });
      fetchForms();
    } catch (error) {
      console.error('Error deleting form:', error);
    }
  };

  const copyFormUrl = async (formKey: string) => {
    const url = `${window.location.origin}/forms/${formKey}`;
    await navigator.clipboard.writeText(url);
    setCopiedId(formKey);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const filteredForms = forms.filter(form =>
    form.name.toLowerCase().includes(search.toLowerCase()) ||
    form.description?.toLowerCase().includes(search.toLowerCase())
  );

  if (status === 'loading' || loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-4">
              <Link href="/crm" className="text-gray-500 hover:text-gray-700 dark:text-gray-400">
                CRM
              </Link>
              <span className="text-gray-300 dark:text-gray-600">/</span>
              <h1 className="text-xl font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                <FileText size={24} />
                Formularios Web
              </h1>
            </div>

            <button
              onClick={() => setShowNewModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
            >
              <Plus size={20} />
              Nuevo Formulario
            </button>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                <FileText className="text-blue-600" size={20} />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{forms.length}</p>
                <p className="text-sm text-gray-500">Total Formularios</p>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
                <Globe className="text-green-600" size={20} />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {forms.filter(f => f.isPublished).length}
                </p>
                <p className="text-sm text-gray-500">Publicados</p>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
                <Users className="text-purple-600" size={20} />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {forms.reduce((sum, f) => sum + f.submissions, 0)}
                </p>
                <p className="text-sm text-gray-500">Total Submissions</p>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-amber-100 dark:bg-amber-900/30 rounded-lg">
                <TrendingUp className="text-amber-600" size={20} />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {forms.filter(f => {
                    if (!f.lastSubmissionAt) return false;
                    const dayAgo = new Date();
                    dayAgo.setDate(dayAgo.getDate() - 1);
                    return new Date(f.lastSubmissionAt) > dayAgo;
                  }).length}
                </p>
                <p className="text-sm text-gray-500">Activos Hoy</p>
              </div>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
            <input
              type="text"
              placeholder="Buscar formularios..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="flex gap-2">
            {(['all', 'active', 'published'] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                  filter === f
                    ? 'bg-blue-600 text-white'
                    : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700'
                }`}
              >
                {f === 'all' ? 'Todos' : f === 'active' ? 'Activos' : 'Publicados'}
              </button>
            ))}
          </div>
        </div>

        {/* Forms Grid */}
        {filteredForms.length === 0 ? (
          <div className="text-center py-12">
            <FileText className="mx-auto text-gray-400 mb-4" size={48} />
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
              No hay formularios
            </h3>
            <p className="text-gray-500 dark:text-gray-400 mb-4">
              Crea tu primer formulario para capturar leads
            </p>
            <button
              onClick={() => setShowNewModal(true)}
              className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              <Plus size={20} />
              Crear Formulario
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredForms.map((form) => (
              <div
                key={form._id}
                className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden hover:shadow-lg transition"
              >
                {/* Card Header */}
                <div className="p-4 border-b border-gray-200 dark:border-gray-700">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <Link
                        href={`/crm/web-forms/${form._id}`}
                        className="text-lg font-semibold text-gray-900 dark:text-white hover:text-blue-600 truncate block"
                      >
                        {form.name}
                      </Link>
                      {form.description && (
                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 line-clamp-2">
                          {form.description}
                        </p>
                      )}
                    </div>

                    <div className="relative ml-2">
                      <button
                        onClick={() => setMenuOpen(menuOpen === form._id ? null : form._id)}
                        className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700"
                      >
                        <MoreVertical size={20} className="text-gray-500" />
                      </button>

                      {menuOpen === form._id && (
                        <div className="absolute right-0 mt-1 w-48 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 z-10">
                          <Link
                            href={`/crm/web-forms/${form._id}`}
                            className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                          >
                            <Edit size={16} />
                            Editar
                          </Link>
                          <Link
                            href={`/crm/web-forms/${form._id}?tab=submissions`}
                            className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                          >
                            <BarChart3 size={16} />
                            Ver Submissions
                          </Link>
                          <button
                            onClick={() => copyFormUrl(form.formKey)}
                            className="w-full flex items-center gap-2 px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                          >
                            {copiedId === form.formKey ? <Check size={16} /> : <Copy size={16} />}
                            Copiar URL
                          </button>
                          {form.isPublished && (
                            <a
                              href={`/forms/${form.formKey}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                            >
                              <ExternalLink size={16} />
                              Ver Formulario
                            </a>
                          )}
                          <hr className="my-1 border-gray-200 dark:border-gray-700" />
                          <button
                            onClick={() => {
                              setMenuOpen(null);
                              deleteForm(form._id);
                            }}
                            className="w-full flex items-center gap-2 px-4 py-2 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
                          >
                            <Trash2 size={16} />
                            Eliminar
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Status badges */}
                  <div className="flex items-center gap-2 mt-3">
                    <span
                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${
                        form.isPublished
                          ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                          : 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300'
                      }`}
                    >
                      {form.isPublished ? <Eye size={12} /> : <EyeOff size={12} />}
                      {form.isPublished ? 'Publicado' : 'Borrador'}
                    </span>
                    <span className="text-xs text-gray-500">
                      {form.fields.length} campos
                    </span>
                  </div>
                </div>

                {/* Card Stats */}
                <div className="p-4 bg-gray-50 dark:bg-gray-900/50">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-2xl font-bold text-gray-900 dark:text-white">
                        {form.submissions}
                      </p>
                      <p className="text-xs text-gray-500">Submissions</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-gray-500">
                        {form.lastSubmissionAt
                          ? `Último: ${new Date(form.lastSubmissionAt).toLocaleDateString('es-ES')}`
                          : 'Sin submissions'}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Card Actions */}
                <div className="p-3 border-t border-gray-200 dark:border-gray-700 flex items-center gap-2">
                  <Link
                    href={`/crm/web-forms/${form._id}`}
                    className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700"
                  >
                    <Edit size={16} />
                    Editar
                  </Link>
                  <button
                    onClick={() => togglePublish(form)}
                    className={`flex items-center justify-center gap-2 px-3 py-2 text-sm rounded-lg border ${
                      form.isPublished
                        ? 'border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                        : 'border-green-500 text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20'
                    }`}
                  >
                    {form.isPublished ? <EyeOff size={16} /> : <Globe size={16} />}
                    {form.isPublished ? 'Despublicar' : 'Publicar'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* New Form Modal */}
      {showNewModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl max-w-md w-full p-6">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
              Nuevo Formulario
            </h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Nombre del formulario
                </label>
                <input
                  type="text"
                  value={newFormName}
                  onChange={(e) => setNewFormName(e.target.value)}
                  placeholder="Ej: Formulario de contacto"
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                  autoFocus
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  onClick={() => {
                    setShowNewModal(false);
                    setNewFormName('');
                  }}
                  className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700"
                >
                  Cancelar
                </button>
                <button
                  onClick={createForm}
                  disabled={!newFormName.trim() || creating}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
                  {creating ? 'Creando...' : 'Crear'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Click outside to close menu */}
      {menuOpen && (
        <div
          className="fixed inset-0 z-0"
          onClick={() => setMenuOpen(null)}
        />
      )}
    </div>
  );
}
