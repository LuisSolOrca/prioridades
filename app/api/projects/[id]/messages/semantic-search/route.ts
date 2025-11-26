import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import connectDB from '@/lib/mongodb';
import ChannelMessage from '@/models/ChannelMessage';
import User from '@/models/User';

// Types for command data extraction
interface ExtractedContent {
  id: string;
  type: string;
  title: string;
  content: string;
  createdBy: string;
  createdAt: string;
  channelId: string;
}

// Extract searchable content from different command types
function extractCommandContent(message: any): ExtractedContent | null {
  if (!message.commandType || !message.commandData) return null;

  const base = {
    id: message._id.toString(),
    type: message.commandType,
    createdBy: message.userId?.name || 'Usuario',
    createdAt: message.createdAt,
    channelId: message.channelId?.toString() || ''
  };

  const data = message.commandData;

  switch (message.commandType) {
    case 'brainstorm':
      return {
        ...base,
        title: data.topic || data.title || 'Brainstorm',
        content: (data.ideas || []).map((i: any) => i.text || i.content || '').join(' | ')
      };

    case 'action-items':
      return {
        ...base,
        title: data.title || 'Action Items',
        content: (data.items || []).map((i: any) => `${i.text || ''} (${i.assignee || ''})`).join(' | ')
      };

    case 'five-whys':
      return {
        ...base,
        title: data.problem || data.title || '5 Whys',
        content: `Problema: ${data.problem || ''} | ${(data.whys || []).map((w: any) => w.answer || w).join(' -> ')} | Causa raíz: ${data.rootCause || ''}`
      };

    case 'poll':
    case 'blind-vote':
    case 'dot-voting':
      return {
        ...base,
        title: data.question || data.title || 'Votación',
        content: (data.options || []).map((o: any) => o.text || o).join(' | ')
      };

    case 'retrospective':
    case 'retro':
      const sections = data.sections || [];
      return {
        ...base,
        title: data.title || 'Retrospectiva',
        content: sections.map((s: any) =>
          `${s.title}: ${(s.items || []).map((i: any) => i.text || i.content || '').join(', ')}`
        ).join(' | ')
      };

    case 'decision-matrix':
      return {
        ...base,
        title: data.title || 'Matriz de Decisión',
        content: `Opciones: ${(data.options || []).join(', ')} | Criterios: ${(data.criteria || []).join(', ')}`
      };

    case 'mind-map':
      const extractNodes = (nodes: any[]): string =>
        (nodes || []).map((n: any) => `${n.text || n.label || ''} ${extractNodes(n.children || [])}`).join(' ');
      return {
        ...base,
        title: data.title || 'Mapa Mental',
        content: extractNodes(data.nodes || [])
      };

    case 'swot':
    case 'soar':
    case 'six-hats':
    case 'start-stop-continue':
    case 'rose-bud-thorn':
    case 'kalm':
    case 'hot-air-balloon':
      return {
        ...base,
        title: data.title || message.commandType.toUpperCase(),
        content: (data.sections || []).map((s: any) =>
          `${s.title}: ${(s.items || []).map((i: any) => i.text || i.content || '').join(', ')}`
        ).join(' | ')
      };

    case 'risk-matrix':
      return {
        ...base,
        title: data.title || 'Matriz de Riesgos',
        content: (data.risks || []).map((r: any) =>
          `${r.name || r.title}: ${r.description || ''} (Prob: ${r.probability}, Imp: ${r.impact})`
        ).join(' | ')
      };

    case 'rice':
      return {
        ...base,
        title: data.title || 'RICE Scoring',
        content: (data.items || []).map((i: any) =>
          `${i.name || i.title}: R=${i.reach} I=${i.impact} C=${i.confidence} E=${i.effort}`
        ).join(' | ')
      };

    case 'opportunity-tree':
      return {
        ...base,
        title: data.objective || data.title || 'Árbol de Oportunidades',
        content: `Objetivo: ${data.objective || ''} | ${(data.opportunities || []).map((o: any) => o.text || o.title || '').join(', ')}`
      };

    case 'fishbone':
      return {
        ...base,
        title: data.problem || data.title || 'Diagrama Ishikawa',
        content: `Problema: ${data.problem || ''} | ${(data.categories || []).map((c: any) =>
          `${c.title}: ${(c.causes || []).join(', ')}`
        ).join(' | ')}`
      };

    case 'lean-canvas':
      const blocks = data.blocks || {};
      return {
        ...base,
        title: data.title || 'Lean Canvas',
        content: Object.entries(blocks).map(([key, val]: [string, any]) =>
          `${key}: ${(val.items || []).map((i: any) => i.text || i).join(', ')}`
        ).join(' | ')
      };

    case 'customer-journey':
      return {
        ...base,
        title: data.title || 'Customer Journey',
        content: `Persona: ${data.persona || ''} | ${(data.stages || []).map((s: any) =>
          `${s.name}: ${(s.touchpoints || []).join(', ')} - Pain: ${(s.painPoints || []).join(', ')}`
        ).join(' | ')}`
      };

    case 'raci':
      return {
        ...base,
        title: data.title || 'RACI Matrix',
        content: `Roles: ${(data.roles || []).map((r: any) => r.name || r).join(', ')} | Tasks: ${(data.tasks || []).map((t: any) => t.name || t).join(', ')}`
      };

    case 'working-agreements':
      return {
        ...base,
        title: data.title || 'Working Agreements',
        content: (data.categories || []).map((c: any) =>
          `${c.title}: ${(c.agreements || []).map((a: any) => a.text || a).join(', ')}`
        ).join(' | ')
      };

    case 'standup':
      return {
        ...base,
        title: data.title || data.question || 'Daily Standup',
        content: (data.entries || []).map((e: any) =>
          `${e.userName || ''}: Ayer=${e.yesterday || ''}, Hoy=${e.today || ''}, Blockers=${e.blockers || ''}`
        ).join(' | ')
      };

    case 'kudos-wall':
      return {
        ...base,
        title: data.title || 'Kudos Wall',
        content: (data.kudos || []).map((k: any) =>
          `De ${k.fromUser || ''} a ${k.toUser || ''}: ${k.message || ''}`
        ).join(' | ')
      };

    case 'checklist':
      return {
        ...base,
        title: data.title || 'Checklist',
        content: (data.items || []).map((i: any) => `${i.checked ? '✓' : '○'} ${i.text || ''}`).join(' | ')
      };

    case 'parking-lot':
      return {
        ...base,
        title: data.title || 'Parking Lot',
        content: (data.items || []).map((i: any) => i.text || i.content || '').join(' | ')
      };

    case 'estimation-poker':
      return {
        ...base,
        title: data.topic || data.title || 'Planning Poker',
        content: `Topic: ${data.topic || ''} | Estimates: ${(data.estimates || []).map((e: any) => `${e.userName}: ${e.value}`).join(', ')}`
      };

    case 'team-health':
      return {
        ...base,
        title: data.title || 'Team Health Check',
        content: (data.areas || []).map((a: any) =>
          `${a.name}: avg ${a.votes?.length ? (a.votes.reduce((s: number, v: any) => s + (v.value || 0), 0) / a.votes.length).toFixed(1) : 'N/A'}`
        ).join(' | ')
      };

    // Default for other commands
    default:
      return {
        ...base,
        title: data.title || data.question || data.topic || message.commandType,
        content: JSON.stringify(data).substring(0, 500)
      };
  }
}

/**
 * POST /api/projects/[id]/messages/semantic-search
 * Búsqueda semántica usando Groq AI
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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
    const { query, channelId, limit = 10 } = body;

    if (!query || query.trim().length < 3) {
      return NextResponse.json({
        error: 'La búsqueda debe tener al menos 3 caracteres'
      }, { status: 400 });
    }

    // Build query to get messages with command data (dynamics)
    const messageQuery: any = {
      projectId: params.id,
      isDeleted: false,
      commandType: { $ne: null },
      commandData: { $ne: null }
    };

    if (channelId) {
      messageQuery.channelId = channelId;
    }

    // Get recent dynamics/commands (last 200)
    const messages = await ChannelMessage.find(messageQuery)
      .sort({ createdAt: -1 })
      .limit(200)
      .populate('userId', 'name email')
      .lean();

    // Also get regular messages that might be relevant
    const regularMessagesQuery: any = {
      projectId: params.id,
      isDeleted: false,
      commandType: null,
      content: { $exists: true, $ne: '' }
    };

    if (channelId) {
      regularMessagesQuery.channelId = channelId;
    }

    const regularMessages = await ChannelMessage.find(regularMessagesQuery)
      .sort({ createdAt: -1 })
      .limit(100)
      .populate('userId', 'name email')
      .lean();

    // Extract searchable content from dynamics
    const extractedDynamics = messages
      .map(extractCommandContent)
      .filter((c): c is ExtractedContent => c !== null);

    // Format regular messages
    const formattedRegularMessages = regularMessages.map((m: any) => ({
      id: m._id.toString(),
      type: 'message',
      title: 'Mensaje',
      content: m.content,
      createdBy: m.userId?.name || 'Usuario',
      createdAt: m.createdAt,
      channelId: m.channelId?.toString() || ''
    }));

    // Combine all content
    const allContent = [...extractedDynamics, ...formattedRegularMessages];

    if (allContent.length === 0) {
      return NextResponse.json({
        results: [],
        query,
        message: 'No hay contenido para buscar en este proyecto'
      });
    }

    // Build context for Groq
    const contentContext = allContent.map((item, idx) => (
      `[${idx}] Tipo: ${item.type} | Título: ${item.title} | Autor: ${item.createdBy} | Fecha: ${new Date(item.createdAt).toLocaleDateString('es-MX')}
Contenido: ${item.content.substring(0, 300)}${item.content.length > 300 ? '...' : ''}`
    )).join('\n\n');

    const systemPrompt = `Eres un asistente de búsqueda semántica experto. Tu tarea es encontrar contenido relevante basándote en el SIGNIFICADO y CONCEPTO de la consulta, no solo en palabras clave.

IMPORTANTE:
- Busca por significado semántico, no solo coincidencias de texto
- Considera sinónimos, conceptos relacionados y contexto
- Si la consulta habla de "reducir latencia", también considera contenido sobre "mejorar rendimiento", "optimización", "velocidad", etc.
- Si la consulta menciona "ideas del Q4", considera brainstorms, decisiones y action items de fechas recientes
- Prioriza contenido que responda directamente a la intención del usuario

Responde ÚNICAMENTE con un JSON array de los índices de los elementos más relevantes, ordenados por relevancia (máximo ${limit}).
Formato: [5, 12, 3, 8] (los números son los índices [N] del contenido)

Si no hay resultados relevantes, responde: []`;

    const userPrompt = `Consulta del usuario: "${query}"

Contenido disponible para buscar:

${contentContext}

Devuelve los índices de los ${limit} elementos más relevantes semánticamente para esta consulta.`;

    // Call Groq API
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
        max_tokens: 200,
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

    // Parse the response to get indices
    let relevantIndices: number[] = [];
    try {
      // Extract JSON array from response (handle potential text around it)
      const jsonMatch = responseText.match(/\[[\d,\s]*\]/);
      if (jsonMatch) {
        relevantIndices = JSON.parse(jsonMatch[0]);
      }
    } catch (parseError) {
      console.error('Error parsing Groq response:', responseText);
      relevantIndices = [];
    }

    // Get the relevant content items
    const results = relevantIndices
      .filter(idx => idx >= 0 && idx < allContent.length)
      .slice(0, limit)
      .map(idx => {
        const item = allContent[idx];
        // Find the original message for full data
        const originalMsg = item.type === 'message'
          ? regularMessages.find((m: any) => m._id.toString() === item.id)
          : messages.find((m: any) => m._id.toString() === item.id);

        return {
          _id: item.id,
          commandType: item.type,
          title: item.title,
          preview: item.content.substring(0, 200),
          createdBy: item.createdBy,
          createdAt: item.createdAt,
          channelId: item.channelId,
          relevanceScore: relevantIndices.indexOf(idx) + 1,
          // Include full message data for navigation
          fullMessage: originalMsg ? {
            _id: originalMsg._id,
            content: originalMsg.content,
            commandType: originalMsg.commandType,
            commandData: originalMsg.commandData,
            userId: originalMsg.userId,
            createdAt: originalMsg.createdAt
          } : null
        };
      });

    return NextResponse.json({
      results,
      query,
      totalSearched: allContent.length,
      aiModel: 'llama-3.3-70b-versatile'
    });

  } catch (error: any) {
    console.error('Error in semantic search:', error);
    return NextResponse.json({
      error: error.message || 'Error en la búsqueda semántica'
    }, { status: 500 });
  }
}
