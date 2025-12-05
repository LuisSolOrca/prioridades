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
} from 'recharts';
import {
  Eye,
  Users,
  Download,
  Globe,
  Monitor,
  Smartphone,
  Tablet,
  ArrowUpRight,
  FileText,
  TrendingUp,
} from 'lucide-react';

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16'];

interface StatCardProps {
  label: string;
  value: string | number;
  icon: React.ReactNode;
  color: string;
}

function StatCard({ label, value, icon, color }: StatCardProps) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-500 dark:text-gray-400">{label}</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
            {typeof value === 'number' ? value.toLocaleString() : value}
          </p>
        </div>
        <div className={`p-3 rounded-lg ${color}`}>
          {icon}
        </div>
      </div>
    </div>
  );
}

export default function WebTrackingPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>(null);
  const [selectedPeriod, setSelectedPeriod] = useState(30);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/marketing/web-analytics?days=${selectedPeriod}`);
      const result = await response.json();
      setData(result);
    } catch (error) {
      console.error('Error loading web analytics:', error);
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

  const getDeviceIcon = (device: string) => {
    switch (device) {
      case 'desktop':
        return <Monitor className="w-5 h-5" />;
      case 'mobile':
        return <Smartphone className="w-5 h-5" />;
      case 'tablet':
        return <Tablet className="w-5 h-5" />;
      default:
        return <Globe className="w-5 h-5" />;
    }
  };

  if (status === 'loading' || loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <div className="flex items-center justify-center h-[calc(100vh-64px)]">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              Web Analytics
            </h1>
            <p className="text-gray-500 dark:text-gray-400 mt-1">
              Análisis de tráfico de tu sitio WordPress
            </p>
          </div>

          <select
            value={selectedPeriod}
            onChange={(e) => setSelectedPeriod(Number(e.target.value))}
            className="mt-4 sm:mt-0 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
          >
            <option value={7}>Últimos 7 días</option>
            <option value={30}>Últimos 30 días</option>
            <option value={90}>Últimos 90 días</option>
          </select>
        </div>

        {/* Overview Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <StatCard
            label="Páginas Vistas"
            value={data?.overview?.pageViews || 0}
            icon={<Eye className="w-6 h-6 text-white" />}
            color="bg-blue-500"
          />
          <StatCard
            label="Usuarios Únicos"
            value={data?.overview?.uniqueUsers || 0}
            icon={<Users className="w-6 h-6 text-white" />}
            color="bg-green-500"
          />
          <StatCard
            label="Sesiones"
            value={data?.overview?.uniqueSessions || 0}
            icon={<Globe className="w-6 h-6 text-white" />}
            color="bg-purple-500"
          />
          <StatCard
            label="Descargas"
            value={data?.overview?.downloads || 0}
            icon={<Download className="w-6 h-6 text-white" />}
            color="bg-orange-500"
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          {/* Traffic Trends */}
          <div className="lg:col-span-2 bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Tendencia de Tráfico
            </h3>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={data?.trends || []}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="pageViews"
                  name="Páginas Vistas"
                  stroke="#3b82f6"
                  strokeWidth={2}
                />
                <Line
                  type="monotone"
                  dataKey="uniqueUsers"
                  name="Usuarios"
                  stroke="#10b981"
                  strokeWidth={2}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Device Breakdown */}
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Dispositivos
            </h3>
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie
                  data={data?.deviceBreakdown || []}
                  dataKey="sessions"
                  nameKey="device"
                  cx="50%"
                  cy="50%"
                  outerRadius={70}
                  label
                >
                  {(data?.deviceBreakdown || []).map((_: any, index: number) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
            <div className="mt-4 space-y-2">
              {(data?.deviceBreakdown || []).map((item: any, index: number) => (
                <div key={item.device} className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <div
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: COLORS[index % COLORS.length] }}
                    />
                    <span className="text-gray-600 dark:text-gray-400 capitalize flex items-center gap-1">
                      {getDeviceIcon(item.device)}
                      {item.device}
                    </span>
                  </div>
                  <span className="font-medium text-gray-900 dark:text-white">
                    {item.sessions.toLocaleString()}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Top Pages */}
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Páginas Más Visitadas
            </h3>
            <div className="space-y-3">
              {(data?.topPages || []).slice(0, 8).map((page: any, index: number) => (
                <div
                  key={page.pagePath}
                  className="flex items-center justify-between py-2 border-b border-gray-100 dark:border-gray-700 last:border-0"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-medium text-gray-400 w-6">
                      {index + 1}.
                    </span>
                    <div>
                      <p className="text-sm font-medium text-gray-900 dark:text-white truncate max-w-xs">
                        {page.pageTitle || page.pagePath}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 truncate max-w-xs">
                        {page.pagePath}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium text-gray-900 dark:text-white">
                      {page.views.toLocaleString()}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {page.uniqueUsers} usuarios
                    </p>
                  </div>
                </div>
              ))}
              {(!data?.topPages || data.topPages.length === 0) && (
                <p className="text-center text-gray-500 dark:text-gray-400 py-4">
                  No hay datos de páginas
                </p>
              )}
            </div>
          </div>

          {/* Top Downloads */}
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Documentos Más Descargados
            </h3>
            <div className="space-y-3">
              {(data?.topDownloads || []).slice(0, 8).map((doc: any, index: number) => (
                <div
                  key={doc.documentUrl}
                  className="flex items-center justify-between py-2 border-b border-gray-100 dark:border-gray-700 last:border-0"
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-orange-100 dark:bg-orange-900/30 rounded-lg">
                      <FileText className="w-4 h-4 text-orange-600" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900 dark:text-white truncate max-w-xs">
                        {doc.documentTitle || doc.documentUrl?.split('/').pop()}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 uppercase">
                        {doc.documentType || 'archivo'}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium text-gray-900 dark:text-white">
                      {doc.downloads.toLocaleString()}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      descargas
                    </p>
                  </div>
                </div>
              ))}
              {(!data?.topDownloads || data.topDownloads.length === 0) && (
                <p className="text-center text-gray-500 dark:text-gray-400 py-4">
                  No hay datos de descargas
                </p>
              )}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Traffic Sources */}
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Fuentes de Tráfico
            </h3>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={data?.trafficSources || []} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" tick={{ fontSize: 12 }} />
                <YAxis dataKey="source" type="category" tick={{ fontSize: 12 }} width={80} />
                <Tooltip />
                <Bar dataKey="sessions" name="Sesiones" fill="#3b82f6" />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Geographic Distribution */}
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Distribución Geográfica
            </h3>
            <div className="space-y-3">
              {(data?.geoBreakdown || []).slice(0, 8).map((item: any, index: number) => {
                const maxSessions = Math.max(...(data?.geoBreakdown || []).map((g: any) => g.sessions));
                const percentage = (item.sessions / maxSessions) * 100;

                return (
                  <div key={item.country} className="space-y-1">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-600 dark:text-gray-400">
                        {item.country}
                      </span>
                      <span className="font-medium text-gray-900 dark:text-white">
                        {item.sessions.toLocaleString()}
                      </span>
                    </div>
                    <div className="h-2 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full"
                        style={{
                          width: `${percentage}%`,
                          backgroundColor: COLORS[index % COLORS.length],
                        }}
                      />
                    </div>
                  </div>
                );
              })}
              {(!data?.geoBreakdown || data.geoBreakdown.length === 0) && (
                <p className="text-center text-gray-500 dark:text-gray-400 py-4">
                  No hay datos geográficos
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Help Section */}
        <div className="mt-8 p-6 bg-blue-50 dark:bg-blue-900/20 rounded-xl">
          <h3 className="font-semibold text-blue-900 dark:text-blue-300 mb-2">
            Configuración de Google Analytics 4
          </h3>
          <p className="text-sm text-blue-700 dark:text-blue-400 mb-3">
            Para ver datos de tu sitio WordPress, asegúrate de:
          </p>
          <ul className="text-sm text-blue-600 dark:text-blue-400 space-y-1">
            <li>1. Conectar tu cuenta de GA4 en <a href="/admin/marketing-integrations" className="underline">Integraciones</a></li>
            <li>2. Tener el código de tracking de GA4 instalado en tu WordPress</li>
            <li>3. Configurar eventos personalizados para tracking de descargas</li>
          </ul>
        </div>
      </main>
    </div>
  );
}
