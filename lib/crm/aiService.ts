/**
 * CRM AI Service - Centralized AI helper for CRM features
 * Uses Groq API with llama-3.3-70b-versatile model
 */

const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';
const DEFAULT_MODEL = 'llama-3.3-70b-versatile';

interface GroqMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

interface GroqResponse {
  choices: Array<{
    message: {
      content: string;
    };
  }>;
}

/**
 * Call Groq API with the given messages
 */
export async function callGroqAPI(
  messages: GroqMessage[],
  options: {
    temperature?: number;
    maxTokens?: number;
    model?: string;
  } = {}
): Promise<string> {
  const apiKey = process.env.GROQ_API_KEY;

  if (!apiKey) {
    throw new Error('GROQ_API_KEY no está configurada');
  }

  const { temperature = 0.7, maxTokens = 2000, model = DEFAULT_MODEL } = options;

  const response = await fetch(GROQ_API_URL, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      messages,
      temperature,
      max_tokens: maxTokens,
    }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    console.error('Groq API error:', errorData);
    throw new Error('Error al comunicarse con la IA');
  }

  const data: GroqResponse = await response.json();
  return data.choices[0]?.message?.content?.trim() || '';
}

/**
 * Generate a personalized email for a deal or contact
 */
export async function generateEmail(params: {
  dealTitle?: string;
  dealValue?: number;
  dealStage?: string;
  clientName?: string;
  contactName?: string;
  contactEmail?: string;
  emailType: 'introduction' | 'followup' | 'proposal' | 'closing' | 'reactivation' | 'custom';
  customInstructions?: string;
  previousInteractions?: string[];
  tone?: 'formal' | 'casual' | 'persuasive';
  language?: string;
}): Promise<{ subject: string; body: string }> {
  const {
    dealTitle,
    dealValue,
    dealStage,
    clientName,
    contactName,
    contactEmail,
    emailType,
    customInstructions,
    previousInteractions = [],
    tone = 'formal',
    language = 'español',
  } = params;

  const emailTypeInstructions: Record<string, string> = {
    introduction: 'Email de presentación inicial para establecer contacto y generar interés.',
    followup: 'Email de seguimiento después de una reunión o conversación previa.',
    proposal: 'Email para presentar o acompañar una propuesta comercial.',
    closing: 'Email para cerrar el deal y confirmar los siguientes pasos.',
    reactivation: 'Email para reactivar un contacto o deal que ha estado inactivo.',
    custom: customInstructions || 'Email personalizado según las instrucciones.',
  };

  const toneInstructions: Record<string, string> = {
    formal: 'Tono profesional y formal, manteniendo la cortesía empresarial.',
    casual: 'Tono amigable y cercano, pero manteniendo profesionalismo.',
    persuasive: 'Tono persuasivo enfocado en beneficios y valor para el cliente.',
  };

  const systemPrompt = `Eres un experto en ventas B2B y comunicación comercial. Tu tarea es generar emails profesionales y efectivos para el equipo de ventas.

Reglas:
- Escribe en ${language}
- ${toneInstructions[tone]}
- Sé conciso pero completo
- Incluye un call-to-action claro
- Personaliza el mensaje con la información disponible
- NO uses placeholders genéricos como [NOMBRE] - usa los datos reales proporcionados
- El email debe sentirse natural y personalizado

Responde SIEMPRE en formato JSON con esta estructura exacta:
{
  "subject": "Asunto del email",
  "body": "Cuerpo del email con saltos de línea usando \\n"
}`;

  const contextParts: string[] = [];

  if (clientName) contextParts.push(`Empresa: ${clientName}`);
  if (contactName) contextParts.push(`Contacto: ${contactName}`);
  if (dealTitle) contextParts.push(`Oportunidad: ${dealTitle}`);
  if (dealValue) contextParts.push(`Valor: $${dealValue.toLocaleString()}`);
  if (dealStage) contextParts.push(`Etapa actual: ${dealStage}`);

  if (previousInteractions.length > 0) {
    contextParts.push(`\nInteracciones previas:\n${previousInteractions.map(i => `- ${i}`).join('\n')}`);
  }

  const userPrompt = `Genera un email de tipo: ${emailTypeInstructions[emailType]}

Contexto:
${contextParts.join('\n')}

${emailType === 'custom' && customInstructions ? `Instrucciones adicionales: ${customInstructions}` : ''}

Genera el email en formato JSON.`;

  const result = await callGroqAPI(
    [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ],
    { temperature: 0.7, maxTokens: 1000 }
  );

  try {
    // Extract JSON from response (handle markdown code blocks)
    const jsonMatch = result.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
    throw new Error('No se encontró JSON válido en la respuesta');
  } catch {
    // Fallback: try to extract subject and body manually
    const lines = result.split('\n');
    return {
      subject: lines[0]?.replace(/^(Asunto|Subject):?\s*/i, '') || 'Seguimiento',
      body: lines.slice(1).join('\n').trim() || result,
    };
  }
}

/**
 * Generate an intelligent summary for a deal or client
 */
export async function generateSummary(params: {
  entityType: 'deal' | 'client' | 'contact';
  entityData: {
    name?: string;
    title?: string;
    value?: number;
    stage?: string;
    probability?: number;
    createdAt?: string;
    expectedCloseDate?: string;
    industry?: string;
    size?: string;
    source?: string;
  };
  activities?: Array<{
    type: string;
    title: string;
    date: string;
    outcome?: string;
  }>;
  notes?: string[];
  products?: Array<{ name: string; quantity: number; price: number }>;
  customFields?: Record<string, any>;
}): Promise<{
  executiveSummary: string;
  keyInsights: string[];
  risks: string[];
  opportunities: string[];
  recommendedActions: string[];
}> {
  const { entityType, entityData, activities = [], notes = [], products = [], customFields = {} } = params;

  const entityLabels = {
    deal: 'oportunidad de venta',
    client: 'cliente',
    contact: 'contacto',
  };

  const systemPrompt = `Eres un analista de ventas experto. Tu tarea es generar resúmenes ejecutivos inteligentes de ${entityLabels[entityType]}s para ayudar al equipo comercial.

Analiza toda la información proporcionada y genera un resumen estructurado que incluya:
1. Resumen ejecutivo (2-3 oraciones)
2. Insights clave (3-5 puntos)
3. Riesgos identificados (si los hay)
4. Oportunidades detectadas
5. Acciones recomendadas

Responde SIEMPRE en formato JSON con esta estructura exacta:
{
  "executiveSummary": "Resumen ejecutivo en 2-3 oraciones",
  "keyInsights": ["Insight 1", "Insight 2", "Insight 3"],
  "risks": ["Riesgo 1", "Riesgo 2"],
  "opportunities": ["Oportunidad 1", "Oportunidad 2"],
  "recommendedActions": ["Acción 1", "Acción 2", "Acción 3"]
}`;

  const dataParts: string[] = [];

  if (entityData.name || entityData.title) {
    dataParts.push(`Nombre: ${entityData.name || entityData.title}`);
  }
  if (entityData.value) dataParts.push(`Valor: $${entityData.value.toLocaleString()}`);
  if (entityData.stage) dataParts.push(`Etapa: ${entityData.stage}`);
  if (entityData.probability) dataParts.push(`Probabilidad: ${entityData.probability}%`);
  if (entityData.createdAt) dataParts.push(`Creado: ${new Date(entityData.createdAt).toLocaleDateString('es-MX')}`);
  if (entityData.expectedCloseDate) dataParts.push(`Cierre esperado: ${new Date(entityData.expectedCloseDate).toLocaleDateString('es-MX')}`);
  if (entityData.industry) dataParts.push(`Industria: ${entityData.industry}`);
  if (entityData.size) dataParts.push(`Tamaño: ${entityData.size}`);
  if (entityData.source) dataParts.push(`Fuente: ${entityData.source}`);

  if (activities.length > 0) {
    dataParts.push(`\nActividades recientes (${activities.length}):`);
    activities.slice(0, 10).forEach(a => {
      dataParts.push(`- ${a.date}: ${a.type} - ${a.title}${a.outcome ? ` (${a.outcome})` : ''}`);
    });
  }

  if (notes.length > 0) {
    dataParts.push(`\nNotas:`);
    notes.slice(0, 5).forEach(n => dataParts.push(`- ${n}`));
  }

  if (products.length > 0) {
    dataParts.push(`\nProductos/Servicios:`);
    products.forEach(p => dataParts.push(`- ${p.name}: ${p.quantity} x $${p.price.toLocaleString()}`));
  }

  if (Object.keys(customFields).length > 0) {
    dataParts.push(`\nCampos adicionales:`);
    Object.entries(customFields).forEach(([k, v]) => dataParts.push(`- ${k}: ${v}`));
  }

  const userPrompt = `Analiza esta ${entityLabels[entityType]} y genera un resumen inteligente:

${dataParts.join('\n')}

Responde en formato JSON.`;

  const result = await callGroqAPI(
    [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ],
    { temperature: 0.5, maxTokens: 1500 }
  );

  try {
    const jsonMatch = result.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
    throw new Error('No se encontró JSON válido');
  } catch {
    return {
      executiveSummary: result.slice(0, 300),
      keyInsights: ['No se pudieron extraer insights estructurados'],
      risks: [],
      opportunities: [],
      recommendedActions: ['Revisar la información manualmente'],
    };
  }
}

/**
 * Generate next best action recommendations
 */
export async function generateNextBestAction(params: {
  deals: Array<{
    id: string;
    title: string;
    value: number;
    stage: string;
    status?: 'open' | 'won' | 'lost';
    probability?: number;
    daysInStage: number;
    lastActivityDate?: string;
    lastActivityType?: string;
    clientName?: string;
    contactName?: string;
    expectedCloseDate?: string;
  }>;
  userContext?: {
    name?: string;
    totalDeals?: number;
    wonThisMonth?: number;
    quota?: number;
  };
}): Promise<Array<{
  dealId: string;
  dealTitle: string;
  priority: 'high' | 'medium' | 'low';
  action: string;
  reason: string;
  suggestedDate?: string;
  actionType: 'call' | 'email' | 'meeting' | 'proposal' | 'followup' | 'close' | 'other';
}>> {
  const { deals, userContext } = params;

  const systemPrompt = `Eres un coach de ventas experto en priorización y gestión de pipeline. Tu tarea es analizar los deals y recomendar la siguiente mejor acción para cada uno.

IMPORTANTE: Los deals pueden estar en diferentes estados:
- OPEN (abierto): Deals activos en el pipeline de ventas
- WON (ganado): Deals cerrados exitosamente - recomendar seguimiento post-venta, upsells, solicitar referidos, check-ins de satisfacción
- LOST (perdido): Deals perdidos - considerar reactivación si ha pasado tiempo

Para deals ABIERTOS considera:
- Deals estancados (muchos días sin actividad o en la misma etapa)
- Deals de alto valor que necesitan atención
- Deals próximos a su fecha de cierre esperada
- Deals con baja actividad reciente
- El contexto del vendedor (si está cerca de su cuota, priorizar cierres)

Para deals GANADOS considera:
- Seguimiento post-venta para asegurar satisfacción
- Oportunidades de upsell o cross-sell
- Solicitar referidos o testimonios
- Renovaciones si aplica
- Check-ins periódicos para mantener la relación

Para deals PERDIDOS considera:
- Si han pasado más de 30 días, considerar reactivación
- Analizar si las circunstancias han cambiado

Prioridades:
- HIGH: Acción urgente requerida (deal en riesgo, fecha de cierre próxima, alto valor, cliente ganado sin seguimiento)
- MEDIUM: Acción importante pero no urgente
- LOW: Mantenimiento regular del pipeline

Responde SIEMPRE en formato JSON como array:
[
  {
    "dealId": "id del deal",
    "dealTitle": "título del deal",
    "priority": "high|medium|low",
    "action": "Descripción clara de la acción recomendada",
    "reason": "Por qué se recomienda esta acción",
    "suggestedDate": "YYYY-MM-DD (opcional)",
    "actionType": "call|email|meeting|proposal|followup|close|other"
  }
]`;

  const dealsInfo = deals.map(d => {
    const daysSinceActivity = d.lastActivityDate
      ? Math.floor((Date.now() - new Date(d.lastActivityDate).getTime()) / (1000 * 60 * 60 * 24))
      : null;

    const statusLabel = d.status === 'won' ? '✅ GANADO' : d.status === 'lost' ? '❌ PERDIDO' : '🔄 ABIERTO';

    return `- ${d.title} (${d.clientName || 'Sin cliente'}) [${statusLabel}]
  Valor: $${d.value.toLocaleString()} | Etapa: ${d.stage} | Prob: ${d.probability || 'N/A'}%
  Días en etapa: ${d.daysInStage} | Última actividad: ${daysSinceActivity !== null ? `hace ${daysSinceActivity} días (${d.lastActivityType})` : 'Sin actividad'}
  Cierre esperado: ${d.expectedCloseDate ? new Date(d.expectedCloseDate).toLocaleDateString('es-MX') : 'No definido'}
  ID: ${d.id}`;
  }).join('\n\n');

  let contextInfo = '';
  if (userContext) {
    contextInfo = `\nContexto del vendedor:
- Nombre: ${userContext.name || 'N/A'}
- Deals activos: ${userContext.totalDeals || deals.length}
- Ganados este mes: ${userContext.wonThisMonth || 0}
- Cuota: ${userContext.quota ? `$${userContext.quota.toLocaleString()}` : 'N/A'}`;
  }

  const userPrompt = `Analiza estos deals y recomienda la siguiente mejor acción para cada uno:

${dealsInfo}
${contextInfo}

Ordena las recomendaciones por prioridad (high primero). Responde en formato JSON.`;

  const result = await callGroqAPI(
    [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ],
    { temperature: 0.4, maxTokens: 2500 }
  );

  try {
    const jsonMatch = result.match(/\[[\s\S]*\]/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
    throw new Error('No se encontró JSON válido');
  } catch {
    return deals.map(d => ({
      dealId: d.id,
      dealTitle: d.title,
      priority: 'medium' as const,
      action: 'Revisar estado del deal y dar seguimiento',
      reason: 'No se pudo generar recomendación específica',
      actionType: 'followup' as const,
    }));
  }
}

/**
 * Predict deal close probability using AI analysis
 */
export async function predictDealClose(params: {
  deal: {
    title: string;
    value: number;
    stage: string;
    currentProbability?: number;
    daysInPipeline: number;
    daysInCurrentStage: number;
    expectedCloseDate?: string;
    source?: string;
  };
  client?: {
    name: string;
    industry?: string;
    size?: string;
    previousDeals?: number;
    wonDeals?: number;
  };
  activities: Array<{
    type: string;
    date: string;
    outcome?: string;
  }>;
  competitors?: string[];
  historicalData?: {
    avgDaysToClose: number;
    avgDealValue: number;
    stageConversionRates: Record<string, number>;
    winRateBySource?: Record<string, number>;
  };
}): Promise<{
  predictedProbability: number;
  confidence: 'high' | 'medium' | 'low';
  factors: Array<{
    factor: string;
    impact: 'positive' | 'negative' | 'neutral';
    weight: number;
    explanation: string;
  }>;
  prediction: 'likely_win' | 'uncertain' | 'at_risk' | 'likely_loss';
  recommendations: string[];
  estimatedCloseDate?: string;
}> {
  const { deal, client, activities, competitors = [], historicalData } = params;

  const systemPrompt = `Eres un analista predictivo de ventas con experiencia en forecasting. Tu tarea es analizar un deal y predecir su probabilidad de cierre basándote en múltiples factores.

Factores a considerar:
1. Etapa actual y tiempo en el pipeline
2. Actividad reciente (cantidad y tipo)
3. Valor del deal vs promedio histórico
4. Historial del cliente (si existe)
5. Presencia de competidores
6. Proximidad a fecha de cierre esperada
7. Datos históricos de conversión

Niveles de confianza:
- HIGH: Suficientes datos históricos y señales claras
- MEDIUM: Datos moderados, algunas incertidumbres
- LOW: Pocos datos, predicción más especulativa

Predicciones:
- likely_win: >70% probabilidad
- uncertain: 40-70% probabilidad
- at_risk: 20-40% probabilidad
- likely_loss: <20% probabilidad

Responde SIEMPRE en formato JSON:
{
  "predictedProbability": 65,
  "confidence": "medium",
  "factors": [
    {
      "factor": "Nombre del factor",
      "impact": "positive|negative|neutral",
      "weight": 0.25,
      "explanation": "Explicación breve"
    }
  ],
  "prediction": "likely_win|uncertain|at_risk|likely_loss",
  "recommendations": ["Recomendación 1", "Recomendación 2"],
  "estimatedCloseDate": "YYYY-MM-DD (opcional)"
}`;

  const dealInfo = `Deal: ${deal.title}
Valor: $${deal.value.toLocaleString()}
Etapa actual: ${deal.stage}
Probabilidad asignada: ${deal.currentProbability || 'No definida'}%
Días en pipeline: ${deal.daysInPipeline}
Días en etapa actual: ${deal.daysInCurrentStage}
Fecha cierre esperada: ${deal.expectedCloseDate || 'No definida'}
Fuente: ${deal.source || 'No especificada'}`;

  const clientInfo = client ? `
Cliente: ${client.name}
Industria: ${client.industry || 'N/A'}
Tamaño: ${client.size || 'N/A'}
Deals previos: ${client.previousDeals || 0}
Deals ganados: ${client.wonDeals || 0}` : '';

  const activityInfo = activities.length > 0
    ? `\nActividades (${activities.length} total, últimas 10):
${activities.slice(0, 10).map(a => `- ${a.date}: ${a.type}${a.outcome ? ` - ${a.outcome}` : ''}`).join('\n')}`
    : '\nSin actividades registradas';

  const competitorInfo = competitors.length > 0
    ? `\nCompetidores: ${competitors.join(', ')}`
    : '';

  const historicalInfo = historicalData ? `
\nDatos históricos:
- Promedio días para cerrar: ${historicalData.avgDaysToClose}
- Valor promedio de deals: $${historicalData.avgDealValue.toLocaleString()}
- Tasas de conversión por etapa: ${JSON.stringify(historicalData.stageConversionRates)}
${historicalData.winRateBySource ? `- Win rate por fuente: ${JSON.stringify(historicalData.winRateBySource)}` : ''}` : '';

  const userPrompt = `Analiza este deal y predice su probabilidad de cierre:

${dealInfo}
${clientInfo}
${activityInfo}
${competitorInfo}
${historicalInfo}

Genera una predicción detallada en formato JSON.`;

  const result = await callGroqAPI(
    [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ],
    { temperature: 0.3, maxTokens: 1500 }
  );

  try {
    const jsonMatch = result.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
    throw new Error('No se encontró JSON válido');
  } catch {
    // Fallback prediction based on basic heuristics
    const baseProbability = deal.currentProbability || 50;
    return {
      predictedProbability: baseProbability,
      confidence: 'low',
      factors: [
        {
          factor: 'Análisis limitado',
          impact: 'neutral',
          weight: 1,
          explanation: 'No se pudo realizar un análisis completo',
        },
      ],
      prediction: baseProbability > 70 ? 'likely_win' : baseProbability > 40 ? 'uncertain' : 'at_risk',
      recommendations: ['Completar información del deal para mejor análisis'],
    };
  }
}
