import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const body = await request.json();
    const { messages, maxMessages = 50 } = body;

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json({
        error: 'Debes proporcionar mensajes del chat para resumir'
      }, { status: 400 });
    }

    const apiKey = process.env.GROQ_API_KEY;

    if (!apiKey) {
      return NextResponse.json({
        error: 'API Key de Groq no configurada'
      }, { status: 500 });
    }

    // Tomar los últimos N mensajes
    const recentMessages = messages.slice(-maxMessages);

    // Formatear mensajes para el contexto
    const chatContext = recentMessages.map((msg: any) => {
      const userName = msg.userId?.name || 'Usuario';
      const timestamp = new Date(msg.createdAt).toLocaleString('es-ES', {
        day: '2-digit',
        month: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
      });

      // Formatear comandos especiales con su información completa
      if (msg.commandType === 'question' && msg.commandData) {
        const questionData = msg.commandData;
        let formatted = `[${timestamp}] ${userName} preguntó a ${questionData.askedTo}: "${questionData.question}"`;

        if (questionData.answered && questionData.answer) {
          const answerTime = questionData.answeredAt ?
            new Date(questionData.answeredAt).toLocaleString('es-ES', {
              day: '2-digit',
              month: '2-digit',
              hour: '2-digit',
              minute: '2-digit'
            }) : timestamp;
          formatted += `\n[${answerTime}] ${questionData.askedTo} respondió: "${questionData.answer}"`;
        } else {
          formatted += ` (Sin responder aún)`;
        }
        return formatted;
      }

      if (msg.commandType === 'decision' && msg.commandData) {
        return `[${timestamp}] ${userName} registró decisión: "${msg.commandData.decision}"`;
      }

      if (msg.commandType === 'celebrate' && msg.commandData) {
        return `[${timestamp}] ${userName} celebró a ${msg.commandData.userName}: "${msg.commandData.achievement}"`;
      }

      // Para mensajes normales, usar el contenido
      return `[${timestamp}] ${userName}: ${msg.content}`;
    }).join('\n');

    const systemPrompt = `Eres un asistente experto en análisis de conversaciones y gestión de proyectos. Tu tarea es analizar el historial de chat de un canal de proyecto y generar un resumen ejecutivo útil.

El resumen debe incluir:
1. **Temas Principales**: Los 3-5 temas más discutidos o importantes
2. **Decisiones Clave**: Cualquier decisión tomada o acordada (busca frases como "registró decisión")
3. **Preguntas y Respuestas**: Preguntas importantes que se hicieron y si fueron respondidas o están pendientes
4. **Acciones Pendientes**: Tareas mencionadas o compromisos adquiridos
5. **Participantes Activos**: Quiénes han sido los más participativos
6. **Puntos de Atención**: Problemas, blockers o riesgos mencionados

IMPORTANTE:
- Si ves que alguien "preguntó a" alguien y luego ves que esa persona "respondió", marca esa pregunta como RESPONDIDA
- Si ves "Sin responder aún", marca esa pregunta como PENDIENTE
- Las celebraciones ("celebró a") deben incluirse en logros del equipo

Formatea el resumen de manera clara usando markdown con encabezados, listas y negritas cuando sea apropiado.
Sé conciso pero completo. Usa español.`;

    const userPrompt = `Analiza el siguiente historial de chat y genera un resumen ejecutivo:

${chatContext}

Genera un resumen profesional y estructurado del contenido de esta conversación.`;

    // Llamar a la API de Groq
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
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
        temperature: 0.5,
        max_tokens: 1500,
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
    const summary = data.choices[0]?.message?.content?.trim() || '';

    if (!summary) {
      return NextResponse.json({
        error: 'No se pudo generar el resumen'
      }, { status: 500 });
    }

    return NextResponse.json({
      summary,
      messagesAnalyzed: recentMessages.length,
      generatedAt: new Date().toISOString()
    });

  } catch (error: any) {
    console.error('Error generating chat summary:', error);
    return NextResponse.json({
      error: 'Error al procesar la solicitud'
    }, { status: 500 });
  }
}
