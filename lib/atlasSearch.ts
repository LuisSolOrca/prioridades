/**
 * MongoDB Atlas Search Helpers
 *
 * Este módulo proporciona helpers para construir pipelines de agregación
 * con $search para MongoDB Atlas Search, ofreciendo capacidades similares
 * a Elasticsearch: fuzzy matching, highlighting, scoring y autocompletado.
 */

import mongoose from 'mongoose';

// Tipos de entidades buscables
export type SearchableEntityType =
  | 'priority' | 'contact' | 'deal' | 'client' | 'project' | 'user'
  | 'channelMessage' | 'comment' | 'kpi' | 'product' | 'emailTemplate'
  | 'channel' | 'activity' | 'quote' | 'milestone' | 'webForm'
  | 'workflow' | 'crmWorkflow' | 'strategicInitiative' | 'pipeline'
  | 'pipelineStage' | 'competitor' | 'emailSequence' | 'badge' | 'customField';

// Configuración de cada entidad buscable
export interface SearchableEntityConfig {
  model: string;
  collection: string;
  searchFields: string[];
  titleField: string;
  subtitleFields?: string[];
  urlPattern: string;
  icon: string;
  priority: number; // Para ordenar resultados (mayor = más importante)
}

// Configuración de todas las entidades buscables
export const SEARCHABLE_ENTITIES: Record<SearchableEntityType, SearchableEntityConfig> = {
  // Alta prioridad
  priority: {
    model: 'Priority',
    collection: 'priorities',
    searchFields: ['title', 'description'],
    titleField: 'title',
    subtitleFields: ['description'],
    urlPattern: '/priorities-kanban',
    icon: 'CheckSquare',
    priority: 100,
  },
  contact: {
    model: 'Contact',
    collection: 'contacts',
    searchFields: ['firstName', 'lastName', 'email', 'phone', 'position'],
    titleField: 'firstName',
    subtitleFields: ['position', 'email'],
    urlPattern: '/crm/contacts/{id}',
    icon: 'User',
    priority: 95,
  },
  deal: {
    model: 'Deal',
    collection: 'deals',
    searchFields: ['title', 'description'],
    titleField: 'title',
    subtitleFields: ['description'],
    urlPattern: '/crm/deals',
    icon: 'DollarSign',
    priority: 90,
  },
  client: {
    model: 'Client',
    collection: 'clients',
    searchFields: ['name', 'description', 'industry', 'crmNotes'],
    titleField: 'name',
    subtitleFields: ['industry', 'description'],
    urlPattern: '/crm/clients/{id}',
    icon: 'Building2',
    priority: 85,
  },
  project: {
    model: 'Project',
    collection: 'projects',
    searchFields: ['name', 'description', 'purpose'],
    titleField: 'name',
    subtitleFields: ['description'],
    urlPattern: '/projects/{id}',
    icon: 'FolderKanban',
    priority: 80,
  },
  user: {
    model: 'User',
    collection: 'users',
    searchFields: ['name', 'email', 'area'],
    titleField: 'name',
    subtitleFields: ['email', 'area'],
    urlPattern: '/admin/users',
    icon: 'Users',
    priority: 75,
  },
  channelMessage: {
    model: 'ChannelMessage',
    collection: 'channelmessages',
    searchFields: ['content', 'voiceMessage.transcription'],
    titleField: 'content',
    subtitleFields: [],
    urlPattern: '/projects/{projectId}/channels/{channelId}',
    icon: 'MessageSquare',
    priority: 70,
  },
  comment: {
    model: 'Comment',
    collection: 'comments',
    searchFields: ['text'],
    titleField: 'text',
    subtitleFields: [],
    urlPattern: '/priorities/{priorityId}',
    icon: 'MessageCircle',
    priority: 65,
  },
  // Media prioridad
  kpi: {
    model: 'KPI',
    collection: 'kpis',
    searchFields: ['name', 'description', 'strategicObjective'],
    titleField: 'name',
    subtitleFields: ['strategicObjective'],
    urlPattern: '/admin/kpis',
    icon: 'BarChart3',
    priority: 60,
  },
  product: {
    model: 'Product',
    collection: 'products',
    searchFields: ['name', 'description', 'sku', 'category'],
    titleField: 'name',
    subtitleFields: ['sku', 'category'],
    urlPattern: '/crm/products',
    icon: 'Package',
    priority: 55,
  },
  emailTemplate: {
    model: 'EmailTemplate',
    collection: 'emailtemplates',
    searchFields: ['name', 'description', 'subject', 'body'],
    titleField: 'name',
    subtitleFields: ['subject'],
    urlPattern: '/crm/email-templates',
    icon: 'Mail',
    priority: 50,
  },
  channel: {
    model: 'Channel',
    collection: 'channels',
    searchFields: ['name', 'description'],
    titleField: 'name',
    subtitleFields: ['description'],
    urlPattern: '/projects/{projectId}/channels/{id}',
    icon: 'Hash',
    priority: 45,
  },
  activity: {
    model: 'Activity',
    collection: 'activities',
    searchFields: ['title', 'description', 'outcome'],
    titleField: 'title',
    subtitleFields: ['outcome'],
    urlPattern: '/crm/activities',
    icon: 'Activity',
    priority: 40,
  },
  quote: {
    model: 'Quote',
    collection: 'quotes',
    searchFields: ['title'],
    titleField: 'title',
    subtitleFields: [],
    urlPattern: '/crm/quotes/{id}',
    icon: 'FileText',
    priority: 35,
  },
  milestone: {
    model: 'Milestone',
    collection: 'milestones',
    searchFields: ['title', 'description'],
    titleField: 'title',
    subtitleFields: ['description'],
    urlPattern: '/milestones',
    icon: 'Flag',
    priority: 30,
  },
  webForm: {
    model: 'WebForm',
    collection: 'webforms',
    searchFields: ['name', 'title', 'description'],
    titleField: 'name',
    subtitleFields: ['title'],
    urlPattern: '/crm/web-forms',
    icon: 'FileInput',
    priority: 25,
  },
  workflow: {
    model: 'Workflow',
    collection: 'workflows',
    searchFields: ['name', 'description'],
    titleField: 'name',
    subtitleFields: ['description'],
    urlPattern: '/admin/workflows',
    icon: 'Workflow',
    priority: 20,
  },
  crmWorkflow: {
    model: 'CRMWorkflow',
    collection: 'crmworkflows',
    searchFields: ['name', 'description'],
    titleField: 'name',
    subtitleFields: ['description'],
    urlPattern: '/crm/workflows',
    icon: 'Zap',
    priority: 15,
  },
  strategicInitiative: {
    model: 'StrategicInitiative',
    collection: 'strategicinitiatives',
    searchFields: ['name', 'description'],
    titleField: 'name',
    subtitleFields: ['description'],
    urlPattern: '/admin/initiatives',
    icon: 'Target',
    priority: 10,
  },
  pipeline: {
    model: 'Pipeline',
    collection: 'pipelines',
    searchFields: ['name', 'description'],
    titleField: 'name',
    subtitleFields: ['description'],
    urlPattern: '/crm/pipelines',
    icon: 'GitBranch',
    priority: 8,
  },
  pipelineStage: {
    model: 'PipelineStage',
    collection: 'pipelinestages',
    searchFields: ['name'],
    titleField: 'name',
    subtitleFields: [],
    urlPattern: '/crm/pipeline-stages',
    icon: 'Layers',
    priority: 5,
  },
  competitor: {
    model: 'Competitor',
    collection: 'competitors',
    searchFields: ['name', 'description', 'website'],
    titleField: 'name',
    subtitleFields: ['website'],
    urlPattern: '/crm/competitors',
    icon: 'Building',
    priority: 4,
  },
  emailSequence: {
    model: 'EmailSequence',
    collection: 'emailsequences',
    searchFields: ['name', 'description'],
    titleField: 'name',
    subtitleFields: ['description'],
    urlPattern: '/crm/sequences',
    icon: 'Send',
    priority: 3,
  },
  badge: {
    model: 'Badge',
    collection: 'badges',
    searchFields: ['name', 'description'],
    titleField: 'name',
    subtitleFields: ['description'],
    urlPattern: '/admin/badges',
    icon: 'Award',
    priority: 2,
  },
  customField: {
    model: 'CustomField',
    collection: 'customfields',
    searchFields: ['name', 'label'],
    titleField: 'name',
    subtitleFields: ['label'],
    urlPattern: '/crm/custom-fields',
    icon: 'Settings',
    priority: 1,
  },
};

// Resultado de búsqueda normalizado
export interface SearchResult {
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

// Opciones de búsqueda
export interface SearchOptions {
  query: string;
  types?: SearchableEntityType[];
  limit?: number;
  fuzzy?: boolean;
  fuzzyMaxEdits?: number;
}

// Resultado de búsqueda global
export interface GlobalSearchResult {
  results: SearchResult[];
  counts: Record<string, number>;
  total: number;
}

/**
 * Construye el pipeline de agregación $search para Atlas Search
 */
export function buildAtlasSearchPipeline(
  config: SearchableEntityConfig,
  query: string,
  limit: number = 10,
  fuzzy: boolean = true,
  fuzzyMaxEdits: number = 1
): any[] {
  const searchStage: any = {
    $search: {
      index: 'global_search',
      compound: {
        should: [
          // Búsqueda en campos principales con boost
          {
            text: {
              query: query,
              path: config.searchFields.filter(f =>
                f === config.titleField || f === 'name' || f === 'title'
              ),
              score: { boost: { value: 3 } },
              ...(fuzzy && { fuzzy: { maxEdits: fuzzyMaxEdits } }),
            },
          },
          // Búsqueda en campos secundarios
          {
            text: {
              query: query,
              path: config.searchFields,
              ...(fuzzy && { fuzzy: { maxEdits: fuzzyMaxEdits } }),
            },
          },
        ],
      },
      highlight: {
        path: config.searchFields,
      },
    },
  };

  return [
    searchStage,
    { $limit: limit },
    {
      $project: {
        _id: 1,
        ...config.searchFields.reduce((acc, field) => ({ ...acc, [field]: 1 }), {}),
        score: { $meta: 'searchScore' },
        highlights: { $meta: 'searchHighlights' },
        // Campos adicionales para contexto
        clientId: 1,
        projectId: 1,
        channelId: 1,
        priorityId: 1,
        createdAt: 1,
        updatedAt: 1,
        status: 1,
        isActive: 1,
      },
    },
  ];
}

/**
 * Construye un pipeline de búsqueda con $regex como fallback
 * cuando Atlas Search no está disponible
 */
export function buildRegexSearchPipeline(
  config: SearchableEntityConfig,
  query: string,
  limit: number = 10
): any[] {
  const escapedQuery = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

  const orConditions = config.searchFields.map(field => ({
    [field]: { $regex: escapedQuery, $options: 'i' },
  }));

  return [
    { $match: { $or: orConditions } },
    { $limit: limit },
    {
      $project: {
        _id: 1,
        ...config.searchFields.reduce((acc, field) => ({ ...acc, [field]: 1 }), {}),
        score: { $literal: 1 }, // Score fijo para regex
        clientId: 1,
        projectId: 1,
        channelId: 1,
        priorityId: 1,
        createdAt: 1,
        updatedAt: 1,
        status: 1,
        isActive: 1,
      },
    },
    { $sort: { updatedAt: -1 } },
  ];
}

/**
 * Extrae highlights del resultado de Atlas Search
 */
export function extractHighlights(highlights: any[]): string[] {
  if (!highlights || !Array.isArray(highlights)) return [];

  return highlights.map(h => {
    if (h.texts && Array.isArray(h.texts)) {
      return h.texts.map((t: any) =>
        t.type === 'hit' ? `<mark>${t.value}</mark>` : t.value
      ).join('');
    }
    return '';
  }).filter(Boolean);
}

/**
 * Genera la URL para un resultado basado en su tipo y datos
 */
export function generateResultUrl(
  type: SearchableEntityType,
  result: any
): string {
  const config = SEARCHABLE_ENTITIES[type];
  let url = config.urlPattern;

  // Reemplazar placeholders
  url = url.replace('{id}', result._id?.toString() || '');
  url = url.replace('{projectId}', result.projectId?.toString() || '');
  url = url.replace('{channelId}', result.channelId?.toString() || '');
  url = url.replace('{priorityId}', result.priorityId?.toString() || '');

  return url;
}

/**
 * Normaliza un resultado de MongoDB a SearchResult
 */
export function normalizeSearchResult(
  type: SearchableEntityType,
  doc: any,
  useAtlasSearch: boolean = false
): SearchResult {
  const config = SEARCHABLE_ENTITIES[type];

  // Construir título
  let title = '';
  if (type === 'contact') {
    title = `${doc.firstName || ''} ${doc.lastName || ''}`.trim();
  } else {
    title = doc[config.titleField] || doc.name || doc.title || 'Sin título';
  }

  // Construir subtítulo
  let subtitle = '';
  if (config.subtitleFields && config.subtitleFields.length > 0) {
    subtitle = config.subtitleFields
      .map(f => doc[f])
      .filter(Boolean)
      .join(' • ');
  }

  // Extraer highlights
  const highlights = useAtlasSearch && doc.highlights
    ? extractHighlights(doc.highlights)
    : [];

  return {
    type,
    id: doc._id?.toString() || '',
    title: title.substring(0, 200), // Limitar longitud
    subtitle: subtitle.substring(0, 300),
    url: generateResultUrl(type, doc),
    icon: config.icon,
    highlights,
    score: doc.score || config.priority,
    metadata: {
      createdAt: doc.createdAt,
      updatedAt: doc.updatedAt,
      status: doc.status,
      isActive: doc.isActive,
    },
  };
}

/**
 * Verifica si Atlas Search está disponible para una colección
 */
export async function isAtlasSearchAvailable(
  collection: any
): Promise<boolean> {
  try {
    // Intentar una búsqueda simple para verificar si el índice existe
    const result = await collection.aggregate([
      {
        $search: {
          index: 'global_search',
          text: {
            query: 'test',
            path: { wildcard: '*' },
          },
        },
      },
      { $limit: 1 },
    ]).toArray();
    return true;
  } catch (error: any) {
    // Si el índice no existe, Atlas devuelve un error específico
    if (error.message?.includes('index not found') ||
        error.code === 31082 ||
        error.message?.includes('$search')) {
      return false;
    }
    throw error;
  }
}

/**
 * Definiciones de índices Atlas Search para cada colección
 * Usar estas definiciones para crear los índices en MongoDB Atlas
 */
export const ATLAS_SEARCH_INDEX_DEFINITIONS: Record<string, any> = {
  // Generamos las definiciones dinámicamente
  ...Object.entries(SEARCHABLE_ENTITIES).reduce((acc, [type, config]) => {
    acc[config.collection] = {
      name: 'global_search',
      definition: {
        mappings: {
          dynamic: false,
          fields: config.searchFields.reduce((fields: any, field: string) => {
            // Determinar el tipo de analyzer según el campo
            if (field === 'email') {
              fields[field] = { type: 'string', analyzer: 'lucene.keyword' };
            } else if (field.includes('.')) {
              // Campos anidados
              const [parent, child] = field.split('.');
              if (!fields[parent]) fields[parent] = { type: 'document', fields: {} };
              fields[parent].fields[child] = { type: 'string', analyzer: 'lucene.spanish' };
            } else {
              fields[field] = [
                { type: 'string', analyzer: 'lucene.spanish' },
                { type: 'autocomplete', analyzer: 'lucene.standard' },
              ];
            }
            return fields;
          }, {}),
        },
      },
    };
    return acc;
  }, {} as Record<string, any>),
};

// Labels para mostrar en UI
export const ENTITY_TYPE_LABELS: Record<SearchableEntityType, string> = {
  priority: 'Prioridades',
  contact: 'Contactos',
  deal: 'Deals',
  client: 'Clientes',
  project: 'Proyectos',
  user: 'Usuarios',
  channelMessage: 'Mensajes',
  comment: 'Comentarios',
  kpi: 'KPIs',
  product: 'Productos',
  emailTemplate: 'Plantillas de Email',
  channel: 'Canales',
  activity: 'Actividades',
  quote: 'Cotizaciones',
  milestone: 'Hitos',
  webForm: 'Formularios Web',
  workflow: 'Workflows',
  crmWorkflow: 'Workflows CRM',
  strategicInitiative: 'Iniciativas',
  pipeline: 'Pipelines',
  pipelineStage: 'Etapas',
  competitor: 'Competidores',
  emailSequence: 'Secuencias',
  badge: 'Insignias',
  customField: 'Campos Personalizados',
};
