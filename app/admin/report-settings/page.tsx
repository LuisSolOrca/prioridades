'use client';

import { useSession } from 'next-auth/react';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Navbar from '@/components/Navbar';

interface ReportSettings {
  _id: string;
  reportFrequency: 'SEMANAL' | 'MENSUAL' | 'AMBOS' | 'NINGUNO';
  weeklyReportDay: number;
  weeklyReportHour: number;
  monthlyReportDay: number;
  monthlyReportHour: number;
  emailSubjectPrefix: string;
  isActive: boolean;
  lastWeeklyReportSent?: string;
  lastMonthlyReportSent?: string;
}

const DIAS_SEMANA = [
  'Domingo',
  'Lunes',
  'Martes',
  'Miércoles',
  'Jueves',
  'Viernes',
  'Sábado',
];

export default function ReportSettingsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [settings, setSettings] = useState<ReportSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [sendingTest, setSendingTest] = useState(false);
  const [testEmail, setTestEmail] = useState('');
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Redirect si no es admin
  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
    } else if (status === 'authenticated' && session?.user?.role !== 'ADMIN') {
      router.push('/dashboard');
    }
  }, [status, session, router]);

  // Cargar configuración
  useEffect(() => {
    if (status === 'authenticated' && session?.user?.role === 'ADMIN') {
      fetchSettings();
    }
  }, [status, session]);

  const fetchSettings = async () => {
    try {
      const response = await fetch('/api/admin/report-settings');
      if (response.ok) {
        const data = await response.json();
        setSettings(data);
        setTestEmail(session?.user?.email || '');
      } else {
        showMessage('error', 'Error al cargar la configuración');
      }
    } catch (error) {
      showMessage('error', 'Error de conexión');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!settings) return;

    setSaving(true);
    setMessage(null);

    try {
      const response = await fetch('/api/admin/report-settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings),
      });

      if (response.ok) {
        showMessage('success', 'Configuración guardada exitosamente');
        fetchSettings();
      } else {
        const data = await response.json();
        showMessage('error', data.error || 'Error al guardar la configuración');
      }
    } catch (error) {
      showMessage('error', 'Error de conexión');
    } finally {
      setSaving(false);
    }
  };

  const handleSendTest = async (reportType: 'SEMANAL' | 'MENSUAL') => {
    if (!testEmail) {
      showMessage('error', 'Por favor ingresa un correo electrónico para la prueba');
      return;
    }

    setSendingTest(true);
    setMessage(null);

    try {
      const response = await fetch('/api/reports/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reportType,
          testMode: true,
          testEmail,
        }),
      });

      if (response.ok) {
        showMessage('success', `Reporte de prueba ${reportType.toLowerCase()} enviado a ${testEmail}`);
      } else {
        const data = await response.json();
        showMessage('error', data.error || 'Error al enviar el reporte de prueba');
      }
    } catch (error) {
      showMessage('error', 'Error de conexión');
    } finally {
      setSendingTest(false);
    }
  };

  const showMessage = (type: 'success' | 'error', text: string) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 5000);
  };

  if (status === 'loading' || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <div className="text-4xl mb-4">⏳</div>
          <div className="text-gray-600 dark:text-gray-400">Cargando configuración...</div>
        </div>
      </div>
    );
  }

  if (!session || session.user.role !== 'ADMIN' || !settings) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Navbar />
      <div className="pt-16 main-content px-4 py-6 max-w-4xl mx-auto">
        <div className="space-y-6">
          {/* Header */}
          <div className="mb-8">
            <button
              onClick={() => router.push('/dashboard')}
              className="text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 mb-4 flex items-center gap-2"
            >
              ← Volver al Dashboard
            </button>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
              📊 Configuración de Reportes Automáticos
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-2">
              Configura el envío automático de reportes de rendimiento por correo electrónico
            </p>
          </div>

          {/* Mensajes */}
          {message && (
            <div
              className={`p-4 rounded-lg ${
                message.type === 'success'
                  ? 'bg-green-50 dark:bg-green-900/20 text-green-800 dark:text-green-200 border border-green-200 dark:border-green-800'
                  : 'bg-red-50 dark:bg-red-900/20 text-red-800 dark:text-red-200 border border-red-200 dark:border-red-800'
              }`}
            >
              {message.text}
            </div>
          )}

          {/* Configuración Principal */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-4">
              Frecuencia de Reportes
            </h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Tipo de reporte
                </label>
                <select
                  value={settings.reportFrequency}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      reportFrequency: e.target.value as any,
                    })
                  }
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                >
                  <option value="NINGUNO">Ninguno (Desactivado)</option>
                  <option value="SEMANAL">Solo Semanal</option>
                  <option value="MENSUAL">Solo Mensual</option>
                  <option value="AMBOS">Ambos (Semanal y Mensual)</option>
                </select>
              </div>

              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="isActive"
                  checked={settings.isActive}
                  onChange={(e) =>
                    setSettings({ ...settings, isActive: e.target.checked })
                  }
                  className="w-4 h-4 text-blue-600 border-gray-300 dark:border-gray-600 rounded focus:ring-blue-500"
                />
                <label htmlFor="isActive" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Sistema activo (debe estar marcado para enviar reportes)
                </label>
              </div>
            </div>
          </div>

          {/* Configuración Semanal */}
          {(settings.reportFrequency === 'SEMANAL' || settings.reportFrequency === 'AMBOS') && (
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center gap-2">
                📅 Reporte Semanal
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Día de envío
                  </label>
                  <select
                    value={settings.weeklyReportDay}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        weeklyReportDay: parseInt(e.target.value),
                      })
                    }
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                  >
                    {DIAS_SEMANA.map((dia, index) => (
                      <option key={index} value={index}>
                        {dia}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Hora de envío (UTC) ⏰
                  </label>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">
                    ⚠️ El servidor usa horario UTC. Si estás en GMT-6, resta 6 horas. Ej: 18:00 UTC = 12:00 PM tu hora local
                  </p>
                  <select
                    value={settings.weeklyReportHour}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        weeklyReportHour: parseInt(e.target.value),
                      })
                    }
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                  >
                    {Array.from({ length: 24 }, (_, i) => (
                      <option key={i} value={i}>
                        {i.toString().padStart(2, '0')}:00
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {settings.lastWeeklyReportSent && (
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-4">
                  Último envío:{' '}
                  {new Date(settings.lastWeeklyReportSent).toLocaleString('es-ES')}
                </p>
              )}
            </div>
          )}

          {/* Configuración Mensual */}
          {(settings.reportFrequency === 'MENSUAL' || settings.reportFrequency === 'AMBOS') && (
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center gap-2">
                📊 Reporte Mensual
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Día del mes (1-28)
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="28"
                    value={settings.monthlyReportDay}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        monthlyReportDay: parseInt(e.target.value),
                      })
                    }
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Hora de envío (UTC) ⏰
                  </label>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">
                    ⚠️ El servidor usa horario UTC. Si estás en GMT-6, resta 6 horas. Ej: 18:00 UTC = 12:00 PM tu hora local
                  </p>
                  <select
                    value={settings.monthlyReportHour}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        monthlyReportHour: parseInt(e.target.value),
                      })
                    }
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                  >
                    {Array.from({ length: 24 }, (_, i) => (
                      <option key={i} value={i}>
                        {i.toString().padStart(2, '0')}:00
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {settings.lastMonthlyReportSent && (
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-4">
                  Último envío:{' '}
                  {new Date(settings.lastMonthlyReportSent).toLocaleString('es-ES')}
                </p>
              )}
            </div>
          )}

          {/* Prueba de Reportes */}
          <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800 p-6">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-4">
              🧪 Enviar Reporte de Prueba
            </h2>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Correo electrónico de prueba
              </label>
              <input
                type="email"
                value={testEmail}
                onChange={(e) => setTestEmail(e.target.value)}
                placeholder="correo@ejemplo.com"
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
              />
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => handleSendTest('SEMANAL')}
                disabled={sendingTest || !testEmail}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 dark:disabled:bg-gray-600 disabled:cursor-not-allowed transition-colors"
              >
                {sendingTest ? 'Enviando...' : 'Enviar Reporte Semanal'}
              </button>

              <button
                onClick={() => handleSendTest('MENSUAL')}
                disabled={sendingTest || !testEmail}
                className="px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:bg-gray-400 dark:disabled:bg-gray-600 disabled:cursor-not-allowed transition-colors"
              >
                {sendingTest ? 'Enviando...' : 'Enviar Reporte Mensual'}
              </button>
            </div>

            <p className="text-sm text-gray-600 dark:text-gray-400 mt-3">
              Los reportes de prueba se enviarán al correo especificado con los datos reales del sistema
            </p>
          </div>

          {/* Información de Cron */}
          <div className="bg-yellow-50 dark:bg-yellow-900/20 rounded-lg border border-yellow-200 dark:border-yellow-800 p-6">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-4">
              ⚙️ Configuración de Cron
            </h2>
            <p className="text-sm text-gray-700 dark:text-gray-300 mb-3">
              Para automatizar el envío, configura un servicio cron externo (como cron-job.org) para
              llamar a este endpoint cada hora:
            </p>
            <div className="bg-gray-900 dark:bg-gray-950 text-gray-100 p-4 rounded-lg font-mono text-sm mb-3 overflow-x-auto">
              GET {process.env.NEXT_PUBLIC_URL || 'https://tu-dominio.vercel.app'}/api/cron/send-reports
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              El sistema verificará automáticamente si es momento de enviar reportes según la
              configuración establecida
            </p>
          </div>

          {/* Botones de acción */}
          <div className="flex justify-end gap-3">
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-400 dark:disabled:bg-gray-600 disabled:cursor-not-allowed transition-colors"
            >
              {saving ? 'Guardando...' : 'Guardar Configuración'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
