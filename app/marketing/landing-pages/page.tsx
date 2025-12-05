'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Plus, Search, Eye, Edit, Copy, Trash2, Globe, ExternalLink, BarChart2 } from 'lucide-react';

interface LandingPage {
  _id: string;
  name: string;
  slug: string;
  title: string;
  status: 'draft' | 'published' | 'archived';
  analytics: {
    views: number;
    uniqueVisitors: number;
    formSubmissions: number;
    conversionRate: number;
  };
  publishedAt?: string;
  createdAt: string;
  updatedAt: string;
}

const statusConfig = {
  draft: { label: 'Borrador', color: 'text-gray-700 dark:text-gray-300', bgColor: 'bg-gray-100 dark:bg-gray-700' },
  published: { label: 'Publicado', color: 'text-green-700 dark:text-green-300', bgColor: 'bg-green-100 dark:bg-green-900/50' },
  archived: { label: 'Archivado', color: 'text-red-700 dark:text-red-300', bgColor: 'bg-red-100 dark:bg-red-900/50' },
};

export default function LandingPagesPage() {
  const [pages, setPages] = useState<LandingPage[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  useEffect(() => {
    fetchPages();
  }, [search, statusFilter]);

  const fetchPages = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (search) params.set('search', search);
      if (statusFilter) params.set('status', statusFilter);

      const res = await fetch(`/api/marketing/landing-pages?${params}`);
      if (res.ok) {
        const data = await res.json();
        setPages(data.pages);
      }
    } catch (e) {
      console.error('Error fetching pages:', e);
    } finally {
      setLoading(false);
    }
  };

  const handlePublish = async (id: string) => {
    try {
      const res = await fetch(`/api/marketing/landing-pages/${id}/publish`, { method: 'POST' });
      if (res.ok) fetchPages();
      else {
        const data = await res.json();
        alert(data.error);
      }
    } catch (e) {}
  };

  const handleUnpublish = async (id: string) => {
    try {
      await fetch(`/api/marketing/landing-pages/${id}/unpublish`, { method: 'POST' });
      fetchPages();
    } catch (e) {}
  };

  const handleDuplicate = async (id: string) => {
    try {
      await fetch(`/api/marketing/landing-pages/${id}/duplicate`, { method: 'POST' });
      fetchPages();
    } catch (e) {}
  };

  const handleDelete = async (id: string) => {
    if (!confirm('¿Estás seguro de eliminar esta landing page?')) return;
    try {
      await fetch(`/api/marketing/landing-pages/${id}`, { method: 'DELETE' });
      fetchPages();
    } catch (e) {}
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: 'numeric' });
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Landing Pages</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">Crea páginas de aterrizaje con nuestro builder visual</p>
        </div>
        <Link href="/marketing/landing-pages/new" className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
          <Plus className="w-5 h-5" />Nueva Landing Page
        </Link>
      </div>

      {/* Overview Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
          <p className="text-sm text-gray-500 dark:text-gray-400">Total páginas</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">{pages.length}</p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
          <p className="text-sm text-gray-500 dark:text-gray-400">Publicadas</p>
          <p className="text-2xl font-bold text-green-600 dark:text-green-400">{pages.filter(p => p.status === 'published').length}</p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
          <p className="text-sm text-gray-500 dark:text-gray-400">Visitas totales</p>
          <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">{pages.reduce((sum, p) => sum + (p.analytics?.views || 0), 0).toLocaleString()}</p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
          <p className="text-sm text-gray-500 dark:text-gray-400">Conversiones</p>
          <p className="text-2xl font-bold text-purple-600 dark:text-purple-400">{pages.reduce((sum, p) => sum + (p.analytics?.formSubmissions || 0), 0).toLocaleString()}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 mb-6">
        <div className="flex flex-wrap gap-4">
          <div className="flex-1 min-w-[200px] relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Buscar landing pages..."
              className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Todos los estados</option>
            <option value="draft">Borrador</option>
            <option value="published">Publicado</option>
            <option value="archived">Archivado</option>
          </select>
        </div>
      </div>

      {/* Pages List */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center p-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        ) : pages.length === 0 ? (
          <div className="text-center py-12">
            <Globe className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">No hay landing pages</h3>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Comienza creando tu primera landing page.</p>
            <div className="mt-6">
              <Link href="/marketing/landing-pages/new" className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                <Plus className="w-5 h-5" />Nueva Landing Page
              </Link>
            </div>
          </div>
        ) : (
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-gray-700 border-b border-gray-200 dark:border-gray-600">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Página</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Estado</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Visitas</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Conversiones</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Fecha</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {pages.map(page => {
                const status = statusConfig[page.status];
                const conversionRate = page.analytics?.uniqueVisitors > 0
                  ? ((page.analytics.formSubmissions / page.analytics.uniqueVisitors) * 100).toFixed(1)
                  : '0';

                return (
                  <tr key={page._id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                    <td className="px-6 py-4">
                      <div>
                        <Link href={`/marketing/landing-pages/${page._id}/edit`} className="font-medium text-gray-900 dark:text-white hover:text-blue-600 dark:hover:text-blue-400">{page.name}</Link>
                        <p className="text-sm text-gray-500 dark:text-gray-400">/lp/{page.slug}</p>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${status.bgColor} ${status.color}`}>{status.label}</span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm">
                        <p className="font-medium text-gray-900 dark:text-white">{(page.analytics?.views || 0).toLocaleString()}</p>
                        <p className="text-gray-500 dark:text-gray-400">{(page.analytics?.uniqueVisitors || 0).toLocaleString()} únicos</p>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm">
                        <p className="font-medium text-gray-900 dark:text-white">{page.analytics?.formSubmissions || 0}</p>
                        <p className="text-gray-500 dark:text-gray-400">{conversionRate}% tasa</p>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm">
                        <p className="text-gray-900 dark:text-white">{formatDate(page.updatedAt)}</p>
                        <p className="text-gray-500 dark:text-gray-400">{page.publishedAt ? 'Publicado' : 'Modificado'}</p>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {page.status === 'published' && (
                          <a href={`/lp/${page.slug}`} target="_blank" rel="noopener noreferrer" className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/50 rounded-lg" title="Ver página">
                            <ExternalLink className="w-5 h-5" />
                          </a>
                        )}
                        <Link href={`/marketing/landing-pages/${page._id}/analytics`} className="p-2 text-gray-400 hover:text-purple-600 hover:bg-purple-50 dark:hover:bg-purple-900/50 rounded-lg" title="Analytics">
                          <BarChart2 className="w-5 h-5" />
                        </Link>
                        <Link href={`/marketing/landing-pages/${page._id}/edit`} className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/50 rounded-lg" title="Editar">
                          <Edit className="w-5 h-5" />
                        </Link>
                        {page.status === 'draft' ? (
                          <button onClick={() => handlePublish(page._id)} className="p-2 text-gray-400 hover:text-green-600 hover:bg-green-50 dark:hover:bg-green-900/50 rounded-lg" title="Publicar">
                            <Globe className="w-5 h-5" />
                          </button>
                        ) : page.status === 'published' ? (
                          <button onClick={() => handleUnpublish(page._id)} className="p-2 text-gray-400 hover:text-yellow-600 hover:bg-yellow-50 dark:hover:bg-yellow-900/50 rounded-lg" title="Despublicar">
                            <Eye className="w-5 h-5" />
                          </button>
                        ) : null}
                        <button onClick={() => handleDuplicate(page._id)} className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg" title="Duplicar">
                          <Copy className="w-5 h-5" />
                        </button>
                        <button onClick={() => handleDelete(page._id)} className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/50 rounded-lg" title="Eliminar">
                          <Trash2 className="w-5 h-5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
