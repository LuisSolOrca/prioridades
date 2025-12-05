'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  GitBranch, TrendingUp, Users, DollarSign, BarChart3, RefreshCw,
  ArrowRight, Target, Mail, Globe, Search, Share2, Eye, MousePointer
} from 'lucide-react';

interface OverviewData {
  dateRange: { startDate: string; endDate: string; days: number };
  overview: {
    totalConversions: number;
    totalValue: number;
    avgJourneyDuration: number;
    avgTouchpoints: number;
    touchpoints: {
      total: number;
      identified: number;
      anonymous: number;
      uniqueVisitors: number;
      uniqueContacts: number;
    };
  };
  byChannel: { channel: string; conversions: number; totalAttributedValue: number; avgCredit: number }[];
  topCampaigns: { campaign: string; source: string; medium: string; conversions: number; totalAttributedValue: number }[];
  conversionPaths: { path: string[]; count: number; totalValue: number; avgJourneyDuration: number }[];
  conversionsOverTime: { _id: string; count: number; value: number }[];
  model: string;
}

const CHANNEL_ICONS: Record<string, React.ReactNode> = {
  email: <Mail className="w-4 h-4" />,
  paid_social: <Share2 className="w-4 h-4" />,
  organic_social: <Share2 className="w-4 h-4" />,
  paid_search: <Search className="w-4 h-4" />,
  organic_search: <Search className="w-4 h-4" />,
  direct: <Globe className="w-4 h-4" />,
  referral: <ArrowRight className="w-4 h-4" />,
  display: <Eye className="w-4 h-4" />,
  video: <BarChart3 className="w-4 h-4" />,
  other: <Target className="w-4 h-4" />,
};

const CHANNEL_COLORS: Record<string, string> = {
  email: 'bg-blue-500',
  paid_social: 'bg-pink-500',
  organic_social: 'bg-purple-500',
  paid_search: 'bg-green-500',
  organic_search: 'bg-teal-500',
  direct: 'bg-gray-500',
  referral: 'bg-orange-500',
  display: 'bg-yellow-500',
  video: 'bg-red-500',
  other: 'bg-slate-500',
};

const MODEL_LABELS: Record<string, string> = {
  first_touch: 'First Touch',
  last_touch: 'Last Touch',
  linear: 'Linear',
  time_decay: 'Time Decay',
  u_shaped: 'U-Shaped',
  w_shaped: 'W-Shaped',
};

export default function AttributionDashboard() {
  const [data, setData] = useState<OverviewData | null>(null);
  const [loading, setLoading] = useState(true);
  const [days, setDays] = useState(30);
  const [model, setModel] = useState('linear');

  const fetchData = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/marketing/attribution/overview?days=${days}&model=${model}`);
      if (res.ok) {
        const json = await res.json();
        setData(json);
      }
    } catch (e) {
      console.error('Error fetching attribution data:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [days, model]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN',
      maximumFractionDigits: 0,
    }).format(value);
  };

  if (loading && !data) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
      </div>
    );
  }

  const maxChannelValue = Math.max(...(data?.byChannel || []).map(c => c.totalAttributedValue), 1);

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <GitBranch className="w-7 h-7 text-purple-600" />
            Attribution Reporting
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Analiza el ROI de cada canal y el journey de tus clientes
          </p>
        </div>

        <div className="flex items-center gap-3">
          <select
            value={model}
            onChange={(e) => setModel(e.target.value)}
            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500"
          >
            {Object.entries(MODEL_LABELS).map(([value, label]) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>
          <select
            value={days}
            onChange={(e) => setDays(parseInt(e.target.value))}
            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500"
          >
            <option value={7}>Últimos 7 días</option>
            <option value={14}>Últimos 14 días</option>
            <option value={30}>Últimos 30 días</option>
            <option value={60}>Últimos 60 días</option>
            <option value={90}>Últimos 90 días</option>
          </select>
          <button
            onClick={fetchData}
            disabled={loading}
            className="p-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
            title="Actualizar"
          >
            <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Overview Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 mb-8">
        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700 shadow-sm">
          <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400 mb-1">
            <TrendingUp className="w-4 h-4" />
            <span className="text-sm">Conversiones</span>
          </div>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">
            {data?.overview.totalConversions?.toLocaleString() || 0}
          </p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700 shadow-sm">
          <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400 mb-1">
            <DollarSign className="w-4 h-4" />
            <span className="text-sm">Valor Total</span>
          </div>
          <p className="text-2xl font-bold text-green-600 dark:text-green-400">
            {formatCurrency(data?.overview.totalValue || 0)}
          </p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700 shadow-sm">
          <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400 mb-1">
            <MousePointer className="w-4 h-4" />
            <span className="text-sm">Touchpoints</span>
          </div>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">
            {data?.overview.touchpoints?.total?.toLocaleString() || 0}
          </p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700 shadow-sm">
          <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400 mb-1">
            <Users className="w-4 h-4" />
            <span className="text-sm">Visitantes</span>
          </div>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">
            {data?.overview.touchpoints?.uniqueVisitors?.toLocaleString() || 0}
          </p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700 shadow-sm">
          <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400 mb-1">
            <BarChart3 className="w-4 h-4" />
            <span className="text-sm">Prom. Touchpoints</span>
          </div>
          <p className="text-2xl font-bold text-purple-600 dark:text-purple-400">
            {(data?.overview.avgTouchpoints || 0).toFixed(1)}
          </p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700 shadow-sm">
          <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400 mb-1">
            <Target className="w-4 h-4" />
            <span className="text-sm">Días Promedio</span>
          </div>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">
            {(data?.overview.avgJourneyDuration || 0).toFixed(1)}
          </p>
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
        {/* Channel Attribution */}
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Atribución por Canal</h2>
            <Link
              href="/marketing/attribution/compare"
              className="text-sm text-purple-600 dark:text-purple-400 hover:underline"
            >
              Comparar modelos
            </Link>
          </div>

          {data?.byChannel && data.byChannel.length > 0 ? (
            <div className="space-y-4">
              {data.byChannel.slice(0, 8).map((channel) => {
                const pct = (channel.totalAttributedValue / maxChannelValue) * 100;
                return (
                  <div key={channel.channel} className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${CHANNEL_COLORS[channel.channel] || 'bg-gray-500'} text-white`}>
                      {CHANNEL_ICONS[channel.channel] || <Target className="w-4 h-4" />}
                    </div>
                    <div className="flex-1">
                      <div className="flex justify-between text-sm mb-1">
                        <span className="font-medium text-gray-900 dark:text-white capitalize">
                          {channel.channel.replace('_', ' ')}
                        </span>
                        <span className="text-gray-600 dark:text-gray-300">
                          {formatCurrency(channel.totalAttributedValue)}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="flex-1 bg-gray-100 dark:bg-gray-700 rounded-full h-2">
                          <div
                            className={`h-2 rounded-full ${CHANNEL_COLORS[channel.channel] || 'bg-gray-500'}`}
                            style={{ width: `${Math.min(pct, 100)}%` }}
                          ></div>
                        </div>
                        <span className="text-xs text-gray-500 dark:text-gray-400 w-20 text-right">
                          {channel.conversions} conv.
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-center text-gray-500 dark:text-gray-400 py-8">Sin datos de atribución</p>
          )}
        </div>

        {/* Top Campaigns */}
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Top Campañas</h2>
            <Link
              href="/marketing/campaigns"
              className="text-sm text-purple-600 dark:text-purple-400 hover:underline"
            >
              Ver todas
            </Link>
          </div>

          {data?.topCampaigns && data.topCampaigns.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-gray-500 dark:text-gray-400 border-b border-gray-200 dark:border-gray-700">
                    <th className="pb-2 font-medium">Campaña</th>
                    <th className="pb-2 font-medium text-right">Conv.</th>
                    <th className="pb-2 font-medium text-right">Valor</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                  {data.topCampaigns.slice(0, 6).map((campaign, idx) => (
                    <tr key={idx} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                      <td className="py-2">
                        <div>
                          <p className="font-medium text-gray-900 dark:text-white truncate max-w-[200px]">
                            {campaign.campaign}
                          </p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            {campaign.source} / {campaign.medium}
                          </p>
                        </div>
                      </td>
                      <td className="py-2 text-right text-gray-900 dark:text-white">{campaign.conversions}</td>
                      <td className="py-2 text-right text-green-600 dark:text-green-400 font-medium">
                        {formatCurrency(campaign.totalAttributedValue)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-center text-gray-500 dark:text-gray-400 py-8">Sin datos de campañas</p>
          )}
        </div>
      </div>

      {/* Conversion Paths */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm p-6 mb-8">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Paths de Conversión más Comunes</h2>

        {data?.conversionPaths && data.conversionPaths.length > 0 ? (
          <div className="space-y-4">
            {data.conversionPaths.map((path, idx) => (
              <div key={idx} className="flex items-center gap-4 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                <span className="text-lg font-bold text-gray-400">#{idx + 1}</span>
                <div className="flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    {path.path.map((channel, i) => (
                      <div key={i} className="flex items-center gap-1">
                        <span className={`px-3 py-1 rounded-full text-sm font-medium text-white capitalize ${CHANNEL_COLORS[channel] || 'bg-gray-500'}`}>
                          {channel.replace('_', ' ')}
                        </span>
                        {i < path.path.length - 1 && (
                          <ArrowRight className="w-4 h-4 text-gray-400" />
                        )}
                      </div>
                    ))}
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium text-gray-900 dark:text-white">{path.count} conversiones</p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">{formatCurrency(path.totalValue)}</p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-center text-gray-500 dark:text-gray-400 py-8">Sin datos de paths</p>
        )}
      </div>

      {/* Conversions Over Time Chart */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm p-6">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Conversiones en el Tiempo</h2>

        {data?.conversionsOverTime && data.conversionsOverTime.length > 0 ? (
          <div className="h-64">
            <div className="flex items-end justify-between h-full gap-1">
              {(() => {
                const maxCount = Math.max(...data.conversionsOverTime.map(d => d.count), 1);
                return data.conversionsOverTime.map((day, idx) => {
                  const height = (day.count / maxCount) * 100;
                  return (
                    <div
                      key={day._id || idx}
                      className="flex-1 flex flex-col items-center justify-end gap-1 group relative"
                    >
                      <div className="absolute bottom-full mb-2 hidden group-hover:block bg-gray-900 text-white text-xs px-2 py-1 rounded whitespace-nowrap z-10">
                        <div>{new Date(day._id).toLocaleDateString('es-MX', { day: 'numeric', month: 'short' })}</div>
                        <div>{day.count} conversiones</div>
                        <div>{formatCurrency(day.value)}</div>
                      </div>
                      <div
                        className="w-full bg-purple-500 rounded-t hover:bg-purple-600 transition-colors"
                        style={{ height: `${Math.max(height, 2)}%` }}
                      ></div>
                    </div>
                  );
                });
              })()}
            </div>
          </div>
        ) : (
          <p className="text-center text-gray-500 dark:text-gray-400 py-8">Sin datos de conversiones</p>
        )}
      </div>

      {/* Quick Links */}
      <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-4">
        <Link
          href="/marketing/attribution/compare"
          className="flex items-center gap-3 p-4 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl hover:border-purple-300 dark:hover:border-purple-600 hover:shadow-sm transition"
        >
          <div className="p-3 bg-purple-100 dark:bg-purple-900/50 text-purple-600 dark:text-purple-400 rounded-lg">
            <BarChart3 className="w-5 h-5" />
          </div>
          <div>
            <p className="font-medium text-gray-900 dark:text-white">Comparar Modelos</p>
            <p className="text-sm text-gray-500 dark:text-gray-400">First, Last, Linear, etc.</p>
          </div>
        </Link>
        <Link
          href="/marketing/attribution/conversions"
          className="flex items-center gap-3 p-4 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl hover:border-purple-300 dark:hover:border-purple-600 hover:shadow-sm transition"
        >
          <div className="p-3 bg-green-100 dark:bg-green-900/50 text-green-600 dark:text-green-400 rounded-lg">
            <TrendingUp className="w-5 h-5" />
          </div>
          <div>
            <p className="font-medium text-gray-900 dark:text-white">Conversiones</p>
            <p className="text-sm text-gray-500 dark:text-gray-400">Lista detallada</p>
          </div>
        </Link>
        <Link
          href="/crm/contacts"
          className="flex items-center gap-3 p-4 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl hover:border-purple-300 dark:hover:border-purple-600 hover:shadow-sm transition"
        >
          <div className="p-3 bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-400 rounded-lg">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <p className="font-medium text-gray-900 dark:text-white">Customer Journeys</p>
            <p className="text-sm text-gray-500 dark:text-gray-400">Ver desde contactos</p>
          </div>
        </Link>
      </div>
    </div>
  );
}
