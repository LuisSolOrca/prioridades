'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  AlertTriangle,
  XCircle,
  Bell,
  X,
  RefreshCw,
  ExternalLink,
} from 'lucide-react';

interface Alert {
  id: string;
  type: 'error' | 'warning' | 'info';
  platform: string;
  title: string;
  message: string;
  timestamp: string;
  syncLogId?: string;
  critical?: boolean;
}

interface AlertsSummary {
  total: number;
  errors: number;
  warnings: number;
  critical: number;
  platformsAffected: number;
}

const PLATFORM_COLORS: Record<string, string> = {
  META: '#1877F2',
  LINKEDIN: '#0A66C2',
  TWITTER: '#1DA1F2',
  TIKTOK: '#000000',
  YOUTUBE: '#FF0000',
  WHATSAPP: '#25D366',
  GA4: '#E37400',
};

const PLATFORM_NAMES: Record<string, string> = {
  META: 'Meta',
  LINKEDIN: 'LinkedIn',
  TWITTER: 'Twitter',
  TIKTOK: 'TikTok',
  YOUTUBE: 'YouTube',
  WHATSAPP: 'WhatsApp',
  GA4: 'GA4',
};

interface Props {
  className?: string;
  showDropdown?: boolean;
}

export default function SyncAlertsBadge({ className = '', showDropdown = true }: Props) {
  const router = useRouter();
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [summary, setSummary] = useState<AlertsSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [isOpen, setIsOpen] = useState(false);
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());

  useEffect(() => {
    loadAlerts();
    // Refresh every 5 minutes
    const interval = setInterval(loadAlerts, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  const loadAlerts = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/marketing/sync/alerts?hours=24');
      if (response.ok) {
        const data = await response.json();
        setAlerts(data.alerts || []);
        setSummary(data.summary);
      }
    } catch (error) {
      console.error('Error loading sync alerts:', error);
    } finally {
      setLoading(false);
    }
  };

  const dismissAlert = (alertId: string) => {
    setDismissed((prev) => new Set([...prev, alertId]));
  };

  const visibleAlerts = alerts.filter((a) => !dismissed.has(a.id));
  const hasAlerts = visibleAlerts.length > 0;
  const hasErrors = summary?.errors ? summary.errors > 0 : false;
  const hasCritical = summary?.critical ? summary.critical > 0 : false;

  if (!hasAlerts && !loading) {
    return null;
  }

  const badgeColor = hasCritical
    ? 'bg-red-500'
    : hasErrors
    ? 'bg-orange-500'
    : 'bg-yellow-500';

  return (
    <div className={`relative ${className}`}>
      <button
        onClick={() => showDropdown && setIsOpen(!isOpen)}
        className={`relative p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition ${
          !showDropdown ? 'cursor-default' : ''
        }`}
        title={`${visibleAlerts.length} alertas de sincronización`}
      >
        <Bell className="w-5 h-5 text-gray-600 dark:text-gray-400" />
        {hasAlerts && (
          <span
            className={`absolute -top-1 -right-1 w-5 h-5 ${badgeColor} text-white text-xs rounded-full flex items-center justify-center font-bold animate-pulse`}
          >
            {visibleAlerts.length > 9 ? '9+' : visibleAlerts.length}
          </span>
        )}
      </button>

      {/* Dropdown */}
      {showDropdown && isOpen && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute right-0 top-full mt-2 w-96 bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-gray-200 dark:border-gray-700 z-50 max-h-[70vh] overflow-hidden flex flex-col">
            {/* Header */}
            <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-gray-900 dark:text-white">
                  Alertas de Sincronización
                </h3>
                <p className="text-xs text-gray-500">Últimas 24 horas</p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={loadAlerts}
                  className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
                  title="Actualizar"
                >
                  <RefreshCw
                    size={16}
                    className={`text-gray-500 ${loading ? 'animate-spin' : ''}`}
                  />
                </button>
                <button
                  onClick={() => setIsOpen(false)}
                  className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
                >
                  <X size={16} className="text-gray-500" />
                </button>
              </div>
            </div>

            {/* Summary */}
            {summary && (
              <div className="px-4 py-2 bg-gray-50 dark:bg-gray-700/50 flex items-center gap-4 text-xs">
                <span className="text-gray-500">
                  {summary.total} alertas
                </span>
                {summary.errors > 0 && (
                  <span className="text-red-600 flex items-center gap-1">
                    <XCircle size={12} />
                    {summary.errors} errores
                  </span>
                )}
                {summary.warnings > 0 && (
                  <span className="text-yellow-600 flex items-center gap-1">
                    <AlertTriangle size={12} />
                    {summary.warnings} advertencias
                  </span>
                )}
              </div>
            )}

            {/* Alerts List */}
            <div className="flex-1 overflow-y-auto">
              {visibleAlerts.length === 0 ? (
                <div className="p-8 text-center text-gray-500">
                  No hay alertas activas
                </div>
              ) : (
                <div className="divide-y divide-gray-100 dark:divide-gray-700">
                  {visibleAlerts.slice(0, 10).map((alert) => (
                    <div
                      key={alert.id}
                      className={`p-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 ${
                        alert.critical ? 'bg-red-50 dark:bg-red-900/10' : ''
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <div
                          className={`p-1.5 rounded-lg ${
                            alert.type === 'error'
                              ? 'bg-red-100 dark:bg-red-900/30'
                              : 'bg-yellow-100 dark:bg-yellow-900/30'
                          }`}
                        >
                          {alert.type === 'error' ? (
                            <XCircle
                              className="w-4 h-4 text-red-600 dark:text-red-400"
                            />
                          ) : (
                            <AlertTriangle
                              className="w-4 h-4 text-yellow-600 dark:text-yellow-400"
                            />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span
                              className="px-1.5 py-0.5 rounded text-xs text-white"
                              style={{ backgroundColor: PLATFORM_COLORS[alert.platform] }}
                            >
                              {PLATFORM_NAMES[alert.platform]}
                            </span>
                            {alert.critical && (
                              <span className="px-1.5 py-0.5 rounded text-xs bg-red-600 text-white">
                                Crítico
                              </span>
                            )}
                          </div>
                          <p className="text-sm font-medium text-gray-900 dark:text-white">
                            {alert.title}
                          </p>
                          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 truncate">
                            {alert.message}
                          </p>
                          <p className="text-xs text-gray-400 mt-1">
                            {new Date(alert.timestamp).toLocaleString('es-MX', {
                              month: 'short',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </p>
                        </div>
                        <button
                          onClick={() => dismissAlert(alert.id)}
                          className="p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-600"
                          title="Descartar"
                        >
                          <X size={14} className="text-gray-400" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="p-3 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/50">
              <button
                onClick={() => {
                  setIsOpen(false);
                  router.push('/admin/marketing-sync');
                }}
                className="w-full px-4 py-2 text-sm text-center text-blue-600 hover:text-blue-700 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition flex items-center justify-center gap-2"
              >
                Ver todos los logs
                <ExternalLink size={14} />
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
