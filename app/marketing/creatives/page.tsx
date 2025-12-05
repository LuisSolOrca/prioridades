'use client';

export const dynamic = 'force-dynamic';

import { useState, useEffect, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import CreativeBuilder, { ICreativeData } from '@/components/marketing/CreativeBuilder';
import {
  Plus,
  Search,
  Image as ImageIcon,
  Video,
  LayoutGrid,
  MoreVertical,
  Edit2,
  Trash2,
  Copy,
  Eye,
  X,
  Filter,
  ChevronDown,
  GripVertical,
  Smartphone,
} from 'lucide-react';

interface Creative {
  _id: string;
  name: string;
  description?: string;
  type: string;
  status: string;
  platforms: string[];
  aspectRatio: string;
  primaryAsset?: {
    type: string;
    url: string;
    thumbnailUrl?: string;
  };
  carouselSlides?: Array<{
    id: string;
    asset: { type: string; url: string };
    order: number;
  }>;
  headline?: string;
  callToAction?: string;
  usageCount: number;
  createdBy: { name: string };
  createdAt: string;
  updatedAt: string;
}

const TYPE_ICONS: Record<string, typeof ImageIcon> = {
  IMAGE: ImageIcon,
  VIDEO: Video,
  CAROUSEL: GripVertical,
  STORY: Smartphone,
  REEL: Smartphone,
};

const TYPE_LABELS: Record<string, string> = {
  IMAGE: 'Imagen',
  VIDEO: 'Video',
  CAROUSEL: 'Carrusel',
  STORY: 'Story',
  REEL: 'Reel',
};

const STATUS_BADGES: Record<string, { color: string; label: string }> = {
  DRAFT: { color: 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300', label: 'Borrador' },
  READY: { color: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400', label: 'Listo' },
  IN_USE: { color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400', label: 'En uso' },
  ARCHIVED: { color: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400', label: 'Archivado' },
};

const DEFAULT_CREATIVE: ICreativeData = {
  type: 'IMAGE',
  aspectRatio: '1:1',
  textOverlays: [],
};

export default function CreativesPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [creatives, setCreatives] = useState<Creative[]>([]);
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState<string>('');
  const [filterStatus, setFilterStatus] = useState<string>('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState<Creative | null>(null);
  const [editingCreative, setEditingCreative] = useState<Creative | null>(null);
  const [menuOpen, setMenuOpen] = useState<string | null>(null);

  // New creative form state
  const [newCreativeName, setNewCreativeName] = useState('');
  const [newCreativeDescription, setNewCreativeDescription] = useState('');
  const [newCreativeData, setNewCreativeData] = useState<ICreativeData>(DEFAULT_CREATIVE);
  const [saving, setSaving] = useState(false);

  const loadCreatives = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (search) params.set('search', search);
      if (filterType) params.set('type', filterType);
      if (filterStatus) params.set('status', filterStatus);

      const response = await fetch(`/api/marketing/creatives?${params}`);
      const data = await response.json();
      setCreatives(data.creatives || []);
    } catch (error) {
      console.error('Error loading creatives:', error);
    } finally {
      setLoading(false);
    }
  }, [search, filterType, filterStatus]);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
      return;
    }
    if (status === 'authenticated') {
      loadCreatives();
    }
  }, [status, router, loadCreatives]);

  const handleCreateCreative = async () => {
    if (!newCreativeName) return;

    setSaving(true);
    try {
      const response = await fetch('/api/marketing/creatives', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newCreativeName,
          description: newCreativeDescription,
          ...newCreativeData,
        }),
      });

      if (response.ok) {
        setShowCreateModal(false);
        resetForm();
        loadCreatives();
      }
    } catch (error) {
      console.error('Error creating creative:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateCreative = async () => {
    if (!editingCreative) return;

    setSaving(true);
    try {
      const response = await fetch(`/api/marketing/creatives/${editingCreative._id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newCreativeName,
          description: newCreativeDescription,
          ...newCreativeData,
        }),
      });

      if (response.ok) {
        setEditingCreative(null);
        resetForm();
        loadCreatives();
      }
    } catch (error) {
      console.error('Error updating creative:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteCreative = async (id: string) => {
    if (!confirm('¿Estás seguro de eliminar este creativo?')) return;

    try {
      await fetch(`/api/marketing/creatives/${id}`, { method: 'DELETE' });
      loadCreatives();
    } catch (error) {
      console.error('Error deleting creative:', error);
    }
  };

  const handleDuplicateCreative = async (creative: Creative) => {
    try {
      await fetch('/api/marketing/creatives', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: `${creative.name} (copia)`,
          description: creative.description,
          type: creative.type,
          platforms: creative.platforms,
          aspectRatio: creative.aspectRatio,
          primaryAsset: creative.primaryAsset,
          carouselSlides: creative.carouselSlides,
          headline: creative.headline,
          callToAction: creative.callToAction,
        }),
      });
      loadCreatives();
    } catch (error) {
      console.error('Error duplicating creative:', error);
    }
  };

  const startEditing = (creative: Creative) => {
    setEditingCreative(creative);
    setNewCreativeName(creative.name);
    setNewCreativeDescription(creative.description || '');
    setNewCreativeData({
      type: creative.type as any,
      aspectRatio: creative.aspectRatio as any,
      primaryAsset: creative.primaryAsset as any,
      carouselSlides: creative.carouselSlides as any,
      headline: creative.headline,
      callToAction: creative.callToAction,
      textOverlays: [],
    });
    setMenuOpen(null);
  };

  const resetForm = () => {
    setNewCreativeName('');
    setNewCreativeDescription('');
    setNewCreativeData(DEFAULT_CREATIVE);
  };

  const getPreviewUrl = (creative: Creative): string | null => {
    if (creative.primaryAsset?.url) {
      return creative.primaryAsset.thumbnailUrl || creative.primaryAsset.url;
    }
    if (creative.carouselSlides && creative.carouselSlides.length > 0) {
      return creative.carouselSlides[0]?.asset?.url || null;
    }
    return null;
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
              Creativos
            </h1>
            <p className="text-gray-500 dark:text-gray-400 mt-1">
              Biblioteca de imágenes, videos y anuncios
            </p>
          </div>
          <button
            onClick={() => setShowCreateModal(true)}
            className="mt-4 sm:mt-0 flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            <Plus className="w-5 h-5" />
            Nuevo Creativo
          </button>
        </div>

        {/* Filters */}
        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 mb-6 shadow-sm">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar creativos..."
                className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
            </div>
            <div className="flex gap-2">
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              >
                <option value="">Todos los tipos</option>
                {Object.entries(TYPE_LABELS).map(([key, label]) => (
                  <option key={key} value={key}>{label}</option>
                ))}
              </select>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              >
                <option value="">Todos los estados</option>
                {Object.entries(STATUS_BADGES).map(([key, { label }]) => (
                  <option key={key} value={key}>{label}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Creatives Grid */}
        {creatives.length === 0 ? (
          <div className="bg-white dark:bg-gray-800 rounded-xl p-12 text-center shadow-sm">
            <LayoutGrid className="w-16 h-16 mx-auto text-gray-300 dark:text-gray-600 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
              No hay creativos
            </h3>
            <p className="text-gray-500 dark:text-gray-400 mb-4">
              Crea tu primer creativo para usar en tus campañas
            </p>
            <button
              onClick={() => setShowCreateModal(true)}
              className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              <Plus className="w-5 h-5" />
              Crear Creativo
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {creatives.map((creative) => {
              const TypeIcon = TYPE_ICONS[creative.type] || ImageIcon;
              const previewUrl = getPreviewUrl(creative);
              const statusBadge = STATUS_BADGES[creative.status] || STATUS_BADGES.DRAFT;

              return (
                <div
                  key={creative._id}
                  className="bg-white dark:bg-gray-800 rounded-xl overflow-hidden shadow-sm border border-gray-200 dark:border-gray-700 hover:shadow-md transition-shadow group"
                >
                  {/* Preview */}
                  <div className="aspect-square relative bg-gray-100 dark:bg-gray-700">
                    {previewUrl ? (
                      creative.primaryAsset?.type === 'video' ? (
                        <video
                          src={previewUrl}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <img
                          src={previewUrl}
                          alt={creative.name}
                          className="w-full h-full object-cover"
                        />
                      )
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <TypeIcon className="w-12 h-12 text-gray-300 dark:text-gray-600" />
                      </div>
                    )}

                    {/* Type badge */}
                    <div className="absolute top-2 left-2">
                      <span className="px-2 py-1 text-xs bg-black/50 text-white rounded flex items-center gap-1">
                        <TypeIcon className="w-3 h-3" />
                        {TYPE_LABELS[creative.type]}
                      </span>
                    </div>

                    {/* Carousel indicator */}
                    {creative.type === 'CAROUSEL' && creative.carouselSlides && (
                      <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1">
                        {creative.carouselSlides.slice(0, 5).map((_, i) => (
                          <div key={i} className="w-1.5 h-1.5 rounded-full bg-white/70" />
                        ))}
                        {creative.carouselSlides.length > 5 && (
                          <span className="text-xs text-white">+{creative.carouselSlides.length - 5}</span>
                        )}
                      </div>
                    )}

                    {/* Hover overlay */}
                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                      <button
                        onClick={() => setShowViewModal(creative)}
                        className="p-2 bg-white rounded-full text-gray-700 hover:bg-gray-100"
                      >
                        <Eye className="w-5 h-5" />
                      </button>
                      <button
                        onClick={() => startEditing(creative)}
                        className="p-2 bg-white rounded-full text-gray-700 hover:bg-gray-100"
                      >
                        <Edit2 className="w-5 h-5" />
                      </button>
                    </div>
                  </div>

                  {/* Info */}
                  <div className="p-3">
                    <div className="flex items-start justify-between">
                      <div className="min-w-0 flex-1">
                        <h3 className="font-medium text-gray-900 dark:text-white text-sm truncate">
                          {creative.name}
                        </h3>
                        <div className="flex items-center gap-2 mt-1">
                          <span className={`px-1.5 py-0.5 text-xs rounded ${statusBadge.color}`}>
                            {statusBadge.label}
                          </span>
                          {creative.usageCount > 0 && (
                            <span className="text-xs text-gray-500">
                              {creative.usageCount} uso{creative.usageCount !== 1 ? 's' : ''}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="relative">
                        <button
                          onClick={() => setMenuOpen(menuOpen === creative._id ? null : creative._id)}
                          className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
                        >
                          <MoreVertical className="w-4 h-4 text-gray-400" />
                        </button>
                        {menuOpen === creative._id && (
                          <>
                            <div
                              className="fixed inset-0 z-40"
                              onClick={() => setMenuOpen(null)}
                            />
                            <div className="absolute right-0 mt-1 w-36 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 z-50">
                              <button
                                onClick={() => {
                                  handleDuplicateCreative(creative);
                                  setMenuOpen(null);
                                }}
                                className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                              >
                                <Copy className="w-4 h-4" />
                                Duplicar
                              </button>
                              <button
                                onClick={() => {
                                  handleDeleteCreative(creative._id);
                                  setMenuOpen(null);
                                }}
                                className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
                              >
                                <Trash2 className="w-4 h-4" />
                                Eliminar
                              </button>
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* Create/Edit Modal */}
      {(showCreateModal || editingCreative) && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl w-full max-w-5xl max-h-[90vh] overflow-hidden shadow-xl">
            <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                {editingCreative ? 'Editar Creativo' : 'Nuevo Creativo'}
              </h2>
              <button
                onClick={() => {
                  setShowCreateModal(false);
                  setEditingCreative(null);
                  resetForm();
                }}
                className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto max-h-[calc(90vh-140px)]">
              <div className="space-y-6">
                {/* Basic Info */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Nombre *
                    </label>
                    <input
                      type="text"
                      value={newCreativeName}
                      onChange={(e) => setNewCreativeName(e.target.value)}
                      placeholder="Ej: Banner Black Friday"
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Descripción
                    </label>
                    <input
                      type="text"
                      value={newCreativeDescription}
                      onChange={(e) => setNewCreativeDescription(e.target.value)}
                      placeholder="Descripción opcional..."
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    />
                  </div>
                </div>

                {/* Creative Builder */}
                <CreativeBuilder
                  value={newCreativeData}
                  onChange={setNewCreativeData}
                  compact
                />
              </div>
            </div>

            <div className="p-4 border-t border-gray-200 dark:border-gray-700 flex justify-end gap-3">
              <button
                onClick={() => {
                  setShowCreateModal(false);
                  setEditingCreative(null);
                  resetForm();
                }}
                className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
              >
                Cancelar
              </button>
              <button
                onClick={editingCreative ? handleUpdateCreative : handleCreateCreative}
                disabled={!newCreativeName || saving}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
              >
                {saving && (
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                )}
                {editingCreative ? 'Guardar Cambios' : 'Crear Creativo'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* View Modal */}
      {showViewModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl w-full max-w-2xl overflow-hidden shadow-xl">
            <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                {showViewModal.name}
              </h2>
              <button
                onClick={() => setShowViewModal(null)}
                className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            <div className="p-6">
              {/* Preview */}
              <div className="aspect-square max-w-md mx-auto bg-gray-100 dark:bg-gray-700 rounded-lg overflow-hidden mb-4">
                {getPreviewUrl(showViewModal) ? (
                  <img
                    src={getPreviewUrl(showViewModal)!}
                    alt={showViewModal.name}
                    className="w-full h-full object-contain"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <ImageIcon className="w-16 h-16 text-gray-300" />
                  </div>
                )}
              </div>

              {/* Details */}
              <div className="space-y-3 text-sm">
                {showViewModal.headline && (
                  <div>
                    <span className="text-gray-500 dark:text-gray-400">Headline:</span>
                    <p className="text-gray-900 dark:text-white">{showViewModal.headline}</p>
                  </div>
                )}
                {showViewModal.callToAction && (
                  <div>
                    <span className="text-gray-500 dark:text-gray-400">CTA:</span>
                    <p className="text-gray-900 dark:text-white">{showViewModal.callToAction}</p>
                  </div>
                )}
                <div className="flex items-center gap-4 text-gray-500 dark:text-gray-400">
                  <span>Tipo: {TYPE_LABELS[showViewModal.type]}</span>
                  <span>Formato: {showViewModal.aspectRatio}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
