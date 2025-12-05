'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { ArrowLeft, TrendingUp, RefreshCw, Search, ExternalLink } from 'lucide-react';

interface ConversionData {
  _id: string;
  type: string;
  value: number;
  currency: string;
  contact: {
    id: string;
    name: string;
    email: string;
    company?: string;
  } | null;
  deal: {
    id: string;
    title: string;
    value: number;
  } | null;
  firstTouchpoint: {
    channel: string;
    source?: string;
    campaign?: string;
    date: string;
  } | null;
  lastTouchpoint: {
    channel: string;
    source?: string;
    campaign?: string;
    date: string;
  } | null;
  touchpointCount: number;
  journeyDuration: number;
  convertedAt: string;
  channels: string[];
}

const CONVERSION_TYPE_LABELS: Record<string, string> = {
  deal_won: 'Deal Ganado',
  deal_created: 'Deal Creado',
  form_submit: 'Formulario',
  signup: 'Registro',
  purchase: 'Compra',
  mql: 'MQL',
  sql: 'SQL',
  demo_request: 'Demo',
  trial_start: 'Trial',
  subscription: 'Suscripción',
};

const CHANNEL_COLORS: Record<string, string> = {
  email: 'bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300',
  paid_social: 'bg-pink-100 text-pink-700 dark:bg-pink-900/50 dark:text-pink-300',
  organic_social: 'bg-purple-100 text-purple-700 dark:bg-purple-900/50 dark:text-purple-300',
  paid_search: 'bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-300',
  organic_search: 'bg-teal-100 text-teal-700 dark:bg-teal-900/50 dark:text-teal-300',
  direct: 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300',
  referral: 'bg-orange-100 text-orange-700 dark:bg-orange-900/50 dark:text-orange-300',
  display: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/50 dark:text-yellow-300',
  video: 'bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-300',
  other: 'bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-300',
};

export default function ConversionsPage() {
  const [conversions, setConversions] = useState<ConversionData[]>([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0, pages: 0 });
  const [days, setDays] = useState(30);
  const [typeFilter, setTypeFilter] = useState('');
  const [channelFilter, setChannelFilter] = useState('');
  const [search, setSearch] = useState('');

  const fetchData = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: pagination.page.toString(),
        limit: pagination.limit.toString(),
        days: days.toString(),
      });
      if (typeFilter) params.set('type', typeFilter);
      if (channelFilter) params.set('channel', channelFilter);

      const res = await fetch(`/api/marketing/attribution/conversions?${params}`);
      if (res.ok) {
        const json = await res.json();
        setConversions(json.conversions);
        setPagination(prev => ({ ...prev, ...json.pagination }));
      }
    } catch (e) {
      console.error('Error fetching conversions:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [pagination.page, days, typeFilter, channelFilter]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN',
      maximumFractionDigits: 0,
    }).format(value);
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('es-MX', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  const filteredConversions = search
    ? conversions.filter(c =>
        c.contact?.name.toLowerCase().includes(search.toLowerCase()) ||
        c.contact?.email.toLowerCase().includes(search.toLowerCase()) ||
        c.deal?.title.toLowerCase().includes(search.toLowerCase())
      )
    : conversions;

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <Link href="/marketing/attribution" className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg">
            <ArrowLeft className="w-5 h-5 text-gray-600 dark:text-gray-400" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <TrendingUp className="w-7 h-7 text-green-600" />
              Conversiones
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              Lista detallada de todas las conversiones con atribución
            </p>
          </div>
        </div>

        <button
          onClick={fetchData}
          disabled={loading}
          className="p-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
        >
          <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 mb-6">
        <div className="flex flex-wrap gap-4">
          <div className="flex-1 min-w-[200px] relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por contacto, email o deal..."
              className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500"
            />
          </div>
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500"
          >
            <option value="">Todos los tipos</option>
            {Object.entries(CONVERSION_TYPE_LABELS).map(([value, label]) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>
          <select
            value={channelFilter}
            onChange={(e) => setChannelFilter(e.target.value)}
            className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500"
          >
            <option value="">Todos los canales</option>
            <option value="email">Email</option>
            <option value="paid_social">Paid Social</option>
            <option value="organic_social">Organic Social</option>
            <option value="paid_search">Paid Search</option>
            <option value="organic_search">Organic Search</option>
            <option value="direct">Direct</option>
            <option value="referral">Referral</option>
          </select>
          <select
            value={days}
            onChange={(e) => setDays(parseInt(e.target.value))}
            className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500"
          >
            <option value={7}>Últimos 7 días</option>
            <option value={14}>Últimos 14 días</option>
            <option value={30}>Últimos 30 días</option>
            <option value={60}>Últimos 60 días</option>
            <option value={90}>Últimos 90 días</option>
          </select>
        </div>
      </div>

      {/* Conversions Table */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
        {loading && conversions.length === 0 ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
          </div>
        ) : filteredConversions.length === 0 ? (
          <div className="text-center py-12 text-gray-500 dark:text-gray-400">
            No hay conversiones para mostrar
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-700 border-b border-gray-200 dark:border-gray-600">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Contacto</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Tipo</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Valor</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Canales</th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Touchpoints</th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Días</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Fecha</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {filteredConversions.map((conv) => (
                  <tr key={conv._id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                    <td className="px-6 py-4">
                      {conv.contact ? (
                        <div>
                          <Link
                            href={`/crm/contacts/${conv.contact.id}`}
                            className="font-medium text-gray-900 dark:text-white hover:text-purple-600 dark:hover:text-purple-400"
                          >
                            {conv.contact.name || 'Sin nombre'}
                          </Link>
                          <p className="text-sm text-gray-500 dark:text-gray-400">{conv.contact.email}</p>
                          {conv.contact.company && (
                            <p className="text-xs text-gray-400">{conv.contact.company}</p>
                          )}
                        </div>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <span className="px-2 py-1 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 text-xs font-medium rounded">
                        {CONVERSION_TYPE_LABELS[conv.type] || conv.type}
                      </span>
                      {conv.deal && (
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 truncate max-w-[150px]">
                          {conv.deal.title}
                        </p>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <span className="font-medium text-green-600 dark:text-green-400">
                        {formatCurrency(conv.value)}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-wrap gap-1">
                        {conv.channels.slice(0, 3).map((channel) => (
                          <span
                            key={channel}
                            className={`px-2 py-0.5 text-xs font-medium rounded capitalize ${CHANNEL_COLORS[channel] || 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300'}`}
                          >
                            {channel.replace('_', ' ')}
                          </span>
                        ))}
                        {conv.channels.length > 3 && (
                          <span className="px-2 py-0.5 text-xs text-gray-500 dark:text-gray-400">
                            +{conv.channels.length - 3}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className="font-medium text-gray-900 dark:text-white">{conv.touchpointCount}</span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className="text-gray-600 dark:text-gray-300">{conv.journeyDuration}</span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-gray-600 dark:text-gray-300">{formatDate(conv.convertedAt)}</span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      {conv.contact && (
                        <Link
                          href={`/marketing/attribution/journey/${conv.contact.id}`}
                          className="p-2 text-gray-400 hover:text-purple-600 hover:bg-purple-50 dark:hover:bg-purple-900/50 rounded-lg inline-flex"
                          title="Ver journey"
                        >
                          <ExternalLink className="w-4 h-4" />
                        </Link>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {pagination.pages > 1 && (
          <div className="flex items-center justify-between px-6 py-3 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Mostrando {((pagination.page - 1) * pagination.limit) + 1} -{' '}
              {Math.min(pagination.page * pagination.limit, pagination.total)} de {pagination.total}
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setPagination(p => ({ ...p, page: p.page - 1 }))}
                disabled={pagination.page === 1}
                className="px-3 py-1 border border-gray-300 dark:border-gray-600 rounded hover:bg-gray-100 dark:hover:bg-gray-600 disabled:opacity-50 text-gray-700 dark:text-gray-300"
              >
                Anterior
              </button>
              <button
                onClick={() => setPagination(p => ({ ...p, page: p.page + 1 }))}
                disabled={pagination.page >= pagination.pages}
                className="px-3 py-1 border border-gray-300 dark:border-gray-600 rounded hover:bg-gray-100 dark:hover:bg-gray-600 disabled:opacity-50 text-gray-700 dark:text-gray-300"
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
