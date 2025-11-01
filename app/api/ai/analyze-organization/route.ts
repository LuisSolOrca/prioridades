import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import connectDB from '@/lib/mongodb';
import Priority from '@/models/Priority';
import User from '@/models/User';
import StrategicInitiative from '@/models/StrategicInitiative';
import AIPromptConfig from '@/models/AIPromptConfig';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const body = await request.json();
    const { weekStart, weekEnd } = body;

    if (!weekStart || !weekEnd) {
      return NextResponse.json({
        error: 'Debes proporcionar weekStart y weekEnd'
      }, { status: 400 });
    }

    const apiKey = process.env.GROQ_API_KEY;

    if (!apiKey) {
      return NextResponse.json({
        error: 'API Key de Groq no configurada'
      }, { status: 500 });
    }

    // Conectar a la base de datos y obtener todos los datos necesarios
    await connectDB();

    // Obtener todas las prioridades de la semana
    const priorities = await Priority.find({
      weekStart: new Date(weekStart),
      weekEnd: new Date(weekEnd)
    }).populate('userId', 'name email')
      .populate('initiativeIds', 'name color')
      .lean();

    // Obtener todas las iniciativas estratégicas
    const initiatives = await StrategicInitiative.find({ isActive: true }).lean();

    // Preparar el contexto para la IA
    const prioritiesContext = priorities.map((p: any) => {
      const initiativeNames = p.initiativeIds?.map((init: any) => init.name).join(', ') || 'Sin iniciativa';
      return {
        usuario: p.userId?.name || 'Usuario desconocido',
        titulo: p.title,
        descripcion: p.description || '',
        iniciativas: initiativeNames,
        estado: p.status,
        porcentajeCompletado: p.completionPercentage
      };
    });

    const completedCount = priorities.filter((p: any) => p.status === 'COMPLETADO').length;
    const inRiskCount = priorities.filter((p: any) => p.status === 'EN_RIESGO').length;
    const blockedCount = priorities.filter((p: any) => p.status === 'BLOQUEADO').length;

    // Obtener configuración de prompts desde la base de datos
    const config = await AIPromptConfig.findOne({ promptType: 'organization_analysis', isActive: true });

    let systemPrompt = '';
    let userPrompt = '';
    let temperature = 0.7;
    let maxTokens = 2000;

    if (config) {
      // Usar configuración personalizada
      systemPrompt = config.systemPrompt;
      userPrompt = config.userPromptTemplate
        .replace('{{prioritiesContext}}', JSON.stringify(prioritiesContext, null, 2))
        .replace('{{initiativesContext}}', initiatives.map((init: any) => `- ${init.name}: ${init.description || 'Sin descripción'}`).join('\n'))
        .replace('{{totalPriorities}}', priorities.length.toString())
        .replace('{{completedCount}}', completedCount.toString())
        .replace('{{inRiskCount}}', inRiskCount.toString())
        .replace('{{blockedCount}}', blockedCount.toString());
      temperature = config.temperature;
      maxTokens = config.maxTokens;
    } else {
      // Fallback a prompts por defecto si no hay configuración
      systemPrompt = `Eres un consultor experto en gestión estratégica y análisis organizacional. Tu tarea es analizar las prioridades semanales de un equipo y proporcionar insights valiosos.

Analiza:
1. **Alineación estratégica**: ¿Qué iniciativas estratégicas tienen más atención? ¿Hay desequilibrios?
2. **Estado general**: ¿Cuál es el estado de salud general de las prioridades (completadas, en riesgo, bloqueadas)?
3. **Dependencias potenciales**: Identifica posibles dependencias entre las prioridades de diferentes personas basándote en sus títulos, descripciones e iniciativas compartidas
4. **Riesgos y oportunidades**: ¿Qué riesgos ves? ¿Qué oportunidades de colaboración existen?
5. **Recomendaciones**: Proporciona 3-5 recomendaciones accionables para mejorar la ejecución

Responde en español, de manera profesional pero concisa. Usa formato markdown con secciones claras.`;

      userPrompt = `Analiza las siguientes prioridades semanales del equipo:

${JSON.stringify(prioritiesContext, null, 2)}

Iniciativas estratégicas disponibles:
${initiatives.map((init: any) => `- ${init.name}: ${init.description || 'Sin descripción'}`).join('\n')}

Total de prioridades: ${priorities.length}
Prioridades completadas: ${completedCount}
Prioridades en riesgo: ${inRiskCount}
Prioridades bloqueadas: ${blockedCount}

Proporciona un análisis completo considerando dependencias, alineación estratégica, riesgos y recomendaciones.`;
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
    const analysis = data.choices[0]?.message?.content?.trim() || '';

    if (!analysis) {
      return NextResponse.json({
        error: 'No se pudo generar el análisis'
      }, { status: 500 });
    }

    return NextResponse.json({
      analysis,
      metadata: {
        totalPriorities: priorities.length,
        completed: priorities.filter((p: any) => p.status === 'COMPLETADO').length,
        inRisk: priorities.filter((p: any) => p.status === 'EN_RIESGO').length,
        blocked: priorities.filter((p: any) => p.status === 'BLOQUEADO').length,
        onTime: priorities.filter((p: any) => p.status === 'EN_TIEMPO').length,
      }
    });

  } catch (error: any) {
    console.error('Error analyzing organization:', error);
    return NextResponse.json({
      error: 'Error al procesar la solicitud'
    }, { status: 500 });
  }
}
