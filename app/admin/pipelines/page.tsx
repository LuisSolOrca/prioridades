'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Navbar from '@/components/Navbar';
import {
  Layers,
  Plus,
  Edit,
  Trash2,
  Star,
  Settings,
  Copy,
  ChevronRight,
  RefreshCw,
  X,
  Check,
  AlertTriangle,
  Palette,
  DollarSign,
  BarChart3,
} from 'lucide-react';

interface Pipeline {
  _id: string;
  name: string;
  description?: string;
  color: string;
  isDefault: boolean;
  isActive: boolean;
  stagesCount?: number;
  dealsCount?: number;
  totalValue?: number;
  createdBy?: { name: string };
  createdAt: string;
}

const PIPELINE_COLORS = [
  '#3B82F6', // Blue
  '#10B981', // Green
  '#F59E0B', // Amber
  '#EF4444', // Red
  '#8B5CF6', // Purple
  '#EC4899', // Pink
  '#06B6D4', // Cyan
  '#F97316', // Orange
];

export default function PipelinesAdminPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const [pipelines, setPipelines] = useState<Pipeline[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingPipeline, setEditingPipeline] = useState<Pipeline | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    color: '#3B82F6',
    isDefault: false,
    copyStagesFrom: '',
  });
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);

  const user = session?.user as any;
  const isAdmin = user?.role === 'ADMIN';

  useEffect(() => {
    if (session && !isAdmin) {
      router.push('/dashboard');
    } else if (session) {
      fetchPipelines();
    }
  }, [session, isAdmin]);

  const fetchPipelines = async () => {
    try {
      const res = await fetch('/api/crm/pipelines?includeStats=true&includeInactive=true');
      if (res.ok) {
        const data = await res.json();
        setPipelines(data);
      }
    } catch (error) {
      console.error('Error fetching pipelines:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenModal = (pipeline?: Pipeline) => {
    if (pipeline) {
      setEditingPipeline(pipeline);
      setFormData({
        name: pipeline.name,
        description: pipeline.description || '',
        color: pipeline.color,
        isDefault: pipeline.isDefault,
        copyStagesFrom: '',
      });
    } else {
      setEditingPipeline(null);
      setFormData({
        name: '',
        description: '',
        color: '#3B82F6',
        isDefault: false,
        copyStagesFrom: '',
      });
    }
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!formData.name.trim()) {
      alert('El nombre es requerido');
      return;
    }

    setSaving(true);
    try {
      const url = editingPipeline
        ? `/api/crm/pipelines/${editingPipeline._id}`
        : '/api/crm/pipelines';
      const method = editingPipeline ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (res.ok) {
        setShowModal(false);
        fetchPipelines();
      } else {
        const error = await res.json();
        alert(error.error || 'Error al guardar');
      }
    } catch (error) {
      console.error('Error saving pipeline:', error);
      alert('Error al guardar el pipeline');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (pipeline: Pipeline) => {
    if (pipeline.isDefault) {
      alert('No puedes eliminar el pipeline por defecto');
      return;
    }

    if (!confirm(`¿Estás seguro de eliminar el pipeline "${pipeline.name}"?`)) {
      return;
    }

    setDeleting(pipeline._id);
    try {
      const res = await fetch(`/api/crm/pipelines/${pipeline._id}`, {
        method: 'DELETE',
      });

      if (res.ok) {
        fetchPipelines();
      } else {
        const error = await res.json();
        alert(error.error || 'Error al eliminar');
      }
    } catch (error) {
      console.error('Error deleting pipeline:', error);
    } finally {
      setDeleting(null);
    }
  };

  const handleSetDefault = async (pipelineId: string) => {
    try {
      const res = await fetch(`/api/crm/pipelines/${pipelineId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isDefault: true }),
      });

      if (res.ok) {
        fetchPipelines();
      }
    } catch (error) {
      console.error('Error setting default:', error);
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN',
      minimumFractionDigits: 0,
    }).format(value);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <Navbar />
        <div className="pt-16 main-content p-8 flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Navbar />
      <div className="pt-16 main-content px-4 py-6">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
                <Layers className="w-7 h-7 text-blue-600" />
                Gestión de Pipelines
              </h1>
              <p className="text-gray-500 dark:text-gray-400 mt-1">
                Administra los pipelines de ventas de tu CRM
              </p>
            </div>
            <button
              onClick={() => handleOpenModal()}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              <Plus className="w-4 h-4" />
              Nuevo Pipeline
            </button>
          </div>

          {/* Pipelines Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {pipelines.map((pipeline) => (
              <div
                key={pipeline._id}
                className={`bg-white dark:bg-gray-800 rounded-xl border-2 overflow-hidden transition-all hover:shadow-lg ${
                  pipeline.isDefault
                    ? 'border-yellow-400'
                    : 'border-gray-200 dark:border-gray-700'
                } ${!pipeline.isActive ? 'opacity-60' : ''}`}
              >
                {/* Color Header */}
                <div
                  className="h-2"
                  style={{ backgroundColor: pipeline.color }}
                />

                <div className="p-4">
                  {/* Title and Badge */}
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <div
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: pipeline.color }}
                      />
                      <h3 className="font-semibold text-gray-900 dark:text-white">
                        {pipeline.name}
                      </h3>
                    </div>
                    {pipeline.isDefault && (
                      <span className="px-2 py-0.5 bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400 text-xs rounded-full flex items-center gap-1">
                        <Star className="w-3 h-3" />
                        Default
                      </span>
                    )}
                  </div>

                  {/* Description */}
                  {pipeline.description && (
                    <p className="text-sm text-gray-500 dark:text-gray-400 mb-4 line-clamp-2">
                      {pipeline.description}
                    </p>
                  )}

                  {/* Stats */}
                  <div className="grid grid-cols-3 gap-2 mb-4">
                    <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-2 text-center">
                      <p className="text-lg font-bold text-gray-900 dark:text-white">
                        {pipeline.stagesCount || 0}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">Etapas</p>
                    </div>
                    <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-2 text-center">
                      <p className="text-lg font-bold text-gray-900 dark:text-white">
                        {pipeline.dealsCount || 0}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">Deals</p>
                    </div>
                    <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-2 text-center">
                      <p className="text-sm font-bold text-gray-900 dark:text-white truncate">
                        {formatCurrency(pipeline.totalValue || 0)}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">Valor</p>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center justify-between pt-3 border-t border-gray-200 dark:border-gray-700">
                    <div className="flex gap-1">
                      <button
                        onClick={() => router.push(`/admin/pipeline?pipelineId=${pipeline._id}`)}
                        className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-lg"
                        title="Gestionar etapas"
                      >
                        <Settings className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleOpenModal(pipeline)}
                        className="p-2 text-gray-500 hover:text-green-600 hover:bg-green-50 dark:hover:bg-green-900/30 rounded-lg"
                        title="Editar"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      {!pipeline.isDefault && (
                        <>
                          <button
                            onClick={() => handleSetDefault(pipeline._id)}
                            className="p-2 text-gray-500 hover:text-yellow-600 hover:bg-yellow-50 dark:hover:bg-yellow-900/30 rounded-lg"
                            title="Establecer como default"
                          >
                            <Star className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(pipeline)}
                            disabled={deleting === pipeline._id}
                            className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg disabled:opacity-50"
                            title="Eliminar"
                          >
                            {deleting === pipeline._id ? (
                              <RefreshCw className="w-4 h-4 animate-spin" />
                            ) : (
                              <Trash2 className="w-4 h-4" />
                            )}
                          </button>
                        </>
                      )}
                    </div>
                    <button
                      onClick={() => router.push(`/crm/deals?pipelineId=${pipeline._id}`)}
                      className="flex items-center gap-1 text-sm text-blue-600 hover:text-blue-700"
                    >
                      Ver deals
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {pipelines.length === 0 && (
            <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-12 text-center">
              <Layers className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                No hay pipelines
              </h3>
              <p className="text-gray-500 dark:text-gray-400 mb-4">
                Ejecuta la migración o crea tu primer pipeline
              </p>
              <button
                onClick={() => handleOpenModal()}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Crear Pipeline
              </button>
            </div>
          )}

          {/* Info Box */}
          <div className="mt-6 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
            <div className="flex gap-3">
              <AlertTriangle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
              <div>
                <h4 className="font-medium text-blue-800 dark:text-blue-200">Migración de datos</h4>
                <p className="text-sm text-blue-700 dark:text-blue-300 mt-1">
                  Si tienes datos existentes sin pipeline asignado, ejecuta:
                  <code className="ml-2 px-2 py-0.5 bg-blue-100 dark:bg-blue-800 rounded text-xs">
                    npx tsx scripts/migrate-multi-pipeline.ts
                  </code>
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-md">
            <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
              <h2 className="text-lg font-bold text-gray-900 dark:text-white">
                {editingPipeline ? 'Editar Pipeline' : 'Nuevo Pipeline'}
              </h2>
              <button
                onClick={() => setShowModal(false)}
                className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              {/* Name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Nombre *
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                  placeholder="Ej: Ventas Enterprise"
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Descripción
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                  rows={2}
                  placeholder="Descripción del pipeline"
                />
              </div>

              {/* Color */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Color
                </label>
                <div className="flex gap-2 flex-wrap">
                  {PIPELINE_COLORS.map((color) => (
                    <button
                      key={color}
                      onClick={() => setFormData({ ...formData, color })}
                      className={`w-8 h-8 rounded-full border-2 transition-all ${
                        formData.color === color
                          ? 'border-gray-800 dark:border-white scale-110'
                          : 'border-transparent hover:scale-105'
                      }`}
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
              </div>

              {/* Copy stages from (only for new) */}
              {!editingPipeline && pipelines.length > 0 && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Copiar etapas de
                  </label>
                  <select
                    value={formData.copyStagesFrom}
                    onChange={(e) => setFormData({ ...formData, copyStagesFrom: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  >
                    <option value="">No copiar (crear vacío)</option>
                    {pipelines.filter(p => p.isActive).map((p) => (
                      <option key={p._id} value={p._id}>
                        {p.name} ({p.stagesCount || 0} etapas)
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Is Default */}
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.isDefault}
                  onChange={(e) => setFormData({ ...formData, isDefault: e.target.checked })}
                  className="rounded text-blue-600"
                />
                <span className="text-gray-700 dark:text-gray-300">
                  Establecer como pipeline por defecto
                </span>
              </label>
            </div>

            <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 flex justify-end gap-3 rounded-b-xl">
              <button
                onClick={() => setShowModal(false)}
                className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-white dark:hover:bg-gray-700"
              >
                Cancelar
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                {saving ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    Guardando...
                  </>
                ) : (
                  <>
                    <Check className="w-4 h-4" />
                    Guardar
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
