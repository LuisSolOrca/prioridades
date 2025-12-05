'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { usePermissions } from '@/hooks/usePermissions';
import {
  BarChart3,
  TrendingUp,
  TrendingDown,
  Eye,
  MousePointer,
  DollarSign,
  Target,
  Loader2,
  Calendar,
  ArrowUpRight,
  ArrowDownRight,
  Minus,
  PieChart,
  Activity,
  Video,
  Heart,
  Share2,
  MessageCircle,
  RefreshCw,
} from 'lucide-react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  PieChart as RechartsPieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts';

interface AnalyticsData {
  period: {
    startDate: string;
    endDate: string;
    days: number;
  };
  connectedPlatforms: {
    platform: string;
    platformAccountName: string;
    lastSyncAt: string;
  }[];
  campaigns: {
    total: number;
    active: number;
    byStatus: Record<string, number>;
    byPlatform: Record<string, number>;
    topCampaigns: {
      _id: string;
      name: string;
      platform: string;
      budget: number;
      spentAmount: number;
      metrics: {
        impressions: number;
        clicks: number;
        conversions: number;
      };
    }[];
  };
  metrics: {
    impressions: number;
    reach: number;
    clicks: number;
    spend: number;
    conversions: number;
    conversionValue: number;
    videoViews: number;
    engagement: {
      likes: number;
      shares: number;
      comments: number;
    };
    calculated: {
      ctr: number;
      cpc: number;
      cpm: number;
      roas: number;
    };
  };
  byPlatform: {
    _id: string;
    impressions: number;
    clicks: number;
    spend: number;
    conversions: number;
  }[];
  trends: {
    _id: string;
    impressions: number;
    clicks: number;
    spend: number;
    conversions: number;
  }[];
}

const PLATFORM_COLORS: Record<string, string> = {
  META: '#1877F2',
  LINKEDIN: '#0A66C2',
  TWITTER: '#1DA1F2',
  TIKTOK: '#000000',
  YOUTUBE: '#FF0000',
  WHATSAPP: '#25D366',
};

const PLATFORM_NAMES: Record<string, string> = {
  META: 'Meta',
  LINKEDIN: 'LinkedIn',
  TWITTER: 'Twitter',
  TIKTOK: 'TikTok',
  YOUTUBE: 'YouTube',
  WHATSAPP: 'WhatsApp',
};

export default function MarketingAnalyticsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const { permissions, isLoading: permissionsLoading } = usePermissions();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [days, setDays] = useState(30);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
    }
    if (status === 'authenticated' && !permissionsLoading) {
      if (!permissions.viewMarketing) {
        router.push('/dashboard');
        return;
      }
      loadData();
    }
  }, [status, router, permissions.viewMarketing, permissionsLoading, days]);

  const loadData = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/marketing/analytics/overview?days=${days}`);
      if (response.ok) {
        const result = await response.json();
        setData(result);
      }
    } catch (error) {
      console.error('Error loading analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN',
      minimumFractionDigits: 0,
    }).format(value);
  };

  const formatNumber = (value: number) => {
    if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`;
    if (value >= 1000) return `${(value / 1000).toFixed(1)}K`;
    return value.toLocaleString();
  };

  if (status === 'loading' || permissionsLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <Loader2 className="animate-spin text-purple-500" size={40} />
      </div>
    );
  }

  if (!session) return null;

  const pieData = data?.byPlatform.map((p) => ({
    name: PLATFORM_NAMES[p._id] || p._id,
    value: p.spend,
    color: PLATFORM_COLORS[p._id] || '#666',
  })) || [];

  const platformBarData = data?.byPlatform.map((p) => ({
    name: PLATFORM_NAMES[p._id] || p._id,
    impressions: p.impressions,
    clicks: p.clicks,
    conversions: p.conversions,
    color: PLATFORM_COLORS[p._id] || '#666',
  })) || [];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-purple-50/30 to-indigo-50/20 dark:from-gray-900 dark:via-gray-900 dark:to-gray-900">
      <div className="pt-16 main-content px-4 py-6 max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100 flex items-center gap-3">
              <div className="p-2 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-xl text-white shadow-lg">
                <BarChart3 size={24} />
              </div>
              Analytics de Marketing
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              Métricas detalladas de todas las plataformas
            </p>
          </div>
          <div className="flex items-center gap-3">
            <select
              value={days}
              onChange={(e) => setDays(parseInt(e.target.value))}
              className="px-4 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm"
            >
              <option value={7}>Últimos 7 días</option>
              <option value={30}>Últimos 30 días</option>
              <option value={90}>Últimos 90 días</option>
            </select>
            <button
              onClick={loadData}
              className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition"
            >
              <RefreshCw size={18} />
              Actualizar
            </button>
          </div>
        </div>

        {data && (
          <>
            {/* Main KPIs */}
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-4 mb-6">
              <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-200 dark:border-gray-700">
                <div className="flex items-center gap-2 mb-2">
                  <DollarSign className="w-5 h-5 text-orange-500" />
                  <span className="text-xs text-gray-500">Inversión</span>
                </div>
                <p className="text-xl font-bold text-gray-900 dark:text-white">
                  {formatCurrency(data.metrics.spend)}
                </p>
              </div>

              <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-200 dark:border-gray-700">
                <div className="flex items-center gap-2 mb-2">
                  <Eye className="w-5 h-5 text-blue-500" />
                  <span className="text-xs text-gray-500">Impresiones</span>
                </div>
                <p className="text-xl font-bold text-gray-900 dark:text-white">
                  {formatNumber(data.metrics.impressions)}
                </p>
              </div>

              <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-200 dark:border-gray-700">
                <div className="flex items-center gap-2 mb-2">
                  <Activity className="w-5 h-5 text-cyan-500" />
                  <span className="text-xs text-gray-500">Alcance</span>
                </div>
                <p className="text-xl font-bold text-gray-900 dark:text-white">
                  {formatNumber(data.metrics.reach)}
                </p>
              </div>

              <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-200 dark:border-gray-700">
                <div className="flex items-center gap-2 mb-2">
                  <MousePointer className="w-5 h-5 text-green-500" />
                  <span className="text-xs text-gray-500">Clicks</span>
                </div>
                <p className="text-xl font-bold text-gray-900 dark:text-white">
                  {formatNumber(data.metrics.clicks)}
                </p>
              </div>

              <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-200 dark:border-gray-700">
                <div className="flex items-center gap-2 mb-2">
                  <Target className="w-5 h-5 text-purple-500" />
                  <span className="text-xs text-gray-500">Conversiones</span>
                </div>
                <p className="text-xl font-bold text-gray-900 dark:text-white">
                  {formatNumber(data.metrics.conversions)}
                </p>
              </div>

              <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-200 dark:border-gray-700">
                <div className="flex items-center gap-2 mb-2">
                  <TrendingUp className="w-5 h-5 text-emerald-500" />
                  <span className="text-xs text-gray-500">CTR</span>
                </div>
                <p className="text-xl font-bold text-gray-900 dark:text-white">
                  {data.metrics.calculated.ctr.toFixed(2)}%
                </p>
              </div>

              <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-200 dark:border-gray-700">
                <div className="flex items-center gap-2 mb-2">
                  <DollarSign className="w-5 h-5 text-amber-500" />
                  <span className="text-xs text-gray-500">CPC</span>
                </div>
                <p className="text-xl font-bold text-gray-900 dark:text-white">
                  {formatCurrency(data.metrics.calculated.cpc)}
                </p>
              </div>

              <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-200 dark:border-gray-700">
                <div className="flex items-center gap-2 mb-2">
                  <BarChart3 className="w-5 h-5 text-indigo-500" />
                  <span className="text-xs text-gray-500">ROAS</span>
                </div>
                <p className="text-xl font-bold text-emerald-600 dark:text-emerald-400">
                  {data.metrics.calculated.roas.toFixed(2)}x
                </p>
              </div>
            </div>

            {/* Charts Row */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
              {/* Trends Chart */}
              <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
                <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-100 mb-4 flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-purple-500" />
                  Tendencia de Métricas
                </h3>
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={data.trends}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                      <XAxis
                        dataKey="_id"
                        tickFormatter={(value) => {
                          const date = new Date(value);
                          return `${date.getDate()}/${date.getMonth() + 1}`;
                        }}
                        stroke="#9ca3af"
                        fontSize={12}
                      />
                      <YAxis stroke="#9ca3af" fontSize={12} />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: '#1f2937',
                          border: 'none',
                          borderRadius: '8px',
                          color: '#fff',
                        }}
                        formatter={(value: number, name: string) => {
                          const labels: Record<string, string> = {
                            impressions: 'Impresiones',
                            clicks: 'Clicks',
                            spend: 'Inversión',
                            conversions: 'Conversiones',
                          };
                          return [formatNumber(value), labels[name] || name];
                        }}
                      />
                      <Area
                        type="monotone"
                        dataKey="impressions"
                        stroke="#3b82f6"
                        fill="#3b82f680"
                        name="impressions"
                      />
                      <Area
                        type="monotone"
                        dataKey="clicks"
                        stroke="#10b981"
                        fill="#10b98180"
                        name="clicks"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Spend by Platform */}
              <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
                <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-100 mb-4 flex items-center gap-2">
                  <PieChart className="w-5 h-5 text-orange-500" />
                  Inversión por Plataforma
                </h3>
                <div className="h-80">
                  {pieData.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <RechartsPieChart>
                        <Pie
                          data={pieData}
                          dataKey="value"
                          nameKey="name"
                          cx="50%"
                          cy="50%"
                          outerRadius={100}
                          label={({ name, percent }) => `${name} ${((percent || 0) * 100).toFixed(0)}%`}
                        >
                          {pieData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip
                          formatter={(value: number) => formatCurrency(value)}
                          contentStyle={{
                            backgroundColor: '#1f2937',
                            border: 'none',
                            borderRadius: '8px',
                            color: '#fff',
                          }}
                        />
                        <Legend />
                      </RechartsPieChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-full flex items-center justify-center text-gray-500">
                      Sin datos de inversión por plataforma
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Platform Comparison */}
            <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700 mb-6">
              <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-100 mb-4 flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-indigo-500" />
                Comparativo por Plataforma
              </h3>
              <div className="h-80">
                {platformBarData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={platformBarData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                      <XAxis dataKey="name" stroke="#9ca3af" fontSize={12} />
                      <YAxis stroke="#9ca3af" fontSize={12} />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: '#1f2937',
                          border: 'none',
                          borderRadius: '8px',
                          color: '#fff',
                        }}
                        formatter={(value: number) => formatNumber(value)}
                      />
                      <Legend />
                      <Bar dataKey="impressions" fill="#3b82f6" name="Impresiones" />
                      <Bar dataKey="clicks" fill="#10b981" name="Clicks" />
                      <Bar dataKey="conversions" fill="#8b5cf6" name="Conversiones" />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex items-center justify-center text-gray-500">
                    Sin datos de plataformas
                  </div>
                )}
              </div>
            </div>

            {/* Engagement & Video Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              {/* Engagement */}
              <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
                <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-100 mb-4 flex items-center gap-2">
                  <Heart className="w-5 h-5 text-pink-500" />
                  Engagement
                </h3>
                <div className="grid grid-cols-3 gap-4">
                  <div className="text-center p-4 bg-pink-50 dark:bg-pink-900/20 rounded-xl">
                    <Heart className="w-8 h-8 text-pink-500 mx-auto mb-2" />
                    <p className="text-2xl font-bold text-gray-900 dark:text-white">
                      {formatNumber(data.metrics.engagement.likes)}
                    </p>
                    <p className="text-xs text-gray-500">Likes</p>
                  </div>
                  <div className="text-center p-4 bg-blue-50 dark:bg-blue-900/20 rounded-xl">
                    <Share2 className="w-8 h-8 text-blue-500 mx-auto mb-2" />
                    <p className="text-2xl font-bold text-gray-900 dark:text-white">
                      {formatNumber(data.metrics.engagement.shares)}
                    </p>
                    <p className="text-xs text-gray-500">Shares</p>
                  </div>
                  <div className="text-center p-4 bg-green-50 dark:bg-green-900/20 rounded-xl">
                    <MessageCircle className="w-8 h-8 text-green-500 mx-auto mb-2" />
                    <p className="text-2xl font-bold text-gray-900 dark:text-white">
                      {formatNumber(data.metrics.engagement.comments)}
                    </p>
                    <p className="text-xs text-gray-500">Comentarios</p>
                  </div>
                </div>
              </div>

              {/* Video Metrics */}
              <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
                <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-100 mb-4 flex items-center gap-2">
                  <Video className="w-5 h-5 text-red-500" />
                  Video & Conversiones
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 bg-red-50 dark:bg-red-900/20 rounded-xl">
                    <Video className="w-6 h-6 text-red-500 mb-2" />
                    <p className="text-2xl font-bold text-gray-900 dark:text-white">
                      {formatNumber(data.metrics.videoViews)}
                    </p>
                    <p className="text-xs text-gray-500">Vistas de video</p>
                  </div>
                  <div className="p-4 bg-emerald-50 dark:bg-emerald-900/20 rounded-xl">
                    <DollarSign className="w-6 h-6 text-emerald-500 mb-2" />
                    <p className="text-2xl font-bold text-gray-900 dark:text-white">
                      {formatCurrency(data.metrics.conversionValue)}
                    </p>
                    <p className="text-xs text-gray-500">Valor conversiones</p>
                  </div>
                  <div className="p-4 bg-amber-50 dark:bg-amber-900/20 rounded-xl col-span-2">
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">CPM (Costo por mil)</p>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white">
                      {formatCurrency(data.metrics.calculated.cpm)}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Top Campaigns */}
            {data.campaigns.topCampaigns.length > 0 && (
              <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
                <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-100 mb-4 flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-emerald-500" />
                  Top Campañas Activas
                </h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-200 dark:border-gray-700">
                        <th className="text-left py-3 text-gray-500">Campaña</th>
                        <th className="text-left py-3 text-gray-500">Plataforma</th>
                        <th className="text-right py-3 text-gray-500">Impresiones</th>
                        <th className="text-right py-3 text-gray-500">Clicks</th>
                        <th className="text-right py-3 text-gray-500">Conversiones</th>
                        <th className="text-right py-3 text-gray-500">Gastado</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.campaigns.topCampaigns.map((campaign) => (
                        <tr
                          key={campaign._id}
                          className="border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50 cursor-pointer"
                          onClick={() => router.push(`/marketing/campaigns/${campaign._id}`)}
                        >
                          <td className="py-3 font-medium text-gray-900 dark:text-white">
                            {campaign.name}
                          </td>
                          <td className="py-3">
                            <span
                              className="px-2 py-1 rounded text-xs text-white"
                              style={{ backgroundColor: PLATFORM_COLORS[campaign.platform] || '#666' }}
                            >
                              {PLATFORM_NAMES[campaign.platform] || campaign.platform}
                            </span>
                          </td>
                          <td className="py-3 text-right text-gray-600 dark:text-gray-400">
                            {formatNumber(campaign.metrics?.impressions || 0)}
                          </td>
                          <td className="py-3 text-right text-gray-600 dark:text-gray-400">
                            {formatNumber(campaign.metrics?.clicks || 0)}
                          </td>
                          <td className="py-3 text-right text-gray-600 dark:text-gray-400">
                            {formatNumber(campaign.metrics?.conversions || 0)}
                          </td>
                          <td className="py-3 text-right font-medium text-emerald-600">
                            {formatCurrency(campaign.spentAmount || 0)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </>
        )}

        {!data && !loading && (
          <div className="bg-white dark:bg-gray-800 rounded-xl p-12 shadow-sm border border-gray-200 dark:border-gray-700 text-center">
            <BarChart3 className="w-16 h-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
              Sin datos de analytics
            </h3>
            <p className="text-gray-500 dark:text-gray-400 mb-4">
              Conecta plataformas y crea campañas para ver métricas
            </p>
            <button
              onClick={() => router.push('/admin/marketing-integrations')}
              className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition"
            >
              Conectar plataformas
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
