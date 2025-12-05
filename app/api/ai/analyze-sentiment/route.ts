import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';

const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';

export interface SentimentResult {
  sentiment: 'positive' | 'negative' | 'neutral' | 'mixed';
  score: number; // -1 to 1
  confidence: number; // 0 to 1
  emotions: {
    emotion: string;
    intensity: 'low' | 'medium' | 'high';
  }[];
  intent: {
    type: 'inquiry' | 'complaint' | 'praise' | 'request' | 'feedback' | 'other';
    description: string;
  };
  urgency: 'low' | 'medium' | 'high';
  suggestedAction: string;
  keyPhrases: string[];
  summary: string;
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const body = await request.json();
    const { text, context, analysisType = 'full' } = body;

    if (!text) {
      return NextResponse.json({
        error: 'Debes proporcionar el texto a analizar'
      }, { status: 400 });
    }

    const apiKey = process.env.GROQ_API_KEY;

    if (!apiKey) {
      return NextResponse.json({
        error: 'API Key de Groq no configurada'
      }, { status: 500 });
    }

    // Build the analysis prompt based on type
    let systemPrompt = '';
    let formatPrompt = '';

    if (analysisType === 'quick') {
      systemPrompt = `Eres un experto en análisis de sentimiento de comunicaciones de clientes.
Analiza el siguiente texto y proporciona un análisis rápido de sentimiento.`;
      formatPrompt = `Responde en formato JSON:
{
  "sentiment": "positive|negative|neutral|mixed",
  "score": 0.5,
  "summary": "Resumen en una oración"
}`;
    } else {
      systemPrompt = `Eres un experto en análisis de sentimiento y comunicaciones de clientes.
Analiza profundamente el siguiente texto considerando:
1. SENTIMIENTO GENERAL: ¿Es positivo, negativo, neutral o mixto?
2. EMOCIONES: ¿Qué emociones específicas se detectan? (satisfacción, frustración, curiosidad, urgencia, etc.)
3. INTENCIÓN: ¿Qué busca el remitente? (información, queja, felicitación, solicitud, etc.)
4. URGENCIA: ¿Qué tan urgente es responder?
5. FRASES CLAVE: Extrae las frases más importantes
6. ACCIÓN SUGERIDA: ¿Cómo debería responder el equipo?

Sé objetivo y preciso en tu análisis.`;
      formatPrompt = `Responde en formato JSON:
{
  "sentiment": "positive|negative|neutral|mixed",
  "score": 0.5,
  "confidence": 0.85,
  "emotions": [
    { "emotion": "nombre de la emoción", "intensity": "low|medium|high" }
  ],
  "intent": {
    "type": "inquiry|complaint|praise|request|feedback|other",
    "description": "Descripción breve de la intención"
  },
  "urgency": "low|medium|high",
  "suggestedAction": "Acción recomendada para el equipo",
  "keyPhrases": ["frase clave 1", "frase clave 2"],
  "summary": "Resumen ejecutivo del mensaje en 1-2 oraciones"
}`;
    }

    const contextInfo = context ? `\n\nContexto adicional: ${context}` : '';

    const response = await fetch(GROQ_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages: [
          { role: 'system', content: `${systemPrompt}\n\n${formatPrompt}` },
          { role: 'user', content: `Analiza el siguiente texto:${contextInfo}\n\n"${text}"` }
        ],
        temperature: 0.3, // Lower temperature for more consistent analysis
        max_tokens: 1000,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('Groq API error:', errorData);
      return NextResponse.json({
        error: 'Error al comunicarse con la IA'
      }, { status: 500 });
    }

    const data = await response.json();
    const generatedContent = data.choices[0]?.message?.content?.trim() || '';

    if (!generatedContent) {
      return NextResponse.json({
        error: 'No se pudo analizar el texto'
      }, { status: 500 });
    }

    // Parse JSON response
    try {
      const jsonMatch = generatedContent.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const result = JSON.parse(jsonMatch[0]);
        return NextResponse.json(result);
      }
    } catch (parseError) {
      console.error('Error parsing sentiment result:', parseError);
    }

    // Fallback if JSON parsing fails
    return NextResponse.json({
      sentiment: 'neutral',
      score: 0,
      summary: generatedContent,
      error: 'Could not parse structured response'
    });

  } catch (error: any) {
    console.error('Error analyzing sentiment:', error);
    return NextResponse.json({
      error: 'Error al procesar la solicitud'
    }, { status: 500 });
  }
}

// Batch analysis endpoint
export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const body = await request.json();
    const { texts } = body;

    if (!texts || !Array.isArray(texts) || texts.length === 0) {
      return NextResponse.json({
        error: 'Debes proporcionar un array de textos a analizar'
      }, { status: 400 });
    }

    if (texts.length > 20) {
      return NextResponse.json({
        error: 'Máximo 20 textos por lote'
      }, { status: 400 });
    }

    const apiKey = process.env.GROQ_API_KEY;

    if (!apiKey) {
      return NextResponse.json({
        error: 'API Key de Groq no configurada'
      }, { status: 500 });
    }

    const systemPrompt = `Eres un experto en análisis de sentimiento por lotes.
Analiza cada mensaje proporcionado y devuelve un análisis resumido.`;

    const formatPrompt = `Responde en formato JSON array:
[
  {
    "index": 0,
    "sentiment": "positive|negative|neutral|mixed",
    "score": 0.5,
    "summary": "Resumen breve",
    "urgency": "low|medium|high"
  }
]`;

    const textsFormatted = texts.map((t, i) => `[${i}] "${t}"`).join('\n\n');

    const response = await fetch(GROQ_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages: [
          { role: 'system', content: `${systemPrompt}\n\n${formatPrompt}` },
          { role: 'user', content: `Analiza los siguientes ${texts.length} mensajes:\n\n${textsFormatted}` }
        ],
        temperature: 0.3,
        max_tokens: 2000,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('Groq API error:', errorData);
      return NextResponse.json({
        error: 'Error al comunicarse con la IA'
      }, { status: 500 });
    }

    const data = await response.json();
    const generatedContent = data.choices[0]?.message?.content?.trim() || '';

    try {
      const jsonMatch = generatedContent.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        const results = JSON.parse(jsonMatch[0]);

        // Calculate aggregate stats
        const stats = {
          total: results.length,
          positive: results.filter((r: any) => r.sentiment === 'positive').length,
          negative: results.filter((r: any) => r.sentiment === 'negative').length,
          neutral: results.filter((r: any) => r.sentiment === 'neutral').length,
          mixed: results.filter((r: any) => r.sentiment === 'mixed').length,
          avgScore: results.reduce((sum: number, r: any) => sum + (r.score || 0), 0) / results.length,
          urgentCount: results.filter((r: any) => r.urgency === 'high').length,
        };

        return NextResponse.json({ results, stats });
      }
    } catch (parseError) {
      console.error('Error parsing batch sentiment result:', parseError);
    }

    return NextResponse.json({
      error: 'Could not parse batch response',
      rawContent: generatedContent
    }, { status: 500 });

  } catch (error: any) {
    console.error('Error analyzing batch sentiment:', error);
    return NextResponse.json({
      error: 'Error al procesar la solicitud'
    }, { status: 500 });
  }
}
