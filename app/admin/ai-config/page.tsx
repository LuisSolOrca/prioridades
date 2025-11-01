'use client';

export const dynamic = 'force-dynamic';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Navbar from '@/components/Navbar';

interface AIPromptConfig {
  _id: string;
  promptType: 'title' | 'description' | 'organization_analysis';
  systemPrompt: string;
  userPromptTemplate: string;
  temperature: number;
  maxTokens: number;
  isActive: boolean;
}

const promptTypeLabels = {
  title: 'Mejora de Títulos',
  description: 'Mejora de Descripciones',
  organization_analysis: 'Análisis Organizacional'
};

const promptTypeDescriptions = {
  title: 'Prompt utilizado para mejorar los títulos de las prioridades',
  description: 'Prompt utilizado para mejorar las descripciones de las prioridades',
  organization_analysis: 'Prompt utilizado para el análisis organizacional en el dashboard'
};

export default function AIConfigPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [configs, setConfigs] = useState<AIPromptConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingConfig, setEditingConfig] = useState<AIPromptConfig | null>(null);
  const [showEditForm, setShowEditForm] = useState(false);
  const [formData, setFormData] = useState<Partial<AIPromptConfig>>({});
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
    }
    if (status === 'authenticated') {
      const user = session.user as any;
      if (user.role !== 'ADMIN') {
        router.push('/dashboard');
      } else {
        loadConfigs();
      }
    }
  }, [status, router, session]);

  const loadConfigs = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/ai-config');
      if (!res.ok) throw new Error('Error cargando configuraciones');
      const data = await res.json();
      setConfigs(data);
    } catch (error) {
      console.error('Error loading configs:', error);
      setMessage({ type: 'error', text: 'Error al cargar las configuraciones' });
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (config: AIPromptConfig) => {
    setEditingConfig(config);
    setFormData({
      promptType: config.promptType,
      systemPrompt: config.systemPrompt,
      userPromptTemplate: config.userPromptTemplate,
      temperature: config.temperature,
      maxTokens: config.maxTokens,
      isActive: config.isActive
    });
    setShowEditForm(true);
    setMessage(null);
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      setMessage(null);

      const res = await fetch('/api/ai-config', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Error al guardar');
      }

      setMessage({ type: 'success', text: 'Configuración guardada exitosamente' });
      setShowEditForm(false);
      setEditingConfig(null);
      await loadConfigs();
    } catch (error: any) {
      console.error('Error saving config:', error);
      setMessage({ type: 'error', text: error.message });
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setShowEditForm(false);
    setEditingConfig(null);
    setFormData({});
    setMessage(null);
  };

  if (status === 'loading' || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="text-4xl mb-4">⏳</div>
          <div className="text-gray-600">Cargando...</div>
        </div>
      </div>
    );
  }

  if (!session) return null;

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="container mx-auto px-4 py-6">
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h1 className="text-3xl font-bold text-gray-800">
              🤖 Configuración de IA
            </h1>
          </div>

          {message && (
            <div className={`p-4 rounded-lg ${message.type === 'success' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
              {message.text}
            </div>
          )}

          <div className="bg-white rounded-lg shadow-md p-6">
            <p className="text-gray-600 mb-6">
              Aquí puedes configurar los prompts que utiliza la IA para mejorar títulos, descripciones y realizar análisis organizacionales.
              Los cambios se aplican inmediatamente a todas las funciones de IA.
            </p>

            <div className="space-y-4">
              {configs.map(config => (
                <div
                  key={config._id}
                  className="border rounded-lg p-5 hover:shadow-md transition-shadow"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-lg font-bold text-gray-800">
                          {promptTypeLabels[config.promptType]}
                        </h3>
                        <span className={`px-3 py-1 rounded-full text-xs font-semibold ${config.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'}`}>
                          {config.isActive ? '✓ Activo' : '✗ Inactivo'}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600 mb-3">
                        {promptTypeDescriptions[config.promptType]}
                      </p>
                      <div className="grid grid-cols-2 gap-3 text-sm">
                        <div>
                          <span className="font-medium text-gray-700">Temperature:</span>
                          <span className="ml-2 text-gray-600">{config.temperature}</span>
                        </div>
                        <div>
                          <span className="font-medium text-gray-700">Max Tokens:</span>
                          <span className="ml-2 text-gray-600">{config.maxTokens}</span>
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={() => handleEdit(config)}
                      className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition font-semibold text-sm"
                    >
                      ✏️ Editar
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Modal de Edición */}
      {showEditForm && editingConfig && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
          onClick={handleCancel}
        >
          <div
            className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6">
              <h2 className="text-2xl font-bold text-gray-800 mb-6">
                Editar Configuración: {promptTypeLabels[editingConfig.promptType]}
              </h2>

              <div className="space-y-6">
                {/* System Prompt */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    System Prompt
                  </label>
                  <p className="text-xs text-gray-500 mb-2">
                    Define el rol y comportamiento de la IA. Este prompt establece el contexto general.
                  </p>
                  <textarea
                    value={formData.systemPrompt || ''}
                    onChange={(e) => setFormData({ ...formData, systemPrompt: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono text-sm"
                    rows={10}
                  />
                </div>

                {/* User Prompt Template */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    User Prompt Template
                  </label>
                  <p className="text-xs text-gray-500 mb-2">
                    Template del prompt del usuario. Usa variables como {'{{text}}'}, {'{{prioritiesContext}}'}, etc.
                  </p>
                  <textarea
                    value={formData.userPromptTemplate || ''}
                    onChange={(e) => setFormData({ ...formData, userPromptTemplate: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono text-sm"
                    rows={8}
                  />
                </div>

                {/* Parámetros */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Temperature (0-2)
                    </label>
                    <p className="text-xs text-gray-500 mb-2">
                      Controla la creatividad. Valores bajos = más determinista, valores altos = más creativo.
                    </p>
                    <input
                      type="number"
                      min="0"
                      max="2"
                      step="0.1"
                      value={formData.temperature || 0.7}
                      onChange={(e) => setFormData({ ...formData, temperature: parseFloat(e.target.value) })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Max Tokens (50-4000)
                    </label>
                    <p className="text-xs text-gray-500 mb-2">
                      Longitud máxima de la respuesta de la IA.
                    </p>
                    <input
                      type="number"
                      min="50"
                      max="4000"
                      step="50"
                      value={formData.maxTokens || 500}
                      onChange={(e) => setFormData({ ...formData, maxTokens: parseInt(e.target.value) })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                </div>

                {/* Estado */}
                <div>
                  <label className="flex items-center space-x-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.isActive !== false}
                      onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                      className="w-5 h-5 text-blue-600"
                    />
                    <span className="text-sm font-semibold text-gray-700">
                      Configuración activa
                    </span>
                  </label>
                  <p className="text-xs text-gray-500 mt-1 ml-7">
                    Si está desactivada, esta configuración no se utilizará.
                  </p>
                </div>
              </div>

              {/* Botones */}
              <div className="flex justify-end space-x-3 mt-6 pt-6 border-t">
                <button
                  onClick={handleCancel}
                  className="bg-gray-200 text-gray-700 px-6 py-2 rounded-lg hover:bg-gray-300 transition font-semibold"
                  disabled={saving}
                >
                  Cancelar
                </button>
                <button
                  onClick={handleSave}
                  className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition font-semibold disabled:bg-gray-400"
                  disabled={saving}
                >
                  {saving ? 'Guardando...' : '💾 Guardar Cambios'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
