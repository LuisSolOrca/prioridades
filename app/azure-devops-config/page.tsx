'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Navbar from '@/components/Navbar';

interface AzureDevOpsConfigData {
  organization: string;
  project: string;
  personalAccessToken: string;
  syncEnabled: boolean;
}

export default function AzureDevOpsConfigPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [configured, setConfigured] = useState(false);
  const [showToken, setShowToken] = useState(false);
  const [formData, setFormData] = useState<AzureDevOpsConfigData>({
    organization: '',
    project: '',
    personalAccessToken: '',
    syncEnabled: true
  });
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
      return;
    }
    if (status === 'authenticated') {
      // Verificar que el usuario sea del área Tecnología
      if ((session.user as any).area !== 'Tecnología') {
        router.push('/priorities');
        return;
      }
      loadConfig();
    }
  }, [status, session, router]);

  const loadConfig = async () => {
    try {
      const res = await fetch('/api/azure-devops/config');
      const data = await res.json();

      if (data.configured && data.config) {
        setConfigured(true);
        setFormData({
          organization: data.config.organization || '',
          project: data.config.project || '',
          personalAccessToken: '', // No mostramos el token por seguridad
          syncEnabled: data.config.syncEnabled !== false
        });
      }
    } catch (error) {
      console.error('Error cargando configuración:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMessage(null);

    try {
      // Validar campos
      if (!formData.organization || !formData.project || !formData.personalAccessToken) {
        setMessage({
          type: 'error',
          text: 'Por favor completa todos los campos requeridos'
        });
        setSaving(false);
        return;
      }

      const res = await fetch('/api/azure-devops/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Error al guardar la configuración');
      }

      setMessage({
        type: 'success',
        text: 'Configuración guardada correctamente'
      });
      setConfigured(true);

      // Limpiar el PAT del formulario después de guardar
      setFormData(prev => ({ ...prev, personalAccessToken: '' }));
    } catch (error) {
      setMessage({
        type: 'error',
        text: error instanceof Error ? error.message : 'Error al guardar la configuración'
      });
    } finally {
      setSaving(false);
    }
  };

  const handleTestConnection = async () => {
    setSaving(true);
    setMessage(null);

    try {
      // Guardar primero
      const res = await fetch('/api/azure-devops/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Error al probar la conexión');
      }

      setMessage({
        type: 'success',
        text: '✅ Conexión exitosa con Azure DevOps'
      });
    } catch (error) {
      setMessage({
        type: 'error',
        text: error instanceof Error ? error.message : 'Error al probar la conexión'
      });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm('¿Estás seguro de que quieres eliminar la configuración de Azure DevOps?')) {
      return;
    }

    setSaving(true);
    setMessage(null);

    try {
      const res = await fetch('/api/azure-devops/config', {
        method: 'DELETE'
      });

      if (!res.ok) {
        throw new Error('Error al eliminar la configuración');
      }

      setMessage({
        type: 'success',
        text: 'Configuración eliminada correctamente'
      });
      setConfigured(false);
      setFormData({
        organization: '',
        project: '',
        personalAccessToken: '',
        syncEnabled: true
      });
    } catch (error) {
      setMessage({
        type: 'error',
        text: error instanceof Error ? error.message : 'Error al eliminar la configuración'
      });
    } finally {
      setSaving(false);
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

  if (!session) return null;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Navbar />
      <div className="pt-16 main-content px-4 py-6 max-w-4xl mx-auto">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-800 dark:text-gray-100">
                🔄 Configuración Azure DevOps
              </h1>
              <p className="text-gray-600 dark:text-gray-400 mt-2">
                Conecta tu cuenta de Azure DevOps para sincronizar work items como prioridades
              </p>
            </div>
            <button
              onClick={() => router.push('/priorities')}
              className="bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700 transition"
            >
              Volver
            </button>
          </div>

          {message && (
            <div
              className={`mb-6 p-4 rounded-lg ${
                message.type === 'success'
                  ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200'
                  : 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-200'
              }`}
            >
              {message.text}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                Organización *
              </label>
              <input
                type="text"
                value={formData.organization}
                onChange={(e) => setFormData({ ...formData, organization: e.target.value })}
                placeholder="mi-organizacion"
                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                required
              />
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                El nombre de tu organización en Azure DevOps (ej: de la URL https://dev.azure.com/<strong>mi-organizacion</strong>)
              </p>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                Proyecto *
              </label>
              <input
                type="text"
                value={formData.project}
                onChange={(e) => setFormData({ ...formData, project: e.target.value })}
                placeholder="mi-proyecto"
                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                required
              />
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                El nombre del proyecto en Azure DevOps
              </p>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                Personal Access Token (PAT) *
              </label>
              <div className="relative">
                <input
                  type={showToken ? 'text' : 'password'}
                  value={formData.personalAccessToken}
                  onChange={(e) => setFormData({ ...formData, personalAccessToken: e.target.value })}
                  placeholder={configured ? '(guardado de forma segura)' : 'Ingresa tu PAT de Azure DevOps'}
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 pr-12"
                  required={!configured}
                />
                <button
                  type="button"
                  onClick={() => setShowToken(!showToken)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                >
                  {showToken ? '🙈' : '👁️'}
                </button>
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                Crea un PAT en Azure DevOps con permisos de lectura/escritura en Work Items
              </p>
            </div>

            <div className="flex items-center">
              <input
                type="checkbox"
                id="syncEnabled"
                checked={formData.syncEnabled}
                onChange={(e) => setFormData({ ...formData, syncEnabled: e.target.checked })}
                className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600"
              />
              <label htmlFor="syncEnabled" className="ml-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                Habilitar sincronización automática de estados
              </label>
            </div>

            <div className="flex gap-3 pt-4">
              <button
                type="submit"
                disabled={saving}
                className="flex-1 bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {saving ? 'Guardando...' : configured ? 'Actualizar Configuración' : 'Guardar Configuración'}
              </button>

              {!configured && (
                <button
                  type="button"
                  onClick={handleTestConnection}
                  disabled={saving}
                  className="bg-green-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-green-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Probar Conexión
                </button>
              )}

              {configured && (
                <button
                  type="button"
                  onClick={handleDelete}
                  disabled={saving}
                  className="bg-red-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-red-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Eliminar
                </button>
              )}
            </div>
          </form>

          {configured && (
            <div className="mt-8 pt-6 border-t border-gray-200 dark:border-gray-700">
              <h2 className="text-xl font-bold text-gray-800 dark:text-gray-100 mb-4">
                Siguiente paso
              </h2>
              <p className="text-gray-600 dark:text-gray-400 mb-4">
                Tu configuración está lista. Ahora puedes importar work items de Azure DevOps como prioridades.
              </p>
              <button
                onClick={() => router.push('/azure-devops-import')}
                className="bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-700 transition"
              >
                Importar Work Items
              </button>
            </div>
          )}

          <div className="mt-8 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
            <h3 className="font-semibold text-blue-900 dark:text-blue-200 mb-2">
              ℹ️ ¿Cómo obtener un Personal Access Token?
            </h3>
            <ol className="text-sm text-blue-800 dark:text-blue-300 space-y-1 list-decimal list-inside">
              <li>Ve a Azure DevOps y haz clic en tu avatar (esquina superior derecha)</li>
              <li>Selecciona "Personal access tokens"</li>
              <li>Haz clic en "+ New Token"</li>
              <li>Dale un nombre, selecciona el scope "Work Items" con permisos "Read & Write"</li>
              <li>Copia el token generado (solo se muestra una vez)</li>
            </ol>
          </div>
        </div>
      </div>
    </div>
  );
}
