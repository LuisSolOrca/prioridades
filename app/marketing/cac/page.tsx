'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { usePermissions } from '@/hooks/usePermissions';
import {
  DollarSign,
  TrendingUp,
  TrendingDown,
  Users,
  Target,
  BarChart3,
  Calendar,
  RefreshCw,
  AlertCircle,
  ArrowUp,
  ArrowDown,
  Minus,
} from 'lucide-react';

interface CACMetrics {
  totalSpend: number;
  totalConversions: number;
  cac: number;
  currency: string;
}

interface PlatformCACMetrics extends CACMetrics {
  platform: string;
  percentOfSpend: number;
  percentOfConversions: number;
}

interface CampaignCACMetrics extends CACMetrics {
  campaignId: string;
  campaignName: string;
  platform: string;
  roas: number;
  conversionValue: number;
}

interface CACTrend {
  date: string;
  spend: number;
  conversions: number;
  cac: number;
}

interface CACData {
  period: { start: string; end: string };
  overall: CACMetrics;
  byPlatform: PlatformCACMetrics[];
  topCampaigns: CampaignCACMetrics[];
  trend: CACTrend[];
  comparison?: {
    previousPeriod: CACMetrics;
    change: { spend: number; conversions: number; cac: number };
  };
}

const PLATFORM_COLORS: Record<string, string> = {
  META: 'bg-blue-500',
  GOOGLE_ADS: 'bg-red-500',
  LINKEDIN: 'bg-blue-700',
  TIKTOK: 'bg-gray-800',
  TWITTER: 'bg-sky-500',
};

const PLATFORM_NAMES: Record<string, string> = {
  META: 'Meta (Facebook/Instagram)',
  GOOGLE_ADS: 'Google Ads',
  LINKEDIN: 'LinkedIn Ads',
  TIKTOK: 'TikTok Ads',
  TWITTER: 'Twitter/X Ads',
};

export default function CACDashboard() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const { permissions, isLoading: permissionsLoading } = usePermissions();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<CACData | null>(null);
  const [period, setPeriod] = useState('30d');
  const [error, setError] = useState<string | null>(null);

  const canView = permissions?.canManageCampaigns || permissions?.canViewWebAnalytics || (session?.user as any)?.role === 'ADMIN';

  useEffect(() => {
    if (status === 'authenticated' && !permissionsLoading) {
      if (canView) {
        fetchData();
      } else {
        setLoading(false);
      }
    }
  }, [status, permissionsLoading, canView, period]);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch(`/api/marketing/cac?period=${period}`);
      if (!res.ok) throw new Error('Error loading CAC data');
      const cacData = await res.json();
      setData(cacData);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (value: number, currency = 'USD') => {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency,
      minimumFractionDigits: 2,
    }).format(value);
  };

  const formatNumber = (value: number) => {
    return new Intl.NumberFormat('es-MX').format(value);
  };

  const formatPercent = (value: number) => {
    const sign = value > 0 ? '+' : '';
    return `${sign}${value.toFixed(1)}%`;
  };

  const getChangeIcon = (value: number, invertColors = false) => {
    if (value === 0) return <Minus className="h-4 w-4 text-gray-400" />;
    const isPositive = invertColors ? value < 0 : value > 0;
    return isPositive ? (
      <ArrowUp className="h-4 w-4 text-green-500" />
    ) : (
      <ArrowDown className="h-4 w-4 text-red-500" />
    );
  };

  if (status === 'loading' || permissionsLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <RefreshCw className="h-8 w-8 animate-spin text-purple-600" />
      </div>
    );
  }

  if (!canView) {
    return (
      <div className="p-8">
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 text-center">
          <AlertCircle className="h-12 w-12 text-yellow-500 mx-auto mb-4" />
          <h2 className="text-lg font-semibold text-yellow-800 mb-2">
            Acceso Restringido
          </h2>
          <p className="text-yellow-700">
            No tienes permisos para ver el análisis de CAC. Contacta a un administrador.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Costo de Adquisición de Clientes (CAC)
          </h1>
          <p className="text-gray-500 mt-1">
            Análisis del costo para adquirir nuevos clientes por plataforma
          </p>
        </div>

        <div className="flex gap-3">
          <select
            value={period}
            onChange={(e) => setPeriod(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
          >
            <option value="7d">Últimos 7 días</option>
            <option value="30d">Últimos 30 días</option>
            <option value="90d">Últimos 90 días</option>
          </select>

          <button
            onClick={fetchData}
            disabled={loading}
            className="flex items-center gap-2 bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            Actualizar
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
          <p className="text-red-700">{error}</p>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <RefreshCw className="h-8 w-8 animate-spin text-purple-600" />
        </div>
      ) : data ? (
        <>
          {/* Overview Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            {/* Total Spend */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 bg-purple-100 rounded-lg">
                  <DollarSign className="h-6 w-6 text-purple-600" />
                </div>
                {data.comparison && (
                  <div className="flex items-center gap-1 text-sm">
                    {getChangeIcon(data.comparison.change.spend)}
                    <span className={data.comparison.change.spend > 0 ? 'text-red-600' : 'text-green-600'}>
                      {formatPercent(data.comparison.change.spend)}
                    </span>
                  </div>
                )}
              </div>
              <p className="text-sm text-gray-500 mb-1">Gasto Total en Ads</p>
              <p className="text-2xl font-bold text-gray-900">
                {formatCurrency(data.overall.totalSpend)}
              </p>
            </div>

            {/* Total Conversions */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 bg-green-100 rounded-lg">
                  <Users className="h-6 w-6 text-green-600" />
                </div>
                {data.comparison && (
                  <div className="flex items-center gap-1 text-sm">
                    {getChangeIcon(data.comparison.change.conversions)}
                    <span className={data.comparison.change.conversions > 0 ? 'text-green-600' : 'text-red-600'}>
                      {formatPercent(data.comparison.change.conversions)}
                    </span>
                  </div>
                )}
              </div>
              <p className="text-sm text-gray-500 mb-1">Conversiones</p>
              <p className="text-2xl font-bold text-gray-900">
                {formatNumber(data.overall.totalConversions)}
              </p>
            </div>

            {/* CAC */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 bg-blue-100 rounded-lg">
                  <Target className="h-6 w-6 text-blue-600" />
                </div>
                {data.comparison && (
                  <div className="flex items-center gap-1 text-sm">
                    {getChangeIcon(data.comparison.change.cac, true)}
                    <span className={data.comparison.change.cac < 0 ? 'text-green-600' : 'text-red-600'}>
                      {formatPercent(data.comparison.change.cac)}
                    </span>
                  </div>
                )}
              </div>
              <p className="text-sm text-gray-500 mb-1">CAC Promedio</p>
              <p className="text-2xl font-bold text-gray-900">
                {formatCurrency(data.overall.cac)}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            {/* CAC by Platform */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">
                CAC por Plataforma
              </h2>

              {data.byPlatform.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <BarChart3 className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                  <p>No hay datos de plataformas</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {data.byPlatform.map((platform) => (
                    <div key={platform.platform} className="border-b border-gray-100 pb-4 last:border-0">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <div className={`w-3 h-3 rounded-full ${PLATFORM_COLORS[platform.platform] || 'bg-gray-400'}`} />
                          <span className="font-medium text-gray-900">
                            {PLATFORM_NAMES[platform.platform] || platform.platform}
                          </span>
                        </div>
                        <span className="text-lg font-semibold text-gray-900">
                          {formatCurrency(platform.cac)}
                        </span>
                      </div>
                      <div className="flex justify-between text-sm text-gray-500">
                        <span>Gasto: {formatCurrency(platform.totalSpend)} ({platform.percentOfSpend.toFixed(1)}%)</span>
                        <span>Conv: {formatNumber(platform.totalConversions)} ({platform.percentOfConversions.toFixed(1)}%)</span>
                      </div>
                      {/* Progress bar */}
                      <div className="mt-2 h-2 bg-gray-100 rounded-full overflow-hidden">
                        <div
                          className={`h-full ${PLATFORM_COLORS[platform.platform] || 'bg-gray-400'}`}
                          style={{ width: `${platform.percentOfSpend}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Top Campaigns */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">
                Top Campañas por Gasto
              </h2>

              {data.topCampaigns.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <Target className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                  <p>No hay datos de campañas</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-200">
                        <th className="text-left py-2 font-medium text-gray-500">Campaña</th>
                        <th className="text-right py-2 font-medium text-gray-500">Gasto</th>
                        <th className="text-right py-2 font-medium text-gray-500">CAC</th>
                        <th className="text-right py-2 font-medium text-gray-500">ROAS</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.topCampaigns.map((campaign) => (
                        <tr key={campaign.campaignId} className="border-b border-gray-50 last:border-0">
                          <td className="py-3">
                            <div className="flex items-center gap-2">
                              <div className={`w-2 h-2 rounded-full ${PLATFORM_COLORS[campaign.platform] || 'bg-gray-400'}`} />
                              <span className="font-medium text-gray-900 truncate max-w-[180px]">
                                {campaign.campaignName}
                              </span>
                            </div>
                          </td>
                          <td className="text-right py-3 text-gray-700">
                            {formatCurrency(campaign.totalSpend)}
                          </td>
                          <td className="text-right py-3">
                            <span className={campaign.cac < data.overall.cac ? 'text-green-600' : 'text-red-600'}>
                              {formatCurrency(campaign.cac)}
                            </span>
                          </td>
                          <td className="text-right py-3">
                            <span className={campaign.roas >= 1 ? 'text-green-600' : 'text-red-600'}>
                              {campaign.roas.toFixed(2)}x
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>

          {/* Trend Chart */}
          {data.trend.length > 0 && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">
                Tendencia de CAC
              </h2>

              <div className="h-64 flex items-end gap-1">
                {data.trend.map((point, index) => {
                  const maxCAC = Math.max(...data.trend.map((t) => t.cac));
                  const height = maxCAC > 0 ? (point.cac / maxCAC) * 100 : 0;

                  return (
                    <div
                      key={point.date}
                      className="flex-1 flex flex-col items-center group"
                    >
                      <div className="relative w-full flex justify-center">
                        <div
                          className="w-full max-w-8 bg-purple-500 rounded-t transition-all hover:bg-purple-600"
                          style={{ height: `${Math.max(height, 2)}%`, minHeight: '4px' }}
                        />
                        {/* Tooltip */}
                        <div className="absolute bottom-full mb-2 hidden group-hover:block bg-gray-900 text-white text-xs rounded px-2 py-1 whitespace-nowrap z-10">
                          <div>{new Date(point.date).toLocaleDateString('es-MX', { month: 'short', day: 'numeric' })}</div>
                          <div>CAC: {formatCurrency(point.cac)}</div>
                          <div>Gasto: {formatCurrency(point.spend)}</div>
                          <div>Conv: {point.conversions}</div>
                        </div>
                      </div>
                      {index % Math.ceil(data.trend.length / 7) === 0 && (
                        <span className="text-xs text-gray-400 mt-1">
                          {new Date(point.date).toLocaleDateString('es-MX', { month: 'short', day: 'numeric' })}
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Period Info */}
          <div className="mt-6 text-center text-sm text-gray-500">
            <Calendar className="h-4 w-4 inline mr-1" />
            Período: {new Date(data.period.start).toLocaleDateString('es-MX')} -{' '}
            {new Date(data.period.end).toLocaleDateString('es-MX')}
          </div>
        </>
      ) : (
        <div className="text-center py-20 text-gray-500">
          <BarChart3 className="h-16 w-16 mx-auto mb-4 text-gray-300" />
          <p>No hay datos de CAC disponibles</p>
          <p className="text-sm mt-2">
            Conecta tus plataformas de ads y sincroniza las métricas para ver el análisis
          </p>
        </div>
      )}
    </div>
  );
}
