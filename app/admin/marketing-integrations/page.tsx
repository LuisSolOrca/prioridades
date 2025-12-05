'use client';

export const dynamic = 'force-dynamic';

import { useState, useEffect, useCallback, Suspense } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';
import Navbar from '@/components/Navbar';
import {
  CheckCircle,
  XCircle,
  AlertTriangle,
  ExternalLink,
  RefreshCw,
  Trash2,
  Clock,
  Activity,
} from 'lucide-react';
import SyncAlertsBadge from '@/components/marketing/SyncAlertsBadge';

const PLATFORMS = [
  {
    id: 'META',
    name: 'Meta (Facebook/Instagram)',
    description: 'Campañas de Facebook Ads e Instagram Ads',
    color: '#1877F2',
    icon: '📘',
    scopes: ['ads_read', 'ads_management', 'business_management'],
  },
  {
    id: 'GOOGLE_ADS',
    name: 'Google Ads',
    description: 'Campañas de Google Ads (Search, Display, YouTube)',
    color: '#4285F4',
    icon: '🔍',
    scopes: ['adwords'],
  },
  {
    id: 'LINKEDIN',
    name: 'LinkedIn',
    description: 'Campañas de LinkedIn Marketing Solutions',
    color: '#0A66C2',
    icon: '💼',
    scopes: ['r_ads', 'r_ads_reporting', 'w_organization_social'],
  },
  {
    id: 'TWITTER',
    name: 'Twitter/X',
    description: 'Publicaciones y métricas de Twitter',
    color: '#1DA1F2',
    icon: '🐦',
    scopes: ['tweet.read', 'users.read'],
  },
  {
    id: 'TIKTOK',
    name: 'TikTok',
    description: 'Métricas de TikTok for Business',
    color: '#000000',
    icon: '🎵',
    scopes: ['user.info.basic', 'video.list'],
  },
  {
    id: 'YOUTUBE',
    name: 'YouTube',
    description: 'Analytics de YouTube y métricas de videos',
    color: '#FF0000',
    icon: '▶️',
    scopes: ['youtube.readonly', 'yt-analytics.readonly'],
  },
  {
    id: 'WHATSAPP',
    name: 'WhatsApp Business',
    description: 'Mensajes y templates de WhatsApp Business API',
    color: '#25D366',
    icon: '💬',
    scopes: ['whatsapp_business_management', 'whatsapp_business_messaging'],
  },
  {
    id: 'GA4',
    name: 'Google Analytics 4',
    description: 'Tracking de tu sitio web WordPress',
    color: '#F9AB00',
    icon: '📊',
    scopes: ['analytics.readonly'],
  },
];

interface PlatformStatus {
  connected: boolean;
  platform: string;
  accountName?: string;
  accountId?: string;
  tokenStatus?: string;
  tokenExpiresAt?: string;
  lastSyncAt?: string;
  lastError?: string;
  platformData?: any;
  syncEnabled?: boolean;
  syncFrequency?: string;
}

function MarketingIntegrationsContent() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [platformStatuses, setPlatformStatuses] = useState<Record<string, PlatformStatus>>({});
  const [connecting, setConnecting] = useState<string | null>(null);
  const [disconnecting, setDisconnecting] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Check URL params for success/error messages
  useEffect(() => {
    const success = searchParams.get('success');
    const error = searchParams.get('error');

    if (success) {
      setMessage({ type: 'success', text: `Conexión con ${success.toUpperCase()} exitosa` });
      // Clean URL
      router.replace('/admin/marketing-integrations');
    }

    if (error) {
      setMessage({ type: 'error', text: decodeURIComponent(error) });
      router.replace('/admin/marketing-integrations');
    }
  }, [searchParams, router]);

  const loadStatuses = useCallback(async () => {
    try {
      setLoading(true);
      const statuses: Record<string, PlatformStatus> = {};

      await Promise.all(
        PLATFORMS.map(async (platform) => {
          try {
            const response = await fetch(`/api/marketing/${platform.id.toLowerCase()}/status`);
            const data = await response.json();
            statuses[platform.id] = data;
          } catch {
            statuses[platform.id] = { connected: false, platform: platform.id };
          }
        })
      );

      setPlatformStatuses(statuses);
    } catch (error) {
      console.error('Error loading platform statuses:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
      return;
    }

    if (status === 'authenticated' && session?.user?.role !== 'ADMIN') {
      router.push('/dashboard');
      return;
    }

    if (status === 'authenticated') {
      loadStatuses();
    }
  }, [status, session, router, loadStatuses]);

  const handleConnect = async (platformId: string) => {
    setConnecting(platformId);
    try {
      const response = await fetch(`/api/marketing/${platformId.toLowerCase()}/auth`);
      const data = await response.json();

      if (data.url) {
        window.location.href = data.url;
      } else {
        setMessage({ type: 'error', text: 'Error al iniciar conexión' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Error al conectar con la plataforma' });
    } finally {
      setConnecting(null);
    }
  };

  const handleDisconnect = async (platformId: string) => {
    if (!confirm(`¿Estás seguro de desconectar ${platformId}? Se perderá el acceso a los datos de esta plataforma.`)) {
      return;
    }

    setDisconnecting(platformId);
    try {
      const response = await fetch(`/api/marketing/${platformId.toLowerCase()}/disconnect`, {
        method: 'POST',
      });

      if (response.ok) {
        setMessage({ type: 'success', text: `${platformId} desconectado correctamente` });
        await loadStatuses();
      } else {
        const data = await response.json();
        setMessage({ type: 'error', text: data.error || 'Error al desconectar' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Error al desconectar' });
    } finally {
      setDisconnecting(null);
    }
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'Nunca';
    return new Date(dateString).toLocaleString('es-MX');
  };

  const getTokenStatusBadge = (tokenStatus?: string) => {
    switch (tokenStatus) {
      case 'valid':
        return <span className="px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs">Válido</span>;
      case 'expired':
        return <span className="px-2 py-1 bg-red-100 text-red-800 rounded-full text-xs">Expirado</span>;
      case 'invalid':
        return <span className="px-2 py-1 bg-yellow-100 text-yellow-800 rounded-full text-xs">Inválido</span>;
      default:
        return <span className="px-2 py-1 bg-gray-100 text-gray-800 rounded-full text-xs">Desconocido</span>;
    }
  };

  if (status === 'loading' || loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <Navbar />
        <div className="flex items-center justify-center h-[calc(100vh-64px)]">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Navbar />

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8 flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              Integraciones de Marketing
            </h1>
            <p className="text-gray-500 dark:text-gray-400 mt-1">
              Conecta tus plataformas de marketing para sincronizar campañas y métricas
            </p>
          </div>
          <div className="flex items-center gap-3">
            <SyncAlertsBadge />
            <button
              onClick={() => router.push('/admin/marketing-sync')}
              className="flex items-center gap-2 px-4 py-2 text-sm bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition"
            >
              <Activity size={16} />
              Ver Logs
            </button>
          </div>
        </div>

        {/* Message */}
        {message && (
          <div
            className={`mb-6 p-4 rounded-lg flex items-center gap-3 ${
              message.type === 'success'
                ? 'bg-green-50 text-green-800 dark:bg-green-900/20 dark:text-green-400'
                : 'bg-red-50 text-red-800 dark:bg-red-900/20 dark:text-red-400'
            }`}
          >
            {message.type === 'success' ? (
              <CheckCircle className="w-5 h-5" />
            ) : (
              <AlertTriangle className="w-5 h-5" />
            )}
            <span>{message.text}</span>
            <button
              onClick={() => setMessage(null)}
              className="ml-auto text-gray-400 hover:text-gray-600"
            >
              ×
            </button>
          </div>
        )}

        {/* Platforms Grid */}
        <div className="space-y-4">
          {PLATFORMS.map((platform) => {
            const platformStatus = platformStatuses[platform.id];
            const isConnected = platformStatus?.connected;

            return (
              <div
                key={platform.id}
                className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-100 dark:border-gray-700"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-4">
                    {/* Platform Icon */}
                    <div
                      className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl"
                      style={{ backgroundColor: `${platform.color}20` }}
                    >
                      {platform.icon}
                    </div>

                    {/* Platform Info */}
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                          {platform.name}
                        </h3>
                        {isConnected ? (
                          <CheckCircle className="w-5 h-5 text-green-500" />
                        ) : (
                          <XCircle className="w-5 h-5 text-gray-300" />
                        )}
                      </div>
                      <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                        {platform.description}
                      </p>

                      {/* Connection Details */}
                      {isConnected && platformStatus && (
                        <div className="mt-3 space-y-1 text-sm">
                          <p className="text-gray-600 dark:text-gray-400">
                            <span className="font-medium">Cuenta:</span> {platformStatus.accountName || 'Sin nombre'}
                          </p>
                          <div className="flex items-center gap-2">
                            <span className="text-gray-600 dark:text-gray-400 font-medium">Token:</span>
                            {getTokenStatusBadge(platformStatus.tokenStatus)}
                          </div>
                          {platformStatus.tokenExpiresAt && (
                            <p className="text-gray-500 dark:text-gray-400 flex items-center gap-1">
                              <Clock className="w-4 h-4" />
                              Expira: {formatDate(platformStatus.tokenExpiresAt)}
                            </p>
                          )}
                          {platformStatus.lastSyncAt && (
                            <p className="text-gray-500 dark:text-gray-400">
                              Última sync: {formatDate(platformStatus.lastSyncAt)}
                            </p>
                          )}
                          {platformStatus.lastError && (
                            <p className="text-red-500 text-xs mt-1">
                              Error: {platformStatus.lastError}
                            </p>
                          )}
                        </div>
                      )}

                      {/* Scopes */}
                      <div className="mt-3 flex flex-wrap gap-1">
                        {platform.scopes.map((scope) => (
                          <span
                            key={scope}
                            className="px-2 py-0.5 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 rounded text-xs"
                          >
                            {scope}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2">
                    {isConnected ? (
                      <>
                        <button
                          onClick={() => handleDisconnect(platform.id)}
                          disabled={disconnecting === platform.id}
                          className="flex items-center gap-2 px-3 py-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg text-sm disabled:opacity-50"
                        >
                          {disconnecting === platform.id ? (
                            <RefreshCw className="w-4 h-4 animate-spin" />
                          ) : (
                            <Trash2 className="w-4 h-4" />
                          )}
                          Desconectar
                        </button>
                      </>
                    ) : (
                      <button
                        onClick={() => handleConnect(platform.id)}
                        disabled={connecting === platform.id}
                        className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm disabled:opacity-50"
                      >
                        {connecting === platform.id ? (
                          <RefreshCw className="w-4 h-4 animate-spin" />
                        ) : (
                          <ExternalLink className="w-4 h-4" />
                        )}
                        Conectar
                      </button>
                    )}
                  </div>
                </div>

                {/* Platform-specific data */}
                {isConnected && platformStatus?.platformData && (
                  <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-700">
                    {platform.id === 'META' && platformStatus.platformData.adAccounts?.length > 0 && (
                      <div>
                        <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          Cuentas de Anuncios:
                        </p>
                        <div className="flex flex-wrap gap-2">
                          {platformStatus.platformData.adAccounts.map((acc: any) => (
                            <span
                              key={acc.id}
                              className="px-2 py-1 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 rounded text-xs"
                            >
                              {acc.name || acc.id}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {platform.id === 'GA4' && platformStatus.platformData.properties?.length > 0 && (
                      <div>
                        <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          Propiedades GA4:
                        </p>
                        <div className="flex flex-wrap gap-2">
                          {platformStatus.platformData.properties.map((prop: any) => (
                            <span
                              key={prop.propertyId}
                              className={`px-2 py-1 rounded text-xs ${
                                prop.propertyId === platformStatus.platformData.selectedPropertyId
                                  ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                                  : 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300'
                              }`}
                            >
                              {prop.propertyName}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {platform.id === 'WHATSAPP' && platformStatus.platformData.phoneNumbers?.length > 0 && (
                      <div>
                        <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          Números de WhatsApp:
                        </p>
                        <div className="flex flex-wrap gap-2">
                          {platformStatus.platformData.phoneNumbers.map((phone: any) => (
                            <span
                              key={phone.id}
                              className="px-2 py-1 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 rounded text-xs"
                            >
                              {phone.displayPhoneNumber} ({phone.verifiedName})
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {platform.id === 'YOUTUBE' && platformStatus.platformData.channelId && (
                      <div className="flex items-center gap-4 text-sm text-gray-600 dark:text-gray-400">
                        <span>Canal: {platformStatus.platformData.customUrl || platformStatus.platformData.channelId}</span>
                        <span>{Number(platformStatus.platformData.subscriberCount || 0).toLocaleString()} subs</span>
                        <span>{Number(platformStatus.platformData.videoCount || 0).toLocaleString()} videos</span>
                      </div>
                    )}

                    {platform.id === 'TWITTER' && platformStatus.platformData.username && (
                      <div className="flex items-center gap-4 text-sm text-gray-600 dark:text-gray-400">
                        <span>@{platformStatus.platformData.username}</span>
                        <span>{Number(platformStatus.platformData.followersCount || 0).toLocaleString()} seguidores</span>
                      </div>
                    )}

                    {platform.id === 'TIKTOK' && platformStatus.platformData.followerCount !== undefined && (
                      <div className="flex items-center gap-4 text-sm text-gray-600 dark:text-gray-400">
                        <span>{Number(platformStatus.platformData.followerCount || 0).toLocaleString()} seguidores</span>
                        <span>{Number(platformStatus.platformData.videoCount || 0).toLocaleString()} videos</span>
                        <span>{Number(platformStatus.platformData.likesCount || 0).toLocaleString()} likes</span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Help Section */}
        <div className="mt-8 p-6 bg-blue-50 dark:bg-blue-900/20 rounded-xl">
          <h3 className="font-semibold text-blue-900 dark:text-blue-300 mb-2">
            ¿Necesitas ayuda?
          </h3>
          <p className="text-sm text-blue-700 dark:text-blue-400 mb-3">
            Para conectar cada plataforma necesitarás crear una aplicación de desarrollador en cada una:
          </p>
          <ul className="text-sm text-blue-600 dark:text-blue-400 space-y-1">
            <li>• Meta: <a href="https://developers.facebook.com" target="_blank" rel="noopener noreferrer" className="underline">developers.facebook.com</a></li>
            <li>• LinkedIn: <a href="https://developer.linkedin.com" target="_blank" rel="noopener noreferrer" className="underline">developer.linkedin.com</a></li>
            <li>• Twitter: <a href="https://developer.twitter.com" target="_blank" rel="noopener noreferrer" className="underline">developer.twitter.com</a></li>
            <li>• TikTok: <a href="https://developers.tiktok.com" target="_blank" rel="noopener noreferrer" className="underline">developers.tiktok.com</a></li>
            <li>• Google (YouTube/GA4): <a href="https://console.cloud.google.com" target="_blank" rel="noopener noreferrer" className="underline">console.cloud.google.com</a></li>
          </ul>
        </div>
      </main>
    </div>
  );
}

export default function MarketingIntegrationsPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
          <Navbar />
          <div className="flex items-center justify-center h-[calc(100vh-64px)]">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          </div>
        </div>
      }
    >
      <MarketingIntegrationsContent />
    </Suspense>
  );
}
