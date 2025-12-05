'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft, Eye, Users, MousePointerClick, TrendingUp, Globe,
  Monitor, Smartphone, Tablet, Calendar, ExternalLink, RefreshCw
} from 'lucide-react';

interface AnalyticsData {
  page: {
    id: string;
    name: string;
    slug: string;
    status: string;
    publishedAt?: string;
    url: string;
  };
  dateRange: {
    start: string;
    end: string;
    days: number;
  };
  overview: {
    totalViews: number;
    uniqueVisitors: number;
    conversions: number;
    conversionRate: number;
    avgTimeOnPage: number;
    avgScrollDepth: number;
    bounceRate: number;
  };
  viewsOverTime: { _id: string; views: number; uniqueVisitors: number; conversions: number }[];
  trafficSources: { _id: string; count: number; conversions: number }[];
  devices: { _id: string; count: number }[];
  topReferrers: { _id: string; count: number; conversions: number }[];
  utmBreakdown: { source: string; medium: string; campaign: string; count: number; conversions: number }[];
  browsers: { _id: string; count: number }[];
  countries: { _id: string; count: number; conversions: number }[];
  abTest?: {
    enabled: boolean;
    variants: { id: string; name: string; weight: number }[];
    results: { variant: string; views: number; conversions: number; conversionRate: number }[];
  };
}

export default function LandingPageAnalytics() {
  const params = useParams();
  const router = useRouter();
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [days, setDays] = useState(30);

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/marketing/landing-pages/${params.id}/analytics?days=${days}`);
      if (!res.ok) {
        if (res.status === 404) {
          setError('Landing page no encontrada');
        } else {
          setError('Error al cargar analytics');
        }
        return;
      }
      const json = await res.json();
      setData(json);
    } catch (e) {
      setError('Error de conexion');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (params.id) {
      fetchAnalytics();
    }
  }, [params.id, days]);

  const formatDuration = (seconds: number) => {
    if (!seconds || seconds < 1) return '0s';
    const mins = Math.floor(seconds / 60);
    const secs = Math.round(seconds % 60);
    return mins > 0 ? `${mins}m ${secs}s` : `${secs}s`;
  };

  const getDeviceIcon = (device: string) => {
    switch (device?.toLowerCase()) {
      case 'mobile': return <Smartphone className="w-4 h-4" />;
      case 'tablet': return <Tablet className="w-4 h-4" />;
      default: return <Monitor className="w-4 h-4" />;
    }
  };

  if (loading && !data) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50 dark:bg-gray-900">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-4 bg-gray-50 dark:bg-gray-900">
        <div className="text-red-500 dark:text-red-400 text-lg">{error}</div>
        <button
          onClick={() => router.push('/marketing/landing-pages')}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          Volver a Landing Pages
        </button>
      </div>
    );
  }

  if (!data) return null;

  const { page, overview, viewsOverTime, devices, topReferrers, utmBreakdown, browsers, countries, abTest } = data;

  // Calculate max for chart scaling
  const maxViews = Math.max(...viewsOverTime.map(d => d.views), 1);

  return (
    <div className="p-6 max-w-7xl mx-auto bg-gray-50 dark:bg-gray-900 min-h-screen">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <Link
            href="/marketing/landing-pages"
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg text-gray-600 dark:text-gray-400"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{page.name}</h1>
            <div className="flex items-center gap-2 mt-1">
              <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                page.status === 'published' ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400' :
                page.status === 'draft' ? 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300' :
                'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400'
              }`}>
                {page.status === 'published' ? 'Publicado' :
                 page.status === 'draft' ? 'Borrador' : 'Archivado'}
              </span>
              <a
                href={page.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
              >
                {page.url} <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <select
            value={days}
            onChange={(e) => setDays(parseInt(e.target.value))}
            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
          >
            <option value={7}>Ultimos 7 dias</option>
            <option value={14}>Ultimos 14 dias</option>
            <option value={30}>Ultimos 30 dias</option>
            <option value={60}>Ultimos 60 dias</option>
            <option value={90}>Ultimos 90 dias</option>
          </select>
          <button
            onClick={fetchAnalytics}
            disabled={loading}
            className="p-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg"
            title="Actualizar"
          >
            <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <Link
            href={`/marketing/landing-pages/${page.id}/edit`}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Editar Pagina
          </Link>
        </div>
      </div>

      {/* Overview Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 mb-8">
        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400 mb-1">
            <Eye className="w-4 h-4" />
            <span className="text-sm">Vistas</span>
          </div>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">{overview.totalViews?.toLocaleString() || 0}</p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400 mb-1">
            <Users className="w-4 h-4" />
            <span className="text-sm">Visitantes</span>
          </div>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">{overview.uniqueVisitors?.toLocaleString() || 0}</p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400 mb-1">
            <MousePointerClick className="w-4 h-4" />
            <span className="text-sm">Conversiones</span>
          </div>
          <p className="text-2xl font-bold text-green-600 dark:text-green-400">{overview.conversions?.toLocaleString() || 0}</p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400 mb-1">
            <TrendingUp className="w-4 h-4" />
            <span className="text-sm">Tasa Conv.</span>
          </div>
          <p className="text-2xl font-bold text-purple-600 dark:text-purple-400">{overview.conversionRate?.toFixed(1) || 0}%</p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400 mb-1">
            <Calendar className="w-4 h-4" />
            <span className="text-sm">Tiempo Prom.</span>
          </div>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">{formatDuration(overview.avgTimeOnPage || 0)}</p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400 mb-1">
            <Globe className="w-4 h-4" />
            <span className="text-sm">Scroll Prom.</span>
          </div>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">{Math.round(overview.avgScrollDepth || 0)}%</p>
        </div>
      </div>

      {/* Views Over Time Chart */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 mb-8">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Vistas en el tiempo</h2>
        <div className="h-64">
          <div className="flex items-end justify-between h-full gap-1">
            {viewsOverTime.map((day, idx) => {
              const height = (day.views / maxViews) * 100;
              const convHeight = maxViews > 0 ? (day.conversions / maxViews) * 100 : 0;
              return (
                <div
                  key={day._id || idx}
                  className="flex-1 flex flex-col items-center justify-end gap-1 group relative"
                >
                  <div className="absolute bottom-full mb-2 hidden group-hover:block bg-gray-900 dark:bg-gray-700 text-white text-xs px-2 py-1 rounded whitespace-nowrap z-10">
                    <div>{new Date(day._id).toLocaleDateString('es-MX', { day: 'numeric', month: 'short' })}</div>
                    <div>Vistas: {day.views}</div>
                    <div>Conversiones: {day.conversions}</div>
                  </div>
                  <div className="w-full flex flex-col items-center gap-0.5">
                    <div
                      className="w-full bg-blue-500 rounded-t"
                      style={{ height: `${Math.max(height, 2)}%` }}
                    ></div>
                    {day.conversions > 0 && (
                      <div
                        className="w-full bg-green-500 rounded"
                        style={{ height: `${Math.max(convHeight, 2)}%` }}
                      ></div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
        <div className="flex items-center justify-center gap-6 mt-4 text-sm">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-blue-500 rounded"></div>
            <span className="text-gray-600 dark:text-gray-400">Vistas</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-green-500 rounded"></div>
            <span className="text-gray-600 dark:text-gray-400">Conversiones</span>
          </div>
        </div>
      </div>

      {/* Two Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
        {/* Devices */}
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Dispositivos</h2>
          {devices && devices.length > 0 ? (
            <div className="space-y-3">
              {devices.map((device) => {
                const total = devices.reduce((sum, d) => sum + d.count, 0);
                const pct = total > 0 ? (device.count / total) * 100 : 0;
                return (
                  <div key={device._id} className="flex items-center gap-3">
                    <span className="text-gray-500 dark:text-gray-400">{getDeviceIcon(device._id)}</span>
                    <span className="text-sm text-gray-700 dark:text-gray-300 w-20 capitalize">{device._id || 'Desconocido'}</span>
                    <div className="flex-1 bg-gray-100 dark:bg-gray-700 rounded-full h-2">
                      <div
                        className="bg-blue-500 h-2 rounded-full"
                        style={{ width: `${pct}%` }}
                      ></div>
                    </div>
                    <span className="text-sm text-gray-500 dark:text-gray-400 w-16 text-right">{pct.toFixed(1)}%</span>
                    <span className="text-sm text-gray-700 dark:text-gray-300 w-12 text-right">{device.count}</span>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-gray-500 dark:text-gray-400 text-center py-4">Sin datos de dispositivos</p>
          )}
        </div>

        {/* Browsers */}
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Navegadores</h2>
          {browsers && browsers.length > 0 ? (
            <div className="space-y-3">
              {browsers.slice(0, 5).map((browser) => {
                const total = browsers.reduce((sum, b) => sum + b.count, 0);
                const pct = total > 0 ? (browser.count / total) * 100 : 0;
                return (
                  <div key={browser._id} className="flex items-center gap-3">
                    <span className="text-sm text-gray-700 dark:text-gray-300 w-24 truncate">{browser._id || 'Desconocido'}</span>
                    <div className="flex-1 bg-gray-100 dark:bg-gray-700 rounded-full h-2">
                      <div
                        className="bg-purple-500 h-2 rounded-full"
                        style={{ width: `${pct}%` }}
                      ></div>
                    </div>
                    <span className="text-sm text-gray-500 dark:text-gray-400 w-16 text-right">{pct.toFixed(1)}%</span>
                    <span className="text-sm text-gray-700 dark:text-gray-300 w-12 text-right">{browser.count}</span>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-gray-500 dark:text-gray-400 text-center py-4">Sin datos de navegadores</p>
          )}
        </div>
      </div>

      {/* UTM Breakdown */}
      {utmBreakdown && utmBreakdown.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 mb-8">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Campanas UTM</h2>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-700">
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Source</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Medium</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Campaign</th>
                  <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Visitas</th>
                  <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Conversiones</th>
                  <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Tasa</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {utmBreakdown.slice(0, 10).map((utm, idx) => {
                  const rate = utm.count > 0 ? (utm.conversions / utm.count) * 100 : 0;
                  return (
                    <tr key={idx} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                      <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">{utm.source || '-'}</td>
                      <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">{utm.medium || '-'}</td>
                      <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">{utm.campaign || '-'}</td>
                      <td className="px-4 py-3 text-sm text-gray-900 dark:text-white text-right">{utm.count}</td>
                      <td className="px-4 py-3 text-sm text-green-600 dark:text-green-400 text-right">{utm.conversions}</td>
                      <td className="px-4 py-3 text-sm text-purple-600 dark:text-purple-400 text-right">{rate.toFixed(1)}%</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Top Referrers */}
      {topReferrers && topReferrers.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 mb-8">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Principales Referentes</h2>
          <div className="space-y-3">
            {topReferrers.slice(0, 10).map((ref, idx) => {
              const total = topReferrers.reduce((sum, r) => sum + r.count, 0);
              const pct = total > 0 ? (ref.count / total) * 100 : 0;
              return (
                <div key={idx} className="flex items-center gap-3">
                  <span className="text-sm text-gray-700 dark:text-gray-300 w-64 truncate">{ref._id}</span>
                  <div className="flex-1 bg-gray-100 dark:bg-gray-700 rounded-full h-2">
                    <div
                      className="bg-indigo-500 h-2 rounded-full"
                      style={{ width: `${pct}%` }}
                    ></div>
                  </div>
                  <span className="text-sm text-gray-500 dark:text-gray-400 w-16 text-right">{ref.count}</span>
                  <span className="text-sm text-green-600 dark:text-green-400 w-16 text-right">{ref.conversions} conv</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Countries */}
      {countries && countries.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 mb-8">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Paises</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {countries.slice(0, 10).map((country, idx) => (
              <div key={idx} className="bg-gray-50 dark:bg-gray-700 rounded-lg p-3 text-center">
                <p className="text-lg font-semibold text-gray-900 dark:text-white">{country.count}</p>
                <p className="text-sm text-gray-600 dark:text-gray-400">{country._id || 'Desconocido'}</p>
                {country.conversions > 0 && (
                  <p className="text-xs text-green-600 dark:text-green-400">{country.conversions} conversiones</p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* A/B Test Results */}
      {abTest && abTest.enabled && abTest.results && abTest.results.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Resultados A/B Test</h2>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-700">
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Variante</th>
                  <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Vistas</th>
                  <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Conversiones</th>
                  <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Tasa</th>
                  <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Diferencia</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {(() => {
                  const sortedResults = [...abTest.results].sort((a, b) => b.conversionRate - a.conversionRate);
                  const bestRate = sortedResults[0]?.conversionRate || 0;

                  return sortedResults.map((result, idx) => {
                    const variant = abTest.variants?.find(v => v.id === result.variant);
                    const diff = idx === 0 ? 0 : ((result.conversionRate - bestRate) / bestRate) * 100;
                    const isBest = idx === 0;

                    return (
                      <tr key={result.variant} className={`hover:bg-gray-50 dark:hover:bg-gray-700/50 ${isBest ? 'bg-green-50 dark:bg-green-900/20' : ''}`}>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium text-gray-900 dark:text-white">
                              {variant?.name || result.variant}
                            </span>
                            {isBest && (
                              <span className="px-2 py-0.5 bg-green-100 dark:bg-green-900/50 text-green-700 dark:text-green-400 text-xs rounded-full">
                                Mejor
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-900 dark:text-white text-right">{result.views}</td>
                        <td className="px-4 py-3 text-sm text-gray-900 dark:text-white text-right">{result.conversions}</td>
                        <td className="px-4 py-3 text-sm font-medium text-right">
                          <span className={isBest ? 'text-green-600 dark:text-green-400' : 'text-gray-900 dark:text-white'}>
                            {result.conversionRate.toFixed(2)}%
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm text-right">
                          {idx === 0 ? (
                            <span className="text-gray-400 dark:text-gray-500">-</span>
                          ) : (
                            <span className="text-red-600 dark:text-red-400">{diff.toFixed(1)}%</span>
                          )}
                        </td>
                      </tr>
                    );
                  });
                })()}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
