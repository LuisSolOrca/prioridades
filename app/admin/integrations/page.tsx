'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Navbar from '@/components/Navbar';
import { Slack, CheckCircle, XCircle, Loader2 } from 'lucide-react';

interface SlackStatus {
  connected: boolean;
  workspace?: {
    id: string;
    name: string;
  };
  configuredBy?: {
    _id: string;
    name: string;
    email: string;
  };
  isAdmin: boolean;
}

function IntegrationsContent() {
  const searchParams = useSearchParams();
  const [slackStatus, setSlackStatus] = useState<SlackStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    loadSlackStatus();

    // Manejar mensajes de callback de OAuth
    const slackSuccess = searchParams.get('slack_success');
    const slackError = searchParams.get('slack_error');

    if (slackSuccess) {
      setMessage({ type: 'success', text: '¡Slack conectado exitosamente!' });
      // Limpiar URL
      window.history.replaceState({}, '', '/admin/integrations');
    } else if (slackError) {
      setMessage({
        type: 'error',
        text: `Error conectando Slack: ${slackError}`,
      });
      window.history.replaceState({}, '', '/admin/integrations');
    }
  }, [searchParams]);

  const loadSlackStatus = async () => {
    try {
      const response = await fetch('/api/slack/status');
      if (response.ok) {
        const data = await response.json();
        setSlackStatus(data);
      }
    } catch (error) {
      console.error('Error cargando estado de Slack:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleConnectSlack = async () => {
    try {
      setConnecting(true);
      const response = await fetch('/api/slack/auth');
      if (response.ok) {
        const data = await response.json();
        // Redirigir a Slack OAuth
        window.location.href = data.authUrl;
      } else {
        const errorData = await response.json();
        setMessage({
          type: 'error',
          text: errorData.error || 'Error iniciando conexión con Slack',
        });
      }
    } catch (error) {
      console.error('Error conectando Slack:', error);
      setMessage({
        type: 'error',
        text: 'Error conectando con Slack',
      });
    } finally {
      setConnecting(false);
    }
  };

  const handleDisconnectSlack = async () => {
    if (!confirm('¿Estás seguro de desconectar la integración de Slack para toda la organización?')) return;

    try {
      setDisconnecting(true);
      const response = await fetch('/api/slack/disconnect', {
        method: 'POST',
      });

      if (response.ok) {
        setMessage({
          type: 'success',
          text: 'Slack desconectado exitosamente',
        });
        await loadSlackStatus();
      } else {
        const errorData = await response.json();
        setMessage({
          type: 'error',
          text: errorData.error || 'Error desconectando Slack',
        });
      }
    } catch (error) {
      console.error('Error desconectando Slack:', error);
      setMessage({
        type: 'error',
        text: 'Error desconectando Slack',
      });
    } finally {
      setDisconnecting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Navbar />
      <div className="pt-16 main-content max-w-4xl mx-auto p-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
          Integraciones
        </h1>
        <p className="text-gray-600 dark:text-gray-400 mb-8">
          Conecta herramientas externas para mejorar tu flujo de trabajo
        </p>

        {/* Mensajes */}
        {message && (
          <div
            className={`mb-6 p-4 rounded-lg flex items-center gap-3 ${
              message.type === 'success'
                ? 'bg-green-50 dark:bg-green-900/20 text-green-800 dark:text-green-200'
                : 'bg-red-50 dark:bg-red-900/20 text-red-800 dark:text-red-200'
            }`}
          >
            {message.type === 'success' ? (
              <CheckCircle size={20} />
            ) : (
              <XCircle size={20} />
            )}
            <span>{message.text}</span>
          </div>
        )}

        {/* Slack Integration Card */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-start gap-4">
            <div className="p-3 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
              <Slack size={32} className="text-purple-600 dark:text-purple-400" />
            </div>

            <div className="flex-1">
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                Slack
              </h3>
              <p className="text-gray-600 dark:text-gray-400 mb-4">
                Integración organizacional de Slack para enviar notificaciones de todos los usuarios a canales específicos por proyecto
              </p>

              {loading ? (
                <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400">
                  <Loader2 size={16} className="animate-spin" />
                  <span>Cargando...</span>
                </div>
              ) : slackStatus?.connected ? (
                <div>
                  <div className="mb-4 space-y-2">
                    <div className="flex items-center gap-2 text-green-600 dark:text-green-400">
                      <CheckCircle size={18} />
                      <span className="font-medium">
                        Conectado a {slackStatus.workspace?.name}
                      </span>
                    </div>
                    {slackStatus.configuredBy && (
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        Configurado por: {slackStatus.configuredBy.name} ({slackStatus.configuredBy.email})
                      </p>
                    )}
                  </div>
                  {slackStatus.isAdmin ? (
                    <button
                      onClick={handleDisconnectSlack}
                      disabled={disconnecting}
                      className="px-4 py-2 bg-red-600 hover:bg-red-700 disabled:bg-red-400 text-white rounded-lg font-medium transition-colors flex items-center gap-2"
                    >
                      {disconnecting && <Loader2 size={16} className="animate-spin" />}
                      Desconectar
                    </button>
                  ) : (
                    <p className="text-sm text-gray-500 dark:text-gray-400 italic">
                      Solo administradores pueden desconectar la integración
                    </p>
                  )}
                </div>
              ) : (
                slackStatus?.isAdmin ? (
                  <button
                    onClick={handleConnectSlack}
                    disabled={connecting}
                    className="px-6 py-2.5 bg-purple-600 hover:bg-purple-700 disabled:bg-purple-400 text-white rounded-lg font-medium transition-colors flex items-center gap-2"
                  >
                    {connecting && <Loader2 size={16} className="animate-spin" />}
                    Conectar con Slack
                  </button>
                ) : (
                  <p className="text-sm text-gray-500 dark:text-gray-400 italic">
                    Solo administradores pueden configurar la integración de Slack
                  </p>
                )
              )}
            </div>
          </div>
        </div>

        {/* Info Box */}
        <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
          <h4 className="font-semibold text-blue-900 dark:text-blue-200 mb-2">
            ℹ️ Configuración de canales
          </h4>
          <p className="text-sm text-blue-800 dark:text-blue-300">
            Después de conectar Slack, podrás configurar qué canal de Slack recibirá
            notificaciones para cada proyecto desde la página de configuración del proyecto.
          </p>
        </div>
      </div>
    </div>
  );
}

export default function IntegrationsPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <Navbar />
        <div className="pt-16 main-content max-w-4xl mx-auto p-8">
          <div className="flex items-center justify-center">
            <Loader2 className="animate-spin" size={32} />
          </div>
        </div>
      </div>
    }>
      <IntegrationsContent />
    </Suspense>
  );
}
