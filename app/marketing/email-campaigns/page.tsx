'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

type CampaignStatus = 'draft' | 'scheduled' | 'sending' | 'sent' | 'paused' | 'cancelled';

interface Campaign {
  _id: string;
  name: string;
  subject: string;
  status: CampaignStatus;
  category: string;
  audience: {
    type: string;
    estimatedRecipients: number;
  };
  metrics?: {
    sent: number;
    delivered: number;
    opened: number;
    clicked: number;
    bounced: number;
    unsubscribed: number;
  };
  scheduledFor?: string;
  sentAt?: string;
  createdAt: string;
  updatedAt: string;
}

const statusConfig: Record<CampaignStatus, { label: string; color: string; bgColor: string }> = {
  draft: { label: 'Borrador', color: 'text-gray-700 dark:text-gray-300', bgColor: 'bg-gray-100 dark:bg-gray-700' },
  scheduled: { label: 'Programado', color: 'text-purple-700 dark:text-purple-300', bgColor: 'bg-purple-100 dark:bg-purple-900/50' },
  sending: { label: 'Enviando', color: 'text-blue-700 dark:text-blue-300', bgColor: 'bg-blue-100 dark:bg-blue-900/50' },
  sent: { label: 'Enviado', color: 'text-green-700 dark:text-green-300', bgColor: 'bg-green-100 dark:bg-green-900/50' },
  paused: { label: 'Pausado', color: 'text-yellow-700 dark:text-yellow-300', bgColor: 'bg-yellow-100 dark:bg-yellow-900/50' },
  cancelled: { label: 'Cancelado', color: 'text-red-700 dark:text-red-300', bgColor: 'bg-red-100 dark:bg-red-900/50' },
};

export default function EmailCampaignsPage() {
  const router = useRouter();
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [categoryFilter, setCategoryFilter] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    pages: 0,
  });

  useEffect(() => {
    fetchCampaigns();
  }, [statusFilter, categoryFilter, searchQuery, pagination.page]);

  const fetchCampaigns = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      params.set('page', pagination.page.toString());
      params.set('limit', pagination.limit.toString());
      if (statusFilter) params.set('status', statusFilter);
      if (categoryFilter) params.set('category', categoryFilter);
      if (searchQuery) params.set('search', searchQuery);

      const response = await fetch(`/api/marketing/email-campaigns?${params}`);
      if (response.ok) {
        const data = await response.json();
        setCampaigns(data.campaigns);
        setPagination(data.pagination);
      }
    } catch (error) {
      console.error('Error fetching campaigns:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDuplicate = async (id: string) => {
    try {
      const response = await fetch(`/api/marketing/email-campaigns/${id}/duplicate`, {
        method: 'POST',
      });
      if (response.ok) {
        fetchCampaigns();
      }
    } catch (error) {
      console.error('Error duplicating campaign:', error);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('¿Estás seguro de eliminar esta campaña?')) return;

    try {
      const response = await fetch(`/api/marketing/email-campaigns/${id}`, {
        method: 'DELETE',
      });
      if (response.ok) {
        fetchCampaigns();
      }
    } catch (error) {
      console.error('Error deleting campaign:', error);
    }
  };

  const handlePause = async (id: string) => {
    try {
      const response = await fetch(`/api/marketing/email-campaigns/${id}/pause`, {
        method: 'POST',
      });
      if (response.ok) {
        fetchCampaigns();
      }
    } catch (error) {
      console.error('Error pausing campaign:', error);
    }
  };

  const handleResume = async (id: string) => {
    try {
      const response = await fetch(`/api/marketing/email-campaigns/${id}/resume`, {
        method: 'POST',
      });
      if (response.ok) {
        fetchCampaigns();
      }
    } catch (error) {
      console.error('Error resuming campaign:', error);
    }
  };

  const handleCancel = async (id: string) => {
    if (!confirm('¿Estás seguro de cancelar esta campaña? Esta acción no se puede deshacer.')) return;

    try {
      const response = await fetch(`/api/marketing/email-campaigns/${id}/cancel`, {
        method: 'POST',
      });
      if (response.ok) {
        fetchCampaigns();
      }
    } catch (error) {
      console.error('Error cancelling campaign:', error);
    }
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('es-MX', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const calculateRate = (numerator: number, denominator: number) => {
    if (denominator === 0) return '0%';
    return ((numerator / denominator) * 100).toFixed(1) + '%';
  };

  // Calculate overview stats
  const overviewStats = {
    total: campaigns.length,
    draft: campaigns.filter(c => c.status === 'draft').length,
    scheduled: campaigns.filter(c => c.status === 'scheduled').length,
    sent: campaigns.filter(c => c.status === 'sent').length,
    totalSent: campaigns.reduce((sum, c) => sum + (c.metrics?.sent || 0), 0),
    totalOpened: campaigns.reduce((sum, c) => sum + (c.metrics?.opened || 0), 0),
    totalClicked: campaigns.reduce((sum, c) => sum + (c.metrics?.clicked || 0), 0),
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Campañas de Email</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Crea y gestiona tus campañas de email marketing
          </p>
        </div>
        <Link
          href="/marketing/email-campaigns/new"
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Nueva campaña
        </Link>
      </div>

      {/* Overview Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
          <p className="text-sm text-gray-500 dark:text-gray-400">Total campañas</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">{pagination.total}</p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
          <p className="text-sm text-gray-500 dark:text-gray-400">Emails enviados</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">
            {overviewStats.totalSent.toLocaleString()}
          </p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
          <p className="text-sm text-gray-500 dark:text-gray-400">Tasa de apertura</p>
          <p className="text-2xl font-bold text-green-600 dark:text-green-400">
            {calculateRate(overviewStats.totalOpened, overviewStats.totalSent)}
          </p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
          <p className="text-sm text-gray-500 dark:text-gray-400">Tasa de clics</p>
          <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
            {calculateRate(overviewStats.totalClicked, overviewStats.totalSent)}
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 mb-6">
        <div className="flex flex-wrap gap-4">
          <div className="flex-1 min-w-[200px]">
            <div className="relative">
              <svg
                className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Buscar campañas..."
                className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Todos los estados</option>
            <option value="draft">Borrador</option>
            <option value="scheduled">Programado</option>
            <option value="sending">Enviando</option>
            <option value="sent">Enviado</option>
            <option value="paused">Pausado</option>
            <option value="cancelled">Cancelado</option>
          </select>
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Todas las categorías</option>
            <option value="newsletter">Newsletter</option>
            <option value="promotion">Promoción</option>
            <option value="announcement">Anuncio</option>
            <option value="event">Evento</option>
            <option value="transactional">Transaccional</option>
          </select>
        </div>
      </div>

      {/* Campaigns List */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center p-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        ) : campaigns.length === 0 ? (
          <div className="text-center py-12">
            <svg
              className="mx-auto h-12 w-12 text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
            <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">No hay campañas</h3>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              Comienza creando tu primera campaña de email.
            </p>
            <div className="mt-6">
              <Link
                href="/marketing/email-campaigns/new"
                className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Nueva campaña
              </Link>
            </div>
          </div>
        ) : (
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-gray-700 border-b border-gray-200 dark:border-gray-600">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Campaña
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Estado
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Destinatarios
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Métricas
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Fecha
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {campaigns.map((campaign) => {
                const status = statusConfig[campaign.status];
                return (
                  <tr key={campaign._id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                    <td className="px-6 py-4">
                      <div>
                        <Link
                          href={campaign.status === 'draft'
                            ? `/marketing/email-campaigns/${campaign._id}/edit`
                            : `/marketing/email-campaigns/${campaign._id}`
                          }
                          className="font-medium text-gray-900 dark:text-white hover:text-blue-600 dark:hover:text-blue-400"
                        >
                          {campaign.name}
                        </Link>
                        <p className="text-sm text-gray-500 dark:text-gray-400 truncate max-w-xs">
                          {campaign.subject}
                        </p>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${status.bgColor} ${status.color}`}>
                        {status.label}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-gray-900 dark:text-white">
                        {campaign.status === 'sent' && campaign.metrics
                          ? campaign.metrics.sent.toLocaleString()
                          : campaign.audience?.estimatedRecipients?.toLocaleString() || '-'
                        }
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      {campaign.metrics && campaign.metrics.sent > 0 ? (
                        <div className="flex items-center gap-4 text-sm">
                          <div className="flex items-center gap-1">
                            <svg className="w-4 h-4 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                            </svg>
                            <span className="text-gray-600 dark:text-gray-300">
                              {calculateRate(campaign.metrics.opened, campaign.metrics.delivered)}
                            </span>
                          </div>
                          <div className="flex items-center gap-1">
                            <svg className="w-4 h-4 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5M7.188 2.239l.777 2.897M5.136 7.965l-2.898-.777M13.95 4.05l-2.122 2.122m-5.657 5.656l-2.12 2.122" />
                            </svg>
                            <span className="text-gray-600 dark:text-gray-300">
                              {calculateRate(campaign.metrics.clicked, campaign.metrics.delivered)}
                            </span>
                          </div>
                        </div>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm">
                        {campaign.sentAt ? (
                          <>
                            <p className="text-gray-900 dark:text-white">{formatDate(campaign.sentAt)}</p>
                            <p className="text-gray-500 dark:text-gray-400">Enviado</p>
                          </>
                        ) : campaign.scheduledFor ? (
                          <>
                            <p className="text-gray-900 dark:text-white">{formatDate(campaign.scheduledFor)}</p>
                            <p className="text-gray-500 dark:text-gray-400">Programado</p>
                          </>
                        ) : (
                          <>
                            <p className="text-gray-900 dark:text-white">{formatDate(campaign.createdAt)}</p>
                            <p className="text-gray-500 dark:text-gray-400">Creado</p>
                          </>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {campaign.status === 'draft' && (
                          <Link
                            href={`/marketing/email-campaigns/${campaign._id}/edit`}
                            className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/50 rounded-lg"
                            title="Editar"
                          >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                          </Link>
                        )}
                        {campaign.status === 'sent' && (
                          <Link
                            href={`/marketing/email-campaigns/${campaign._id}`}
                            className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/50 rounded-lg"
                            title="Ver analytics"
                          >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                            </svg>
                          </Link>
                        )}
                        {(campaign.status === 'sending' || campaign.status === 'scheduled') && (
                          <button
                            onClick={() => handlePause(campaign._id)}
                            className="p-2 text-gray-400 hover:text-yellow-600 hover:bg-yellow-50 dark:hover:bg-yellow-900/50 rounded-lg"
                            title="Pausar"
                          >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 9v6m4-6v6m7-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                          </button>
                        )}
                        {campaign.status === 'paused' && (
                          <>
                            <button
                              onClick={() => handleResume(campaign._id)}
                              className="p-2 text-gray-400 hover:text-green-600 hover:bg-green-50 dark:hover:bg-green-900/50 rounded-lg"
                              title="Reanudar"
                            >
                              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                              </svg>
                            </button>
                            <button
                              onClick={() => handleCancel(campaign._id)}
                              className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/50 rounded-lg"
                              title="Cancelar"
                            >
                              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
                              </svg>
                            </button>
                          </>
                        )}
                        <button
                          onClick={() => handleDuplicate(campaign._id)}
                          className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
                          title="Duplicar"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                          </svg>
                        </button>
                        {campaign.status === 'draft' && (
                          <button
                            onClick={() => handleDelete(campaign._id)}
                            className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/50 rounded-lg"
                            title="Eliminar"
                          >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}

        {/* Pagination */}
        {pagination.pages > 1 && (
          <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 flex items-center justify-between">
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Mostrando {((pagination.page - 1) * pagination.limit) + 1} a{' '}
              {Math.min(pagination.page * pagination.limit, pagination.total)} de{' '}
              {pagination.total} campañas
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPagination({ ...pagination, page: pagination.page - 1 })}
                disabled={pagination.page === 1}
                className="px-3 py-1 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed text-gray-700 dark:text-gray-300"
              >
                Anterior
              </button>
              <button
                onClick={() => setPagination({ ...pagination, page: pagination.page + 1 })}
                disabled={pagination.page === pagination.pages}
                className="px-3 py-1 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed text-gray-700 dark:text-gray-300"
              >
                Siguiente
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
