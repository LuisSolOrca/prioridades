'use client';

export const dynamic = 'force-dynamic';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  Save,
  Target,
  DollarSign,
  Calendar,
  Users,
  Image,
  Plus,
  X,
  AlertCircle,
  Library,
  Sparkles,
} from 'lucide-react';
import AudienceBuilder, { IAudienceRules } from '@/components/marketing/AudienceBuilder';
import CreativeBuilder, { ICreativeData } from '@/components/marketing/CreativeBuilder';

const PLATFORMS = [
  { id: 'META', name: 'Meta (Facebook/Instagram)', icon: '📘', color: '#1877F2' },
  { id: 'LINKEDIN', name: 'LinkedIn', icon: '💼', color: '#0A66C2' },
  { id: 'TWITTER', name: 'Twitter/X', icon: '🐦', color: '#1DA1F2' },
  { id: 'TIKTOK', name: 'TikTok', icon: '🎵', color: '#000000' },
  { id: 'YOUTUBE', name: 'YouTube', icon: '▶️', color: '#FF0000' },
  { id: 'WHATSAPP', name: 'WhatsApp', icon: '💬', color: '#25D366' },
];

const OBJECTIVES = [
  { id: 'AWARENESS', name: 'Reconocimiento', description: 'Aumentar el alcance de tu marca' },
  { id: 'TRAFFIC', name: 'Tráfico', description: 'Dirigir visitantes a tu sitio web' },
  { id: 'ENGAGEMENT', name: 'Interacción', description: 'Obtener más likes, comentarios y compartidos' },
  { id: 'LEADS', name: 'Leads', description: 'Capturar información de contacto' },
  { id: 'CONVERSIONS', name: 'Conversiones', description: 'Impulsar ventas o acciones específicas' },
  { id: 'MESSAGES', name: 'Mensajes', description: 'Iniciar conversaciones con clientes' },
  { id: 'VIDEO_VIEWS', name: 'Vistas de Video', description: 'Maximizar visualizaciones de video' },
];

interface SavedAudience {
  _id: string;
  name: string;
  description?: string;
  platforms: string[];
  rules: IAudienceRules;
  targeting: Record<string, any>;
}

interface FormData {
  name: string;
  description: string;
  platform: string;
  objective: string;
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
  audienceRules: IAudienceRules;
  savedAudienceId?: string;
  creativeData: ICreativeData;
  savedCreativeId?: string;
  tags: string[];
}

export default function NewCampaignPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [step, setStep] = useState(1);
  const [newTag, setNewTag] = useState('');
  const [newLocation, setNewLocation] = useState('');
  const [newInterest, setNewInterest] = useState('');
  const [audienceMode, setAudienceMode] = useState<'builder' | 'saved'>('builder');
  const [savedAudiences, setSavedAudiences] = useState<SavedAudience[]>([]);
  const [loadingAudiences, setLoadingAudiences] = useState(false);
  const [creativeMode, setCreativeMode] = useState<'builder' | 'saved'>('builder');
  const [savedCreatives, setSavedCreatives] = useState<any[]>([]);
  const [loadingCreatives, setLoadingCreatives] = useState(false);

  const DEFAULT_AUDIENCE_RULES: IAudienceRules = {
    operator: 'AND',
    groups: [
      {
        id: 'default-group',
        operator: 'AND',
        conditions: [],
      },
    ],
  };

  const DEFAULT_CREATIVE_DATA: ICreativeData = {
    type: 'IMAGE',
    aspectRatio: '1:1',
    textOverlays: [],
  };

  const [formData, setFormData] = useState<FormData>({
    name: '',
    description: '',
    platform: '',
    objective: '',
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
    audienceRules: DEFAULT_AUDIENCE_RULES,
    creativeData: DEFAULT_CREATIVE_DATA,
    tags: [],
  });

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
    }
  }, [status, router]);

  // Load saved audiences when reaching step 4
  useEffect(() => {
    if (step === 4 && savedAudiences.length === 0 && formData.platform) {
      loadSavedAudiences();
    }
  }, [step, formData.platform]);

  const loadSavedAudiences = async () => {
    setLoadingAudiences(true);
    try {
      const response = await fetch(`/api/marketing/audiences?platform=${formData.platform}`);
      const data = await response.json();
      setSavedAudiences(data.audiences || []);
    } catch (error) {
      console.error('Error loading audiences:', error);
    } finally {
      setLoadingAudiences(false);
    }
  };

  const selectSavedAudience = (audience: SavedAudience) => {
    setFormData({
      ...formData,
      savedAudienceId: audience._id,
      audienceRules: audience.rules,
      targeting: {
        locations: audience.targeting?.locations || [],
        ageMin: audience.targeting?.ageMin || 18,
        ageMax: audience.targeting?.ageMax || 65,
        genders: audience.targeting?.genders || ['all'],
        interests: audience.targeting?.interests || [],
      },
    });
  };

  // Load saved creatives when reaching step 5
  useEffect(() => {
    if (step === 5 && savedCreatives.length === 0) {
      loadSavedCreatives();
    }
  }, [step]);

  const loadSavedCreatives = async () => {
    setLoadingCreatives(true);
    try {
      const response = await fetch('/api/marketing/creatives?status=READY');
      const data = await response.json();
      setSavedCreatives(data.creatives || []);
    } catch (error) {
      console.error('Error loading creatives:', error);
    } finally {
      setLoadingCreatives(false);
    }
  };

  const selectSavedCreative = (creative: any) => {
    setFormData({
      ...formData,
      savedCreativeId: creative._id,
      creativeData: {
        type: creative.type,
        aspectRatio: creative.aspectRatio,
        primaryAsset: creative.primaryAsset,
        carouselSlides: creative.carouselSlides,
        headline: creative.headline,
        bodyText: creative.bodyText,
        callToAction: creative.callToAction,
        linkUrl: creative.linkUrl,
        textOverlays: creative.textOverlays || [],
      },
    });
  };

  const handleSubmit = async () => {
    if (!formData.name || !formData.platform || !formData.objective || !formData.budget) {
      setError('Por favor completa todos los campos requeridos');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/marketing/campaigns', {
        method: 'POST',
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
        throw new Error(data.error || 'Error al crear la campaña');
      }

      const campaign = await response.json();
      router.push(`/marketing/campaigns/${campaign._id}`);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const addTag = () => {
    if (newTag && !formData.tags.includes(newTag)) {
      setFormData({ ...formData, tags: [...formData.tags, newTag] });
      setNewTag('');
    }
  };

  const removeTag = (tag: string) => {
    setFormData({ ...formData, tags: formData.tags.filter(t => t !== tag) });
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
        locations: formData.targeting.locations.filter(l => l !== location),
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
        interests: formData.targeting.interests.filter(i => i !== interest),
      },
    });
  };

  if (status === 'loading') {
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
              Nueva Campaña
            </h1>
            <p className="text-gray-500 dark:text-gray-400">
              Configura y lanza una nueva campaña de marketing
            </p>
          </div>
        </div>

        {/* Progress Steps */}
        <div className="flex items-center justify-between mb-8 overflow-x-auto pb-2">
          {[
            { num: 1, label: 'Plataforma' },
            { num: 2, label: 'Objetivo' },
            { num: 3, label: 'Presupuesto' },
            { num: 4, label: 'Audiencia' },
            { num: 5, label: 'Creativo' },
            { num: 6, label: 'Revisar' },
          ].map((s, idx) => (
            <div key={s.num} className="flex items-center flex-shrink-0">
              <button
                onClick={() => setStep(s.num)}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-colors ${
                  step === s.num
                    ? 'bg-blue-600 text-white'
                    : step > s.num
                    ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                    : 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400'
                }`}
              >
                <span className="w-5 h-5 rounded-full bg-white/20 flex items-center justify-center text-xs">
                  {s.num}
                </span>
                <span className="hidden sm:inline text-sm">{s.label}</span>
              </button>
              {idx < 5 && (
                <div className="w-6 h-0.5 bg-gray-200 dark:bg-gray-700 mx-1"></div>
              )}
            </div>
          ))}
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

        {/* Step Content */}
        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm">
          {/* Step 1: Platform */}
          {step === 1 && (
            <div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                Selecciona la Plataforma
              </h2>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {PLATFORMS.map((platform) => (
                  <button
                    key={platform.id}
                    onClick={() => setFormData({ ...formData, platform: platform.id })}
                    className={`p-4 rounded-xl border-2 transition-all ${
                      formData.platform === platform.id
                        ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                        : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                    }`}
                  >
                    <div className="text-3xl mb-2">{platform.icon}</div>
                    <div className="font-medium text-gray-900 dark:text-white">
                      {platform.name}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Step 2: Objective */}
          {step === 2 && (
            <div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                Define el Objetivo
              </h2>
              <div className="space-y-3">
                {OBJECTIVES.map((objective) => (
                  <button
                    key={objective.id}
                    onClick={() => setFormData({ ...formData, objective: objective.id })}
                    className={`w-full p-4 rounded-xl border-2 text-left transition-all ${
                      formData.objective === objective.id
                        ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                        : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                    }`}
                  >
                    <div className="font-medium text-gray-900 dark:text-white">
                      {objective.name}
                    </div>
                    <div className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                      {objective.description}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Step 3: Budget */}
          {step === 3 && (
            <div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                Configura el Presupuesto
              </h2>
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Nombre de la Campaña *
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Ej: Campaña Black Friday 2024"
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Descripción
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Describe el objetivo de tu campaña..."
                    rows={3}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Tipo de Presupuesto
                    </label>
                    <select
                      value={formData.budgetType}
                      onChange={(e) => setFormData({ ...formData, budgetType: e.target.value as 'DAILY' | 'LIFETIME' })}
                      className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    >
                      <option value="DAILY">Diario</option>
                      <option value="LIFETIME">Total</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Presupuesto ({formData.currency}) *
                    </label>
                    <input
                      type="number"
                      value={formData.budget || ''}
                      onChange={(e) => setFormData({ ...formData, budget: parseFloat(e.target.value) || 0 })}
                      placeholder="1000"
                      min={0}
                      className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
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

                {/* Tags */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Etiquetas
                  </label>
                  <div className="flex gap-2 mb-2 flex-wrap">
                    {formData.tags.map((tag) => (
                      <span
                        key={tag}
                        className="px-3 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 rounded-full text-sm flex items-center gap-1"
                      >
                        {tag}
                        <button onClick={() => removeTag(tag)}>
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
                      placeholder="Nueva etiqueta"
                      onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addTag())}
                      className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    />
                    <button
                      onClick={addTag}
                      className="px-4 py-2 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600"
                    >
                      <Plus className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Step 4: Targeting */}
          {step === 4 && (
            <div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                Define tu Audiencia
              </h2>

              {/* Mode Toggle */}
              <div className="flex gap-2 mb-6">
                <button
                  onClick={() => setAudienceMode('builder')}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${
                    audienceMode === 'builder'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                  }`}
                >
                  <Sparkles className="w-4 h-4" />
                  Crear Nueva
                </button>
                <button
                  onClick={() => setAudienceMode('saved')}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${
                    audienceMode === 'saved'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                  }`}
                >
                  <Library className="w-4 h-4" />
                  Audiencias Guardadas
                  {savedAudiences.length > 0 && (
                    <span className="ml-1 px-1.5 py-0.5 text-xs bg-white/20 rounded-full">
                      {savedAudiences.length}
                    </span>
                  )}
                </button>
              </div>

              {/* Builder Mode */}
              {audienceMode === 'builder' && (
                <AudienceBuilder
                  value={formData.audienceRules}
                  onChange={(rules) => setFormData({ ...formData, audienceRules: rules, savedAudienceId: undefined })}
                  compact
                />
              )}

              {/* Saved Audiences Mode */}
              {audienceMode === 'saved' && (
                <div>
                  {loadingAudiences ? (
                    <div className="flex items-center justify-center py-12">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                    </div>
                  ) : savedAudiences.length === 0 ? (
                    <div className="text-center py-12">
                      <Users className="w-12 h-12 mx-auto text-gray-300 dark:text-gray-600 mb-3" />
                      <p className="text-gray-500 dark:text-gray-400 mb-4">
                        No tienes audiencias guardadas para {PLATFORMS.find(p => p.id === formData.platform)?.name || 'esta plataforma'}
                      </p>
                      <button
                        onClick={() => router.push('/marketing/audiences')}
                        className="text-blue-600 hover:text-blue-700 text-sm font-medium"
                      >
                        Crear una audiencia →
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {savedAudiences.map((audience) => (
                        <button
                          key={audience._id}
                          onClick={() => selectSavedAudience(audience)}
                          className={`w-full p-4 rounded-lg border-2 text-left transition-all ${
                            formData.savedAudienceId === audience._id
                              ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                              : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                          }`}
                        >
                          <div className="flex items-start justify-between">
                            <div>
                              <h4 className="font-medium text-gray-900 dark:text-white">
                                {audience.name}
                              </h4>
                              {audience.description && (
                                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                                  {audience.description}
                                </p>
                              )}
                            </div>
                            {formData.savedAudienceId === audience._id && (
                              <span className="px-2 py-1 text-xs bg-blue-600 text-white rounded">
                                Seleccionada
                              </span>
                            )}
                          </div>
                          <div className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                            {audience.rules.groups.length} grupo(s) de segmentación
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Step 5: Creative */}
          {step === 5 && (
            <div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                Crea tu Anuncio
              </h2>

              {/* Mode Toggle */}
              <div className="flex gap-2 mb-6">
                <button
                  onClick={() => setCreativeMode('builder')}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${
                    creativeMode === 'builder'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                  }`}
                >
                  <Sparkles className="w-4 h-4" />
                  Crear Nuevo
                </button>
                <button
                  onClick={() => setCreativeMode('saved')}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${
                    creativeMode === 'saved'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                  }`}
                >
                  <Library className="w-4 h-4" />
                  Creativos Guardados
                  {savedCreatives.length > 0 && (
                    <span className="ml-1 px-1.5 py-0.5 text-xs bg-white/20 rounded-full">
                      {savedCreatives.length}
                    </span>
                  )}
                </button>
              </div>

              {/* Builder Mode */}
              {creativeMode === 'builder' && (
                <CreativeBuilder
                  value={formData.creativeData}
                  onChange={(data) => setFormData({ ...formData, creativeData: data, savedCreativeId: undefined })}
                  compact
                />
              )}

              {/* Saved Creatives Mode */}
              {creativeMode === 'saved' && (
                <div>
                  {loadingCreatives ? (
                    <div className="flex items-center justify-center py-12">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                    </div>
                  ) : savedCreatives.length === 0 ? (
                    <div className="text-center py-12">
                      <Image className="w-12 h-12 mx-auto text-gray-300 dark:text-gray-600 mb-3" />
                      <p className="text-gray-500 dark:text-gray-400 mb-4">
                        No tienes creativos guardados
                      </p>
                      <button
                        onClick={() => router.push('/marketing/creatives')}
                        className="text-blue-600 hover:text-blue-700 text-sm font-medium"
                      >
                        Crear un creativo →
                      </button>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                      {savedCreatives.map((creative) => (
                        <button
                          key={creative._id}
                          onClick={() => selectSavedCreative(creative)}
                          className={`rounded-lg border-2 overflow-hidden text-left transition-all ${
                            formData.savedCreativeId === creative._id
                              ? 'border-blue-500 ring-2 ring-blue-200'
                              : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                          }`}
                        >
                          <div className="aspect-square bg-gray-100 dark:bg-gray-700">
                            {creative.primaryAsset?.url ? (
                              <img
                                src={creative.primaryAsset.url}
                                alt={creative.name}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center">
                                <Image className="w-8 h-8 text-gray-300" />
                              </div>
                            )}
                          </div>
                          <div className="p-2">
                            <p className="font-medium text-sm text-gray-900 dark:text-white truncate">
                              {creative.name}
                            </p>
                            <p className="text-xs text-gray-500">{creative.type} • {creative.aspectRatio}</p>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Step 6: Review */}
          {step === 6 && (
            <div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                Revisa tu Campaña
              </h2>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                    <p className="text-sm text-gray-500 dark:text-gray-400">Plataforma</p>
                    <p className="font-medium text-gray-900 dark:text-white">
                      {PLATFORMS.find((p) => p.id === formData.platform)?.name || '-'}
                    </p>
                  </div>
                  <div className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                    <p className="text-sm text-gray-500 dark:text-gray-400">Objetivo</p>
                    <p className="font-medium text-gray-900 dark:text-white">
                      {OBJECTIVES.find((o) => o.id === formData.objective)?.name || '-'}
                    </p>
                  </div>
                </div>

                <div className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                  <p className="text-sm text-gray-500 dark:text-gray-400">Nombre</p>
                  <p className="font-medium text-gray-900 dark:text-white">{formData.name || '-'}</p>
                </div>

                {formData.description && (
                  <div className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                    <p className="text-sm text-gray-500 dark:text-gray-400">Descripción</p>
                    <p className="font-medium text-gray-900 dark:text-white">{formData.description}</p>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                    <p className="text-sm text-gray-500 dark:text-gray-400">Presupuesto</p>
                    <p className="font-medium text-gray-900 dark:text-white">
                      ${formData.budget.toLocaleString()} {formData.currency} ({formData.budgetType === 'DAILY' ? 'diario' : 'total'})
                    </p>
                  </div>
                  <div className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                    <p className="text-sm text-gray-500 dark:text-gray-400">Fechas</p>
                    <p className="font-medium text-gray-900 dark:text-white">
                      {formData.startDate || 'Sin definir'} - {formData.endDate || 'Sin definir'}
                    </p>
                  </div>
                </div>

                <div className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                  <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">Audiencia</p>
                  <div className="flex flex-wrap gap-2 text-sm">
                    <span className="px-2 py-1 bg-white dark:bg-gray-600 rounded">
                      {formData.targeting.ageMin}-{formData.targeting.ageMax} años
                    </span>
                    {formData.targeting.locations.map((loc) => (
                      <span key={loc} className="px-2 py-1 bg-white dark:bg-gray-600 rounded">
                        {loc}
                      </span>
                    ))}
                    {formData.targeting.interests.map((int) => (
                      <span key={int} className="px-2 py-1 bg-white dark:bg-gray-600 rounded">
                        {int}
                      </span>
                    ))}
                  </div>
                </div>

                {formData.tags.length > 0 && (
                  <div className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                    <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">Etiquetas</p>
                    <div className="flex flex-wrap gap-2">
                      {formData.tags.map((tag) => (
                        <span
                          key={tag}
                          className="px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 rounded text-sm"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Navigation Buttons */}
        <div className="flex justify-between mt-6">
          <button
            onClick={() => setStep(Math.max(1, step - 1))}
            disabled={step === 1}
            className="px-6 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-50"
          >
            Anterior
          </button>

          {step < 6 ? (
            <button
              onClick={() => setStep(Math.min(6, step + 1))}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Siguiente
            </button>
          ) : (
            <button
              onClick={handleSubmit}
              disabled={loading}
              className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center gap-2 disabled:opacity-50"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
              ) : (
                <Save className="w-5 h-5" />
              )}
              Crear Campaña
            </button>
          )}
        </div>
      </main>
    </div>
  );
}
