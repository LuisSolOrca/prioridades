'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Navbar from '@/components/Navbar';

interface NextResetInfo {
  nextResetDate: string;
  formattedDate: string;
  formattedTime: string;
}

export default function LeaderboardSettingsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [nextReset, setNextReset] = useState<NextResetInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [resetting, setResetting] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
    } else if (status === 'authenticated') {
      if (session.user.role !== 'ADMIN') {
        router.push('/dashboard');
      } else {
        loadNextResetDate();
      }
    }
  }, [status, session, router]);

  const loadNextResetDate = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/leaderboard/next-reset');

      if (!response.ok) {
        throw new Error('Error al cargar fecha de reset');
      }

      const data = await response.json();
      setNextReset(data);
    } catch (err: any) {
      console.error('Error loading next reset date:', err);
      setMessage({
        type: 'error',
        text: err.message || 'Error al cargar la información'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleManualReset = async () => {
    if (!confirm('¿Estás seguro de que quieres resetear el leaderboard ahora? Esto enviará correos a los top 3 ganadores y notificará a todos los usuarios.')) {
      return;
    }

    try {
      setResetting(true);
      setMessage(null);

      const response = await fetch('/api/admin/reset-leaderboard', {
        method: 'POST',
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Error al resetear el leaderboard');
      }

      setMessage({
        type: 'success',
        text: `Leaderboard reseteado exitosamente. Correos enviados: ${data.result.emailsSent}. Usuarios notificados: ${data.result.totalUsersNotified}`
      });

      setTimeout(() => {
        loadNextResetDate();
      }, 1000);
    } catch (err: any) {
      console.error('Error resetting leaderboard:', err);
      setMessage({
        type: 'error',
        text: err.message || 'Error al resetear el leaderboard'
      });
    } finally {
      setResetting(false);
    }
  };

  if (status === 'loading' || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <div className="text-4xl mb-4">⏳</div>
          <div className="text-gray-600 dark:text-gray-400">Cargando...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Navbar />
      <div className="pt-16 main-content container mx-auto px-4 py-8 max-w-4xl">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-800 dark:text-gray-100 mb-2">
            🏆 Configuración del Leaderboard
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Gestiona el reseteo mensual del leaderboard y las notificaciones a los ganadores
          </p>
        </div>

        {message && (
          <div
            className={`mb-6 p-4 rounded-lg ${
              message.type === 'success'
                ? 'bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-800 text-green-700 dark:text-green-200'
                : 'bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-200'
            }`}
          >
            {message.text}
          </div>
        )}

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-xl font-bold text-gray-800 dark:text-gray-100 mb-4 flex items-center">
            <span className="mr-2">⏰</span>
            Próximo Reseteo Automático
          </h2>

          {nextReset ? (
            <div className="bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-900/30 dark:to-pink-900/30 border-2 border-purple-200 dark:border-purple-700 rounded-lg p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-sm font-medium text-purple-900 dark:text-purple-200 mb-1">
                    📅 Fecha
                  </label>
                  <p className="text-lg font-bold text-purple-800 dark:text-purple-300">
                    {nextReset.formattedDate}
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-purple-900 dark:text-purple-200 mb-1">
                    🕐 Hora
                  </label>
                  <p className="text-lg font-bold text-purple-800 dark:text-purple-300">
                    {nextReset.formattedTime}
                  </p>
                </div>
              </div>

              <div className="pt-4 border-t border-purple-200 dark:border-purple-700">
                <p className="text-sm text-purple-700 dark:text-purple-300">
                  <strong>ℹ️ Nota:</strong> El reseteo ocurre automáticamente el primer lunes de cada mes a las 9:00 AM (hora del servidor).
                  Los <strong>top 3</strong> recibirán correos de felicitación personalizados y todos los usuarios serán notificados.
                </p>
              </div>
            </div>
          ) : (
            <p className="text-gray-600 dark:text-gray-400">Cargando información...</p>
          )}
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-xl font-bold text-gray-800 dark:text-gray-100 mb-4 flex items-center">
            <span className="mr-2">🔄</span>
            Reseteo Manual
          </h2>

          <div className="bg-yellow-50 dark:bg-yellow-900/30 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4 mb-4">
            <p className="text-sm text-yellow-800 dark:text-yellow-200 mb-2">
              <strong>⚠️ Advertencia:</strong> El reseteo manual ejecuta las mismas acciones que el reseteo automático:
            </p>
            <ul className="text-sm text-yellow-700 dark:text-yellow-300 space-y-1 ml-4 list-disc">
              <li>Resetea los puntos mensuales de todos los usuarios a 0</li>
              <li>Envía correos de felicitación personalizados a los top 3 ganadores</li>
              <li>Notifica a todos los usuarios sobre los ganadores del mes</li>
            </ul>
          </div>

          <button
            onClick={handleManualReset}
            disabled={resetting}
            className="w-full bg-purple-600 text-white py-3 px-6 rounded-lg font-semibold hover:bg-purple-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition flex items-center justify-center"
          >
            {resetting ? (
              <>
                <span className="mr-2">⏳</span>
                Reseteando...
              </>
            ) : (
              <>
                <span className="mr-2">▶️</span>
                Resetear Leaderboard Ahora
              </>
            )}
          </button>

          <p className="text-xs text-gray-500 dark:text-gray-400 mt-3 text-center">
            Usa esta función solo para pruebas o situaciones especiales
          </p>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
          <h2 className="text-xl font-bold text-gray-800 dark:text-gray-100 mb-4 flex items-center">
            <span className="mr-2">🤖</span>
            Automatización con Cron
          </h2>

          <div className="space-y-4">
            <div>
              <h3 className="font-semibold text-gray-800 dark:text-gray-100 mb-2">
                Endpoint para Cron Externo
              </h3>
              <div className="bg-gray-100 dark:bg-gray-700 p-3 rounded font-mono text-sm overflow-x-auto">
                GET https://tu-dominio.com/api/cron/reset-leaderboard
              </div>
            </div>

            <div>
              <h3 className="font-semibold text-gray-800 dark:text-gray-100 mb-2">
                Configuración Recomendada
              </h3>
              <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-2 ml-4 list-disc">
                <li>Servicio: cron-job.org (gratis)</li>
                <li>Frecuencia: Cada hora (el endpoint valida internamente si debe ejecutarse)</li>
                <li>Condiciones de ejecución: Primer lunes del mes a las 9:00 AM UTC</li>
              </ul>
            </div>

            <div className="bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
              <p className="text-sm text-blue-800 dark:text-blue-200">
                <strong>💡 Tip:</strong> El endpoint de cron valida automáticamente si es el momento correcto
                para ejecutar el reseteo. Puedes configurarlo para que se ejecute cada hora sin preocuparte
                por ejecuciones duplicadas.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
