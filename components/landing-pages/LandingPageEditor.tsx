'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  Layout, Type, Image as ImageIcon, Video, Users, Star, HelpCircle,
  DollarSign, MessageSquare, BarChart2, Building, Clock, GitCompare,
  Grid, Minus, Square, Code, Menu, Footprints, Plus, Trash2, GripVertical,
  ChevronUp, ChevronDown, Copy, Settings, Eye, Smartphone, Monitor, Tablet,
  Save, Globe, ArrowLeft, Sparkles, FlaskConical, ExternalLink, Loader2
} from 'lucide-react';
import { ILandingSection, ILandingGlobalStyles, LandingSectionType } from '@/models/LandingPage';
import SectionRenderer from './sections/SectionRenderer';
import AIContentGenerator from '@/components/marketing/AIContentGenerator';

interface ABTestVariant {
  id: string;
  name: string;
  sections?: ILandingSection[];
  weight: number;
  views: number;
  conversions: number;
}

interface ABTestConfig {
  enabled: boolean;
  variants: ABTestVariant[];
  winnerCriteria: 'conversion_rate' | 'time_on_page' | 'manual';
}

interface LandingPageEditorProps {
  pageId?: string;
  initialData?: {
    name: string;
    slug: string;
    title: string;
    description: string;
    sections: ILandingSection[];
    globalStyles: ILandingGlobalStyles;
    formId?: string;
    abTest?: ABTestConfig;
  };
}

const SECTION_TYPES: { type: LandingSectionType; label: string; icon: any; category: string }[] = [
  { type: 'header', label: 'Header', icon: Menu, category: 'layout' },
  { type: 'hero', label: 'Hero', icon: Layout, category: 'content' },
  { type: 'features', label: 'Caracteristicas', icon: Grid, category: 'content' },
  { type: 'benefits', label: 'Beneficios', icon: Star, category: 'content' },
  { type: 'testimonials', label: 'Testimonios', icon: MessageSquare, category: 'social' },
  { type: 'pricing', label: 'Precios', icon: DollarSign, category: 'conversion' },
  { type: 'faq', label: 'FAQ', icon: HelpCircle, category: 'content' },
  { type: 'cta', label: 'Call to Action', icon: Star, category: 'conversion' },
  { type: 'form', label: 'Formulario', icon: Square, category: 'conversion' },
  { type: 'video', label: 'Video', icon: Video, category: 'media' },
  { type: 'gallery', label: 'Galeria', icon: ImageIcon, category: 'media' },
  { type: 'logos', label: 'Logos', icon: Building, category: 'social' },
  { type: 'stats', label: 'Estadisticas', icon: BarChart2, category: 'content' },
  { type: 'team', label: 'Equipo', icon: Users, category: 'content' },
  { type: 'countdown', label: 'Cuenta Regresiva', icon: Clock, category: 'conversion' },
  { type: 'comparison', label: 'Comparacion', icon: GitCompare, category: 'conversion' },
  { type: 'text', label: 'Texto', icon: Type, category: 'basic' },
  { type: 'divider', label: 'Separador', icon: Minus, category: 'basic' },
  { type: 'spacer', label: 'Espacio', icon: Square, category: 'basic' },
  { type: 'html', label: 'HTML', icon: Code, category: 'advanced' },
  { type: 'footer', label: 'Footer', icon: Footprints, category: 'layout' },
];

const DEFAULT_SECTION_CONTENT: Record<LandingSectionType, any> = {
  hero: { title: 'Tu Titulo Aqui', subtitle: 'Descripcion convincente de tu oferta', ctaText: 'Comenzar', ctaUrl: '#', alignment: 'center' },
  features: { title: 'Caracteristicas', columns: 3, items: [{ icon: 'zap', title: 'Rapido', description: 'Descripcion' }] },
  benefits: { title: 'Beneficios', items: [{ title: 'Beneficio 1', description: 'Descripcion' }] },
  testimonials: { title: 'Lo que dicen nuestros clientes', items: [{ quote: 'Excelente servicio', author: 'Cliente', role: 'CEO', company: 'Empresa' }] },
  pricing: { title: 'Precios', plans: [{ name: 'Basico', price: '$29', period: '/mes', features: ['Feature 1'], ctaText: 'Elegir', highlighted: false }] },
  faq: { title: 'Preguntas Frecuentes', items: [{ question: 'Pregunta 1?', answer: 'Respuesta 1' }] },
  cta: { title: 'Listo para comenzar?', subtitle: 'Unete hoy', ctaText: 'Empezar', ctaUrl: '#' },
  form: { title: 'Contactanos', subtitle: 'Completa el formulario', formId: null },
  video: { url: '', title: '', autoplay: false, loop: false },
  gallery: { title: 'Galeria', columns: 3, items: [] },
  logos: { title: 'Empresas que confian en nosotros', logos: [] },
  stats: { items: [{ value: '100+', label: 'Clientes' }] },
  team: { title: 'Nuestro Equipo', members: [{ name: 'Nombre', role: 'Cargo' }] },
  countdown: { title: 'Proximamente', targetDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString() },
  comparison: { title: 'Comparacion', ourName: 'Nosotros', theirName: 'Competencia', rows: [{ feature: 'Caracteristica', us: true, them: false }] },
  text: { html: '<p>Tu texto aqui...</p>' },
  columns: { columns: 2, children: [], gap: 24 },
  divider: { style: 'solid' },
  spacer: { height: 40 },
  html: { html: '', css: '' },
  header: { logoText: 'Logo', menuItems: [], ctaText: 'CTA', ctaUrl: '#', sticky: true },
  footer: { companyName: 'Tu Empresa', copyright: '2024 Tu Empresa. Todos los derechos reservados.' },
};

const defaultGlobalStyles: ILandingGlobalStyles = {
  primaryColor: '#3B82F6',
  secondaryColor: '#10B981',
  backgroundColor: '#ffffff',
  textColor: '#1F2937',
  fontFamily: 'Inter, system-ui, sans-serif',
  containerWidth: 1200,
  borderRadius: 8,
};

export default function LandingPageEditor({ pageId, initialData }: LandingPageEditorProps) {
  const router = useRouter();
  const [name, setName] = useState(initialData?.name || '');
  const [slug, setSlug] = useState(initialData?.slug || '');
  const [title, setTitle] = useState(initialData?.title || '');
  const [description, setDescription] = useState(initialData?.description || '');
  const [sections, setSections] = useState<ILandingSection[]>(initialData?.sections || []);
  const [globalStyles, setGlobalStyles] = useState<ILandingGlobalStyles>(initialData?.globalStyles || defaultGlobalStyles);
  const [selectedSectionId, setSelectedSectionId] = useState<string | null>(null);
  const [previewMode, setPreviewMode] = useState<'desktop' | 'tablet' | 'mobile'>('desktop');
  const [showSettings, setShowSettings] = useState(false);
  const [saving, setSaving] = useState(false);
  const [webForms, setWebForms] = useState<any[]>([]);
  const [generatingPreview, setGeneratingPreview] = useState(false);
  const [settingsTab, setSettingsTab] = useState<'general' | 'abtest'>('general');
  const [abTest, setAbTest] = useState<ABTestConfig>(initialData?.abTest || {
    enabled: false,
    variants: [],
    winnerCriteria: 'conversion_rate',
  });

  useEffect(() => {
    fetchWebForms();
  }, []);

  const fetchWebForms = async () => {
    try {
      const res = await fetch('/api/crm/web-forms?status=active');
      if (res.ok) {
        const data = await res.json();
        // La API devuelve directamente un array de formularios
        setWebForms(Array.isArray(data) ? data : (data.forms || []));
      }
    } catch (e) {
      console.error('Error fetching web forms:', e);
    }
  };

  const generateId = () => `section-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

  const addSection = (type: LandingSectionType, initialContent?: Partial<any>) => {
    const defaultContent = DEFAULT_SECTION_CONTENT[type] || {};
    const newSection: ILandingSection = {
      id: generateId(),
      type,
      content: initialContent ? { ...defaultContent, ...initialContent } : defaultContent,
      styles: { padding: '60px 24px' },
      visibility: { desktop: true, mobile: true },
    };
    setSections([...sections, newSection]);
    setSelectedSectionId(newSection.id);
  };

  const updateSection = (id: string, updates: Partial<ILandingSection>) => {
    setSections(sections.map(s => s.id === id ? { ...s, ...updates } : s));
  };

  const deleteSection = (id: string) => {
    setSections(sections.filter(s => s.id !== id));
    if (selectedSectionId === id) setSelectedSectionId(null);
  };

  const moveSection = (id: string, direction: 'up' | 'down') => {
    const index = sections.findIndex(s => s.id === id);
    if ((direction === 'up' && index === 0) || (direction === 'down' && index === sections.length - 1)) return;
    const newSections = [...sections];
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    [newSections[index], newSections[newIndex]] = [newSections[newIndex], newSections[index]];
    setSections(newSections);
  };

  const duplicateSection = (id: string) => {
    const section = sections.find(s => s.id === id);
    if (!section) return;
    const index = sections.findIndex(s => s.id === id);
    const newSection = { ...section, id: generateId() };
    const newSections = [...sections];
    newSections.splice(index + 1, 0, newSection);
    setSections(newSections);
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      const payload = { name, slug, title, description, content: { sections, globalStyles }, abTest };
      const url = pageId ? `/api/marketing/landing-pages/${pageId}` : '/api/marketing/landing-pages';
      const method = pageId ? 'PUT' : 'POST';
      const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      if (!res.ok) throw new Error((await res.json()).error);
      const data = await res.json();
      if (!pageId) router.push(`/marketing/landing-pages/${data._id}/edit`);
    } catch (e: any) {
      alert(e.message);
    } finally {
      setSaving(false);
    }
  };

  const handlePreview = async () => {
    try {
      setGeneratingPreview(true);
      const res = await fetch('/api/marketing/landing-pages/preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pageId,
          sections,
          globalStyles,
          title: name || title || 'Preview',
        }),
      });
      if (!res.ok) throw new Error('Error generando preview');
      const data = await res.json();
      window.open(data.previewUrl, '_blank');
    } catch (e: any) {
      alert(e.message);
    } finally {
      setGeneratingPreview(false);
    }
  };

  // A/B Test helpers
  const addVariant = () => {
    const newVariant: ABTestVariant = {
      id: `variant-${Date.now()}`,
      name: `Variante ${String.fromCharCode(65 + abTest.variants.length)}`,
      sections: [...sections],
      weight: 50,
      views: 0,
      conversions: 0,
    };
    setAbTest({
      ...abTest,
      variants: [...abTest.variants, newVariant],
    });
  };

  const updateVariant = (id: string, updates: Partial<ABTestVariant>) => {
    setAbTest({
      ...abTest,
      variants: abTest.variants.map(v => v.id === id ? { ...v, ...updates } : v),
    });
  };

  const deleteVariant = (id: string) => {
    setAbTest({
      ...abTest,
      variants: abTest.variants.filter(v => v.id !== id),
    });
  };

  const selectedSection = sections.find(s => s.id === selectedSectionId);
  const previewWidths = { desktop: '100%', tablet: '768px', mobile: '375px' };

  return (
    <div className="h-screen flex flex-col bg-gray-100 dark:bg-gray-900">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button onClick={() => router.push('/marketing/landing-pages')} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg text-gray-600 dark:text-gray-400"><ArrowLeft className="w-5 h-5" /></button>
          <div>
            <input type="text" value={name} onChange={e => setName(e.target.value)} placeholder="Nombre de la página" className="font-semibold text-lg border-none focus:ring-0 p-0 bg-transparent text-gray-900 dark:text-white" />
            <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
              <span>/lp/</span>
              <input type="text" value={slug} onChange={e => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))} placeholder="slug" className="border-none focus:ring-0 p-0 bg-transparent w-32 text-gray-500 dark:text-gray-400" />
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center bg-gray-100 dark:bg-gray-700 rounded-lg p-1">
            {[{ mode: 'desktop', icon: Monitor }, { mode: 'tablet', icon: Tablet }, { mode: 'mobile', icon: Smartphone }].map(({ mode, icon: Icon }) => (
              <button key={mode} onClick={() => setPreviewMode(mode as any)} className={`p-2 rounded ${previewMode === mode ? 'bg-white dark:bg-gray-600 shadow' : ''} text-gray-600 dark:text-gray-300`}><Icon className="w-4 h-4" /></button>
            ))}
          </div>
          <button onClick={() => setShowSettings(!showSettings)} className={`p-2 rounded-lg ${showSettings ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400' : 'hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-400'}`}><Settings className="w-5 h-5" /></button>
          <button
            onClick={handlePreview}
            disabled={generatingPreview || sections.length === 0}
            className="flex items-center gap-2 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 disabled:opacity-50"
            title="Ver preview sin publicar"
          >
            {generatingPreview ? <Loader2 className="w-4 h-4 animate-spin" /> : <Eye className="w-4 h-4" />}
            Preview
          </button>
          <button onClick={handleSave} disabled={saving} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50">
            <Save className="w-4 h-4" />{saving ? 'Guardando...' : 'Guardar'}
          </button>
          {pageId && (
            <a href={`/lp/${slug}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 px-4 py-2 border border-green-300 dark:border-green-600 rounded-lg hover:bg-green-50 dark:hover:bg-green-900/20 text-green-700 dark:text-green-400">
              <Globe className="w-4 h-4" />Ver publicada
            </a>
          )}
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Sections Palette */}
        <div className="w-80 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 overflow-y-auto p-4">
          <h3 className="font-semibold text-gray-900 dark:text-white mb-4">Secciones</h3>

          {/* AI Content Generator */}
          <div className="mb-4 p-3 bg-gradient-to-br from-purple-50 to-indigo-50 dark:from-purple-900/20 dark:to-indigo-900/20 rounded-lg border border-purple-200 dark:border-purple-700">
            <div className="flex items-center gap-2 mb-2">
              <Sparkles className="w-4 h-4 text-purple-500" />
              <span className="text-sm font-medium text-purple-900 dark:text-purple-300">Generar con IA</span>
            </div>
            <AIContentGenerator
              compact
              buttonLabel="Crear contenido"
              contentTypes={[
                { id: 'landing-hero', label: 'Sección Hero', description: 'Titular + subtítulo + CTA' },
                { id: 'landing-headline', label: 'Titulares', description: 'Titulares impactantes' },
                { id: 'landing-benefits', label: 'Beneficios', description: 'Lista de beneficios' },
                { id: 'landing-features', label: 'Características', description: 'Funcionalidades' },
                { id: 'landing-testimonial', label: 'Testimonio', description: 'Prueba social' },
                { id: 'landing-faq', label: 'FAQs', description: 'Preguntas frecuentes' },
                { id: 'landing-cta', label: 'Call to Action', description: 'Sección de cierre' },
                { id: 'landing-stats', label: 'Estadísticas', description: 'Números impactantes' },
              ]}
              onContentGenerated={(content, type) => {
                if (type === 'landing-hero' && typeof content === 'object') {
                  addSection('hero', {
                    title: content.headline,
                    subtitle: content.subheadline,
                    ctaText: content.cta,
                  });
                } else if (type === 'landing-benefits' && Array.isArray(content)) {
                  addSection('benefits', { items: content });
                } else if (type === 'landing-features' && Array.isArray(content)) {
                  addSection('features', { items: content });
                } else if (type === 'landing-faq' && Array.isArray(content)) {
                  addSection('faq', { items: content });
                } else if (type === 'landing-testimonial' && typeof content === 'object') {
                  addSection('testimonials', { items: [content] });
                } else if (type === 'landing-cta' && typeof content === 'object') {
                  addSection('cta', {
                    title: content.headline,
                    subtitle: content.subheadline,
                    ctaText: content.ctaText,
                  });
                } else if (type === 'landing-stats' && Array.isArray(content)) {
                  addSection('stats', { items: content });
                }
              }}
            />
          </div>

          <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">Agregar sección</p>
          <div className="space-y-2">
            {SECTION_TYPES.map(({ type, label, icon: Icon }) => (
              <button key={type} onClick={() => addSection(type)} className="w-full flex items-center gap-3 p-3 rounded-lg border border-gray-200 dark:border-gray-600 hover:border-blue-300 dark:hover:border-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors text-left">
                <Icon className="w-5 h-5 text-gray-500 dark:text-gray-400" />
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Preview */}
        <div className="flex-1 overflow-auto p-6 bg-gray-200 dark:bg-gray-950">
          <div className="mx-auto transition-all duration-300 bg-white shadow-xl min-h-full" style={{ width: previewWidths[previewMode], maxWidth: '100%' }}>
            {sections.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-96 text-gray-400">
                <Layout className="w-12 h-12 mb-4" />
                <p className="text-lg font-medium">Arrastra secciones aquí</p>
                <p className="text-sm">O haz clic en una sección del panel izquierdo</p>
              </div>
            ) : (
              sections.map((section, index) => (
                <div key={section.id} className={`relative group ${selectedSectionId === section.id ? 'ring-2 ring-blue-500' : ''}`} onClick={() => setSelectedSectionId(section.id)}>
                  <SectionRenderer section={section} globalStyles={globalStyles} isEditing form={webForms.find(f => f._id === section.content?.formId)} />
                  <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1 bg-white rounded-lg shadow-lg p-1">
                    <button onClick={(e) => { e.stopPropagation(); moveSection(section.id, 'up'); }} disabled={index === 0} className="p-1.5 hover:bg-gray-100 rounded disabled:opacity-30"><ChevronUp className="w-4 h-4" /></button>
                    <button onClick={(e) => { e.stopPropagation(); moveSection(section.id, 'down'); }} disabled={index === sections.length - 1} className="p-1.5 hover:bg-gray-100 rounded disabled:opacity-30"><ChevronDown className="w-4 h-4" /></button>
                    <button onClick={(e) => { e.stopPropagation(); duplicateSection(section.id); }} className="p-1.5 hover:bg-gray-100 rounded"><Copy className="w-4 h-4" /></button>
                    <button onClick={(e) => { e.stopPropagation(); deleteSection(section.id); }} className="p-1.5 hover:bg-red-100 text-red-600 rounded"><Trash2 className="w-4 h-4" /></button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Settings Panel */}
        {(showSettings || selectedSection) && (
          <div className="w-96 bg-white dark:bg-gray-800 border-l border-gray-200 dark:border-gray-700 overflow-y-auto">
            {showSettings ? (
              <div className="p-4">
                {/* Tabs */}
                <div className="flex gap-1 mb-4 p-1 bg-gray-100 dark:bg-gray-700 rounded-lg">
                  <button
                    onClick={() => setSettingsTab('general')}
                    className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                      settingsTab === 'general'
                        ? 'bg-white dark:bg-gray-600 text-gray-900 dark:text-white shadow-sm'
                        : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                    }`}
                  >
                    <Settings className="w-4 h-4" />
                    General
                  </button>
                  <button
                    onClick={() => setSettingsTab('abtest')}
                    className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                      settingsTab === 'abtest'
                        ? 'bg-white dark:bg-gray-600 text-gray-900 dark:text-white shadow-sm'
                        : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                    }`}
                  >
                    <FlaskConical className="w-4 h-4" />
                    A/B Test
                    {abTest.enabled && <span className="w-2 h-2 bg-green-500 rounded-full" />}
                  </button>
                </div>

                {settingsTab === 'general' ? (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Título SEO</label>
                    <input type="text" value={title} onChange={e => setTitle(e.target.value)} className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white" placeholder="Título de la página" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Descripción SEO</label>
                    <textarea value={description} onChange={e => setDescription(e.target.value)} rows={3} className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white" placeholder="Descripción meta" />
                  </div>
                  <hr className="border-gray-200 dark:border-gray-700" />
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Color primario</label>
                    <input type="color" value={globalStyles.primaryColor} onChange={e => setGlobalStyles({ ...globalStyles, primaryColor: e.target.value })} className="w-full h-10 rounded-lg cursor-pointer" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Color secundario</label>
                    <input type="color" value={globalStyles.secondaryColor} onChange={e => setGlobalStyles({ ...globalStyles, secondaryColor: e.target.value })} className="w-full h-10 rounded-lg cursor-pointer" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Color de texto</label>
                    <input type="color" value={globalStyles.textColor} onChange={e => setGlobalStyles({ ...globalStyles, textColor: e.target.value })} className="w-full h-10 rounded-lg cursor-pointer" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Ancho contenedor (px)</label>
                    <input type="number" value={globalStyles.containerWidth} onChange={e => setGlobalStyles({ ...globalStyles, containerWidth: parseInt(e.target.value) })} className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Border radius (px)</label>
                    <input type="number" value={globalStyles.borderRadius} onChange={e => setGlobalStyles({ ...globalStyles, borderRadius: parseInt(e.target.value) })} className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white" />
                  </div>
                </div>
                ) : (
                /* A/B Testing Tab */
                <div className="space-y-4">
                  {/* Enable toggle */}
                  <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                    <div>
                      <p className="font-medium text-gray-900 dark:text-white">Prueba A/B</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">Compara diferentes versiones</p>
                    </div>
                    <button
                      onClick={() => setAbTest({ ...abTest, enabled: !abTest.enabled })}
                      className={`relative w-12 h-6 rounded-full transition-colors ${
                        abTest.enabled ? 'bg-green-500' : 'bg-gray-300 dark:bg-gray-600'
                      }`}
                    >
                      <span className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${
                        abTest.enabled ? 'translate-x-7' : 'translate-x-1'
                      }`} />
                    </button>
                  </div>

                  {abTest.enabled && (
                    <>
                      {/* Winner criteria */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                          Criterio de ganador
                        </label>
                        <select
                          value={abTest.winnerCriteria}
                          onChange={e => setAbTest({ ...abTest, winnerCriteria: e.target.value as any })}
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                        >
                          <option value="conversion_rate">Tasa de conversión</option>
                          <option value="time_on_page">Tiempo en página</option>
                          <option value="manual">Selección manual</option>
                        </select>
                      </div>

                      {/* Variants */}
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Variantes</label>
                          <button
                            onClick={addVariant}
                            disabled={abTest.variants.length >= 4}
                            className="text-sm text-blue-600 hover:text-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            + Agregar variante
                          </button>
                        </div>

                        {/* Control (original) */}
                        <div className="p-3 mb-2 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <span className="w-6 h-6 flex items-center justify-center bg-blue-600 text-white text-xs font-bold rounded">A</span>
                              <span className="font-medium text-gray-900 dark:text-white">Control (Original)</span>
                            </div>
                            <span className="text-sm text-gray-500">100% - suma variantes</span>
                          </div>
                          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                            {sections.length} secciones
                          </p>
                        </div>

                        {/* Variant list */}
                        {abTest.variants.map((variant, index) => (
                          <div
                            key={variant.id}
                            className="p-3 mb-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg"
                          >
                            <div className="flex items-center justify-between mb-2">
                              <div className="flex items-center gap-2">
                                <span className="w-6 h-6 flex items-center justify-center bg-gray-600 text-white text-xs font-bold rounded">
                                  {String.fromCharCode(66 + index)}
                                </span>
                                <input
                                  type="text"
                                  value={variant.name}
                                  onChange={e => updateVariant(variant.id, { name: e.target.value })}
                                  className="font-medium bg-transparent border-none p-0 text-gray-900 dark:text-white focus:ring-0"
                                />
                              </div>
                              <button
                                onClick={() => deleteVariant(variant.id)}
                                className="p-1 hover:bg-red-100 dark:hover:bg-red-900/30 rounded text-red-500"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>

                            <div className="flex items-center gap-2">
                              <label className="text-xs text-gray-500">Peso:</label>
                              <input
                                type="number"
                                min="1"
                                max="100"
                                value={variant.weight}
                                onChange={e => updateVariant(variant.id, { weight: parseInt(e.target.value) || 1 })}
                                className="w-16 px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                              />
                              <span className="text-xs text-gray-500">%</span>
                            </div>

                            {variant.views > 0 && (
                              <div className="mt-2 pt-2 border-t border-gray-200 dark:border-gray-600 grid grid-cols-2 gap-2 text-xs">
                                <div>
                                  <span className="text-gray-500">Vistas:</span>
                                  <span className="ml-1 font-medium text-gray-900 dark:text-white">{variant.views}</span>
                                </div>
                                <div>
                                  <span className="text-gray-500">Conversiones:</span>
                                  <span className="ml-1 font-medium text-green-600">{variant.conversions}</span>
                                </div>
                              </div>
                            )}

                            <p className="text-xs text-gray-400 mt-2">
                              {variant.sections?.length || sections.length} secciones
                              {!variant.sections && ' (copia del original)'}
                            </p>
                          </div>
                        ))}

                        {abTest.variants.length === 0 && (
                          <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-4">
                            Agrega variantes para comparar diferentes versiones de tu página
                          </p>
                        )}
                      </div>

                      {/* Info */}
                      <div className="p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
                        <p className="text-xs text-yellow-800 dark:text-yellow-200">
                          <strong>Nota:</strong> Al activar A/B Testing, los visitantes verán aleatoriamente una de las variantes según los pesos configurados.
                        </p>
                      </div>
                    </>
                  )}
                </div>
                )}
              </div>
            ) : selectedSection && (
              <div className="p-4">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold text-gray-900 dark:text-white">Editar Sección</h3>
                  <span className="text-xs bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 px-2 py-1 rounded">{selectedSection.type}</span>
                </div>
                <SectionSettings section={selectedSection} onUpdate={(updates) => updateSection(selectedSection.id, updates)} webForms={webForms} globalStyles={globalStyles} />
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// Section Settings Component
function SectionSettings({ section, onUpdate, webForms, globalStyles }: { section: ILandingSection; onUpdate: (updates: Partial<ILandingSection>) => void; webForms: any[]; globalStyles: ILandingGlobalStyles }) {
  const updateContent = (key: string, value: any) => {
    onUpdate({ content: { ...section.content, [key]: value } });
  };

  const updateStyles = (key: string, value: any) => {
    onUpdate({ styles: { ...section.styles, [key]: value } });
  };

  const inputClass = "w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white";
  const labelClass = "block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1";

  return (
    <div className="space-y-4">
      {/* Common styles */}
      <div>
        <label className={labelClass}>Padding</label>
        <input type="text" value={section.styles?.padding || '60px 24px'} onChange={e => updateStyles('padding', e.target.value)} className={inputClass} />
      </div>
      <div>
        <label className={labelClass}>Color de fondo</label>
        <input type="color" value={section.styles?.backgroundColor || '#ffffff'} onChange={e => updateStyles('backgroundColor', e.target.value)} className="w-full h-10 rounded-lg cursor-pointer" />
      </div>

      {/* Section-specific fields */}
      {section.type === 'hero' && (
        <>
          <div className="mb-3 p-2 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
            <AIContentGenerator
              compact
              buttonLabel="Generar Hero con IA"
              className="w-full"
              contentTypes={[
                { id: 'landing-hero', label: 'Hero completo', description: 'Titular + subtítulo + CTA' },
              ]}
              onContentGenerated={(content) => {
                if (typeof content === 'object') {
                  if (content.headline) updateContent('title', content.headline);
                  if (content.subheadline) updateContent('subtitle', content.subheadline);
                  if (content.cta) updateContent('ctaText', content.cta);
                }
              }}
            />
          </div>
          <div><label className={labelClass}>Título</label><input type="text" value={section.content.title || ''} onChange={e => updateContent('title', e.target.value)} className={inputClass} /></div>
          <div><label className={labelClass}>Subtítulo</label><textarea value={section.content.subtitle || ''} onChange={e => updateContent('subtitle', e.target.value)} rows={2} className={inputClass} /></div>
          <div><label className={labelClass}>Texto CTA</label><input type="text" value={section.content.ctaText || ''} onChange={e => updateContent('ctaText', e.target.value)} className={inputClass} /></div>
          <div><label className={labelClass}>URL CTA</label><input type="text" value={section.content.ctaUrl || ''} onChange={e => updateContent('ctaUrl', e.target.value)} className={inputClass} /></div>
          <div><label className={labelClass}>Alineación</label><select value={section.content.alignment || 'center'} onChange={e => updateContent('alignment', e.target.value)} className={inputClass}><option value="left">Izquierda</option><option value="center">Centro</option><option value="right">Derecha</option></select></div>
        </>
      )}

      {section.type === 'cta' && (
        <>
          <div className="mb-3 p-2 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
            <AIContentGenerator
              compact
              buttonLabel="Generar CTA con IA"
              className="w-full"
              contentTypes={[
                { id: 'landing-cta', label: 'Call to Action', description: 'Sección de cierre persuasiva' },
              ]}
              onContentGenerated={(content) => {
                if (typeof content === 'object') {
                  if (content.headline) updateContent('title', content.headline);
                  if (content.subheadline) updateContent('subtitle', content.subheadline);
                  if (content.ctaText) updateContent('ctaText', content.ctaText);
                }
              }}
            />
          </div>
          <div><label className={labelClass}>Título</label><input type="text" value={section.content.title || ''} onChange={e => updateContent('title', e.target.value)} className={inputClass} /></div>
          <div><label className={labelClass}>Subtítulo</label><input type="text" value={section.content.subtitle || ''} onChange={e => updateContent('subtitle', e.target.value)} className={inputClass} /></div>
          <div><label className={labelClass}>Texto CTA</label><input type="text" value={section.content.ctaText || ''} onChange={e => updateContent('ctaText', e.target.value)} className={inputClass} /></div>
        </>
      )}

      {section.type === 'form' && (
        <>
          <div><label className={labelClass}>Título</label><input type="text" value={section.content.title || ''} onChange={e => updateContent('title', e.target.value)} className={inputClass} /></div>
          <div><label className={labelClass}>Subtítulo</label><input type="text" value={section.content.subtitle || ''} onChange={e => updateContent('subtitle', e.target.value)} className={inputClass} /></div>
          <div>
            <label className={labelClass}>Formulario WebToLead</label>
            <select value={section.content.formId || ''} onChange={e => updateContent('formId', e.target.value)} className={inputClass}>
              <option value="">Seleccionar formulario...</option>
              {webForms.map(f => <option key={f._id} value={f._id}>{f.name}</option>)}
            </select>
          </div>
        </>
      )}

      {section.type === 'video' && (
        <>
          <div><label className={labelClass}>URL del video</label><input type="text" value={section.content.url || ''} onChange={e => updateContent('url', e.target.value)} placeholder="YouTube o Vimeo URL" className={inputClass} /></div>
          <div><label className={labelClass}>Título</label><input type="text" value={section.content.title || ''} onChange={e => updateContent('title', e.target.value)} className={inputClass} /></div>
          <div className="flex items-center gap-2">
            <input type="checkbox" id="video-autoplay" checked={section.content.autoplay || false} onChange={e => updateContent('autoplay', e.target.checked)} className="rounded border-gray-300 dark:border-gray-600" />
            <label htmlFor="video-autoplay" className="text-sm text-gray-700 dark:text-gray-300">Autoplay (silenciado)</label>
          </div>
          <div className="flex items-center gap-2">
            <input type="checkbox" id="video-loop" checked={section.content.loop || false} onChange={e => updateContent('loop', e.target.checked)} className="rounded border-gray-300 dark:border-gray-600" />
            <label htmlFor="video-loop" className="text-sm text-gray-700 dark:text-gray-300">Repetir video</label>
          </div>
        </>
      )}

      {section.type === 'text' && (
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className={labelClass}>Contenido HTML</label>
            <AIContentGenerator
              compact
              buttonLabel="IA"
              contentTypes={[
                { id: 'landing-subheadline', label: 'Subtítulo', description: 'Texto de apoyo' },
                { id: 'product-description', label: 'Descripción', description: 'Texto persuasivo' },
              ]}
              onContentGenerated={(content) => {
                updateContent('html', `<p>${typeof content === 'string' ? content : JSON.stringify(content)}</p>`);
              }}
            />
          </div>
          <textarea value={section.content.html || ''} onChange={e => updateContent('html', e.target.value)} rows={6} className={`${inputClass} font-mono`} />
        </div>
      )}

      {section.type === 'spacer' && (
        <div><label className={labelClass}>Altura (px)</label><input type="number" value={section.content.height || 40} onChange={e => updateContent('height', parseInt(e.target.value))} className={inputClass} /></div>
      )}

      {section.type === 'faq' && (
        <>
          <div className="flex items-center justify-between mb-2">
            <label className={labelClass}>Título</label>
            <AIContentGenerator
              compact
              buttonLabel="IA"
              contentTypes={[{ id: 'landing-faq', label: 'FAQ', description: 'Preguntas frecuentes' }]}
              onContentGenerated={(content) => {
                if (Array.isArray(content)) {
                  updateContent('items', content.map((item: any) => ({ question: item.question, answer: item.answer })));
                }
              }}
            />
          </div>
          <input type="text" value={section.content.title || ''} onChange={e => updateContent('title', e.target.value)} className={inputClass} />
          <div className="mt-4">
            <div className="flex items-center justify-between mb-2">
              <label className={labelClass}>Preguntas</label>
              <button onClick={() => updateContent('items', [...(section.content.items || []), { question: 'Nueva pregunta?', answer: 'Respuesta' }])} className="text-xs text-blue-600 hover:text-blue-700">+ Agregar</button>
            </div>
            <div className="space-y-3 max-h-80 overflow-y-auto">
              {(section.content.items || []).map((item: any, idx: number) => (
                <div key={idx} className="p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                  <input type="text" value={item.question} onChange={e => { const items = [...section.content.items]; items[idx] = { ...items[idx], question: e.target.value }; updateContent('items', items); }} placeholder="Pregunta" className={`${inputClass} mb-2`} />
                  <textarea value={item.answer} onChange={e => { const items = [...section.content.items]; items[idx] = { ...items[idx], answer: e.target.value }; updateContent('items', items); }} placeholder="Respuesta" rows={2} className={inputClass} />
                  <button onClick={() => updateContent('items', section.content.items.filter((_: any, i: number) => i !== idx))} className="mt-2 text-xs text-red-500 hover:text-red-600">Eliminar</button>
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      {section.type === 'comparison' && (
        <>
          <div><label className={labelClass}>Título</label><input type="text" value={section.content.title || ''} onChange={e => updateContent('title', e.target.value)} className={inputClass} /></div>
          <div className="grid grid-cols-2 gap-2 mt-3">
            <div><label className={labelClass}>Nosotros</label><input type="text" value={section.content.ourName || ''} onChange={e => updateContent('ourName', e.target.value)} className={inputClass} /></div>
            <div><label className={labelClass}>Competencia</label><input type="text" value={section.content.theirName || ''} onChange={e => updateContent('theirName', e.target.value)} className={inputClass} /></div>
          </div>
          <div className="mt-4">
            <div className="flex items-center justify-between mb-2">
              <label className={labelClass}>Características</label>
              <button onClick={() => updateContent('rows', [...(section.content.rows || []), { feature: 'Nueva característica', us: true, them: false }])} className="text-xs text-blue-600 hover:text-blue-700">+ Agregar</button>
            </div>
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {(section.content.rows || []).map((row: any, idx: number) => (
                <div key={idx} className="flex items-center gap-2 p-2 bg-gray-50 dark:bg-gray-700 rounded">
                  <input type="text" value={row.feature} onChange={e => { const rows = [...section.content.rows]; rows[idx] = { ...rows[idx], feature: e.target.value }; updateContent('rows', rows); }} className={`${inputClass} flex-1`} />
                  <label className="flex items-center gap-1 text-xs"><input type="checkbox" checked={row.us} onChange={e => { const rows = [...section.content.rows]; rows[idx] = { ...rows[idx], us: e.target.checked }; updateContent('rows', rows); }} className="rounded" />Nos</label>
                  <label className="flex items-center gap-1 text-xs"><input type="checkbox" checked={row.them} onChange={e => { const rows = [...section.content.rows]; rows[idx] = { ...rows[idx], them: e.target.checked }; updateContent('rows', rows); }} className="rounded" />Ellos</label>
                  <button onClick={() => updateContent('rows', section.content.rows.filter((_: any, i: number) => i !== idx))} className="text-red-500 hover:text-red-600 text-xs">×</button>
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      {section.type === 'features' && (
        <>
          <div><label className={labelClass}>Título</label><input type="text" value={section.content.title || ''} onChange={e => updateContent('title', e.target.value)} className={inputClass} /></div>
          <div><label className={labelClass}>Columnas</label>
            <select value={section.content.columns || 3} onChange={e => updateContent('columns', parseInt(e.target.value))} className={inputClass}>
              <option value={2}>2 columnas</option><option value={3}>3 columnas</option><option value={4}>4 columnas</option>
            </select>
          </div>
          <div className="mt-4">
            <div className="flex items-center justify-between mb-2">
              <label className={labelClass}>Características</label>
              <button onClick={() => updateContent('items', [...(section.content.items || []), { icon: 'star', title: 'Título', description: 'Descripción' }])} className="text-xs text-blue-600 hover:text-blue-700">+ Agregar</button>
            </div>
            <div className="space-y-3 max-h-60 overflow-y-auto">
              {(section.content.items || []).map((item: any, idx: number) => (
                <div key={idx} className="p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                  <div className="grid grid-cols-2 gap-2 mb-2">
                    <input type="text" value={item.icon || ''} onChange={e => { const items = [...section.content.items]; items[idx] = { ...items[idx], icon: e.target.value }; updateContent('items', items); }} placeholder="Icono" className={inputClass} />
                    <input type="text" value={item.title || ''} onChange={e => { const items = [...section.content.items]; items[idx] = { ...items[idx], title: e.target.value }; updateContent('items', items); }} placeholder="Título" className={inputClass} />
                  </div>
                  <textarea value={item.description || ''} onChange={e => { const items = [...section.content.items]; items[idx] = { ...items[idx], description: e.target.value }; updateContent('items', items); }} placeholder="Descripción" rows={2} className={inputClass} />
                  <button onClick={() => updateContent('items', section.content.items.filter((_: any, i: number) => i !== idx))} className="mt-2 text-xs text-red-500 hover:text-red-600">Eliminar</button>
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      {section.type === 'benefits' && (
        <>
          <div className="flex items-center justify-between mb-2">
            <label className={labelClass}>Título</label>
            <AIContentGenerator
              compact
              buttonLabel="IA"
              contentTypes={[{ id: 'landing-benefits', label: 'Beneficios', description: 'Lista de beneficios' }]}
              onContentGenerated={(content) => {
                if (Array.isArray(content)) {
                  updateContent('items', content.map((item: any) => ({ title: item.title, description: item.description })));
                }
              }}
            />
          </div>
          <input type="text" value={section.content.title || ''} onChange={e => updateContent('title', e.target.value)} className={inputClass} />
          <div className="mt-4">
            <div className="flex items-center justify-between mb-2">
              <label className={labelClass}>Beneficios</label>
              <button onClick={() => updateContent('items', [...(section.content.items || []), { title: 'Beneficio', description: 'Descripción' }])} className="text-xs text-blue-600 hover:text-blue-700">+ Agregar</button>
            </div>
            <div className="space-y-3 max-h-60 overflow-y-auto">
              {(section.content.items || []).map((item: any, idx: number) => (
                <div key={idx} className="p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                  <input type="text" value={item.title || ''} onChange={e => { const items = [...section.content.items]; items[idx] = { ...items[idx], title: e.target.value }; updateContent('items', items); }} placeholder="Título" className={`${inputClass} mb-2`} />
                  <textarea value={item.description || ''} onChange={e => { const items = [...section.content.items]; items[idx] = { ...items[idx], description: e.target.value }; updateContent('items', items); }} placeholder="Descripción" rows={2} className={inputClass} />
                  <button onClick={() => updateContent('items', section.content.items.filter((_: any, i: number) => i !== idx))} className="mt-2 text-xs text-red-500 hover:text-red-600">Eliminar</button>
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      {section.type === 'testimonials' && (
        <>
          <div className="flex items-center justify-between mb-2">
            <label className={labelClass}>Título</label>
            <AIContentGenerator
              compact
              buttonLabel="IA"
              contentTypes={[{ id: 'landing-testimonial', label: 'Testimonio', description: 'Cita de cliente' }]}
              onContentGenerated={(content) => {
                if (typeof content === 'object' && content.quote) {
                  updateContent('items', [...(section.content.items || []), { quote: content.quote, author: content.author, role: content.role, company: content.company }]);
                }
              }}
            />
          </div>
          <input type="text" value={section.content.title || ''} onChange={e => updateContent('title', e.target.value)} className={inputClass} />
          <div className="mt-4">
            <div className="flex items-center justify-between mb-2">
              <label className={labelClass}>Testimonios</label>
              <button onClick={() => updateContent('items', [...(section.content.items || []), { quote: 'Testimonio...', author: 'Nombre', role: 'Cargo', company: 'Empresa' }])} className="text-xs text-blue-600 hover:text-blue-700">+ Agregar</button>
            </div>
            <div className="space-y-3 max-h-60 overflow-y-auto">
              {(section.content.items || []).map((item: any, idx: number) => (
                <div key={idx} className="p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                  <textarea value={item.quote || ''} onChange={e => { const items = [...section.content.items]; items[idx] = { ...items[idx], quote: e.target.value }; updateContent('items', items); }} placeholder="Cita" rows={2} className={`${inputClass} mb-2`} />
                  <div className="grid grid-cols-3 gap-2">
                    <input type="text" value={item.author || ''} onChange={e => { const items = [...section.content.items]; items[idx] = { ...items[idx], author: e.target.value }; updateContent('items', items); }} placeholder="Nombre" className={inputClass} />
                    <input type="text" value={item.role || ''} onChange={e => { const items = [...section.content.items]; items[idx] = { ...items[idx], role: e.target.value }; updateContent('items', items); }} placeholder="Cargo" className={inputClass} />
                    <input type="text" value={item.company || ''} onChange={e => { const items = [...section.content.items]; items[idx] = { ...items[idx], company: e.target.value }; updateContent('items', items); }} placeholder="Empresa" className={inputClass} />
                  </div>
                  <button onClick={() => updateContent('items', section.content.items.filter((_: any, i: number) => i !== idx))} className="mt-2 text-xs text-red-500 hover:text-red-600">Eliminar</button>
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      {section.type === 'pricing' && (
        <>
          <div><label className={labelClass}>Título</label><input type="text" value={section.content.title || ''} onChange={e => updateContent('title', e.target.value)} className={inputClass} /></div>
          <div className="mt-4">
            <div className="flex items-center justify-between mb-2">
              <label className={labelClass}>Planes</label>
              <button onClick={() => updateContent('plans', [...(section.content.plans || []), { name: 'Plan', price: '$99', period: '/mes', features: ['Feature'], ctaText: 'Elegir', highlighted: false }])} className="text-xs text-blue-600 hover:text-blue-700">+ Agregar</button>
            </div>
            <div className="space-y-3 max-h-80 overflow-y-auto">
              {(section.content.plans || []).map((plan: any, idx: number) => (
                <div key={idx} className="p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                  <div className="grid grid-cols-2 gap-2 mb-2">
                    <input type="text" value={plan.name || ''} onChange={e => { const plans = [...section.content.plans]; plans[idx] = { ...plans[idx], name: e.target.value }; updateContent('plans', plans); }} placeholder="Nombre" className={inputClass} />
                    <input type="text" value={plan.price || ''} onChange={e => { const plans = [...section.content.plans]; plans[idx] = { ...plans[idx], price: e.target.value }; updateContent('plans', plans); }} placeholder="Precio" className={inputClass} />
                  </div>
                  <div className="grid grid-cols-2 gap-2 mb-2">
                    <input type="text" value={plan.period || ''} onChange={e => { const plans = [...section.content.plans]; plans[idx] = { ...plans[idx], period: e.target.value }; updateContent('plans', plans); }} placeholder="Período" className={inputClass} />
                    <input type="text" value={plan.ctaText || ''} onChange={e => { const plans = [...section.content.plans]; plans[idx] = { ...plans[idx], ctaText: e.target.value }; updateContent('plans', plans); }} placeholder="Texto botón" className={inputClass} />
                  </div>
                  <textarea value={(plan.features || []).join('\n')} onChange={e => { const plans = [...section.content.plans]; plans[idx] = { ...plans[idx], features: e.target.value.split('\n').filter(Boolean) }; updateContent('plans', plans); }} placeholder="Features (una por línea)" rows={3} className={`${inputClass} mb-2`} />
                  <label className="flex items-center gap-2 text-sm">
                    <input type="checkbox" checked={plan.highlighted || false} onChange={e => { const plans = [...section.content.plans]; plans[idx] = { ...plans[idx], highlighted: e.target.checked }; updateContent('plans', plans); }} className="rounded" />
                    <span className="text-gray-700 dark:text-gray-300">Destacado</span>
                  </label>
                  <button onClick={() => updateContent('plans', section.content.plans.filter((_: any, i: number) => i !== idx))} className="mt-2 text-xs text-red-500 hover:text-red-600">Eliminar plan</button>
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      {section.type === 'stats' && (
        <>
          <div className="flex items-center justify-between mb-2">
            <label className={labelClass}>Estadísticas</label>
            <AIContentGenerator
              compact
              buttonLabel="IA"
              contentTypes={[{ id: 'landing-stats', label: 'Stats', description: 'Métricas impactantes' }]}
              onContentGenerated={(content) => {
                if (Array.isArray(content)) {
                  updateContent('items', content.map((item: any) => ({ value: item.value, label: item.label })));
                }
              }}
            />
          </div>
          <button onClick={() => updateContent('items', [...(section.content.items || []), { value: '100+', label: 'Métrica' }])} className="text-xs text-blue-600 hover:text-blue-700 mb-2">+ Agregar</button>
          <div className="space-y-2 max-h-60 overflow-y-auto">
            {(section.content.items || []).map((item: any, idx: number) => (
              <div key={idx} className="flex items-center gap-2 p-2 bg-gray-50 dark:bg-gray-700 rounded">
                <input type="text" value={item.value || ''} onChange={e => { const items = [...section.content.items]; items[idx] = { ...items[idx], value: e.target.value }; updateContent('items', items); }} placeholder="Valor" className={`${inputClass} w-24`} />
                <input type="text" value={item.label || ''} onChange={e => { const items = [...section.content.items]; items[idx] = { ...items[idx], label: e.target.value }; updateContent('items', items); }} placeholder="Etiqueta" className={`${inputClass} flex-1`} />
                <button onClick={() => updateContent('items', section.content.items.filter((_: any, i: number) => i !== idx))} className="text-red-500 hover:text-red-600 text-xs">×</button>
              </div>
            ))}
          </div>
        </>
      )}

      {section.type === 'team' && (
        <>
          <div><label className={labelClass}>Título</label><input type="text" value={section.content.title || ''} onChange={e => updateContent('title', e.target.value)} className={inputClass} /></div>
          <div className="mt-4">
            <div className="flex items-center justify-between mb-2">
              <label className={labelClass}>Miembros</label>
              <button onClick={() => updateContent('members', [...(section.content.members || []), { name: 'Nombre', role: 'Cargo', image: '', bio: '' }])} className="text-xs text-blue-600 hover:text-blue-700">+ Agregar</button>
            </div>
            <div className="space-y-3 max-h-60 overflow-y-auto">
              {(section.content.members || []).map((member: any, idx: number) => (
                <div key={idx} className="p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                  <div className="grid grid-cols-2 gap-2 mb-2">
                    <input type="text" value={member.name || ''} onChange={e => { const members = [...section.content.members]; members[idx] = { ...members[idx], name: e.target.value }; updateContent('members', members); }} placeholder="Nombre" className={inputClass} />
                    <input type="text" value={member.role || ''} onChange={e => { const members = [...section.content.members]; members[idx] = { ...members[idx], role: e.target.value }; updateContent('members', members); }} placeholder="Cargo" className={inputClass} />
                  </div>
                  <input type="text" value={member.image || ''} onChange={e => { const members = [...section.content.members]; members[idx] = { ...members[idx], image: e.target.value }; updateContent('members', members); }} placeholder="URL de imagen" className={`${inputClass} mb-2`} />
                  <textarea value={member.bio || ''} onChange={e => { const members = [...section.content.members]; members[idx] = { ...members[idx], bio: e.target.value }; updateContent('members', members); }} placeholder="Biografía" rows={2} className={inputClass} />
                  <button onClick={() => updateContent('members', section.content.members.filter((_: any, i: number) => i !== idx))} className="mt-2 text-xs text-red-500 hover:text-red-600">Eliminar</button>
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      {section.type === 'gallery' && (
        <>
          <div><label className={labelClass}>Título</label><input type="text" value={section.content.title || ''} onChange={e => updateContent('title', e.target.value)} className={inputClass} /></div>
          <div><label className={labelClass}>Columnas</label>
            <select value={section.content.columns || 3} onChange={e => updateContent('columns', parseInt(e.target.value))} className={inputClass}>
              <option value={2}>2 columnas</option><option value={3}>3 columnas</option><option value={4}>4 columnas</option>
            </select>
          </div>
          <div className="mt-4">
            <div className="flex items-center justify-between mb-2">
              <label className={labelClass}>Imágenes</label>
              <button onClick={() => updateContent('items', [...(section.content.items || []), { url: '', caption: '' }])} className="text-xs text-blue-600 hover:text-blue-700">+ Agregar</button>
            </div>
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {(section.content.items || []).map((item: any, idx: number) => (
                <div key={idx} className="flex items-center gap-2 p-2 bg-gray-50 dark:bg-gray-700 rounded">
                  <input type="text" value={item.url || ''} onChange={e => { const items = [...section.content.items]; items[idx] = { ...items[idx], url: e.target.value }; updateContent('items', items); }} placeholder="URL imagen" className={`${inputClass} flex-1`} />
                  <input type="text" value={item.caption || ''} onChange={e => { const items = [...section.content.items]; items[idx] = { ...items[idx], caption: e.target.value }; updateContent('items', items); }} placeholder="Título" className={`${inputClass} w-32`} />
                  <button onClick={() => updateContent('items', section.content.items.filter((_: any, i: number) => i !== idx))} className="text-red-500 hover:text-red-600 text-xs">×</button>
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      {section.type === 'logos' && (
        <>
          <div><label className={labelClass}>Título</label><input type="text" value={section.content.title || ''} onChange={e => updateContent('title', e.target.value)} className={inputClass} placeholder="Empresas que confían en nosotros" /></div>
          <div className="mt-4">
            <div className="flex items-center justify-between mb-2">
              <label className={labelClass}>Logos</label>
              <button onClick={() => updateContent('logos', [...(section.content.logos || []), { url: '', alt: '', link: '' }])} className="text-xs text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300">+ Agregar Logo</button>
            </div>
            <div className="space-y-3 max-h-80 overflow-y-auto">
              {(section.content.logos || []).map((logo: any, idx: number) => (
                <div key={idx} className="p-3 bg-gray-50 dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-medium text-gray-500 dark:text-gray-400">Logo {idx + 1}</span>
                    <button onClick={() => updateContent('logos', section.content.logos.filter((_: any, i: number) => i !== idx))} className="text-red-500 hover:text-red-600 text-xs">Eliminar</button>
                  </div>
                  <div className="space-y-2">
                    <input type="text" value={logo.url || ''} onChange={e => { const logos = [...section.content.logos]; logos[idx] = { ...logos[idx], url: e.target.value }; updateContent('logos', logos); }} placeholder="URL de la imagen del logo" className={inputClass} />
                    <input type="text" value={logo.alt || ''} onChange={e => { const logos = [...section.content.logos]; logos[idx] = { ...logos[idx], alt: e.target.value }; updateContent('logos', logos); }} placeholder="Texto alternativo (nombre empresa)" className={inputClass} />
                    <input type="text" value={logo.link || ''} onChange={e => { const logos = [...section.content.logos]; logos[idx] = { ...logos[idx], link: e.target.value }; updateContent('logos', logos); }} placeholder="Enlace (opcional)" className={inputClass} />
                  </div>
                  {logo.url && (
                    <div className="mt-2 p-2 bg-white dark:bg-gray-800 rounded border">
                      <img src={logo.url} alt={logo.alt || 'Logo'} className="h-8 object-contain mx-auto" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                    </div>
                  )}
                </div>
              ))}
              {(!section.content.logos || section.content.logos.length === 0) && (
                <p className="text-xs text-gray-500 dark:text-gray-400 text-center py-4">No hay logos agregados. Haz clic en "+ Agregar Logo" para comenzar.</p>
              )}
            </div>
          </div>
        </>
      )}

      {section.type === 'countdown' && (
        <>
          <div><label className={labelClass}>Título</label><input type="text" value={section.content.title || ''} onChange={e => updateContent('title', e.target.value)} className={inputClass} /></div>
          <div><label className={labelClass}>Fecha objetivo</label><input type="datetime-local" value={section.content.targetDate ? new Date(section.content.targetDate).toISOString().slice(0, 16) : ''} onChange={e => updateContent('targetDate', new Date(e.target.value).toISOString())} className={inputClass} /></div>
          <div><label className={labelClass}>Subtítulo</label><input type="text" value={section.content.subtitle || ''} onChange={e => updateContent('subtitle', e.target.value)} placeholder="Texto debajo del countdown" className={inputClass} /></div>
        </>
      )}

      {section.type === 'divider' && (
        <div><label className={labelClass}>Estilo</label>
          <select value={section.content.style || 'solid'} onChange={e => updateContent('style', e.target.value)} className={inputClass}>
            <option value="solid">Sólido</option><option value="dashed">Guiones</option><option value="dotted">Puntos</option>
          </select>
        </div>
      )}

      {section.type === 'html' && (
        <>
          <div><label className={labelClass}>HTML</label><textarea value={section.content.html || ''} onChange={e => updateContent('html', e.target.value)} rows={6} className={`${inputClass} font-mono`} placeholder="<div>Tu HTML...</div>" /></div>
          <div><label className={labelClass}>CSS</label><textarea value={section.content.css || ''} onChange={e => updateContent('css', e.target.value)} rows={4} className={`${inputClass} font-mono`} placeholder=".clase { color: red; }" /></div>
        </>
      )}

      {section.type === 'header' && (
        <>
          <div><label className={labelClass}>Logo (texto)</label><input type="text" value={section.content.logoText || ''} onChange={e => updateContent('logoText', e.target.value)} className={inputClass} /></div>
          <div><label className={labelClass}>Logo (imagen URL)</label><input type="text" value={section.content.logoUrl || ''} onChange={e => updateContent('logoUrl', e.target.value)} placeholder="URL del logo" className={inputClass} /></div>
          <div className="grid grid-cols-2 gap-2 mt-2">
            <div><label className={labelClass}>Texto CTA</label><input type="text" value={section.content.ctaText || ''} onChange={e => updateContent('ctaText', e.target.value)} className={inputClass} /></div>
            <div><label className={labelClass}>URL CTA</label><input type="text" value={section.content.ctaUrl || ''} onChange={e => updateContent('ctaUrl', e.target.value)} className={inputClass} /></div>
          </div>
          <label className="flex items-center gap-2 mt-3 text-sm">
            <input type="checkbox" checked={section.content.sticky || false} onChange={e => updateContent('sticky', e.target.checked)} className="rounded" />
            <span className="text-gray-700 dark:text-gray-300">Header fijo (sticky)</span>
          </label>
          <div className="mt-4">
            <div className="flex items-center justify-between mb-2">
              <label className={labelClass}>Menú</label>
              <button onClick={() => updateContent('menuItems', [...(section.content.menuItems || []), { label: 'Link', url: '#' }])} className="text-xs text-blue-600 hover:text-blue-700">+ Agregar</button>
            </div>
            <div className="space-y-2 max-h-40 overflow-y-auto">
              {(section.content.menuItems || []).map((item: any, idx: number) => (
                <div key={idx} className="flex items-center gap-2">
                  <input type="text" value={item.label || ''} onChange={e => { const items = [...section.content.menuItems]; items[idx] = { ...items[idx], label: e.target.value }; updateContent('menuItems', items); }} placeholder="Texto" className={`${inputClass} flex-1`} />
                  <input type="text" value={item.url || ''} onChange={e => { const items = [...section.content.menuItems]; items[idx] = { ...items[idx], url: e.target.value }; updateContent('menuItems', items); }} placeholder="URL" className={`${inputClass} flex-1`} />
                  <button onClick={() => updateContent('menuItems', section.content.menuItems.filter((_: any, i: number) => i !== idx))} className="text-red-500 hover:text-red-600 text-xs">×</button>
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      {section.type === 'footer' && (
        <>
          <div><label className={labelClass}>Logo (texto)</label><input type="text" value={section.content.logoText || ''} onChange={e => updateContent('logoText', e.target.value)} className={inputClass} /></div>
          <div><label className={labelClass}>Descripción</label><textarea value={section.content.description || ''} onChange={e => updateContent('description', e.target.value)} rows={2} className={inputClass} /></div>
          <div><label className={labelClass}>Copyright</label><input type="text" value={section.content.copyright || ''} onChange={e => updateContent('copyright', e.target.value)} placeholder="© 2024 Empresa" className={inputClass} /></div>
          <div className="mt-4">
            <div className="flex items-center justify-between mb-2">
              <label className={labelClass}>Links</label>
              <button onClick={() => updateContent('links', [...(section.content.links || []), { label: 'Link', url: '#' }])} className="text-xs text-blue-600 hover:text-blue-700">+ Agregar</button>
            </div>
            <div className="space-y-2 max-h-40 overflow-y-auto">
              {(section.content.links || []).map((link: any, idx: number) => (
                <div key={idx} className="flex items-center gap-2">
                  <input type="text" value={link.label || ''} onChange={e => { const links = [...section.content.links]; links[idx] = { ...links[idx], label: e.target.value }; updateContent('links', links); }} placeholder="Texto" className={`${inputClass} flex-1`} />
                  <input type="text" value={link.url || ''} onChange={e => { const links = [...section.content.links]; links[idx] = { ...links[idx], url: e.target.value }; updateContent('links', links); }} placeholder="URL" className={`${inputClass} flex-1`} />
                  <button onClick={() => updateContent('links', section.content.links.filter((_: any, i: number) => i !== idx))} className="text-red-500 hover:text-red-600 text-xs">×</button>
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      {section.type === 'columns' && (
        <>
          <div><label className={labelClass}>Número de columnas</label>
            <select value={section.content.columns || 2} onChange={e => updateContent('columns', parseInt(e.target.value))} className={inputClass}>
              <option value={2}>2 columnas</option><option value={3}>3 columnas</option><option value={4}>4 columnas</option>
            </select>
          </div>
          <div><label className={labelClass}>Espacio entre columnas (px)</label><input type="number" value={section.content.gap || 24} onChange={e => updateContent('gap', parseInt(e.target.value))} className={inputClass} /></div>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">Las columnas se configuran arrastrando secciones dentro de ellas en el editor visual.</p>
        </>
      )}

      {/* Visibility */}
      <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Visibilidad</label>
        <div className="flex gap-4">
          <label className="flex items-center gap-2">
            <input type="checkbox" checked={section.visibility?.desktop !== false} onChange={e => onUpdate({ visibility: { desktop: e.target.checked, mobile: section.visibility?.mobile !== false } })} className="rounded" />
            <span className="text-sm text-gray-700 dark:text-gray-300">Desktop</span>
          </label>
          <label className="flex items-center gap-2">
            <input type="checkbox" checked={section.visibility?.mobile !== false} onChange={e => onUpdate({ visibility: { desktop: section.visibility?.desktop !== false, mobile: e.target.checked } })} className="rounded" />
            <span className="text-sm text-gray-700 dark:text-gray-300">Mobile</span>
          </label>
        </div>
      </div>
    </div>
  );
}
