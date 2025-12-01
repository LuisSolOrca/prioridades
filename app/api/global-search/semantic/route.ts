import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import connectDB from '@/lib/mongodb';
import mongoose from 'mongoose';
import {
  SEARCHABLE_ENTITIES,
  SearchableEntityType,
  SearchResult,
  ENTITY_TYPE_LABELS,
  normalizeSearchResult,
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

// Tipos a buscar semánticamente (los más relevantes para búsqueda conceptual)
const SEMANTIC_SEARCH_TYPES: SearchableEntityType[] = [
  'priority', 'deal', 'client', 'project', 'kpi', 'product',
  'channelMessage', 'comment', 'activity', 'milestone',
];

// Límites
const MAX_ITEMS_PER_TYPE = 30;
const MAX_TOTAL_CONTEXT = 150;
const MAX_RESULTS = 20;

interface ExtractedContent {
  index: number;
  type: SearchableEntityType;
  id: string;
  title: string;
  content: string;
  url: string;
  icon: string;
  metadata?: Record<string, any>;
}

/**
 * Extrae contenido buscable de un documento según su tipo
 */
function extractSearchableContent(
  type: SearchableEntityType,
  doc: any,
  index: number
): ExtractedContent {
  const config = SEARCHABLE_ENTITIES[type];

  // Construir título
  let title = '';
  if (type === 'contact') {
    title = `${doc.firstName || ''} ${doc.lastName || ''}`.trim();
  } else {
    title = doc[config.titleField] || doc.name || doc.title || 'Sin título';
  }

  // Construir contenido para búsqueda semántica
  let contentParts: string[] = [title];

  // Agregar campos de búsqueda
  config.searchFields.forEach(field => {
    if (field.includes('.')) {
      const [parent, child] = field.split('.');
      if (doc[parent]?.[child]) {
        contentParts.push(String(doc[parent][child]));
      }
    } else if (doc[field] && doc[field] !== title) {
      contentParts.push(String(doc[field]));
    }
  });

  // Agregar campos específicos por tipo
  switch (type) {
    case 'priority':
      if (doc.status) contentParts.push(`Estado: ${doc.status}`);
      if (doc.completionPercentage !== undefined) contentParts.push(`${doc.completionPercentage}% completado`);
      break;
    case 'deal':
      if (doc.value) contentParts.push(`Valor: $${doc.value.toLocaleString()}`);
      if (doc.stage) contentParts.push(`Etapa: ${doc.stage}`);
      break;
    case 'client':
      if (doc.industry) contentParts.push(`Industria: ${doc.industry}`);
      if (doc.size) contentParts.push(`Tamaño: ${doc.size}`);
      break;
    case 'kpi':
      if (doc.strategicObjective) contentParts.push(`Objetivo: ${doc.strategicObjective}`);
      if (doc.unit) contentParts.push(`Unidad: ${doc.unit}`);
      break;
    case 'product':
      if (doc.category) contentParts.push(`Categoría: ${doc.category}`);
      if (doc.price) contentParts.push(`Precio: $${doc.price}`);
      break;
    case 'activity':
      if (doc.type) contentParts.push(`Tipo: ${doc.type}`);
      if (doc.outcome) contentParts.push(`Resultado: ${doc.outcome}`);
      break;
    case 'channelMessage':
      if (doc.voiceMessage?.transcription) {
        contentParts.push(`Transcripción: ${doc.voiceMessage.transcription}`);
      }
      break;
  }

  const content = contentParts.filter(Boolean).join(' | ').substring(0, 500);

  return {
    index,
    type,
    id: doc._id?.toString() || '',
    title: title.substring(0, 200),
    content,
    url: generateUrl(type, doc),
    icon: config.icon,
    metadata: {
      createdAt: doc.createdAt,
      updatedAt: doc.updatedAt,
      status: doc.status,
    },
  };
}

/**
 * Genera la URL para un resultado
 */
function generateUrl(type: SearchableEntityType, doc: any): string {
  const config = SEARCHABLE_ENTITIES[type];
  let url = config.urlPattern;

  url = url.replace('{id}', doc._id?.toString() || '');
  url = url.replace('{projectId}', doc.projectId?.toString() || '');
  url = url.replace('{channelId}', doc.channelId?.toString() || '');
  url = url.replace('{priorityId}', doc.priorityId?.toString() || '');

  return url;
}

/**
 * POST /api/global-search/semantic
 *
 * Búsqueda semántica global usando Groq AI
 * Entiende conceptos, sinónimos y contexto
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) {
      return NextResponse.json({
        error: 'API Key de Groq no configurada. Contacta al administrador.'
      }, { status: 500 });
    }

    await connectDB();

    const body = await request.json();
    const { query, types, limit = MAX_RESULTS } = body;

    if (!query || query.trim().length < 3) {
      return NextResponse.json({
        error: 'La búsqueda debe tener al menos 3 caracteres'
      }, { status: 400 });
    }

    // Determinar tipos a buscar
    const typesToSearch: SearchableEntityType[] = types && types.length > 0
      ? types.filter((t: string): t is SearchableEntityType => t in SEARCHABLE_ENTITIES)
      : SEMANTIC_SEARCH_TYPES;

    const db = mongoose.connection.db;
    if (!db) {
      return NextResponse.json({ error: 'Database not connected' }, { status: 500 });
    }

    // Obtener documentos recientes de cada tipo
    const allContent: ExtractedContent[] = [];
    let globalIndex = 0;

    for (const type of typesToSearch) {
      try {
        const config = SEARCHABLE_ENTITIES[type];
        const collection = db.collection(config.collection);

        // Obtener documentos recientes
        const docs = await collection
          .find({})
          .sort({ updatedAt: -1, createdAt: -1 })
          .limit(MAX_ITEMS_PER_TYPE)
          .toArray();

        for (const doc of docs) {
          if (globalIndex >= MAX_TOTAL_CONTEXT) break;
          allContent.push(extractSearchableContent(type, doc, globalIndex));
          globalIndex++;
        }

        if (globalIndex >= MAX_TOTAL_CONTEXT) break;
      } catch (err) {
        console.error(`Error fetching ${type}:`, err);
      }
    }

    if (allContent.length === 0) {
      return NextResponse.json({
        results: [],
        query,
        message: 'No hay contenido para buscar'
      });
    }

    // Construir contexto para Groq
    const contentContext = allContent.map((item) => (
      `[${item.index}] ${ENTITY_TYPE_LABELS[item.type]}: ${item.title}
${item.content.substring(0, 250)}`
    )).join('\n\n');

    const systemPrompt = `Eres un asistente de búsqueda semántica experto para un sistema empresarial. Tu tarea es encontrar contenido relevante basándote en el SIGNIFICADO y CONCEPTO de la consulta, no solo en palabras clave.

IMPORTANTE - Busca por significado semántico:
- Si buscan "ventas del trimestre", considera deals, KPIs de ventas, reportes
- Si buscan "problemas de rendimiento", considera prioridades bloqueadas, KPIs bajos, actividades de troubleshooting
- Si buscan "clientes importantes", considera deals de alto valor, clientes con múltiples proyectos
- Si buscan "pendientes urgentes", considera prioridades en riesgo, deals próximos a cerrar
- Si buscan "comunicación con cliente X", considera mensajes, actividades, comentarios relacionados
- Considera sinónimos: "ingresos" = "ventas" = "revenue", "problema" = "issue" = "bloqueo"
- Entiende el contexto empresarial: CRM, KPIs, prioridades, proyectos

Prioriza resultados que:
1. Responden directamente a la intención del usuario
2. Son recientes o activos
3. Tienen mayor relevancia semántica

Responde ÚNICAMENTE con un JSON array de los índices más relevantes, ordenados por relevancia.
Formato: [5, 12, 3, 8] (máximo ${limit} resultados)
Si no hay resultados relevantes: []`;

    const userPrompt = `Consulta del usuario: "${query}"

Contenido disponible:

${contentContext}

Devuelve los índices de los ${limit} elementos más relevantes semánticamente.`;

    // Llamar a Groq API
    const groqResponse = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.1,
        max_tokens: 300,
      }),
    });

    if (!groqResponse.ok) {
      const errorData = await groqResponse.json();
      console.error('Groq API error:', errorData);
      return NextResponse.json({
        error: 'Error al comunicarse con la IA'
      }, { status: 500 });
    }

    const groqData = await groqResponse.json();
    const responseText = groqData.choices[0]?.message?.content?.trim() || '[]';

    // Parsear respuesta para obtener índices
    let relevantIndices: number[] = [];
    try {
      const jsonMatch = responseText.match(/\[[\d,\s]*\]/);
      if (jsonMatch) {
        relevantIndices = JSON.parse(jsonMatch[0]);
      }
    } catch (parseError) {
      console.error('Error parsing Groq response:', responseText);
      relevantIndices = [];
    }

    // Construir resultados
    const results: SearchResult[] = relevantIndices
      .filter(idx => idx >= 0 && idx < allContent.length)
      .slice(0, limit)
      .map((idx, position) => {
        const item = allContent[idx];
        return {
          type: item.type,
          id: item.id,
          title: item.title,
          subtitle: item.content.substring(0, 150),
          url: item.url,
          icon: item.icon,
          highlights: [],
          score: 100 - position, // Score basado en posición de relevancia
          metadata: {
            ...item.metadata,
            semanticRank: position + 1,
          },
        };
      });

    // Contar por tipo
    const counts: Record<string, number> = {};
    results.forEach(r => {
      counts[r.type] = (counts[r.type] || 0) + 1;
    });

    return NextResponse.json({
      results,
      counts,
      total: results.length,
      query,
      searchedItems: allContent.length,
      aiModel: 'llama-3.3-70b-versatile',
      mode: 'semantic',
    });

  } catch (error: any) {
    console.error('Error in semantic search:', error);
    return NextResponse.json({
      error: error.message || 'Error en la búsqueda semántica'
    }, { status: 500 });
  }
}
