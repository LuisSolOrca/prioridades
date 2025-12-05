'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import EmailBlockEditor, { IEmailBlock, IGlobalStyles } from './EmailBlockEditor';
import AudienceSelector, { AudienceSelection } from './AudienceSelector';
import ABTestConfig, { ABTestSettings } from './ABTestConfig';
import { Layout, FileText, Plus, Check, Loader2, X, Eye } from 'lucide-react';

type CampaignStep = 'details' | 'audience' | 'content' | 'ab_test' | 'review';

interface EmailTemplate {
  _id: string;
  name: string;
  description?: string;
  category: string;
  subject: string;
  preheader?: string;
  blocks: IEmailBlock[];
  globalStyles: IGlobalStyles;
  isSystem?: boolean;
  isPublic?: boolean;
}

interface CampaignData {
  name: string;
  subject: string;
  preheader: string;
  fromName: string;
  fromEmail: string;
  replyTo: string;
  category: string;
  tags: string[];
  audience: AudienceSelection | null;
  content: {
    json: {
      blocks: IEmailBlock[];
      globalStyles: IGlobalStyles;
    };
    html: string;
  };
  abTest: ABTestSettings;
}

interface CampaignEditorProps {
  campaignId?: string;
  initialData?: Partial<CampaignData>;
}

const defaultGlobalStyles: IGlobalStyles = {
  backgroundColor: '#f5f5f5',
  contentWidth: 600,
  fontFamily: 'Arial, sans-serif',
};

const defaultAbTest: ABTestSettings = {
  enabled: false,
  testType: 'subject',
  variants: [],
  testSize: 20,
  winnerCriteria: 'open_rate',
  testDuration: 4,
};

export default function CampaignEditor({ campaignId, initialData }: CampaignEditorProps) {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState<CampaignStep>('details');
  const [saving, setSaving] = useState(false);
  const [sending, setSending] = useState(false);
  const [scheduling, setScheduling] = useState(false);
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [scheduleDate, setScheduleDate] = useState('');
  const [showTestModal, setShowTestModal] = useState(false);
  const [testEmails, setTestEmails] = useState('');
  const [sendingTest, setSendingTest] = useState(false);

  // Template selection state
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [loadingTemplates, setLoadingTemplates] = useState(false);
  const [showTemplateSelector, setShowTemplateSelector] = useState(false);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);
  const [templatePreview, setTemplatePreview] = useState<EmailTemplate | null>(null);

  const [campaign, setCampaign] = useState<CampaignData>({
    name: '',
    subject: '',
    preheader: '',
    fromName: '',
    fromEmail: '',
    replyTo: '',
    category: 'newsletter',
    tags: [],
    audience: null,
    content: {
      json: {
        blocks: [],
        globalStyles: defaultGlobalStyles,
      },
      html: '',
    },
    abTest: defaultAbTest,
    ...initialData,
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  // Load templates when component mounts
  useEffect(() => {
    loadTemplates();
  }, []);

  const loadTemplates = async () => {
    try {
      setLoadingTemplates(true);
      const res = await fetch('/api/marketing/email-templates');
      if (res.ok) {
        const data = await res.json();
        setTemplates(data.templates || []);
      }
    } catch (error) {
      console.error('Error loading templates:', error);
    } finally {
      setLoadingTemplates(false);
    }
  };

  const applyTemplate = (template: EmailTemplate) => {
    setCampaign(prev => ({
      ...prev,
      subject: template.subject || prev.subject,
      preheader: template.preheader || prev.preheader,
      content: {
        json: {
          blocks: template.blocks || [],
          globalStyles: template.globalStyles || defaultGlobalStyles,
        },
        html: '',
      },
    }));
    setSelectedTemplateId(template._id);
    setShowTemplateSelector(false);
    setTemplatePreview(null);
  };

  const getCategoryLabel = (category: string) => {
    const labels: Record<string, string> = {
      welcome: 'Bienvenida',
      newsletter: 'Newsletter',
      promotional: 'Promocional',
      announcement: 'Anuncio',
      event: 'Evento',
      follow_up: 'Seguimiento',
      transactional: 'Transaccional',
      seasonal: 'Temporada',
      other: 'Otro',
    };
    return labels[category] || category;
  };

  const steps: { id: CampaignStep; label: string; icon: JSX.Element }[] = [
    {
      id: 'details',
      label: 'Detalles',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
        </svg>
      ),
    },
    {
      id: 'audience',
      label: 'Audiencia',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
        </svg>
      ),
    },
    {
      id: 'content',
      label: 'Contenido',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z" />
        </svg>
      ),
    },
    {
      id: 'ab_test',
      label: 'A/B Test',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
      ),
    },
    {
      id: 'review',
      label: 'Revisar',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
    },
  ];

  const validateStep = (step: CampaignStep): boolean => {
    const newErrors: Record<string, string> = {};

    switch (step) {
      case 'details':
        if (!campaign.name.trim()) newErrors.name = 'El nombre es requerido';
        if (!campaign.subject.trim()) newErrors.subject = 'El asunto es requerido';
        if (!campaign.fromName.trim()) newErrors.fromName = 'El nombre del remitente es requerido';
        if (!campaign.fromEmail.trim()) newErrors.fromEmail = 'El email del remitente es requerido';
        else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(campaign.fromEmail)) {
          newErrors.fromEmail = 'Email invalido';
        }
        break;

      case 'audience':
        if (!campaign.audience || campaign.audience.estimatedRecipients === 0) {
          newErrors.audience = 'Debes seleccionar una audiencia';
        }
        break;

      case 'content':
        if (campaign.content.json.blocks.length === 0) {
          newErrors.content = 'El email debe tener al menos un bloque de contenido';
        }
        break;
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = () => {
    if (!validateStep(currentStep)) return;

    const stepIndex = steps.findIndex((s) => s.id === currentStep);
    if (stepIndex < steps.length - 1) {
      setCurrentStep(steps[stepIndex + 1].id);
    }
  };

  const handlePrevious = () => {
    const stepIndex = steps.findIndex((s) => s.id === currentStep);
    if (stepIndex > 0) {
      setCurrentStep(steps[stepIndex - 1].id);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);

      const payload = {
        name: campaign.name,
        subject: campaign.subject,
        preheader: campaign.preheader,
        fromName: campaign.fromName,
        fromEmail: campaign.fromEmail,
        replyTo: campaign.replyTo || campaign.fromEmail,
        category: campaign.category,
        tags: campaign.tags,
        audience: campaign.audience,
        content: campaign.content,
        abTest: campaign.abTest.enabled ? campaign.abTest : undefined,
      };

      const url = campaignId
        ? `/api/marketing/email-campaigns/${campaignId}`
        : '/api/marketing/email-campaigns';
      const method = campaignId ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Error al guardar');
      }

      const data = await response.json();

      if (!campaignId) {
        router.push(`/marketing/email-campaigns/${data._id}/edit`);
      }
    } catch (error: any) {
      alert(error.message);
    } finally {
      setSaving(false);
    }
  };

  const handleSendTest = async () => {
    if (!testEmails.trim()) return;

    const emails = testEmails.split(',').map((e) => e.trim()).filter(Boolean);

    try {
      setSendingTest(true);

      // Save first
      await handleSave();

      const response = await fetch(`/api/marketing/email-campaigns/${campaignId}/test`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ emails }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Error al enviar prueba');
      }

      alert('Email de prueba enviado correctamente');
      setShowTestModal(false);
      setTestEmails('');
    } catch (error: any) {
      alert(error.message);
    } finally {
      setSendingTest(false);
    }
  };

  const handleSchedule = async () => {
    if (!scheduleDate) return;

    try {
      setScheduling(true);

      // Save first
      await handleSave();

      const response = await fetch(`/api/marketing/email-campaigns/${campaignId}/schedule`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scheduledFor: new Date(scheduleDate).toISOString() }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Error al programar');
      }

      router.push('/marketing/email-campaigns');
    } catch (error: any) {
      alert(error.message);
    } finally {
      setScheduling(false);
    }
  };

  const handleSend = async () => {
    if (!confirm('¿Estás seguro de enviar esta campaña ahora?')) return;

    try {
      setSending(true);

      // Save first
      await handleSave();

      const response = await fetch(`/api/marketing/email-campaigns/${campaignId}/send`, {
        method: 'POST',
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Error al enviar');
      }

      router.push('/marketing/email-campaigns');
    } catch (error: any) {
      alert(error.message);
    } finally {
      setSending(false);
    }
  };

  const stepIndex = steps.findIndex((s) => s.id === currentStep);
  const isLastStep = stepIndex === steps.length - 1;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 sticky top-16 z-10">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={() => router.push('/marketing/email-campaigns')}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg text-gray-600 dark:text-gray-400"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
              </button>
              <div>
                <h1 className="text-lg font-semibold text-gray-900 dark:text-white">
                  {campaignId ? 'Editar campaña' : 'Nueva campaña'}
                </h1>
                {campaign.name && (
                  <p className="text-sm text-gray-500 dark:text-gray-400">{campaign.name}</p>
                )}
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={handleSave}
                disabled={saving}
                className="px-4 py-2 text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-600 disabled:opacity-50"
              >
                {saving ? 'Guardando...' : 'Guardar borrador'}
              </button>
              {isLastStep && campaignId && (
                <>
                  <button
                    onClick={() => setShowTestModal(true)}
                    className="px-4 py-2 text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-600"
                  >
                    Enviar prueba
                  </button>
                  <button
                    onClick={() => setShowScheduleModal(true)}
                    className="px-4 py-2 text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-900/30 border border-purple-200 dark:border-purple-700 rounded-lg hover:bg-purple-100 dark:hover:bg-purple-900/50"
                  >
                    Programar
                  </button>
                  <button
                    onClick={handleSend}
                    disabled={sending}
                    className="px-4 py-2 text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50"
                  >
                    {sending ? 'Enviando...' : 'Enviar ahora'}
                  </button>
                </>
              )}
            </div>
          </div>

          {/* Step Progress */}
          <div className="mt-6">
            <div className="flex items-center">
              {steps.map((step, index) => (
                <div key={step.id} className="flex items-center flex-1">
                  <button
                    onClick={() => setCurrentStep(step.id)}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all ${
                      currentStep === step.id
                        ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400'
                        : index < stepIndex
                        ? 'text-green-600 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/30'
                        : 'text-gray-400 dark:text-gray-500'
                    }`}
                  >
                    <span className={`w-8 h-8 rounded-full flex items-center justify-center ${
                      currentStep === step.id
                        ? 'bg-blue-100 dark:bg-blue-800'
                        : index < stepIndex
                        ? 'bg-green-100 dark:bg-green-800'
                        : 'bg-gray-100 dark:bg-gray-700'
                    }`}>
                      {index < stepIndex ? (
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                      ) : (
                        step.icon
                      )}
                    </span>
                    <span className="font-medium hidden sm:inline">{step.label}</span>
                  </button>
                  {index < steps.length - 1 && (
                    <div className={`flex-1 h-0.5 mx-2 ${
                      index < stepIndex ? 'bg-green-300 dark:bg-green-600' : 'bg-gray-200 dark:bg-gray-700'
                    }`} />
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Details Step */}
        {currentStep === 'details' && (
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6 space-y-6">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Detalles de la campaña</h2>

            <div className="grid grid-cols-2 gap-6">
              <div className="col-span-2">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Nombre de la campaña *
                </label>
                <input
                  type="text"
                  value={campaign.name}
                  onChange={(e) => setCampaign({ ...campaign, name: e.target.value })}
                  placeholder="Ej: Newsletter Diciembre 2024"
                  className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white border-gray-300 dark:border-gray-600 ${
                    errors.name ? 'border-red-500' : ''
                  }`}
                />
                {errors.name && <p className="mt-1 text-sm text-red-500">{errors.name}</p>}
              </div>

              <div className="col-span-2">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Línea de asunto *
                </label>
                <input
                  type="text"
                  value={campaign.subject}
                  onChange={(e) => setCampaign({ ...campaign, subject: e.target.value })}
                  placeholder="Ej: Descubre nuestras novedades de diciembre"
                  className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white border-gray-300 dark:border-gray-600 ${
                    errors.subject ? 'border-red-500' : ''
                  }`}
                />
                {errors.subject && <p className="mt-1 text-sm text-red-500">{errors.subject}</p>}
                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                  {campaign.subject.length} caracteres
                </p>
              </div>

              <div className="col-span-2">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Preheader (opcional)
                </label>
                <input
                  type="text"
                  value={campaign.preheader}
                  onChange={(e) => setCampaign({ ...campaign, preheader: e.target.value })}
                  placeholder="Texto que aparece después del asunto en la bandeja"
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white border-gray-300 dark:border-gray-600"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Nombre del remitente *
                </label>
                <input
                  type="text"
                  value={campaign.fromName}
                  onChange={(e) => setCampaign({ ...campaign, fromName: e.target.value })}
                  placeholder="Ej: Tu Empresa"
                  className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white border-gray-300 dark:border-gray-600 ${
                    errors.fromName ? 'border-red-500' : ''
                  }`}
                />
                {errors.fromName && <p className="mt-1 text-sm text-red-500">{errors.fromName}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Email del remitente *
                </label>
                <input
                  type="email"
                  value={campaign.fromEmail}
                  onChange={(e) => setCampaign({ ...campaign, fromEmail: e.target.value })}
                  placeholder="hola@tuempresa.com"
                  className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white border-gray-300 dark:border-gray-600 ${
                    errors.fromEmail ? 'border-red-500' : ''
                  }`}
                />
                {errors.fromEmail && <p className="mt-1 text-sm text-red-500">{errors.fromEmail}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Responder a (opcional)
                </label>
                <input
                  type="email"
                  value={campaign.replyTo}
                  onChange={(e) => setCampaign({ ...campaign, replyTo: e.target.value })}
                  placeholder="respuestas@tuempresa.com"
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white border-gray-300 dark:border-gray-600"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Categoría
                </label>
                <select
                  value={campaign.category}
                  onChange={(e) => setCampaign({ ...campaign, category: e.target.value })}
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white border-gray-300 dark:border-gray-600"
                >
                  <option value="newsletter">Newsletter</option>
                  <option value="promotion">Promoción</option>
                  <option value="announcement">Anuncio</option>
                  <option value="event">Evento</option>
                  <option value="transactional">Transaccional</option>
                  <option value="other">Otro</option>
                </select>
              </div>
            </div>
          </div>
        )}

        {/* Audience Step */}
        {currentStep === 'audience' && (
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-6">Seleccionar audiencia</h2>
            <AudienceSelector
              value={campaign.audience}
              onChange={(audience) => setCampaign({ ...campaign, audience })}
            />
            {errors.audience && (
              <p className="mt-4 text-sm text-red-500">{errors.audience}</p>
            )}
          </div>
        )}

        {/* Content Step */}
        {currentStep === 'content' && (
          <div className="space-y-4">
            {/* Template Selector Header */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Diseñar email</h2>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                    Comienza desde cero o selecciona un template existente
                  </p>
                </div>
                <button
                  onClick={() => setShowTemplateSelector(true)}
                  className="flex items-center gap-2 px-4 py-2 bg-purple-50 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 rounded-lg hover:bg-purple-100 dark:hover:bg-purple-900/50 border border-purple-200 dark:border-purple-700"
                >
                  <Layout size={18} />
                  {selectedTemplateId ? 'Cambiar template' : 'Usar template'}
                </button>
              </div>
              {selectedTemplateId && (
                <div className="mt-3 flex items-center gap-2 text-sm text-purple-600 dark:text-purple-400">
                  <Check size={16} />
                  <span>Template aplicado</span>
                  <button
                    onClick={() => {
                      setCampaign(prev => ({
                        ...prev,
                        content: {
                          json: { blocks: [], globalStyles: defaultGlobalStyles },
                          html: '',
                        },
                      }));
                      setSelectedTemplateId(null);
                    }}
                    className="ml-2 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
                  >
                    (limpiar)
                  </button>
                </div>
              )}
            </div>

            {/* Email Editor */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm overflow-hidden">
              <EmailBlockEditor
                value={{
                  blocks: campaign.content.json.blocks,
                  globalStyles: campaign.content.json.globalStyles,
                }}
                onChange={(content) => {
                  setCampaign({
                    ...campaign,
                    content: {
                      json: { blocks: content.blocks, globalStyles: content.globalStyles },
                      html: '',
                    },
                  });
                }}
              />
              {errors.content && (
                <p className="p-4 text-sm text-red-500">{errors.content}</p>
              )}
            </div>
          </div>
        )}

        {/* A/B Test Step */}
        {currentStep === 'ab_test' && (
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-6">Configurar prueba A/B</h2>
            <ABTestConfig
              value={campaign.abTest}
              onChange={(abTest) => setCampaign({ ...campaign, abTest })}
              baseSubject={campaign.subject}
              baseFromName={campaign.fromName}
              baseFromEmail={campaign.fromEmail}
            />
          </div>
        )}

        {/* Review Step */}
        {currentStep === 'review' && (
          <div className="space-y-6">
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-6">Revisar campaña</h2>

              {/* Campaign Summary */}
              <div className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                    <p className="text-sm text-gray-500 dark:text-gray-400">Nombre</p>
                    <p className="font-medium text-gray-900 dark:text-white">{campaign.name || '-'}</p>
                  </div>
                  <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                    <p className="text-sm text-gray-500 dark:text-gray-400">Categoría</p>
                    <p className="font-medium text-gray-900 dark:text-white capitalize">{campaign.category}</p>
                  </div>
                  <div className="col-span-2 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                    <p className="text-sm text-gray-500 dark:text-gray-400">Línea de asunto</p>
                    <p className="font-medium text-gray-900 dark:text-white">{campaign.subject || '-'}</p>
                  </div>
                  {campaign.preheader && (
                    <div className="col-span-2 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                      <p className="text-sm text-gray-500 dark:text-gray-400">Preheader</p>
                      <p className="font-medium text-gray-900 dark:text-white">{campaign.preheader}</p>
                    </div>
                  )}
                </div>

                <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
                  <h3 className="font-medium text-gray-900 dark:text-white mb-4">Remitente</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                      <p className="text-sm text-gray-500 dark:text-gray-400">De</p>
                      <p className="font-medium text-gray-900 dark:text-white">
                        {campaign.fromName} &lt;{campaign.fromEmail}&gt;
                      </p>
                    </div>
                    <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                      <p className="text-sm text-gray-500 dark:text-gray-400">Responder a</p>
                      <p className="font-medium text-gray-900 dark:text-white">
                        {campaign.replyTo || campaign.fromEmail}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
                  <h3 className="font-medium text-gray-900 dark:text-white mb-4">Audiencia</h3>
                  {campaign.audience ? (
                    <div className="p-4 bg-blue-50 dark:bg-blue-900/30 rounded-lg flex items-center justify-between">
                      <div>
                        <p className="font-medium text-blue-900 dark:text-blue-300">
                          {campaign.audience.type === 'segment' && 'Segmento seleccionado'}
                          {campaign.audience.type === 'list' && 'Lista seleccionada'}
                          {campaign.audience.type === 'all_contacts' && 'Todos los contactos'}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-2xl font-bold text-blue-900 dark:text-blue-300">
                          {campaign.audience.estimatedRecipients.toLocaleString()}
                        </p>
                        <p className="text-sm text-blue-700 dark:text-blue-400">destinatarios</p>
                      </div>
                    </div>
                  ) : (
                    <p className="text-red-500">No se ha seleccionado audiencia</p>
                  )}
                </div>

                <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
                  <h3 className="font-medium text-gray-900 dark:text-white mb-4">Contenido</h3>
                  <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      {campaign.content.json.blocks.length} bloques de contenido
                    </p>
                  </div>
                </div>

                {campaign.abTest.enabled && (
                  <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
                    <h3 className="font-medium text-gray-900 dark:text-white mb-4">Prueba A/B</h3>
                    <div className="p-4 bg-purple-50 dark:bg-purple-900/30 rounded-lg">
                      <p className="font-medium text-purple-900 dark:text-purple-300">
                        Probando: {
                          campaign.abTest.testType === 'subject' ? 'Línea de asunto' :
                          campaign.abTest.testType === 'content' ? 'Contenido' :
                          campaign.abTest.testType === 'sender' ? 'Remitente' : 'Hora de envío'
                        }
                      </p>
                      <p className="text-sm text-purple-700 dark:text-purple-400 mt-1">
                        {campaign.abTest.variants.length} variantes, {campaign.abTest.testSize}% de prueba
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Checklist */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6">
              <h3 className="font-medium text-gray-900 dark:text-white mb-4">Lista de verificación</h3>
              <ul className="space-y-3">
                {[
                  { check: !!campaign.name, label: 'Nombre de campaña definido' },
                  { check: !!campaign.subject, label: 'Línea de asunto definida' },
                  { check: !!campaign.fromName && !!campaign.fromEmail, label: 'Remitente configurado' },
                  { check: campaign.audience && campaign.audience.estimatedRecipients > 0, label: 'Audiencia seleccionada' },
                  { check: campaign.content.json.blocks.length > 0, label: 'Contenido del email creado' },
                ].map((item, index) => (
                  <li key={index} className="flex items-center gap-3">
                    {item.check ? (
                      <svg className="w-5 h-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    ) : (
                      <svg className="w-5 h-5 text-gray-300 dark:text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    )}
                    <span className={item.check ? 'text-gray-900 dark:text-white' : 'text-gray-400 dark:text-gray-500'}>
                      {item.label}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}

        {/* Navigation */}
        <div className="flex items-center justify-between mt-8">
          <button
            onClick={handlePrevious}
            disabled={stepIndex === 0}
            className="px-6 py-2 text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Anterior
          </button>
          {!isLastStep && (
            <button
              onClick={handleNext}
              className="px-6 py-2 text-white bg-blue-600 rounded-lg hover:bg-blue-700"
            >
              Siguiente
            </button>
          )}
        </div>
      </div>

      {/* Test Email Modal */}
      {showTestModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-md mx-4 p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Enviar email de prueba</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              Ingresa los emails a los que deseas enviar una prueba (separados por coma)
            </p>
            <textarea
              value={testEmails}
              onChange={(e) => setTestEmails(e.target.value)}
              placeholder="email1@ejemplo.com, email2@ejemplo.com"
              rows={3}
              className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 mb-4 bg-white dark:bg-gray-700 text-gray-900 dark:text-white border-gray-300 dark:border-gray-600"
            />
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowTestModal(false)}
                className="px-4 py-2 text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-600"
              >
                Cancelar
              </button>
              <button
                onClick={handleSendTest}
                disabled={sendingTest || !testEmails.trim()}
                className="px-4 py-2 text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                {sendingTest ? 'Enviando...' : 'Enviar prueba'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Schedule Modal */}
      {showScheduleModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-md mx-4 p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Programar envío</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              Selecciona la fecha y hora para enviar la campaña
            </p>
            <input
              type="datetime-local"
              value={scheduleDate}
              onChange={(e) => setScheduleDate(e.target.value)}
              min={new Date().toISOString().slice(0, 16)}
              className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 mb-4 bg-white dark:bg-gray-700 text-gray-900 dark:text-white border-gray-300 dark:border-gray-600"
            />
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowScheduleModal(false)}
                className="px-4 py-2 text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-600"
              >
                Cancelar
              </button>
              <button
                onClick={handleSchedule}
                disabled={scheduling || !scheduleDate}
                className="px-4 py-2 text-white bg-purple-600 rounded-lg hover:bg-purple-700 disabled:opacity-50"
              >
                {scheduling ? 'Programando...' : 'Programar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Template Selector Modal */}
      {showTemplateSelector && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                  <Layout size={20} className="text-purple-600" />
                  Seleccionar Template
                </h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  Elige un template para aplicar a tu campaña
                </p>
              </div>
              <button
                onClick={() => {
                  setShowTemplateSelector(false);
                  setTemplatePreview(null);
                }}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
              >
                <X size={20} className="text-gray-500" />
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-hidden flex">
              {/* Template List */}
              <div className="w-1/2 border-r border-gray-200 dark:border-gray-700 overflow-y-auto p-4">
                {loadingTemplates ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="animate-spin text-purple-600" size={32} />
                  </div>
                ) : templates.length === 0 ? (
                  <div className="text-center py-12">
                    <FileText size={48} className="mx-auto text-gray-300 dark:text-gray-600 mb-4" />
                    <p className="text-gray-500 dark:text-gray-400">No hay templates disponibles</p>
                    <a
                      href="/marketing/email-templates/new"
                      className="mt-4 inline-flex items-center gap-2 text-purple-600 hover:text-purple-700"
                    >
                      <Plus size={16} />
                      Crear template
                    </a>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {/* System Templates */}
                    {templates.filter(t => t.isSystem).length > 0 && (
                      <div className="mb-4">
                        <h4 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">
                          Templates de Sistema
                        </h4>
                        {templates.filter(t => t.isSystem).map(template => (
                          <button
                            key={template._id}
                            onClick={() => setTemplatePreview(template)}
                            className={`w-full text-left p-3 rounded-lg border transition ${
                              templatePreview?._id === template._id
                                ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/30'
                                : 'border-gray-200 dark:border-gray-700 hover:border-purple-300 dark:hover:border-purple-600'
                            }`}
                          >
                            <div className="flex items-start justify-between">
                              <div className="flex-1 min-w-0">
                                <p className="font-medium text-gray-900 dark:text-white truncate">
                                  {template.name}
                                </p>
                                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                                  {getCategoryLabel(template.category)}
                                </p>
                              </div>
                              <span className="ml-2 px-2 py-0.5 text-xs bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300 rounded">
                                Sistema
                              </span>
                            </div>
                            {template.description && (
                              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 line-clamp-2">
                                {template.description}
                              </p>
                            )}
                          </button>
                        ))}
                      </div>
                    )}

                    {/* User Templates */}
                    {templates.filter(t => !t.isSystem).length > 0 && (
                      <div>
                        <h4 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">
                          Mis Templates
                        </h4>
                        {templates.filter(t => !t.isSystem).map(template => (
                          <button
                            key={template._id}
                            onClick={() => setTemplatePreview(template)}
                            className={`w-full text-left p-3 rounded-lg border transition mb-2 ${
                              templatePreview?._id === template._id
                                ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/30'
                                : 'border-gray-200 dark:border-gray-700 hover:border-purple-300 dark:hover:border-purple-600'
                            }`}
                          >
                            <div className="flex items-start justify-between">
                              <div className="flex-1 min-w-0">
                                <p className="font-medium text-gray-900 dark:text-white truncate">
                                  {template.name}
                                </p>
                                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                                  {getCategoryLabel(template.category)}
                                </p>
                              </div>
                              {template.isPublic && (
                                <span className="ml-2 px-2 py-0.5 text-xs bg-green-100 dark:bg-green-900/50 text-green-700 dark:text-green-300 rounded">
                                  Público
                                </span>
                              )}
                            </div>
                            {template.description && (
                              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 line-clamp-2">
                                {template.description}
                              </p>
                            )}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Preview Panel */}
              <div className="w-1/2 overflow-y-auto bg-gray-50 dark:bg-gray-900 p-4">
                {templatePreview ? (
                  <div>
                    <div className="mb-4">
                      <h4 className="font-semibold text-gray-900 dark:text-white">{templatePreview.name}</h4>
                      {templatePreview.subject && (
                        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                          <span className="font-medium">Asunto:</span> {templatePreview.subject}
                        </p>
                      )}
                      <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                        {templatePreview.blocks?.length || 0} bloques de contenido
                      </p>
                    </div>

                    {/* Mini Preview */}
                    <div
                      className="bg-white dark:bg-gray-800 rounded-lg shadow-sm overflow-hidden border border-gray-200 dark:border-gray-700"
                      style={{ transform: 'scale(0.6)', transformOrigin: 'top center', height: '400px' }}
                    >
                      <div
                        style={{
                          backgroundColor: templatePreview.globalStyles?.backgroundColor || '#f5f5f5',
                          padding: '20px',
                          minHeight: '100%',
                        }}
                      >
                        <div
                          style={{
                            maxWidth: templatePreview.globalStyles?.contentWidth || 600,
                            margin: '0 auto',
                            backgroundColor: '#ffffff',
                          }}
                        >
                          {templatePreview.blocks?.slice(0, 5).map((block, idx) => (
                            <div
                              key={idx}
                              style={{
                                padding: block.styles?.padding || '10px',
                                backgroundColor: block.styles?.backgroundColor || 'transparent',
                              }}
                            >
                              {block.type === 'text' && (
                                <div
                                  dangerouslySetInnerHTML={{ __html: block.content as string }}
                                  style={{ fontSize: '12px' }}
                                />
                              )}
                              {block.type === 'button' && (
                                <div style={{ textAlign: (block.styles?.textAlign as any) || 'center' }}>
                                  <span
                                    style={{
                                      display: 'inline-block',
                                      padding: '8px 16px',
                                      backgroundColor: (block.content as any)?.backgroundColor || '#3B82F6',
                                      color: (block.content as any)?.color || '#ffffff',
                                      borderRadius: (block.content as any)?.borderRadius || '4px',
                                      fontSize: '11px',
                                    }}
                                  >
                                    {(block.content as any)?.text || 'Botón'}
                                  </span>
                                </div>
                              )}
                              {block.type === 'image' && (
                                <div style={{ textAlign: 'center' }}>
                                  <div className="bg-gray-200 dark:bg-gray-600 h-16 flex items-center justify-center rounded">
                                    <span className="text-xs text-gray-500">Imagen</span>
                                  </div>
                                </div>
                              )}
                              {block.type === 'divider' && (
                                <hr style={{ borderColor: '#e5e7eb', margin: '10px 0' }} />
                              )}
                              {block.type === 'spacer' && (
                                <div style={{ height: (block.content as any)?.height || 20 }} />
                              )}
                            </div>
                          ))}
                          {(templatePreview.blocks?.length || 0) > 5 && (
                            <p className="text-xs text-center text-gray-400 py-2">
                              +{templatePreview.blocks!.length - 5} bloques más...
                            </p>
                          )}
                        </div>
                      </div>
                    </div>

                    <button
                      onClick={() => applyTemplate(templatePreview)}
                      className="w-full mt-4 px-4 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 font-medium flex items-center justify-center gap-2"
                    >
                      <Check size={18} />
                      Usar este template
                    </button>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center h-full text-center">
                    <Eye size={48} className="text-gray-300 dark:text-gray-600 mb-4" />
                    <p className="text-gray-500 dark:text-gray-400">
                      Selecciona un template para ver la vista previa
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
