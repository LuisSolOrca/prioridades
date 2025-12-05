'use client';

import { useState, useEffect } from 'react';

interface AnalyticsData {
  campaign: {
    id: string;
    name: string;
    subject: string;
    status: string;
    sentAt: string;
  };
  overview: {
    sent: number;
    delivered: number;
    opened: number;
    clicked: number;
    bounced: number;
    unsubscribed: number;
    complained: number;
    openRate: string;
    clickRate: string;
    clickToOpenRate: string;
    bounceRate: string;
    unsubscribeRate: string;
    complaintRate: string;
  };
  variants: Array<{
    _id: string;
    sent: number;
    delivered: number;
    opened: number;
    clicked: number;
  }>;
  links: Array<{
    _id: string;
    clicks: number;
    uniqueClicks: number;
  }>;
  activity: {
    opens: Array<{ _id: string; count: number }>;
    clicks: Array<{ _id: string; count: number }>;
  };
  devices: Array<{ _id: string; count: number }>;
  locations: Array<{ _id: string; count: number }>;
  bounces: Array<{ _id: string; count: number }>;
}

interface CampaignAnalyticsProps {
  campaignId: string;
}

export default function CampaignAnalytics({ campaignId }: CampaignAnalyticsProps) {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'activity' | 'links' | 'recipients'>('overview');

  useEffect(() => {
    fetchAnalytics();
  }, [campaignId]);

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/marketing/email-campaigns/${campaignId}/analytics`);
      if (!response.ok) {
        throw new Error('Error al cargar analytics');
      }
      const analyticsData = await response.json();
      setData(analyticsData);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center p-12">
        <p className="text-red-500">{error}</p>
      </div>
    );
  }

  if (!data) return null;

  const { campaign, overview, variants, links, activity, devices, locations, bounces } = data;

  return (
    <div className="space-y-6">
      {/* Campaign Header */}
      <div className="bg-white rounded-xl border p-6">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-xl font-bold text-gray-900">{campaign.name}</h2>
            <p className="text-gray-600 mt-1">{campaign.subject}</p>
            <p className="text-sm text-gray-500 mt-2">
              Enviado el {new Date(campaign.sentAt).toLocaleDateString('es-MX', {
                day: 'numeric',
                month: 'long',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
              })}
            </p>
          </div>
          <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm font-medium">
            {campaign.status === 'sent' ? 'Enviado' : campaign.status}
          </span>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b">
        <nav className="flex gap-8">
          {[
            { id: 'overview', label: 'Resumen' },
            { id: 'activity', label: 'Actividad' },
            { id: 'links', label: 'Enlaces' },
            { id: 'recipients', label: 'Destinatarios' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`pb-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === tab.id
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Overview Tab */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* Main Metrics */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <MetricCard
              label="Enviados"
              value={overview.sent.toLocaleString()}
              icon={
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                </svg>
              }
              color="blue"
            />
            <MetricCard
              label="Entregados"
              value={overview.delivered.toLocaleString()}
              subValue={`${((overview.delivered / overview.sent) * 100 || 0).toFixed(1)}%`}
              icon={
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              }
              color="green"
            />
            <MetricCard
              label="Aperturas"
              value={overview.opened.toLocaleString()}
              subValue={`${overview.openRate}%`}
              icon={
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
              }
              color="purple"
            />
            <MetricCard
              label="Clics"
              value={overview.clicked.toLocaleString()}
              subValue={`${overview.clickRate}%`}
              icon={
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5M7.188 2.239l.777 2.897M5.136 7.965l-2.898-.777M13.95 4.05l-2.122 2.122m-5.657 5.656l-2.12 2.122" />
                </svg>
              }
              color="indigo"
            />
          </div>

          {/* Secondary Metrics */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-white rounded-xl border p-4">
              <p className="text-sm text-gray-500">Rebotes</p>
              <p className="text-xl font-bold text-red-600">{overview.bounced}</p>
              <p className="text-xs text-gray-400">{overview.bounceRate}%</p>
            </div>
            <div className="bg-white rounded-xl border p-4">
              <p className="text-sm text-gray-500">Desuscritos</p>
              <p className="text-xl font-bold text-yellow-600">{overview.unsubscribed}</p>
              <p className="text-xs text-gray-400">{overview.unsubscribeRate}%</p>
            </div>
            <div className="bg-white rounded-xl border p-4">
              <p className="text-sm text-gray-500">Quejas</p>
              <p className="text-xl font-bold text-orange-600">{overview.complained}</p>
              <p className="text-xs text-gray-400">{overview.complaintRate}%</p>
            </div>
            <div className="bg-white rounded-xl border p-4">
              <p className="text-sm text-gray-500">Click-to-Open</p>
              <p className="text-xl font-bold text-blue-600">{overview.clickToOpenRate}%</p>
            </div>
          </div>

          {/* A/B Test Results */}
          {variants.length > 1 && (
            <div className="bg-white rounded-xl border p-6">
              <h3 className="font-semibold text-gray-900 mb-4">Resultados A/B Test</h3>
              <div className="space-y-4">
                {variants.map((variant, index) => {
                  const openRate = variant.delivered > 0
                    ? ((variant.opened / variant.delivered) * 100).toFixed(1)
                    : '0';
                  const clickRate = variant.delivered > 0
                    ? ((variant.clicked / variant.delivered) * 100).toFixed(1)
                    : '0';

                  return (
                    <div key={variant._id} className="p-4 bg-gray-50 rounded-lg">
                      <div className="flex items-center justify-between mb-3">
                        <span className="font-medium text-gray-900">Variante {variant._id}</span>
                        {index === 0 && variants.length > 1 && (
                          <span className="px-2 py-1 bg-green-100 text-green-700 text-xs rounded-full">
                            Ganador
                          </span>
                        )}
                      </div>
                      <div className="grid grid-cols-4 gap-4 text-sm">
                        <div>
                          <p className="text-gray-500">Enviados</p>
                          <p className="font-medium">{variant.sent.toLocaleString()}</p>
                        </div>
                        <div>
                          <p className="text-gray-500">Entregados</p>
                          <p className="font-medium">{variant.delivered.toLocaleString()}</p>
                        </div>
                        <div>
                          <p className="text-gray-500">Tasa apertura</p>
                          <p className="font-medium text-purple-600">{openRate}%</p>
                        </div>
                        <div>
                          <p className="text-gray-500">Tasa clics</p>
                          <p className="font-medium text-blue-600">{clickRate}%</p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Device & Location Breakdown */}
          <div className="grid md:grid-cols-2 gap-6">
            {/* Devices */}
            <div className="bg-white rounded-xl border p-6">
              <h3 className="font-semibold text-gray-900 mb-4">Dispositivos</h3>
              {devices.length > 0 ? (
                <div className="space-y-3">
                  {devices.map((device) => {
                    const total = devices.reduce((sum, d) => sum + d.count, 0);
                    const percentage = ((device.count / total) * 100).toFixed(1);
                    return (
                      <div key={device._id || 'unknown'} className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center">
                          {device._id === 'mobile' ? (
                            <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
                            </svg>
                          ) : device._id === 'tablet' ? (
                            <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                            </svg>
                          ) : (
                            <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                            </svg>
                          )}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-sm font-medium text-gray-900 capitalize">
                              {device._id || 'Desconocido'}
                            </span>
                            <span className="text-sm text-gray-500">{percentage}%</span>
                          </div>
                          <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-blue-500 rounded-full"
                              style={{ width: `${percentage}%` }}
                            />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-gray-500 text-sm">No hay datos de dispositivos</p>
              )}
            </div>

            {/* Locations */}
            <div className="bg-white rounded-xl border p-6">
              <h3 className="font-semibold text-gray-900 mb-4">Ubicaciones</h3>
              {locations.length > 0 ? (
                <div className="space-y-3">
                  {locations.slice(0, 5).map((location) => {
                    const total = locations.reduce((sum, l) => sum + l.count, 0);
                    const percentage = ((location.count / total) * 100).toFixed(1);
                    return (
                      <div key={location._id || 'unknown'} className="flex items-center gap-3">
                        <div className="flex-1">
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-sm font-medium text-gray-900">
                              {location._id || 'Desconocido'}
                            </span>
                            <span className="text-sm text-gray-500">
                              {location.count} ({percentage}%)
                            </span>
                          </div>
                          <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-green-500 rounded-full"
                              style={{ width: `${percentage}%` }}
                            />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-gray-500 text-sm">No hay datos de ubicacion</p>
              )}
            </div>
          </div>

          {/* Bounce Breakdown */}
          {bounces.length > 0 && (
            <div className="bg-white rounded-xl border p-6">
              <h3 className="font-semibold text-gray-900 mb-4">Desglose de Rebotes</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {bounces.map((bounce) => (
                  <div key={bounce._id} className="p-4 bg-red-50 rounded-lg">
                    <p className="text-sm text-red-600 capitalize">{bounce._id || 'Otro'}</p>
                    <p className="text-xl font-bold text-red-700">{bounce.count}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Activity Tab */}
      {activeTab === 'activity' && (
        <div className="bg-white rounded-xl border p-6">
          <h3 className="font-semibold text-gray-900 mb-4">Actividad por hora</h3>
          {activity.opens.length > 0 || activity.clicks.length > 0 ? (
            <div className="space-y-6">
              <div>
                <p className="text-sm font-medium text-gray-700 mb-3">Aperturas</p>
                <div className="flex items-end gap-1 h-32">
                  {activity.opens.map((item, index) => {
                    const maxCount = Math.max(...activity.opens.map(o => o.count));
                    const height = maxCount > 0 ? (item.count / maxCount) * 100 : 0;
                    return (
                      <div
                        key={index}
                        className="flex-1 bg-purple-200 hover:bg-purple-300 rounded-t transition-colors cursor-pointer group relative"
                        style={{ height: `${Math.max(height, 4)}%` }}
                        title={`${item._id}: ${item.count} aperturas`}
                      >
                        <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 hidden group-hover:block bg-gray-900 text-white text-xs px-2 py-1 rounded whitespace-nowrap">
                          {item._id}: {item.count}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-700 mb-3">Clics</p>
                <div className="flex items-end gap-1 h-32">
                  {activity.clicks.map((item, index) => {
                    const maxCount = Math.max(...activity.clicks.map(c => c.count));
                    const height = maxCount > 0 ? (item.count / maxCount) * 100 : 0;
                    return (
                      <div
                        key={index}
                        className="flex-1 bg-blue-200 hover:bg-blue-300 rounded-t transition-colors cursor-pointer group relative"
                        style={{ height: `${Math.max(height, 4)}%` }}
                        title={`${item._id}: ${item.count} clics`}
                      >
                        <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 hidden group-hover:block bg-gray-900 text-white text-xs px-2 py-1 rounded whitespace-nowrap">
                          {item._id}: {item.count}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          ) : (
            <p className="text-gray-500 text-center py-8">No hay actividad registrada</p>
          )}
        </div>
      )}

      {/* Links Tab */}
      {activeTab === 'links' && (
        <div className="bg-white rounded-xl border overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">URL</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Clics totales</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Clics unicos</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {links.length > 0 ? (
                links.map((link, index) => (
                  <tr key={index} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <a
                        href={link._id}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:underline truncate max-w-md block"
                      >
                        {link._id}
                      </a>
                    </td>
                    <td className="px-6 py-4 text-right font-medium">{link.clicks}</td>
                    <td className="px-6 py-4 text-right text-gray-500">{link.uniqueClicks}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={3} className="px-6 py-8 text-center text-gray-500">
                    No hay clics en enlaces registrados
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Recipients Tab */}
      {activeTab === 'recipients' && (
        <RecipientsList campaignId={campaignId} />
      )}
    </div>
  );
}

function MetricCard({
  label,
  value,
  subValue,
  icon,
  color,
}: {
  label: string;
  value: string;
  subValue?: string;
  icon: React.ReactNode;
  color: 'blue' | 'green' | 'purple' | 'indigo';
}) {
  const colorClasses = {
    blue: 'bg-blue-50 text-blue-600',
    green: 'bg-green-50 text-green-600',
    purple: 'bg-purple-50 text-purple-600',
    indigo: 'bg-indigo-50 text-indigo-600',
  };

  return (
    <div className="bg-white rounded-xl border p-4">
      <div className="flex items-center gap-3 mb-3">
        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${colorClasses[color]}`}>
          {icon}
        </div>
        <p className="text-sm text-gray-500">{label}</p>
      </div>
      <p className="text-2xl font-bold text-gray-900">{value}</p>
      {subValue && <p className="text-sm text-gray-500 mt-1">{subValue}</p>}
    </div>
  );
}

function RecipientsList({ campaignId }: { campaignId: string }) {
  const [recipients, setRecipients] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('');
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ total: 0, pages: 0 });

  useEffect(() => {
    fetchRecipients();
  }, [campaignId, filter, page]);

  const fetchRecipients = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      params.set('page', page.toString());
      params.set('limit', '20');
      if (filter) params.set('status', filter);

      const response = await fetch(`/api/marketing/email-campaigns/${campaignId}/recipients?${params}`);
      if (response.ok) {
        const data = await response.json();
        setRecipients(data.recipients);
        setPagination(data.pagination);
      }
    } catch (error) {
      console.error('Error fetching recipients:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-xl border overflow-hidden">
      <div className="p-4 border-b flex items-center gap-4">
        <select
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
        >
          <option value="">Todos</option>
          <option value="delivered">Entregados</option>
          <option value="bounced">Rebotados</option>
          <option value="failed">Fallidos</option>
        </select>
        <span className="text-sm text-gray-500">
          {pagination.total} destinatarios
        </span>
      </div>

      {loading ? (
        <div className="flex items-center justify-center p-8">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
        </div>
      ) : (
        <table className="w-full">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Email</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Estado</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Abierto</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Clic</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {recipients.map((recipient) => (
              <tr key={recipient._id} className="hover:bg-gray-50">
                <td className="px-6 py-4">
                  <div>
                    <p className="font-medium text-gray-900">{recipient.email}</p>
                    {recipient.firstName && (
                      <p className="text-sm text-gray-500">
                        {recipient.firstName} {recipient.lastName}
                      </p>
                    )}
                  </div>
                </td>
                <td className="px-6 py-4">
                  <span className={`inline-flex px-2 py-1 text-xs rounded-full ${
                    recipient.status === 'delivered' ? 'bg-green-100 text-green-700' :
                    recipient.status === 'bounced' ? 'bg-red-100 text-red-700' :
                    recipient.status === 'failed' ? 'bg-red-100 text-red-700' :
                    'bg-gray-100 text-gray-700'
                  }`}>
                    {recipient.status}
                  </span>
                </td>
                <td className="px-6 py-4">
                  {recipient.openedAt ? (
                    <span className="text-green-600">Si</span>
                  ) : (
                    <span className="text-gray-400">-</span>
                  )}
                </td>
                <td className="px-6 py-4">
                  {recipient.clickedAt ? (
                    <span className="text-blue-600">Si</span>
                  ) : (
                    <span className="text-gray-400">-</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {pagination.pages > 1 && (
        <div className="px-6 py-4 border-t flex items-center justify-between">
          <button
            onClick={() => setPage(page - 1)}
            disabled={page === 1}
            className="px-3 py-1 border rounded-lg hover:bg-gray-50 disabled:opacity-50"
          >
            Anterior
          </button>
          <span className="text-sm text-gray-500">
            Pagina {page} de {pagination.pages}
          </span>
          <button
            onClick={() => setPage(page + 1)}
            disabled={page === pagination.pages}
            className="px-3 py-1 border rounded-lg hover:bg-gray-50 disabled:opacity-50"
          >
            Siguiente
          </button>
        </div>
      )}
    </div>
  );
}
