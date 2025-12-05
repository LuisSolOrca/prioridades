'use client';

export const dynamic = 'force-dynamic';

import { useState, useEffect, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter, useParams } from 'next/navigation';
import {
  ArrowLeft,
  Save,
  X,
  Plus,
  AlertCircle,
  Loader2,
} from 'lucide-react';

const PLATFORMS = [
  { id: 'META', name: 'Meta (Facebook/Instagram)', icon: '📘' },
  { id: 'LINKEDIN', name: 'LinkedIn', icon: '💼' },
  { id: 'TWITTER', name: 'Twitter/X', icon: '🐦' },
  { id: 'TIKTOK', name: 'TikTok', icon: '🎵' },
  { id: 'YOUTUBE', name: 'YouTube', icon: '▶️' },
  { id: 'WHATSAPP', name: 'WhatsApp', icon: '💬' },
];

const OBJECTIVES = [
  { id: 'AWARENESS', name: 'Reconocimiento' },
  { id: 'TRAFFIC', name: 'Tráfico' },
  { id: 'ENGAGEMENT', name: 'Interacción' },
  { id: 'LEADS', name: 'Leads' },
  { id: 'CONVERSIONS', name: 'Conversiones' },
  { id: 'MESSAGES', name: 'Mensajes' },
  { id: 'VIDEO_VIEWS', name: 'Vistas de Video' },
];

const STATUSES = [
  { id: 'DRAFT', name: 'Borrador' },
  { id: 'ACTIVE', name: 'Activa' },
  { id: 'PAUSED', name: 'Pausada' },
  { id: 'COMPLETED', name: 'Completada' },
  { id: 'ARCHIVED', name: 'Archivada' },
];

interface FormData {
  name: string;
  description: string;
  platform: string;
  objective: string;
  status: string;
  budgetType: 'DAILY' | 'LIFETIME';
  budget: number;
  currency: string;
  startDate: string;
  endDate: string;
  targeting: {
    locations: string[];
    ageMin: number;
    ageMax: number;
    genders: string[];
    interests: string[];
  };
  tags: string[];
}

export default function EditCampaignPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const params = useParams();
  const campaignId = params?.id as string;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [newTag, setNewTag] = useState('');
  const [newLocation, setNewLocation] = useState('');
  const [newInterest, setNewInterest] = useState('');

  const [formData, setFormData] = useState<FormData>({
    name: '',
    description: '',
    platform: '',
    objective: '',
    status: 'DRAFT',
    budgetType: 'DAILY',
    budget: 0,
    currency: 'MXN',
    startDate: '',
    endDate: '',
    targeting: {
      locations: [],
      ageMin: 18,
      ageMax: 65,
      genders: ['all'],
      interests: [],
    },
    tags: [],
  });

  const loadCampaign = useCallback(async () => {
    if (!campaignId) return;

    try {
      setLoading(true);
      const response = await fetch(`/api/marketing/campaigns/${campaignId}`);

      if (!response.ok) {
        throw new Error('Campaign not found');
      }

      const campaign = await response.json();

      setFormData({
        name: campaign.name || '',
        description: campaign.description || '',
        platform: campaign.platform || '',
        objective: campaign.objective || '',
        status: campaign.status || 'DRAFT',
        budgetType: campaign.budgetType || 'DAILY',
        budget: campaign.budget || 0,
        currency: campaign.currency || 'MXN',
        startDate: campaign.startDate ? campaign.startDate.split('T')[0] : '',
        endDate: campaign.endDate ? campaign.endDate.split('T')[0] : '',
        targeting: {
          locations: campaign.targeting?.locations || [],
          ageMin: campaign.targeting?.ageMin || 18,
          ageMax: campaign.targeting?.ageMax || 65,
          genders: campaign.targeting?.genders || ['all'],
          interests: campaign.targeting?.interests || [],
        },
        tags: campaign.tags || [],
      });
    } catch (err) {
      console.error('Error loading campaign:', err);
      setError('Error al cargar la campaña');
    } finally {
      setLoading(false);
    }
  }, [campaignId]);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
      return;
    }

    if (status === 'authenticated') {
      loadCampaign();
    }
  }, [status, router, loadCampaign]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name || !formData.platform || !formData.objective) {
      setError('Por favor completa todos los campos requeridos');
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const response = await fetch(`/api/marketing/campaigns/${campaignId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...formData,
          startDate: formData.startDate || undefined,
          endDate: formData.endDate || undefined,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Error al actualizar la campaña');
      }

      router.push(`/marketing/campaigns/${campaignId}`);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const addTag = () => {
    if (newTag && !formData.tags.includes(newTag)) {
      setFormData({ ...formData, tags: [...formData.tags, newTag] });
      setNewTag('');
    }
  };

  const removeTag = (tag: string) => {
    setFormData({ ...formData, tags: formData.tags.filter((t) => t !== tag) });
  };

  const addLocation = () => {
    if (newLocation && !formData.targeting.locations.includes(newLocation)) {
      setFormData({
        ...formData,
        targeting: {
          ...formData.targeting,
          locations: [...formData.targeting.locations, newLocation],
        },
      });
      setNewLocation('');
    }
  };

  const removeLocation = (location: string) => {
    setFormData({
      ...formData,
      targeting: {
        ...formData.targeting,
        locations: formData.targeting.locations.filter((l) => l !== location),
      },
    });
  };

  const addInterest = () => {
    if (newInterest && !formData.targeting.interests.includes(newInterest)) {
      setFormData({
        ...formData,
        targeting: {
          ...formData.targeting,
          interests: [...formData.targeting.interests, newInterest],
        },
      });
      setNewInterest('');
    }
  };

  const removeInterest = (interest: string) => {
    setFormData({
      ...formData,
      targeting: {
        ...formData.targeting,
        interests: formData.targeting.interests.filter((i) => i !== interest),
      },
    });
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

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <button
            onClick={() => router.back()}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg"
          >
            <ArrowLeft className="w-5 h-5 text-gray-600 dark:text-gray-400" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              Editar Campaña
            </h1>
            <p className="text-gray-500 dark:text-gray-400">{formData.name}</p>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg flex items-center gap-3 text-red-700 dark:text-red-400">
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            <span>{error}</span>
            <button onClick={() => setError(null)} className="ml-auto">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Info */}
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Información Básica
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Nombre de la Campaña *
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  required
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Descripción
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={3}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Plataforma *
                </label>
                <select
                  value={formData.platform}
                  onChange={(e) => setFormData({ ...formData, platform: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  required
                >
                  <option value="">Seleccionar...</option>
                  {PLATFORMS.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.icon} {p.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Objetivo *
                </label>
                <select
                  value={formData.objective}
                  onChange={(e) => setFormData({ ...formData, objective: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  required
                >
                  <option value="">Seleccionar...</option>
                  {OBJECTIVES.map((o) => (
                    <option key={o.id} value={o.id}>
                      {o.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Estado
                </label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                >
                  {STATUSES.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Budget */}
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Presupuesto y Fechas
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Tipo de Presupuesto
                </label>
                <select
                  value={formData.budgetType}
                  onChange={(e) =>
                    setFormData({ ...formData, budgetType: e.target.value as 'DAILY' | 'LIFETIME' })
                  }
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                >
                  <option value="DAILY">Diario</option>
                  <option value="LIFETIME">Total</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Presupuesto ({formData.currency})
                </label>
                <input
                  type="number"
                  value={formData.budget || ''}
                  onChange={(e) =>
                    setFormData({ ...formData, budget: parseFloat(e.target.value) || 0 })
                  }
                  min={0}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Fecha de Inicio
                </label>
                <input
                  type="date"
                  value={formData.startDate}
                  onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Fecha de Fin
                </label>
                <input
                  type="date"
                  value={formData.endDate}
                  onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>
            </div>
          </div>

          {/* Targeting */}
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Segmentación
            </h2>

            <div className="space-y-6">
              {/* Locations */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Ubicaciones
                </label>
                <div className="flex gap-2 mb-2 flex-wrap">
                  {formData.targeting.locations.map((location) => (
                    <span
                      key={location}
                      className="px-3 py-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 rounded-full text-sm flex items-center gap-1"
                    >
                      {location}
                      <button type="button" onClick={() => removeLocation(location)}>
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                </div>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newLocation}
                    onChange={(e) => setNewLocation(e.target.value)}
                    placeholder="Agregar ubicación"
                    onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addLocation())}
                    className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                  <button
                    type="button"
                    onClick={addLocation}
                    className="px-4 py-2 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600"
                  >
                    <Plus className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Age Range */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Edad Mínima
                  </label>
                  <input
                    type="number"
                    value={formData.targeting.ageMin}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        targeting: {
                          ...formData.targeting,
                          ageMin: parseInt(e.target.value) || 18,
                        },
                      })
                    }
                    min={13}
                    max={65}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Edad Máxima
                  </label>
                  <input
                    type="number"
                    value={formData.targeting.ageMax}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        targeting: {
                          ...formData.targeting,
                          ageMax: parseInt(e.target.value) || 65,
                        },
                      })
                    }
                    min={13}
                    max={65}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                </div>
              </div>

              {/* Gender */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Género
                </label>
                <div className="flex gap-3">
                  {[
                    { id: 'all', label: 'Todos' },
                    { id: 'male', label: 'Hombres' },
                    { id: 'female', label: 'Mujeres' },
                  ].map((gender) => (
                    <button
                      key={gender.id}
                      type="button"
                      onClick={() =>
                        setFormData({
                          ...formData,
                          targeting: { ...formData.targeting, genders: [gender.id] },
                        })
                      }
                      className={`px-4 py-2 rounded-lg border-2 transition-all ${
                        formData.targeting.genders.includes(gender.id)
                          ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400'
                          : 'border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400'
                      }`}
                    >
                      {gender.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Interests */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Intereses
                </label>
                <div className="flex gap-2 mb-2 flex-wrap">
                  {formData.targeting.interests.map((interest) => (
                    <span
                      key={interest}
                      className="px-3 py-1 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400 rounded-full text-sm flex items-center gap-1"
                    >
                      {interest}
                      <button type="button" onClick={() => removeInterest(interest)}>
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                </div>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newInterest}
                    onChange={(e) => setNewInterest(e.target.value)}
                    placeholder="Agregar interés"
                    onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addInterest())}
                    className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                  <button
                    type="button"
                    onClick={addInterest}
                    className="px-4 py-2 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600"
                  >
                    <Plus className="w-5 h-5" />
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Tags */}
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Etiquetas
            </h2>

            <div className="flex gap-2 mb-2 flex-wrap">
              {formData.tags.map((tag) => (
                <span
                  key={tag}
                  className="px-3 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 rounded-full text-sm flex items-center gap-1"
                >
                  {tag}
                  <button type="button" onClick={() => removeTag(tag)}>
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                value={newTag}
                onChange={(e) => setNewTag(e.target.value)}
                placeholder="Agregar etiqueta"
                onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addTag())}
                className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
              <button
                type="button"
                onClick={addTag}
                className="px-4 py-2 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600"
              >
                <Plus className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-4">
            <button
              type="button"
              onClick={() => router.back()}
              className="px-6 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2 disabled:opacity-50"
            >
              {saving ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <Save className="w-5 h-5" />
              )}
              Guardar Cambios
            </button>
          </div>
        </form>
      </main>
    </div>
  );
}
