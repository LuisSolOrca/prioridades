import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import connectDB from '@/lib/mongodb';
import mongoose from 'mongoose';
import {
  SEARCHABLE_ENTITIES,
  SearchableEntityType,
  SearchResult,
  GlobalSearchResult,
  buildAtlasSearchPipeline,
  buildRegexSearchPipeline,
  normalizeSearchResult,
  isAtlasSearchAvailable,
} from '@/lib/atlasSearch';

// Importar todos los modelos necesarios
import '@/models/Priority';
import '@/models/Contact';
import '@/models/Deal';
import '@/models/Client';
import '@/models/Project';
import '@/models/User';
import '@/models/ChannelMessage';
import '@/models/Comment';
import '@/models/KPI';
import '@/models/Product';
import '@/models/EmailTemplate';
import '@/models/Channel';
import '@/models/Activity';
import '@/models/Quote';
import '@/models/Milestone';
import '@/models/WebForm';
import '@/models/Workflow';
import '@/models/CRMWorkflow';
import '@/models/StrategicInitiative';
import '@/models/Pipeline';
import '@/models/PipelineStage';
import '@/models/Competitor';
import '@/models/EmailSequence';
import '@/models/Badge';
import '@/models/CustomField';

export const dynamic = 'force-dynamic';

// Entidades por defecto para búsqueda (alta prioridad)
const DEFAULT_SEARCH_TYPES: SearchableEntityType[] = [
  'priority', 'contact', 'deal', 'client', 'project', 'user',
  'channelMessage', 'comment', 'kpi', 'product',
];

// Límite máximo de resultados por tipo
const MAX_RESULTS_PER_TYPE = 10;
const MAX_TOTAL_RESULTS = 50;

/**
 * GET /api/global-search
 *
 * Parámetros:
 * - q: string (requerido) - Término de búsqueda
 * - types: string (opcional) - Tipos separados por coma (ej: "contact,deal,client")
 * - limit: number (opcional) - Límite total de resultados (default: 20)
 * - fuzzy: boolean (opcional) - Activar fuzzy matching (default: true)
 * - all: boolean (opcional) - Buscar en todos los tipos (default: false)
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    await connectDB();

    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q')?.trim();
    const typesParam = searchParams.get('types');
    const limitParam = parseInt(searchParams.get('limit') || '20', 10);
    const fuzzy = searchParams.get('fuzzy') !== 'false';
    const searchAll = searchParams.get('all') === 'true';

    // Validar query
    if (!query || query.length < 2) {
      return NextResponse.json(
        { error: 'El término de búsqueda debe tener al menos 2 caracteres' },
        { status: 400 }
      );
    }

    // Determinar tipos a buscar
    let typesToSearch: SearchableEntityType[];
    if (searchAll) {
      typesToSearch = Object.keys(SEARCHABLE_ENTITIES) as SearchableEntityType[];
    } else if (typesParam) {
      typesToSearch = typesParam.split(',').filter(
        (t): t is SearchableEntityType => t in SEARCHABLE_ENTITIES
      );
    } else {
      typesToSearch = DEFAULT_SEARCH_TYPES;
    }

    if (typesToSearch.length === 0) {
      return NextResponse.json(
        { error: 'No se especificaron tipos de búsqueda válidos' },
        { status: 400 }
      );
    }

    // Calcular límite por tipo
    const limit = Math.min(limitParam, MAX_TOTAL_RESULTS);
    const limitPerType = Math.min(
      Math.ceil(limit / typesToSearch.length),
      MAX_RESULTS_PER_TYPE
    );

    // Ejecutar búsquedas en paralelo
    const searchPromises = typesToSearch.map(async (type) => {
      try {
        const config = SEARCHABLE_ENTITIES[type];
        const db = mongoose.connection.db;
        if (!db) throw new Error('Database not connected');

        const collection = db.collection(config.collection);

        // Intentar Atlas Search primero, si falla usar regex
        let results: any[] = [];
        let useAtlasSearch = false;

        try {
          // Verificar si Atlas Search está disponible
          const atlasAvailable = await isAtlasSearchAvailable(collection);

          if (atlasAvailable) {
            const pipeline = buildAtlasSearchPipeline(
              config,
              query,
              limitPerType,
              fuzzy
            );
            results = await collection.aggregate(pipeline).toArray();
            useAtlasSearch = true;
          } else {
            // Fallback a regex
            const pipeline = buildRegexSearchPipeline(config, query, limitPerType);
            results = await collection.aggregate(pipeline).toArray();
          }
        } catch (searchError) {
          // Si Atlas Search falla, usar regex como fallback
          console.warn(`Atlas Search failed for ${type}, using regex fallback:`, searchError);
          const pipeline = buildRegexSearchPipeline(config, query, limitPerType);
          results = await collection.aggregate(pipeline).toArray();
        }

        // Normalizar resultados
        const normalizedResults = results.map(doc =>
          normalizeSearchResult(type, doc, useAtlasSearch)
        );

        return {
          type,
          results: normalizedResults,
          count: normalizedResults.length,
        };
      } catch (error) {
        console.error(`Error searching ${type}:`, error);
        return {
          type,
          results: [],
          count: 0,
          error: true,
        };
      }
    });

    const searchResults = await Promise.all(searchPromises);

    // Combinar y ordenar resultados
    let allResults: SearchResult[] = [];
    const counts: Record<string, number> = {};

    for (const { type, results, count } of searchResults) {
      allResults = allResults.concat(results);
      counts[type] = count;
    }

    // Ordenar por score (de mayor a menor) y luego por prioridad del tipo
    allResults.sort((a, b) => {
      if (b.score !== a.score) {
        return b.score - a.score;
      }
      return SEARCHABLE_ENTITIES[b.type].priority - SEARCHABLE_ENTITIES[a.type].priority;
    });

    // Limitar resultados totales
    allResults = allResults.slice(0, limit);

    const response: GlobalSearchResult = {
      results: allResults,
      counts,
      total: allResults.length,
    };

    return NextResponse.json(response);
  } catch (error: any) {
    console.error('Error in global search:', error);
    return NextResponse.json(
      { error: error.message || 'Error en la búsqueda' },
      { status: 500 }
    );
  }
}
