'use client';

import { useState, useEffect, useCallback, useRef, Suspense } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import Navbar from '@/components/Navbar';
import {
  Search,
  X,
  Loader2,
  CheckSquare,
  User,
  DollarSign,
  Building2,
  FolderKanban,
  Users,
  MessageSquare,
  MessageCircle,
  BarChart3,
  Package,
  Mail,
  Hash,
  Activity,
  FileText,
  Flag,
  FileInput,
  Workflow,
  Zap,
  Target,
  GitBranch,
  Layers,
  Building,
  Send,
  Award,
  Settings,
  Clock,
  ArrowRight,
  Sparkles,
  Brain,
} from 'lucide-react';
import { ENTITY_TYPE_LABELS, SearchableEntityType } from '@/lib/atlasSearch';

interface SearchResult {
  type: SearchableEntityType;
  id: string;
  title: string;
  subtitle?: string;
  url: string;
  icon: string;
  highlights: string[];
  score: number;
  metadata?: Record<string, any>;
}

interface GlobalSearchResponse {
  results: SearchResult[];
  counts: Record<string, number>;
  total: number;
}

// Mapeo de iconos
const ICON_MAP: Record<string, any> = {
  CheckSquare,
  User,
  DollarSign,
  Building2,
  FolderKanban,
  Users,
  MessageSquare,
  MessageCircle,
  BarChart3,
  Package,
  Mail,
  Hash,
  Activity,
  FileText,
  Flag,
  FileInput,
  Workflow,
  Zap,
  Target,
  GitBranch,
  Layers,
  Building,
  Send,
  Award,
  Settings,
};

// Tipos principales para filtros rápidos
const MAIN_FILTER_TYPES: SearchableEntityType[] = [
  'priority', 'contact', 'deal', 'client', 'project', 'user',
  'channelMessage', 'product', 'kpi',
];

function GlobalSearchContent() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  const inputRef = useRef<HTMLInputElement>(null);

  const [query, setQuery] = useState(searchParams.get('q') || '');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedTypes, setSelectedTypes] = useState<SearchableEntityType[]>([]);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [showAllTypes, setShowAllTypes] = useState(false);
  const [searchAll, setSearchAll] = useState(false);
  const [semanticMode, setSemanticMode] = useState(false);
  const [searchMode, setSearchMode] = useState<'text' | 'semantic'>('text');

  // Cargar búsquedas recientes del localStorage
  useEffect(() => {
    const stored = localStorage.getItem('recentSearches');
    if (stored) {
      try {
        setRecentSearches(JSON.parse(stored));
      } catch (e) {
        // Ignorar errores de parsing
      }
    }
  }, []);

  // Redirigir si no está autenticado
  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
    }
  }, [status, router]);

  // Focus en input al cargar
  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.focus();
    }
  }, []);

  // Buscar cuando cambia el query desde URL
  useEffect(() => {
    const urlQuery = searchParams.get('q');
    if (urlQuery && urlQuery !== query) {
      setQuery(urlQuery);
      performSearch(urlQuery);
    }
  }, [searchParams]);

  // Guardar búsqueda reciente
  const saveRecentSearch = (searchQuery: string) => {
    const updated = [
      searchQuery,
      ...recentSearches.filter(s => s !== searchQuery),
    ].slice(0, 10);
    setRecentSearches(updated);
    localStorage.setItem('recentSearches', JSON.stringify(updated));
  };

  // Realizar búsqueda
  const performSearch = useCallback(async (searchQuery: string) => {
    if (!searchQuery || searchQuery.length < 2) {
      setResults([]);
      setCounts({});
      return;
    }

    // Búsqueda semántica requiere mínimo 3 caracteres
    if (searchMode === 'semantic' && searchQuery.length < 3) {
      setResults([]);
      setCounts({});
      return;
    }

    setLoading(true);
    setError(null);

    try {
      let data: GlobalSearchResponse;

      if (searchMode === 'semantic') {
        // Búsqueda semántica con Groq
        const res = await fetch('/api/global-search/semantic', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            query: searchQuery,
            types: selectedTypes.length > 0 ? selectedTypes : undefined,
            limit: 20,
          }),
        });

        if (!res.ok) {
          const errorData = await res.json();
          throw new Error(errorData.error || 'Error en la búsqueda semántica');
        }

        data = await res.json();
      } else {
        // Búsqueda tradicional con Atlas Search
        const params = new URLSearchParams({ q: searchQuery });

        if (selectedTypes.length > 0) {
          params.set('types', selectedTypes.join(','));
        } else if (searchAll) {
          params.set('all', 'true');
        }

        params.set('limit', '50');

        const res = await fetch(`/api/global-search?${params}`);

        if (!res.ok) {
          const errorData = await res.json();
          throw new Error(errorData.error || 'Error en la búsqueda');
        }

        data = await res.json();
      }

      setResults(data.results);
      setCounts(data.counts);
      saveRecentSearch(searchQuery);
    } catch (err: any) {
      setError(err.message);
      setResults([]);
      setCounts({});
    } finally {
      setLoading(false);
    }
  }, [selectedTypes, searchAll, searchMode]);

  // Debounce para búsqueda
  useEffect(() => {
    const timer = setTimeout(() => {
      if (query.length >= 2) {
        performSearch(query);
        // Actualizar URL sin recargar
        const newUrl = query
          ? `/busquedaglobal?q=${encodeURIComponent(query)}`
          : '/busquedaglobal';
        window.history.replaceState({}, '', newUrl);
      } else {
        setResults([]);
        setCounts({});
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [query, performSearch]);

  // Re-buscar cuando cambian los filtros o el modo
  useEffect(() => {
    const minLength = searchMode === 'semantic' ? 3 : 2;
    if (query.length >= minLength) {
      performSearch(query);
    }
  }, [selectedTypes, searchAll, searchMode]);

  // Toggle tipo de filtro
  const toggleType = (type: SearchableEntityType) => {
    setSelectedTypes(prev =>
      prev.includes(type)
        ? prev.filter(t => t !== type)
        : [...prev, type]
    );
    setSearchAll(false);
  };

  // Limpiar búsqueda
  const clearSearch = () => {
    setQuery('');
    setResults([]);
    setCounts({});
    setSelectedTypes([]);
    setSearchAll(false);
    inputRef.current?.focus();
    window.history.replaceState({}, '', '/busquedaglobal');
  };

  // Obtener icono para un resultado
  const getIcon = (iconName: string) => {
    const IconComponent = ICON_MAP[iconName] || FileText;
    return IconComponent;
  };

  // Agrupar resultados por tipo
  const groupedResults = results.reduce((acc, result) => {
    if (!acc[result.type]) {
      acc[result.type] = [];
    }
    acc[result.type].push(result);
    return acc;
  }, {} as Record<string, SearchResult[]>);

  // Renderizar highlight con HTML
  const renderHighlight = (text: string) => {
    return { __html: text };
  };

  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Navbar />
      <div className="pt-16 main-content">
        <div className="max-w-4xl mx-auto px-4 py-8">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
              Búsqueda Global
            </h1>
            <p className="text-gray-500 dark:text-gray-400">
              Busca en prioridades, contactos, deals, proyectos, mensajes y más
            </p>
          </div>

          {/* Barra de búsqueda */}
          <div className="relative mb-4">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={searchMode === 'semantic'
                  ? "Buscar por conceptos... (ej: 'deals próximos a cerrar', 'problemas de rendimiento')"
                  : "Buscar en todo el sistema..."
                }
                className="w-full pl-12 pr-12 py-4 text-lg bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 dark:text-white placeholder-gray-400"
              />
              {(query || loading) && (
                <button
                  onClick={clearSearch}
                  className="absolute right-4 top-1/2 -translate-y-1/2 p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full"
                >
                  {loading ? (
                    <Loader2 className="w-5 h-5 text-gray-400 animate-spin" />
                  ) : (
                    <X className="w-5 h-5 text-gray-400" />
                  )}
                </button>
              )}
            </div>
          </div>

          {/* Toggle de modo de búsqueda */}
          <div className="flex items-center gap-4 mb-6">
            <div className="flex bg-gray-100 dark:bg-gray-800 rounded-lg p-1">
              <button
                onClick={() => setSearchMode('text')}
                className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all ${
                  searchMode === 'text'
                    ? 'bg-white dark:bg-gray-700 text-blue-600 dark:text-blue-400 shadow-sm'
                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
                }`}
              >
                <Search className="w-4 h-4" />
                Texto
              </button>
              <button
                onClick={() => setSearchMode('semantic')}
                className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all ${
                  searchMode === 'semantic'
                    ? 'bg-gradient-to-r from-purple-500 to-blue-500 text-white shadow-sm'
                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
                }`}
              >
                <Brain className="w-4 h-4" />
                Conceptos
                <Sparkles className="w-3 h-3" />
              </button>
            </div>
            {searchMode === 'semantic' && (
              <p className="text-sm text-purple-600 dark:text-purple-400 flex items-center gap-1">
                <Sparkles className="w-3 h-3" />
                Búsqueda inteligente con IA - entiende sinónimos y contexto
              </p>
            )}
          </div>

          {/* Filtros por tipo */}
          <div className="mb-6">
            <div className="flex flex-wrap gap-2 items-center">
              <button
                onClick={() => {
                  setSelectedTypes([]);
                  setSearchAll(false);
                }}
                className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                  selectedTypes.length === 0 && !searchAll
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
                }`}
              >
                Principales
              </button>

              <button
                onClick={() => {
                  setSelectedTypes([]);
                  setSearchAll(true);
                }}
                className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                  searchAll
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
                }`}
              >
                Todos
              </button>

              <div className="w-px h-6 bg-gray-300 dark:bg-gray-600 mx-1" />

              {MAIN_FILTER_TYPES.map((type) => {
                const IconComponent = getIcon(
                  type === 'priority' ? 'CheckSquare' :
                  type === 'contact' ? 'User' :
                  type === 'deal' ? 'DollarSign' :
                  type === 'client' ? 'Building2' :
                  type === 'project' ? 'FolderKanban' :
                  type === 'user' ? 'Users' :
                  type === 'channelMessage' ? 'MessageSquare' :
                  type === 'product' ? 'Package' :
                  'BarChart3'
                );
                return (
                  <button
                    key={type}
                    onClick={() => toggleType(type)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                      selectedTypes.includes(type)
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
                    }`}
                  >
                    <IconComponent className="w-3.5 h-3.5" />
                    {ENTITY_TYPE_LABELS[type]}
                    {counts[type] > 0 && (
                      <span className={`ml-1 text-xs ${
                        selectedTypes.includes(type) ? 'text-blue-200' : 'text-gray-500'
                      }`}>
                        ({counts[type]})
                      </span>
                    )}
                  </button>
                );
              })}

              <button
                onClick={() => setShowAllTypes(!showAllTypes)}
                className="px-3 py-1.5 rounded-full text-sm font-medium bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700"
              >
                {showAllTypes ? 'Menos' : 'Más...'}
              </button>
            </div>

            {/* Tipos adicionales expandidos */}
            {showAllTypes && (
              <div className="flex flex-wrap gap-2 mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
                {(Object.keys(ENTITY_TYPE_LABELS) as SearchableEntityType[])
                  .filter(t => !MAIN_FILTER_TYPES.includes(t))
                  .map((type) => (
                    <button
                      key={type}
                      onClick={() => toggleType(type)}
                      className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                        selectedTypes.includes(type)
                          ? 'bg-blue-600 text-white'
                          : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
                      }`}
                    >
                      {ENTITY_TYPE_LABELS[type]}
                      {counts[type] > 0 && (
                        <span className={`ml-1 text-xs ${
                          selectedTypes.includes(type) ? 'text-blue-200' : 'text-gray-500'
                        }`}>
                          ({counts[type]})
                        </span>
                      )}
                    </button>
                  ))}
              </div>
            )}
          </div>

          {/* Error */}
          {error && (
            <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-700 dark:text-red-300">
              {error}
            </div>
          )}

          {/* Resultados */}
          {query.length >= (searchMode === 'semantic' ? 3 : 2) ? (
            results.length > 0 ? (
              <div className="space-y-6">
                <p className="text-sm text-gray-500 dark:text-gray-400 flex items-center gap-2">
                  {searchMode === 'semantic' && <Brain className="w-4 h-4 text-purple-500" />}
                  {results.length} resultado{results.length !== 1 ? 's' : ''} encontrado{results.length !== 1 ? 's' : ''}
                  {searchMode === 'semantic' && ' por relevancia semántica'}
                </p>

                {Object.entries(groupedResults).map(([type, typeResults]) => (
                  <div key={type} className="space-y-2">
                    <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide flex items-center gap-2">
                      {(() => {
                        const IconComponent = getIcon(typeResults[0]?.icon || 'FileText');
                        return <IconComponent className="w-4 h-4" />;
                      })()}
                      {ENTITY_TYPE_LABELS[type as SearchableEntityType]} ({typeResults.length})
                    </h3>

                    <div className="space-y-2">
                      {typeResults.map((result) => {
                        const IconComponent = getIcon(result.icon);
                        return (
                          <Link
                            key={`${result.type}-${result.id}`}
                            href={result.url}
                            className="block bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4 hover:border-blue-300 dark:hover:border-blue-600 hover:shadow-md transition-all group"
                          >
                            <div className="flex items-start gap-3">
                              <div className="p-2 bg-gray-100 dark:bg-gray-700 rounded-lg group-hover:bg-blue-100 dark:group-hover:bg-blue-900/30 transition-colors">
                                <IconComponent className="w-5 h-5 text-gray-600 dark:text-gray-300 group-hover:text-blue-600 dark:group-hover:text-blue-400" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <h4 className="font-medium text-gray-900 dark:text-white truncate group-hover:text-blue-600 dark:group-hover:text-blue-400">
                                  {result.title}
                                </h4>
                                {result.subtitle && (
                                  <p className="text-sm text-gray-500 dark:text-gray-400 truncate">
                                    {result.subtitle}
                                  </p>
                                )}
                                {result.highlights.length > 0 && (
                                  <div className="mt-1 text-sm text-gray-600 dark:text-gray-300">
                                    {result.highlights.slice(0, 2).map((highlight, idx) => (
                                      <span
                                        key={idx}
                                        dangerouslySetInnerHTML={renderHighlight(highlight)}
                                        className="[&_mark]:bg-yellow-200 dark:[&_mark]:bg-yellow-800 [&_mark]:px-0.5 [&_mark]:rounded"
                                      />
                                    ))}
                                  </div>
                                )}
                              </div>
                              <ArrowRight className="w-5 h-5 text-gray-400 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors" />
                            </div>
                          </Link>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            ) : !loading ? (
              <div className="text-center py-12">
                {searchMode === 'semantic' ? (
                  <Brain className="w-12 h-12 text-purple-300 dark:text-purple-700 mx-auto mb-4" />
                ) : (
                  <Search className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
                )}
                <p className="text-gray-500 dark:text-gray-400">
                  No se encontraron resultados para "{query}"
                </p>
                <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">
                  {searchMode === 'semantic'
                    ? 'Intenta describir lo que buscas de otra manera'
                    : 'Intenta con otros términos o revisa los filtros'}
                </p>
              </div>
            ) : null
          ) : (
            /* Estado inicial - búsquedas recientes */
            <div className="space-y-6">
              {recentSearches.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide flex items-center gap-2 mb-3">
                    <Clock className="w-4 h-4" />
                    Búsquedas recientes
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {recentSearches.map((search, idx) => (
                      <button
                        key={idx}
                        onClick={() => setQuery(search)}
                        className="px-3 py-1.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm text-gray-700 dark:text-gray-300 hover:border-blue-300 dark:hover:border-blue-600 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                      >
                        {search}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div className="text-center py-8">
                {searchMode === 'semantic' ? (
                  <>
                    <Brain className="w-16 h-16 text-purple-200 dark:text-purple-800 mx-auto mb-4" />
                    <p className="text-gray-500 dark:text-gray-400">
                      Escribe al menos 3 caracteres para buscar por conceptos
                    </p>
                    <p className="text-sm text-purple-500 dark:text-purple-400 mt-2">
                      Ejemplos: "deals importantes", "tareas atrasadas", "clientes de tecnología"
                    </p>
                  </>
                ) : (
                  <>
                    <Search className="w-16 h-16 text-gray-200 dark:text-gray-700 mx-auto mb-4" />
                    <p className="text-gray-500 dark:text-gray-400">
                      Escribe al menos 2 caracteres para buscar
                    </p>
                  </>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Loading fallback component
function SearchLoadingFallback() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
      <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
    </div>
  );
}

// Export with Suspense boundary for useSearchParams
export default function GlobalSearchPage() {
  return (
    <Suspense fallback={<SearchLoadingFallback />}>
      <GlobalSearchContent />
    </Suspense>
  );
}