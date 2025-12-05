'use client';

export const dynamic = 'force-dynamic';

import { useState, useEffect, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  AreaChart,
  Area,
} from 'recharts';
import {
  TrendingUp,
  TrendingDown,
  Eye,
  MousePointer,
  DollarSign,
  Target,
  Users,
  Activity,
  RefreshCw,
  ExternalLink,
  CheckCircle,
  AlertCircle,
  Clock,
} from 'lucide-react';

const PLATFORM_COLORS: Record<string, string> = {
  META: '#1877F2',
  TWITTER: '#1DA1F2',
  TIKTOK: '#000000',
  YOUTUBE: '#FF0000',
  LINKEDIN: '#0A66C2',
  WHATSAPP: '#25D366',
  GA4: '#F9AB00',
};

const PLATFORM_NAMES: Record<string, string> = {
  META: 'Meta',
  TWITTER: 'Twitter/X',
  TIKTOK: 'TikTok',
  YOUTUBE: 'YouTube',
  LINKEDIN: 'LinkedIn',
  WHATSAPP: 'WhatsApp',
  GA4: 'Analytics',
};

interface StatCardProps {
  label: string;
  value: string | number;
  change?: number;
  icon: React.ReactNode;
  color: string;
  prefix?: string;
  suffix?: string;
}

function StatCard({ label, value, change, icon, color, prefix = '', suffix = '' }: StatCardProps) {
  return (
    <div className={`bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-100 dark:border-gray-700`}>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-500 dark:text-gray-400">{label}</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
            {prefix}{typeof value === 'number' ? value.toLocaleString() : value}{suffix}
          </p>
          {change !== undefined && (
            <div className={`flex items-center mt-2 text-sm ${change >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {change >= 0 ? <TrendingUp className="w-4 h-4 mr-1" /> : <TrendingDown className="w-4 h-4 mr-1" />}
              {Math.abs(change)}% vs periodo anterior
            </div>
          )}
        </div>
        <div className={`p-3 rounded-lg ${color}`}>
          {icon}
        </div>
      </div>
    </div>
  );
}

interface PlatformBadgeProps {
  platform: string;
  connected: boolean;
  accountName?: string;
  lastSync?: string;
}

function PlatformBadge({ platform, connected, accountName, lastSync }: PlatformBadgeProps) {
  return (
    <div className={`flex items-center justify-between p-3 rounded-lg border ${
      connected
        ? 'border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-900/20'
        : 'border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-800'
    }`}>
      <div className="flex items-center gap-3">
        <div
          className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold"
          style={{ backgroundColor: PLATFORM_COLORS[platform] || '#6B7280' }}
        >
          {platform.charAt(0)}
        </div>
        <div>
          <p className="font-medium text-gray-900 dark:text-white text-sm">
            {PLATFORM_NAMES[platform] || platform}
          </p>
          {connected && accountName && (
            <p className="text-xs text-gray-500 dark:text-gray-400">{accountName}</p>
          )}
        </div>
      </div>
      <div className="flex items-center gap-2">
        {connected ? (
          <CheckCircle className="w-5 h-5 text-green-500" />
        ) : (
          <AlertCircle className="w-5 h-5 text-gray-400" />
        )}
      </div>
    </div>
  );
}

export default function MarketingDashboard() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [data, setData] = useState<any>(null);
  const [selectedPeriod, setSelectedPeriod] = useState(30);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/marketing/analytics/overview?days=${selectedPeriod}`);
      const result = await response.json();
      setData(result);
    } catch (error) {
      console.error('Error loading marketing data:', error);
    } finally {
      setLoading(false);
    }
  }, [selectedPeriod]);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
      return;
    }

    if (status === 'authenticated') {
      loadData();
    }
  }, [status, router, loadData]);

  const handleSync = async () => {
    setSyncing(true);
    try {
      await fetch('/api/marketing/sync/all', { method: 'POST' });
      await loadData();
    } catch (error) {
      console.error('Error syncing:', error);
    } finally {
      setSyncing(false);
    }
  };

  if (status === 'loading' || loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const CHART_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4'];

  return (
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              Marketing Hub
            </h1>
            <p className="text-gray-500 dark:text-gray-400 mt-1">
              Gestiona tus campañas y analiza el rendimiento
            </p>
          </div>

          <div className="flex items-center gap-3 mt-4 sm:mt-0">
            <select
              value={selectedPeriod}
              onChange={(e) => setSelectedPeriod(Number(e.target.value))}
              className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm"
            >
              <option value={7}>Últimos 7 días</option>
              <option value={30}>Últimos 30 días</option>
              <option value={90}>Últimos 90 días</option>
            </select>

            <button
              onClick={handleSync}
              disabled={syncing}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 text-sm"
            >
              <RefreshCw className={`w-4 h-4 ${syncing ? 'animate-spin' : ''}`} />
              Sincronizar
            </button>

            <button
              onClick={() => router.push('/marketing/campaigns/new')}
              className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm"
            >
              + Nueva Campaña
            </button>
          </div>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <StatCard
            label="Impresiones"
            value={data?.metrics?.impressions || 0}
            icon={<Eye className="w-6 h-6 text-white" />}
            color="bg-blue-500"
          />
          <StatCard
            label="Clicks"
            value={data?.metrics?.clicks || 0}
            icon={<MousePointer className="w-6 h-6 text-white" />}
            color="bg-green-500"
          />
          <StatCard
            label="Gasto Total"
            value={data?.metrics?.spend || 0}
            prefix="$"
            icon={<DollarSign className="w-6 h-6 text-white" />}
            color="bg-purple-500"
          />
          <StatCard
            label="Conversiones"
            value={data?.metrics?.conversions || 0}
            icon={<Target className="w-6 h-6 text-white" />}
            color="bg-orange-500"
          />
        </div>

        {/* Secondary KPIs */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-4 text-center">
            <p className="text-2xl font-bold text-gray-900 dark:text-white">
              {data?.metrics?.calculated?.ctr || 0}%
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-400">CTR</p>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-lg p-4 text-center">
            <p className="text-2xl font-bold text-gray-900 dark:text-white">
              ${data?.metrics?.calculated?.cpc || 0}
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-400">CPC</p>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-lg p-4 text-center">
            <p className="text-2xl font-bold text-gray-900 dark:text-white">
              ${data?.metrics?.calculated?.cpm || 0}
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-400">CPM</p>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-lg p-4 text-center">
            <p className="text-2xl font-bold text-gray-900 dark:text-white">
              {data?.metrics?.calculated?.roas || 0}x
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-400">ROAS</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          {/* Trends Chart */}
          <div className="lg:col-span-2 bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Tendencia de Métricas
            </h3>
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={data?.trends || []}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="_id" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip />
                <Legend />
                <Area
                  type="monotone"
                  dataKey="impressions"
                  name="Impresiones"
                  stroke="#3b82f6"
                  fill="#3b82f6"
                  fillOpacity={0.2}
                />
                <Area
                  type="monotone"
                  dataKey="clicks"
                  name="Clicks"
                  stroke="#10b981"
                  fill="#10b981"
                  fillOpacity={0.2}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* Connected Platforms */}
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Plataformas
              </h3>
              <button
                onClick={() => router.push('/admin/marketing-integrations')}
                className="text-blue-600 hover:text-blue-700 text-sm flex items-center gap-1"
              >
                Configurar <ExternalLink className="w-4 h-4" />
              </button>
            </div>
            <div className="space-y-3">
              {['META', 'LINKEDIN', 'TWITTER', 'TIKTOK', 'YOUTUBE', 'WHATSAPP', 'GA4'].map((platform) => {
                const connected = data?.connectedPlatforms?.find((p: any) => p.platform === platform);
                return (
                  <PlatformBadge
                    key={platform}
                    platform={platform}
                    connected={!!connected}
                    accountName={connected?.platformAccountName}
                    lastSync={connected?.lastSyncAt}
                  />
                );
              })}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* By Platform Chart */}
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Rendimiento por Plataforma
            </h3>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={data?.byPlatform || []}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="_id" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip />
                <Legend />
                <Bar dataKey="impressions" name="Impresiones" fill="#3b82f6" />
                <Bar dataKey="clicks" name="Clicks" fill="#10b981" />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Campaign Status */}
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Estado de Campañas
            </h3>
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div className="text-center p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                <p className="text-3xl font-bold text-gray-900 dark:text-white">
                  {data?.campaigns?.total || 0}
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-400">Total</p>
              </div>
              <div className="text-center p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
                <p className="text-3xl font-bold text-green-600">
                  {data?.campaigns?.active || 0}
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-400">Activas</p>
              </div>
            </div>
            <div className="space-y-2">
              {Object.entries(data?.campaigns?.byStatus || {}).map(([status, count]) => (
                <div key={status} className="flex items-center justify-between text-sm">
                  <span className="text-gray-600 dark:text-gray-400">{status}</span>
                  <span className="font-medium text-gray-900 dark:text-white">{count as number}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Top Campaigns */}
        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm mb-8">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Top Campañas Activas
            </h3>
            <button
              onClick={() => router.push('/marketing/campaigns')}
              className="text-blue-600 hover:text-blue-700 text-sm"
            >
              Ver todas →
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-gray-500 dark:text-gray-400 border-b border-gray-200 dark:border-gray-700">
                  <th className="pb-3 font-medium">Campaña</th>
                  <th className="pb-3 font-medium">Plataforma</th>
                  <th className="pb-3 font-medium text-right">Impresiones</th>
                  <th className="pb-3 font-medium text-right">Clicks</th>
                  <th className="pb-3 font-medium text-right">Gasto</th>
                  <th className="pb-3 font-medium text-right">CTR</th>
                </tr>
              </thead>
              <tbody>
                {(data?.campaigns?.topCampaigns || []).map((campaign: any) => (
                  <tr
                    key={campaign._id}
                    className="border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700"
                  >
                    <td className="py-3">
                      <p className="font-medium text-gray-900 dark:text-white">{campaign.name}</p>
                    </td>
                    <td className="py-3">
                      <span
                        className="px-2 py-1 rounded text-xs text-white"
                        style={{ backgroundColor: PLATFORM_COLORS[campaign.platform] }}
                      >
                        {PLATFORM_NAMES[campaign.platform]}
                      </span>
                    </td>
                    <td className="py-3 text-right text-gray-600 dark:text-gray-400">
                      {campaign.metrics?.impressions?.toLocaleString() || 0}
                    </td>
                    <td className="py-3 text-right text-gray-600 dark:text-gray-400">
                      {campaign.metrics?.clicks?.toLocaleString() || 0}
                    </td>
                    <td className="py-3 text-right text-gray-600 dark:text-gray-400">
                      ${campaign.spentAmount?.toLocaleString() || 0}
                    </td>
                    <td className="py-3 text-right text-gray-600 dark:text-gray-400">
                      {campaign.metrics?.ctr?.toFixed(2) || 0}%
                    </td>
                  </tr>
                ))}
                {(!data?.campaigns?.topCampaigns || data.campaigns.topCampaigns.length === 0) && (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-gray-500 dark:text-gray-400">
                      No hay campañas activas
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <button
            onClick={() => router.push('/marketing/campaigns')}
            className="p-4 bg-white dark:bg-gray-800 rounded-xl shadow-sm hover:shadow-md transition-shadow text-center"
          >
            <Activity className="w-8 h-8 mx-auto mb-2 text-blue-600" />
            <p className="font-medium text-gray-900 dark:text-white">Campañas</p>
          </button>
          <button
            onClick={() => router.push('/marketing/web-tracking')}
            className="p-4 bg-white dark:bg-gray-800 rounded-xl shadow-sm hover:shadow-md transition-shadow text-center"
          >
            <Users className="w-8 h-8 mx-auto mb-2 text-green-600" />
            <p className="font-medium text-gray-900 dark:text-white">Web Analytics</p>
          </button>
          <button
            onClick={() => router.push('/marketing/whatsapp')}
            className="p-4 bg-white dark:bg-gray-800 rounded-xl shadow-sm hover:shadow-md transition-shadow text-center"
          >
            <span className="text-3xl block mb-1">💬</span>
            <p className="font-medium text-gray-900 dark:text-white">WhatsApp</p>
          </button>
          <button
            onClick={() => router.push('/marketing/analytics')}
            className="p-4 bg-white dark:bg-gray-800 rounded-xl shadow-sm hover:shadow-md transition-shadow text-center"
          >
            <TrendingUp className="w-8 h-8 mx-auto mb-2 text-purple-600" />
            <p className="font-medium text-gray-900 dark:text-white">Analytics</p>
          </button>
        </div>
      </main>
  );
}
