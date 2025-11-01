import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import connectDB from '@/lib/mongodb';
import AIPromptConfig from '@/models/AIPromptConfig';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const body = await request.json();
    const { text, type } = body; // type: 'title' o 'description'

    if (!text || !type) {
      return NextResponse.json({
        error: 'Debes proporcionar el texto y el tipo (title o description)'
      }, { status: 400 });
    }

    const apiKey = process.env.GROQ_API_KEY;

    if (!apiKey) {
      return NextResponse.json({
        error: 'API Key de Groq no configurada'
      }, { status: 500 });
    }

    // Obtener configuración de prompts desde la base de datos
    await connectDB();
    const config = await AIPromptConfig.findOne({ promptType: type, isActive: true });

    let systemPrompt = '';
    let userPrompt = '';
    let temperature = 0.7;
    let maxTokens = 500;

    if (config) {
      // Usar configuración personalizada
      systemPrompt = config.systemPrompt;
      userPrompt = config.userPromptTemplate.replace('{{text}}', text);
      temperature = config.temperature;
      maxTokens = config.maxTokens;
    } else {
      // Fallback a prompts por defecto si no hay configuración
      if (type === 'title') {
        systemPrompt = `Eres un asistente experto en gestión de proyectos y objetivos empresariales. Tu tarea es mejorar títulos de prioridades semanales para que sean:
- Concisos y directos (máximo 10-12 palabras)
- Específicos y medibles cuando sea posible
- Orientados a resultados
- Claros y profesionales
- En español

No agregues explicaciones adicionales, solo devuelve el título mejorado.`;

        userPrompt = `Mejora este título de prioridad semanal:

"${text}"

Devuelve SOLO el título mejorado, sin comillas ni explicaciones adicionales.`;
      } else {
        systemPrompt = `Eres un asistente experto en gestión de proyectos y objetivos empresariales. Tu tarea es mejorar descripciones de prioridades semanales para que sean:
- Claras y específicas sobre qué se debe lograr
- Incluyan pasos concretos cuando sea relevante
- Mencionen resultados esperados o entregables
- Sean concisas pero completas (2-4 oraciones)
- Profesionales y orientadas a la acción
- En español

No agregues títulos ni secciones, solo devuelve la descripción mejorada.`;

        userPrompt = `Mejora esta descripción de prioridad semanal:

"${text}"

Devuelve SOLO la descripción mejorada, sin títulos ni explicaciones adicionales.`;
      }
    }

    // Llamar a la API de Groq
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'openai/gpt-oss-20b',
        messages: [
          {
            role: 'system',
            content: systemPrompt
          },
          {
            role: 'user',
            content: userPrompt
          }
        ],
        temperature,
        max_tokens: maxTokens,
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
    const improvedText = data.choices[0]?.message?.content?.trim() || '';

    if (!improvedText) {
      return NextResponse.json({
        error: 'No se pudo generar una mejora'
      }, { status: 500 });
    }

    return NextResponse.json({
      originalText: text,
      improvedText,
      type
    });

  } catch (error: any) {
    console.error('Error improving text:', error);
    return NextResponse.json({
      error: 'Error al procesar la solicitud'
    }, { status: 500 });
  }
}
