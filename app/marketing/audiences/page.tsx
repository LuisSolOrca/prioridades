'use client';

export const dynamic = 'force-dynamic';

import { useState, useEffect, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import AudienceBuilder, { IAudienceRules } from '@/components/marketing/AudienceBuilder';
import {
  Plus,
  Search,
  Users,
  MoreVertical,
  Edit2,
  Trash2,
  Copy,
  Eye,
  Target,
  X,
  Filter,
  ChevronDown,
} from 'lucide-react';

interface Audience {
  _id: string;
  name: string;
  description?: string;
  platforms: string[];
  rules: IAudienceRules;
  targeting: Record<string, any>;
  estimatedReach?: { min: number; max: number };
  usageCount: number;
  isTemplate: boolean;
  tags?: string[];
  createdBy: { name: string; email: string };
  createdAt: string;
  updatedAt: string;
}

const PLATFORM_COLORS: Record<string, string> = {
  META: '#1877F2',
  LINKEDIN: '#0A66C2',
  TWITTER: '#1DA1F2',
  TIKTOK: '#000000',
  YOUTUBE: '#FF0000',
  WHATSAPP: '#25D366',
};

const PLATFORM_NAMES: Record<string, string> = {
  META: 'Meta',
  LINKEDIN: 'LinkedIn',
  TWITTER: 'Twitter',
  TIKTOK: 'TikTok',
  YOUTUBE: 'YouTube',
  WHATSAPP: 'WhatsApp',
};

const DEFAULT_RULES: IAudienceRules = {
  operator: 'AND',
  groups: [
    {
      id: 'default-group',
      operator: 'AND',
      conditions: [],
    },
  ],
};

export default function AudiencesPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [audiences, setAudiences] = useState<Audience[]>([]);
  const [search, setSearch] = useState('');
  const [filterPlatform, setFilterPlatform] = useState<string>('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState<Audience | null>(null);
  const [editingAudience, setEditingAudience] = useState<Audience | null>(null);
  const [menuOpen, setMenuOpen] = useState<string | null>(null);

  // New audience form state
  const [newAudienceName, setNewAudienceName] = useState('');
  const [newAudienceDescription, setNewAudienceDescription] = useState('');
  const [newAudiencePlatforms, setNewAudiencePlatforms] = useState<string[]>([
    'META', 'LINKEDIN', 'TWITTER', 'TIKTOK', 'YOUTUBE', 'WHATSAPP'
  ]);
  const [newAudienceRules, setNewAudienceRules] = useState<IAudienceRules>(DEFAULT_RULES);
  const [saving, setSaving] = useState(false);

  const loadAudiences = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (search) params.set('search', search);
      if (filterPlatform) params.set('platform', filterPlatform);

      const response = await fetch(`/api/marketing/audiences?${params}`);
      const data = await response.json();
      setAudiences(data.audiences || []);
    } catch (error) {
      console.error('Error loading audiences:', error);
    } finally {
      setLoading(false);
    }
  }, [search, filterPlatform]);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
      return;
    }
    if (status === 'authenticated') {
      loadAudiences();
    }
  }, [status, router, loadAudiences]);

  const handleCreateAudience = async () => {
    if (!newAudienceName) return;

    setSaving(true);
    try {
      const response = await fetch('/api/marketing/audiences', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newAudienceName,
          description: newAudienceDescription,
          platforms: newAudiencePlatforms,
          rules: newAudienceRules,
        }),
      });

      if (response.ok) {
        setShowCreateModal(false);
        resetForm();
        loadAudiences();
      }
    } catch (error) {
      console.error('Error creating audience:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateAudience = async () => {
    if (!editingAudience) return;

    setSaving(true);
    try {
      const response = await fetch(`/api/marketing/audiences/${editingAudience._id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newAudienceName,
          description: newAudienceDescription,
          platforms: newAudiencePlatforms,
          rules: newAudienceRules,
        }),
      });

      if (response.ok) {
        setEditingAudience(null);
        resetForm();
        loadAudiences();
      }
    } catch (error) {
      console.error('Error updating audience:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteAudience = async (id: string) => {
    if (!confirm('¿Estás seguro de eliminar esta audiencia?')) return;

    try {
      await fetch(`/api/marketing/audiences/${id}`, { method: 'DELETE' });
      loadAudiences();
    } catch (error) {
      console.error('Error deleting audience:', error);
    }
  };

  const handleDuplicateAudience = async (audience: Audience) => {
    try {
      await fetch('/api/marketing/audiences', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: `${audience.name} (copia)`,
          description: audience.description,
          platforms: audience.platforms,
          rules: audience.rules,
        }),
      });
      loadAudiences();
    } catch (error) {
      console.error('Error duplicating audience:', error);
    }
  };

  const startEditing = (audience: Audience) => {
    setEditingAudience(audience);
    setNewAudienceName(audience.name);
    setNewAudienceDescription(audience.description || '');
    setNewAudiencePlatforms(audience.platforms);
    setNewAudienceRules(audience.rules);
    setMenuOpen(null);
  };

  const resetForm = () => {
    setNewAudienceName('');
    setNewAudienceDescription('');
    setNewAudiencePlatforms(['META', 'LINKEDIN', 'TWITTER', 'TIKTOK', 'YOUTUBE', 'WHATSAPP']);
    setNewAudienceRules(DEFAULT_RULES);
  };

  const togglePlatform = (platform: string) => {
    setNewAudiencePlatforms((prev) =>
      prev.includes(platform)
        ? prev.filter((p) => p !== platform)
        : [...prev, platform]
    );
  };

  const getConditionsSummary = (rules: IAudienceRules): string => {
    const totalConditions = rules.groups.reduce((sum, g) => sum + g.conditions.length, 0);
    return `${rules.groups.length} grupo${rules.groups.length !== 1 ? 's' : ''}, ${totalConditions} condición${totalConditions !== 1 ? 'es' : ''}`;
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
              Audiencias
            </h1>
            <p className="text-gray-500 dark:text-gray-400 mt-1">
              Crea y gestiona segmentos de audiencia reutilizables
            </p>
          </div>
          <button
            onClick={() => setShowCreateModal(true)}
            className="mt-4 sm:mt-0 flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            <Plus className="w-5 h-5" />
            Nueva Audiencia
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
                placeholder="Buscar audiencias..."
                className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
            </div>
            <div className="relative">
              <select
                value={filterPlatform}
                onChange={(e) => setFilterPlatform(e.target.value)}
                className="appearance-none pl-10 pr-10 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              >
                <option value="">Todas las plataformas</option>
                {Object.entries(PLATFORM_NAMES).map(([key, name]) => (
                  <option key={key} value={key}>{name}</option>
                ))}
              </select>
              <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            </div>
          </div>
        </div>

        {/* Audiences Grid */}
        {audiences.length === 0 ? (
          <div className="bg-white dark:bg-gray-800 rounded-xl p-12 text-center shadow-sm">
            <Users className="w-16 h-16 mx-auto text-gray-300 dark:text-gray-600 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
              No hay audiencias
            </h3>
            <p className="text-gray-500 dark:text-gray-400 mb-4">
              Crea tu primera audiencia para segmentar tus campañas
            </p>
            <button
              onClick={() => setShowCreateModal(true)}
              className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              <Plus className="w-5 h-5" />
              Crear Audiencia
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {audiences.map((audience) => (
              <div
                key={audience._id}
                className="bg-white dark:bg-gray-800 rounded-xl p-5 shadow-sm border border-gray-200 dark:border-gray-700 hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-gray-900 dark:text-white truncate">
                      {audience.name}
                    </h3>
                    {audience.description && (
                      <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 line-clamp-2">
                        {audience.description}
                      </p>
                    )}
                  </div>
                  <div className="relative ml-2">
                    <button
                      onClick={() => setMenuOpen(menuOpen === audience._id ? null : audience._id)}
                      className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
                    >
                      <MoreVertical className="w-5 h-5 text-gray-400" />
                    </button>
                    {menuOpen === audience._id && (
                      <>
                        <div
                          className="fixed inset-0 z-40"
                          onClick={() => setMenuOpen(null)}
                        />
                        <div className="absolute right-0 mt-1 w-48 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 z-50">
                          <button
                            onClick={() => {
                              setShowViewModal(audience);
                              setMenuOpen(null);
                            }}
                            className="w-full flex items-center gap-2 px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                          >
                            <Eye className="w-4 h-4" />
                            Ver detalles
                          </button>
                          <button
                            onClick={() => startEditing(audience)}
                            className="w-full flex items-center gap-2 px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                          >
                            <Edit2 className="w-4 h-4" />
                            Editar
                          </button>
                          <button
                            onClick={() => {
                              handleDuplicateAudience(audience);
                              setMenuOpen(null);
                            }}
                            className="w-full flex items-center gap-2 px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                          >
                            <Copy className="w-4 h-4" />
                            Duplicar
                          </button>
                          <button
                            onClick={() => {
                              handleDeleteAudience(audience._id);
                              setMenuOpen(null);
                            }}
                            className="w-full flex items-center gap-2 px-4 py-2 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
                          >
                            <Trash2 className="w-4 h-4" />
                            Eliminar
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                </div>

                {/* Platforms */}
                <div className="flex flex-wrap gap-1 mb-3">
                  {audience.platforms.map((platform) => (
                    <span
                      key={platform}
                      className="px-2 py-0.5 text-xs rounded text-white"
                      style={{ backgroundColor: PLATFORM_COLORS[platform] || '#6B7280' }}
                    >
                      {PLATFORM_NAMES[platform] || platform}
                    </span>
                  ))}
                </div>

                {/* Stats */}
                <div className="flex items-center gap-4 text-sm text-gray-500 dark:text-gray-400">
                  <span className="flex items-center gap-1">
                    <Target className="w-4 h-4" />
                    {getConditionsSummary(audience.rules)}
                  </span>
                  {audience.usageCount > 0 && (
                    <span>
                      Usado {audience.usageCount}x
                    </span>
                  )}
                </div>

                {/* Estimated Reach */}
                {audience.estimatedReach && (
                  <div className="mt-3 pt-3 border-t border-gray-100 dark:border-gray-700">
                    <p className="text-xs text-gray-500 dark:text-gray-400">Alcance estimado</p>
                    <p className="text-sm font-medium text-gray-900 dark:text-white">
                      {audience.estimatedReach.min.toLocaleString()} - {audience.estimatedReach.max.toLocaleString()}
                    </p>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Create/Edit Modal */}
      {(showCreateModal || editingAudience) && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl w-full max-w-4xl max-h-[90vh] overflow-hidden shadow-xl">
            <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                {editingAudience ? 'Editar Audiencia' : 'Nueva Audiencia'}
              </h2>
              <button
                onClick={() => {
                  setShowCreateModal(false);
                  setEditingAudience(null);
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
                      value={newAudienceName}
                      onChange={(e) => setNewAudienceName(e.target.value)}
                      placeholder="Ej: Profesionales de tecnología"
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Descripción
                    </label>
                    <input
                      type="text"
                      value={newAudienceDescription}
                      onChange={(e) => setNewAudienceDescription(e.target.value)}
                      placeholder="Descripción opcional..."
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    />
                  </div>
                </div>

                {/* Platforms */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Plataformas compatibles
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {Object.entries(PLATFORM_NAMES).map(([key, name]) => (
                      <button
                        key={key}
                        onClick={() => togglePlatform(key)}
                        className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                          newAudiencePlatforms.includes(key)
                            ? 'text-white'
                            : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400'
                        }`}
                        style={
                          newAudiencePlatforms.includes(key)
                            ? { backgroundColor: PLATFORM_COLORS[key] }
                            : {}
                        }
                      >
                        {name}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Audience Builder */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Reglas de Segmentación
                  </label>
                  <AudienceBuilder
                    value={newAudienceRules}
                    onChange={setNewAudienceRules}
                    compact
                  />
                </div>
              </div>
            </div>

            <div className="p-4 border-t border-gray-200 dark:border-gray-700 flex justify-end gap-3">
              <button
                onClick={() => {
                  setShowCreateModal(false);
                  setEditingAudience(null);
                  resetForm();
                }}
                className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
              >
                Cancelar
              </button>
              <button
                onClick={editingAudience ? handleUpdateAudience : handleCreateAudience}
                disabled={!newAudienceName || saving}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
              >
                {saving && (
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                )}
                {editingAudience ? 'Guardar Cambios' : 'Crear Audiencia'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* View Modal */}
      {showViewModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl w-full max-w-3xl max-h-[90vh] overflow-hidden shadow-xl">
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

            <div className="p-6 overflow-y-auto max-h-[calc(90vh-80px)]">
              {showViewModal.description && (
                <p className="text-gray-600 dark:text-gray-400 mb-4">
                  {showViewModal.description}
                </p>
              )}

              <div className="mb-4">
                <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Plataformas
                </h4>
                <div className="flex flex-wrap gap-1">
                  {showViewModal.platforms.map((platform) => (
                    <span
                      key={platform}
                      className="px-2 py-1 text-xs rounded text-white"
                      style={{ backgroundColor: PLATFORM_COLORS[platform] || '#6B7280' }}
                    >
                      {PLATFORM_NAMES[platform] || platform}
                    </span>
                  ))}
                </div>
              </div>

              <div>
                <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Reglas de Segmentación
                </h4>
                <AudienceBuilder
                  value={showViewModal.rules}
                  onChange={() => {}}
                  compact
                />
              </div>

              <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700 text-sm text-gray-500 dark:text-gray-400">
                <p>Creado por {showViewModal.createdBy?.name || 'Usuario'}</p>
                <p>Usado en {showViewModal.usageCount} campañas</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
