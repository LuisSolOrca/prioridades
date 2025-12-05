'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import LandingPageEditor from '@/components/landing-pages/LandingPageEditor';
import {
  Layout,
  FileText,
  Rocket,
  Video,
  ShoppingBag,
  Clock,
  CheckCircle,
  Smartphone,
  Briefcase,
  Palette,
  Plus,
  ArrowRight,
  Loader2,
  Search,
  ChevronLeft,
} from 'lucide-react';

interface Template {
  slug: string;
  name: string;
  description: string;
  category: string;
  tags: string[];
  content: {
    sections: any[];
    globalStyles: any;
  };
  isSystem?: boolean;
}

interface Category {
  value: string;
  label: string;
  count: number;
}

const CATEGORY_ICONS: Record<string, any> = {
  lead_generation: FileText,
  product_launch: Rocket,
  webinar_event: Video,
  saas_software: Layout,
  ecommerce_promo: ShoppingBag,
  coming_soon: Clock,
  thank_you: CheckCircle,
  app_download: Smartphone,
  service_business: Briefcase,
  portfolio: Palette,
};

const CATEGORY_COLORS: Record<string, string> = {
  lead_generation: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  product_launch: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
  webinar_event: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
  saas_software: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400',
  ecommerce_promo: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  coming_soon: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
  thank_you: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  app_download: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-400',
  service_business: 'bg-slate-100 text-slate-700 dark:bg-slate-900/30 dark:text-slate-400',
  portfolio: 'bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-400',
};

function TemplateSelector() {
  const searchParams = useSearchParams();
  const templateParam = searchParams.get('template');

  const [templates, setTemplates] = useState<Template[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null);
  const [loadingTemplate, setLoadingTemplate] = useState(false);

  // If template is passed via URL, load it directly
  useEffect(() => {
    if (templateParam) {
      loadTemplateBySlug(templateParam);
    } else {
      fetchTemplates();
    }
  }, [templateParam]);

  const fetchTemplates = async () => {
    try {
      const params = new URLSearchParams();
      if (selectedCategory) params.set('category', selectedCategory);

      const res = await fetch(`/api/marketing/landing-templates?${params}`);
      const data = await res.json();

      setTemplates(data.templates || []);
      setCategories(data.categories || []);
    } catch (error) {
      console.error('Error fetching templates:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadTemplateBySlug = async (slug: string) => {
    setLoadingTemplate(true);
    try {
      const res = await fetch('/api/marketing/landing-templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'get', slug }),
      });

      if (res.ok) {
        const data = await res.json();
        setSelectedTemplate(data.template);
      }
    } catch (error) {
      console.error('Error loading template:', error);
    } finally {
      setLoadingTemplate(false);
    }
  };

  const handleSelectTemplate = async (template: Template) => {
    setLoadingTemplate(true);

    // If it's a system template, fetch full content
    if (template.isSystem) {
      try {
        const res = await fetch('/api/marketing/landing-templates', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'get', slug: template.slug }),
        });

        if (res.ok) {
          const data = await res.json();
          setSelectedTemplate(data.template);
        }
      } catch (error) {
        console.error('Error loading template:', error);
      }
    } else {
      setSelectedTemplate(template);
    }

    setLoadingTemplate(false);
  };

  const handleStartFromScratch = () => {
    setSelectedTemplate({
      slug: '',
      name: '',
      description: '',
      category: '',
      tags: [],
      content: {
        sections: [],
        globalStyles: {
          primaryColor: '#3B82F6',
          secondaryColor: '#10B981',
          backgroundColor: '#ffffff',
          textColor: '#1F2937',
          fontFamily: 'Inter, system-ui, sans-serif',
          containerWidth: 1200,
          borderRadius: 8,
        },
      },
    });
  };

  const filteredTemplates = templates.filter(t => {
    const matchesSearch =
      t.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.tags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesCategory = !selectedCategory || t.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  // If template is selected, show the editor
  if (selectedTemplate) {
    return (
      <LandingPageEditor
        initialData={{
          name: selectedTemplate.name ? `Copia de ${selectedTemplate.name}` : '',
          slug: '',
          title: selectedTemplate.name || '',
          description: selectedTemplate.description || '',
          sections: selectedTemplate.content.sections || [],
          globalStyles: selectedTemplate.content.globalStyles,
        }}
      />
    );
  }

  if (loading || loadingTemplate) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center">
            <Loader2 className="w-12 h-12 animate-spin text-blue-600 mx-auto mb-4" />
            <p className="text-gray-600 dark:text-gray-400">
              {loadingTemplate ? 'Cargando plantilla...' : 'Cargando plantillas...'}
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">

      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <Link
            href="/marketing/landing-pages"
            className="inline-flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white mb-4"
          >
            <ChevronLeft className="w-4 h-4" />
            Volver a Landing Pages
          </Link>

          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Crear Nueva Landing Page
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Elige una plantilla para comenzar o crea desde cero
          </p>
        </div>

        {/* Start from scratch option */}
        <div className="mb-8">
          <button
            onClick={handleStartFromScratch}
            className="w-full md:w-auto flex items-center gap-3 px-6 py-4 bg-white dark:bg-gray-800 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-xl hover:border-blue-500 dark:hover:border-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-all group"
          >
            <div className="p-3 bg-gray-100 dark:bg-gray-700 rounded-lg group-hover:bg-blue-100 dark:group-hover:bg-blue-900/30 transition-colors">
              <Plus className="w-6 h-6 text-gray-500 dark:text-gray-400 group-hover:text-blue-600 dark:group-hover:text-blue-400" />
            </div>
            <div className="text-left">
              <p className="font-semibold text-gray-900 dark:text-white">Crear desde cero</p>
              <p className="text-sm text-gray-500 dark:text-gray-400">Comienza con un lienzo en blanco</p>
            </div>
            <ArrowRight className="w-5 h-5 text-gray-400 group-hover:text-blue-600 dark:group-hover:text-blue-400 ml-auto" />
          </button>
        </div>

        {/* Divider */}
        <div className="flex items-center gap-4 mb-8">
          <div className="flex-1 h-px bg-gray-200 dark:bg-gray-700" />
          <span className="text-sm text-gray-500 dark:text-gray-400">o elige una plantilla</span>
          <div className="flex-1 h-px bg-gray-200 dark:bg-gray-700" />
        </div>

        {/* Search and filters */}
        <div className="flex flex-col md:flex-row gap-4 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar plantillas..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-500 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="">Todas las categorias</option>
            {categories.map(cat => (
              <option key={cat.value} value={cat.value}>
                {cat.label} ({cat.count})
              </option>
            ))}
          </select>
        </div>

        {/* Category pills */}
        <div className="flex flex-wrap gap-2 mb-8">
          <button
            onClick={() => setSelectedCategory('')}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
              !selectedCategory
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
            }`}
          >
            Todas
          </button>
          {categories.map(cat => {
            const Icon = CATEGORY_ICONS[cat.value] || Layout;
            return (
              <button
                key={cat.value}
                onClick={() => setSelectedCategory(cat.value)}
                className={`px-4 py-2 rounded-full text-sm font-medium transition-colors flex items-center gap-2 ${
                  selectedCategory === cat.value
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
                }`}
              >
                <Icon className="w-4 h-4" />
                {cat.label}
              </button>
            );
          })}
        </div>

        {/* Templates grid */}
        {filteredTemplates.length === 0 ? (
          <div className="text-center py-12">
            <Layout className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
            <p className="text-gray-500 dark:text-gray-400">
              No se encontraron plantillas con esos criterios
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredTemplates.map((template) => {
              const Icon = CATEGORY_ICONS[template.category] || Layout;
              const colorClass = CATEGORY_COLORS[template.category] || 'bg-gray-100 text-gray-700';

              return (
                <div
                  key={template.slug}
                  className="group bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden hover:shadow-lg hover:border-blue-300 dark:hover:border-blue-600 transition-all cursor-pointer"
                  onClick={() => handleSelectTemplate(template)}
                >
                  {/* Preview area */}
                  <div className="aspect-[16/10] bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-700 dark:to-gray-800 relative overflow-hidden">
                    <div className="absolute inset-4 bg-white dark:bg-gray-900 rounded-lg shadow-inner flex items-center justify-center">
                      <Icon className="w-16 h-16 text-gray-300 dark:text-gray-600" />
                    </div>

                    {/* Hover overlay */}
                    <div className="absolute inset-0 bg-blue-600/90 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <span className="text-white font-medium flex items-center gap-2">
                        Usar plantilla
                        <ArrowRight className="w-4 h-4" />
                      </span>
                    </div>
                  </div>

                  {/* Info */}
                  <div className="p-4">
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <h3 className="font-semibold text-gray-900 dark:text-white line-clamp-1">
                        {template.name}
                      </h3>
                      {template.isSystem && (
                        <span className="px-2 py-0.5 text-xs font-medium bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 rounded-full whitespace-nowrap">
                          Sistema
                        </span>
                      )}
                    </div>

                    <p className="text-sm text-gray-500 dark:text-gray-400 line-clamp-2 mb-3">
                      {template.description}
                    </p>

                    <div className="flex items-center justify-between">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${colorClass}`}>
                        {categories.find(c => c.value === template.category)?.label || template.category}
                      </span>
                      <span className="text-xs text-gray-400">
                        {template.content.sections?.length || 0} secciones
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

function LoadingEditor() {
  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
    </div>
  );
}

export default function NewLandingPage() {
  return (
    <Suspense fallback={<LoadingEditor />}>
      <TemplateSelector />
    </Suspense>
  );
}
