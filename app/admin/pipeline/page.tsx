'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';
import Navbar from '@/components/Navbar';
import {
  Loader2,
  Plus,
  GripVertical,
  Edit2,
  Trash2,
  X,
  Check,
  AlertTriangle,
  Trophy,
  XCircle,
  Star,
  Layers,
  ArrowLeft
} from 'lucide-react';
import Link from 'next/link';

interface Pipeline {
  _id: string;
  name: string;
  color: string;
  isDefault: boolean;
}

interface PipelineStage {
  _id: string;
  pipelineId?: string;
  name: string;
  order: number;
  color: string;
  probability: number;
  isDefault: boolean;
  isClosed: boolean;
  isWon: boolean;
  isActive: boolean;
}

const PRESET_COLORS = [
  '#9ca3af', '#6b7280', '#4b5563',
  '#ef4444', '#f97316', '#f59e0b', '#fbbf24',
  '#84cc16', '#22c55e', '#10b981',
  '#14b8a6', '#06b6d4', '#0ea5e9', '#3b82f6', '#60a5fa',
  '#6366f1', '#8b5cf6', '#a855f7',
  '#d946ef', '#ec4899', '#f43f5e',
];

export default function PipelineAdminPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [pipelines, setPipelines] = useState<Pipeline[]>([]);
  const [selectedPipelineId, setSelectedPipelineId] = useState<string>('');
  const [stages, setStages] = useState<PipelineStage[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editingStage, setEditingStage] = useState<PipelineStage | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    name: '',
    color: '#6b7280',
    probability: 0,
    isDefault: false,
    isClosed: false,
    isWon: false,
  });

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
    }
    if (status === 'authenticated') {
      const user = session?.user as any;
      if (user?.role !== 'ADMIN') {
        router.push('/dashboard');
        return;
      }
      loadPipelines();
    }
  }, [status, router, session]);

  useEffect(() => {
    if (selectedPipelineId) {
      loadStages(selectedPipelineId);
    }
  }, [selectedPipelineId]);

  const loadPipelines = async () => {
    try {
      const res = await fetch('/api/crm/pipelines');
      const data = await res.json();
      setPipelines(Array.isArray(data) ? data : []);
      // Select default pipeline or first one
      const defaultPipeline = data.find((p: Pipeline) => p.isDefault) || data[0];
      if (defaultPipeline) {
        setSelectedPipelineId(defaultPipeline._id);
      } else {
        setLoading(false);
      }
    } catch (error) {
      console.error('Error loading pipelines:', error);
      setLoading(false);
    }
  };

  const loadStages = async (pipelineId: string) => {
    try {
      setLoading(true);
      const res = await fetch(`/api/crm/pipeline-stages?pipelineId=${pipelineId}`);
      const data = await res.json();
      setStages(Array.isArray(data) ? data.sort((a: PipelineStage, b: PipelineStage) => a.order - b.order) : []);
    } catch (error) {
      console.error('Error loading stages:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDragEnd = async (result: DropResult) => {
    if (!result.destination) return;

    const items = Array.from(stages);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);

    setStages(items);

    try {
      await fetch('/api/crm/pipeline-stages', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ stageIds: items.map(s => s._id) }),
      });
    } catch (error) {
      console.error('Error reordering stages:', error);
      loadStages(selectedPipelineId);
    }
  };

  const openCreateModal = () => {
    setEditingStage(null);
    setFormData({
      name: '',
      color: '#6b7280',
      probability: 0,
      isDefault: false,
      isClosed: false,
      isWon: false,
    });
    setShowModal(true);
  };

  const openEditModal = (stage: PipelineStage) => {
    setEditingStage(stage);
    setFormData({
      name: stage.name,
      color: stage.color,
      probability: stage.probability,
      isDefault: stage.isDefault,
      isClosed: stage.isClosed,
      isWon: stage.isWon,
    });
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      const url = editingStage
        ? '/api/crm/pipeline-stages/' + editingStage._id
        : '/api/crm/pipeline-stages';

      const payload = editingStage
        ? formData
        : { ...formData, pipelineId: selectedPipelineId };

      const res = await fetch(url, {
        method: editingStage ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Error al guardar');
      }

      setShowModal(false);
      loadStages(selectedPipelineId);
    } catch (error: any) {
      alert(error.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (stageId: string) => {
    try {
      const res = await fetch('/api/crm/pipeline-stages/' + stageId, {
        method: 'DELETE',
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Error al eliminar');
      }

      setDeleteConfirm(null);
      loadStages(selectedPipelineId);
    } catch (error: any) {
      alert(error.message);
    }
  };

  const handleToggleActive = async (stage: PipelineStage) => {
    try {
      await fetch('/api/crm/pipeline-stages/' + stage._id, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !stage.isActive }),
      });
      loadStages(selectedPipelineId);
    } catch (error) {
      console.error('Error toggling stage:', error);
    }
  };

  const selectedPipeline = pipelines.find(p => p._id === selectedPipelineId);

  if (status === 'loading' || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <Loader2 className="animate-spin" size={40} />
      </div>
    );
  }

  if (!session) return null;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Navbar />
      <div className="pt-16 main-content px-4 py-6 max-w-4xl mx-auto">
        <div className="flex items-center gap-4 mb-6">
          <Link
            href="/crm"
            className="p-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition"
          >
            <ArrowLeft size={20} />
          </Link>
          <div className="flex-1">
            <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100 flex items-center gap-2">
              <Layers className="text-blue-500" />
              Etapas del Pipeline
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              Configura las etapas de tu embudo de ventas
            </p>
          </div>
          <Link
            href="/admin/pipelines"
            className="flex items-center gap-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 px-4 py-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition font-medium"
          >
            <Layers size={18} />
            Gestionar Pipelines
          </Link>
          <button
            onClick={openCreateModal}
            disabled={!selectedPipelineId}
            className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition font-medium disabled:opacity-50"
          >
            <Plus size={20} />
            Nueva Etapa
          </button>
        </div>

        {/* Pipeline Selector */}
        {pipelines.length > 0 && (
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4 mb-6">
            <div className="flex items-center gap-4">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Pipeline:
              </label>
              <div className="flex gap-2 flex-wrap">
                {pipelines.map((pipeline) => (
                  <button
                    key={pipeline._id}
                    onClick={() => setSelectedPipelineId(pipeline._id)}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg border transition ${
                      selectedPipelineId === pipeline._id
                        ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
                        : 'border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300'
                    }`}
                  >
                    <div
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: pipeline.color || '#3B82F6' }}
                    />
                    {pipeline.name}
                    {pipeline.isDefault && (
                      <Star size={14} className="text-yellow-500" />
                    )}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {pipelines.length === 0 && !loading && (
          <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4 mb-6">
            <p className="text-yellow-700 dark:text-yellow-300">
              No hay pipelines creados.{' '}
              <Link href="/admin/pipelines" className="underline font-medium">
                Crea tu primer pipeline
              </Link>
              {' '}para comenzar a agregar etapas.
            </p>
          </div>
        )}

        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 mb-6">
          <p className="text-sm text-blue-700 dark:text-blue-300">
            <strong>Arrastra</strong> las etapas para reordenarlas. Las etapas cerradas (Ganado/Perdido)
            generalmente van al final del pipeline.
          </p>
        </div>

        <DragDropContext onDragEnd={handleDragEnd}>
          <Droppable droppableId="stages">
            {(provided) => (
              <div
                ref={provided.innerRef}
                {...provided.droppableProps}
                className="space-y-2"
              >
                {stages.map((stage, index) => (
                  <Draggable key={stage._id} draggableId={stage._id} index={index}>
                    {(provided, snapshot) => (
                      <div
                        ref={provided.innerRef}
                        {...provided.draggableProps}
                        className={'bg-white dark:bg-gray-800 rounded-lg border ' +
                          (snapshot.isDragging
                            ? 'border-blue-400 shadow-lg'
                            : 'border-gray-200 dark:border-gray-700') +
                          (!stage.isActive ? ' opacity-50' : '')}
                      >
                        <div className="flex items-center gap-4 p-4">
                          <div
                            {...provided.dragHandleProps}
                            className="text-gray-400 hover:text-gray-600 cursor-grab active:cursor-grabbing"
                          >
                            <GripVertical size={20} />
                          </div>

                          <div
                            className="w-6 h-6 rounded-full flex-shrink-0 border-2 border-white shadow"
                            style={{ backgroundColor: stage.color }}
                          />

                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <h3 className="font-medium text-gray-800 dark:text-gray-100">
                                {stage.name}
                              </h3>
                              {stage.isDefault && (
                                <span className="flex items-center gap-1 text-xs bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400 px-2 py-0.5 rounded-full">
                                  <Star size={12} />
                                  Default
                                </span>
                              )}
                              {stage.isClosed && stage.isWon && (
                                <span className="flex items-center gap-1 text-xs bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 px-2 py-0.5 rounded-full">
                                  <Trophy size={12} />
                                  Ganado
                                </span>
                              )}
                              {stage.isClosed && !stage.isWon && (
                                <span className="flex items-center gap-1 text-xs bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 px-2 py-0.5 rounded-full">
                                  <XCircle size={12} />
                                  Perdido
                                </span>
                              )}
                            </div>
                            <p className="text-sm text-gray-500 dark:text-gray-400">
                              Probabilidad: {stage.probability}%
                            </p>
                          </div>

                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => handleToggleActive(stage)}
                              className={'px-3 py-1.5 rounded-lg text-sm font-medium transition ' +
                                (stage.isActive
                                  ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
                                  : 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400')}
                            >
                              {stage.isActive ? 'Activa' : 'Inactiva'}
                            </button>
                            <button
                              onClick={() => openEditModal(stage)}
                              className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-lg transition"
                            >
                              <Edit2 size={18} />
                            </button>
                            <button
                              onClick={() => setDeleteConfirm(stage._id)}
                              className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition"
                            >
                              <Trash2 size={18} />
                            </button>
                          </div>
                        </div>

                        {deleteConfirm === stage._id && (
                          <div className="border-t dark:border-gray-700 p-3 bg-red-50 dark:bg-red-900/20 flex items-center justify-between">
                            <span className="text-sm text-red-700 dark:text-red-400 flex items-center gap-2">
                              <AlertTriangle size={16} />
                              Eliminar esta etapa?
                            </span>
                            <div className="flex gap-2">
                              <button
                                onClick={() => setDeleteConfirm(null)}
                                className="px-3 py-1 text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700 rounded"
                              >
                                Cancelar
                              </button>
                              <button
                                onClick={() => handleDelete(stage._id)}
                                className="px-3 py-1 text-sm bg-red-600 text-white rounded hover:bg-red-700"
                              >
                                Eliminar
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </Draggable>
                ))}
                {provided.placeholder}
              </div>
            )}
          </Droppable>
        </DragDropContext>

        {stages.length === 0 && (
          <div className="text-center py-12 text-gray-500 dark:text-gray-400">
            No hay etapas configuradas. Crea la primera etapa del pipeline.
          </div>
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-md w-full">
            <div className="flex items-center justify-between p-4 border-b dark:border-gray-700">
              <h2 className="text-xl font-bold text-gray-800 dark:text-gray-100">
                {editingStage ? 'Editar Etapa' : 'Nueva Etapa'}
              </h2>
              <button
                onClick={() => setShowModal(false)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                <X size={24} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Nombre *
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                  placeholder="Ej: Propuesta Enviada"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Color
                </label>
                <div className="flex flex-wrap gap-2">
                  {PRESET_COLORS.map((color) => (
                    <button
                      key={color}
                      type="button"
                      onClick={() => setFormData({ ...formData, color })}
                      className={'w-8 h-8 rounded-full border-2 transition ' +
                        (formData.color === color
                          ? 'border-blue-500 scale-110'
                          : 'border-transparent hover:scale-105')}
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
                <div className="mt-2 flex items-center gap-2">
                  <input
                    type="color"
                    value={formData.color}
                    onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                    className="w-10 h-10 rounded cursor-pointer"
                  />
                  <input
                    type="text"
                    value={formData.color}
                    onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                    className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-sm"
                    placeholder="#000000"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Probabilidad de cierre (%)
                </label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={formData.probability}
                  onChange={(e) => setFormData({ ...formData, probability: Number(e.target.value) })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                />
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  Se usa para calcular el valor ponderado del pipeline
                </p>
              </div>

              <div className="space-y-3 pt-2">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.isDefault}
                    onChange={(e) => setFormData({ ...formData, isDefault: e.target.checked })}
                    className="w-5 h-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <div>
                    <span className="font-medium text-gray-700 dark:text-gray-300">Etapa por defecto</span>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      Los nuevos deals empiezan en esta etapa
                    </p>
                  </div>
                </label>

                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.isClosed}
                    onChange={(e) => {
                      const isClosed = e.target.checked;
                      setFormData({
                        ...formData,
                        isClosed,
                        isWon: isClosed ? formData.isWon : false,
                        probability: isClosed ? (formData.isWon ? 100 : 0) : formData.probability,
                      });
                    }}
                    className="w-5 h-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <div>
                    <span className="font-medium text-gray-700 dark:text-gray-300">Etapa de cierre</span>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      Marca el deal como finalizado
                    </p>
                  </div>
                </label>

                {formData.isClosed && (
                  <label className="flex items-center gap-3 cursor-pointer ml-8">
                    <input
                      type="checkbox"
                      checked={formData.isWon}
                      onChange={(e) => setFormData({
                        ...formData,
                        isWon: e.target.checked,
                        probability: e.target.checked ? 100 : 0,
                      })}
                      className="w-5 h-5 rounded border-gray-300 text-green-600 focus:ring-green-500"
                    />
                    <div>
                      <span className="font-medium text-gray-700 dark:text-gray-300 flex items-center gap-1">
                        <Trophy size={16} className="text-green-500" />
                        Deal ganado
                      </span>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        Si no se marca, se considera perdido
                      </p>
                    </div>
                  </label>
                )}
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t dark:border-gray-700">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
                  {saving ? (
                    <Loader2 size={18} className="animate-spin" />
                  ) : (
                    <Check size={18} />
                  )}
                  {editingStage ? 'Guardar Cambios' : 'Crear Etapa'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
