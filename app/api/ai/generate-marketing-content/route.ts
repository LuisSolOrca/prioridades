import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';

const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const body = await request.json();
    const {
      contentType,
      context,
      tone = 'professional',
      language = 'español',
      product,
      audience,
      keywords,
      length = 'medium'
    } = body;

    if (!contentType) {
      return NextResponse.json({
        error: 'Debes especificar el tipo de contenido'
      }, { status: 400 });
    }

    const apiKey = process.env.GROQ_API_KEY;

    if (!apiKey) {
      return NextResponse.json({
        error: 'API Key de Groq no configurada'
      }, { status: 500 });
    }

    // Define content type specific prompts
    const contentPrompts: Record<string, { system: string; format: string }> = {
      // Email content types
      'email-subject': {
        system: `Eres un experto en email marketing con alta especialización en líneas de asunto que generan aperturas.
Crea líneas de asunto cortas (máximo 50 caracteres), impactantes y que generen curiosidad.
Evita palabras spam como "gratis", "urgente", "dinero".
Usa emojis moderadamente si es apropiado para el tono.`,
        format: 'Responde con 3 opciones de línea de asunto, cada una en una línea nueva, sin numeración ni explicaciones adicionales.'
      },
      'email-headline': {
        system: `Eres un experto en copywriting para emails. Crea titulares que capten la atención y refuercen el mensaje principal.
Los titulares deben ser claros, directos y orientados al beneficio del lector.`,
        format: 'Responde con 3 opciones de titular, cada una en una línea nueva.'
      },
      'email-body': {
        system: `Eres un experto en email marketing. Escribe contenido de email persuasivo pero no agresivo.
El contenido debe:
- Empezar con un gancho que conecte con el lector
- Presentar el beneficio principal claramente
- Incluir un call-to-action natural
- Ser escaneable (párrafos cortos)
- Mantener un tono ${tone}`,
        format: 'Escribe el contenido del email en formato HTML simple (usa <p>, <strong>, <ul> si es necesario).'
      },
      'email-cta': {
        system: `Eres un experto en conversiones. Crea textos para botones de call-to-action que generen clics.
Los CTAs deben ser cortos (2-4 palabras), orientados a la acción, y crear sentido de urgencia o beneficio.`,
        format: 'Responde con 5 opciones de CTA, cada una en una línea nueva.'
      },
      'email-preheader': {
        system: `Eres un experto en email marketing. Crea preheaders que complementen el asunto y aumenten la tasa de apertura.
El preheader debe añadir información extra que no esté en el asunto, máximo 100 caracteres.`,
        format: 'Responde con 3 opciones de preheader, cada una en una línea nueva.'
      },

      // A/B Testing - Subject Lines
      'email-subject-ab': {
        system: `Eres un experto en email marketing especializado en pruebas A/B de líneas de asunto.
Genera variantes de líneas de asunto usando diferentes enfoques psicológicos:
1. CURIOSIDAD: Genera intriga sin revelar todo
2. BENEFICIO: Enfoca en lo que el lector ganará
3. URGENCIA: Crea sensación de tiempo limitado (sin ser spam)
4. PERSONALIZACIÓN: Usa un enfoque personal y directo
5. PREGUNTA: Formula como pregunta que resuene
6. NÚMERO: Incluye un número específico
Cada variante debe ser máximo 50 caracteres.`,
        format: `Responde en formato JSON:
{
  "variants": [
    { "text": "Línea de asunto", "strategy": "curiosity|benefit|urgency|personal|question|number", "explanation": "Por qué funciona" }
  ],
  "recommendation": "Cuál variante recomendarías para A/B test inicial y por qué"
}
Incluye 6 variantes, una por cada estrategia.`
      },

      // CTA Optimization
      'cta-optimize': {
        system: `Eres un experto en optimización de conversiones y CTAs (Call to Action).
Analiza el CTA proporcionado y sugiere mejoras basándote en:
- Claridad: ¿Es obvio qué pasará al hacer clic?
- Acción: ¿Usa verbos de acción fuertes?
- Urgencia: ¿Hay motivación para actuar ahora?
- Valor: ¿Comunica el beneficio?
- Longitud: Los mejores CTAs tienen 2-5 palabras`,
        format: `Responde en formato JSON:
{
  "analysis": {
    "strengths": ["Puntos fuertes del CTA actual"],
    "weaknesses": ["Áreas de mejora"]
  },
  "score": 7,
  "suggestions": [
    { "text": "CTA mejorado", "improvement": "Qué mejora" }
  ],
  "bestPractices": ["Consejos aplicables a este caso"]
}`
      },

      // CTA Variants for A/B
      'cta-variants': {
        system: `Eres un experto en copywriting de CTAs que convierten.
Genera variantes de CTAs usando diferentes enfoques:
- ACCIÓN: Verbos de acción directos
- BENEFICIO: Enfoca en lo que obtiene el usuario
- URGENCIA: Sensación de oportunidad limitada
- BAJO_RIESGO: Reduce fricción con garantías
- EXCLUSIVO: Sensación de acceso especial
Todos los CTAs deben ser 2-5 palabras máximo.`,
        format: `Responde en formato JSON:
{
  "variants": [
    { "text": "Texto del CTA", "approach": "action|benefit|urgency|low_risk|exclusive", "bestFor": "Cuándo usar esta variante" }
  ]
}
Incluye 5-8 variantes con diferentes enfoques.`
      },

      // Landing page content types
      'landing-headline': {
        system: `Eres un experto en copywriting para landing pages de alta conversión.
Crea titulares que:
- Comuniquen el beneficio principal en 10 palabras o menos
- Generen curiosidad o urgencia
- Sean específicos y no genéricos
- Conecten emocionalmente con el público objetivo`,
        format: 'Responde con 3 opciones de titular, cada una en una línea nueva.'
      },
      'landing-subheadline': {
        system: `Eres un experto en landing pages. Crea subtítulos que amplíen el mensaje del titular principal.
El subtítulo debe:
- Explicar cómo se logra el beneficio prometido
- Añadir credibilidad o especificidad
- Ser de 1-2 oraciones máximo`,
        format: 'Responde con 3 opciones de subtítulo, cada una en una línea nueva.'
      },
      'landing-hero': {
        system: `Eres un experto en copywriting para landing pages. Crea el contenido completo para una sección hero que convierta.
Incluye un titular impactante, un subtítulo explicativo y texto para el CTA.`,
        format: `Responde en formato JSON:
{
  "headline": "El titular principal",
  "subheadline": "El subtítulo explicativo",
  "cta": "Texto del botón",
  "supportText": "Texto opcional de apoyo bajo el CTA (ej: Sin tarjeta de crédito)"
}`
      },
      'landing-benefits': {
        system: `Eres un experto en copywriting. Crea una lista de beneficios que resalten el valor de la oferta.
Cada beneficio debe:
- Empezar con un verbo de acción o resultado
- Ser específico y medible cuando sea posible
- Conectar con dolor o deseo del cliente`,
        format: `Responde en formato JSON array:
[
  { "title": "Beneficio corto", "description": "Explicación en 1-2 oraciones" }
]
Incluye 4-6 beneficios.`
      },
      'landing-features': {
        system: `Eres un experto en copywriting técnico. Crea descripciones de características que destaquen el valor.
Transforma características técnicas en beneficios entendibles.`,
        format: `Responde en formato JSON array:
[
  { "title": "Nombre de característica", "description": "Cómo ayuda al usuario" }
]
Incluye 3-6 características.`
      },
      'landing-testimonial': {
        system: `Eres un experto en prueba social. Crea un testimonio realista y convincente.
El testimonio debe:
- Sonar auténtico y específico
- Mencionar resultados concretos
- Incluir contexto del cliente`,
        format: `Responde en formato JSON:
{
  "quote": "El testimonio entrecomillado",
  "author": "Nombre del cliente",
  "role": "Cargo del cliente",
  "company": "Empresa del cliente"
}`
      },
      'landing-faq': {
        system: `Eres un experto en ventas. Crea preguntas frecuentes que superen objeciones y generen confianza.
Las FAQ deben:
- Anticipar dudas reales de compradores
- Responder de forma clara y persuasiva
- Incluir beneficios sutilmente`,
        format: `Responde en formato JSON array:
[
  { "question": "La pregunta", "answer": "La respuesta" }
]
Incluye 4-6 FAQs.`
      },
      'landing-cta': {
        system: `Eres un experto en conversiones. Crea contenido para una sección de call-to-action final.
Debe crear urgencia y resumir el valor principal.`,
        format: `Responde en formato JSON:
{
  "headline": "Título de cierre persuasivo",
  "subheadline": "Refuerzo del beneficio",
  "ctaText": "Texto del botón",
  "guarantee": "Texto de garantía o reducción de riesgo (opcional)"
}`
      },
      'landing-stats': {
        system: `Eres un experto en copywriting. Crea estadísticas impactantes que generen credibilidad.
Las estadísticas deben ser específicas y relevantes para el público objetivo.`,
        format: `Responde en formato JSON array:
[
  { "value": "100+", "label": "Clientes satisfechos" }
]
Incluye 3-4 estadísticas.`
      },

      // General marketing content
      'product-description': {
        system: `Eres un experto en copywriting de productos. Crea descripciones que vendan sin ser agresivas.
Enfócate en beneficios, no solo características.`,
        format: 'Escribe una descripción de producto persuasiva en 2-3 párrafos.'
      },
      'value-proposition': {
        system: `Eres un experto en posicionamiento de marca. Crea una propuesta de valor única y memorable.
Debe comunicar: qué ofreces, para quién, y qué te hace diferente.`,
        format: 'Responde con 3 opciones de propuesta de valor, cada una en una línea nueva.'
      },
      'social-proof': {
        system: `Eres un experto en prueba social. Crea texto que genere confianza usando números y logros.`,
        format: 'Escribe 3-4 puntos de prueba social, cada uno en una línea nueva.'
      }
    };

    const promptConfig = contentPrompts[contentType];
    if (!promptConfig) {
      return NextResponse.json({
        error: `Tipo de contenido "${contentType}" no soportado`
      }, { status: 400 });
    }

    // Build context string
    const contextParts: string[] = [];
    if (product) contextParts.push(`Producto/Servicio: ${product}`);
    if (audience) contextParts.push(`Público objetivo: ${audience}`);
    if (keywords?.length) contextParts.push(`Palabras clave: ${keywords.join(', ')}`);
    if (context) contextParts.push(`Contexto adicional: ${context}`);

    const lengthInstructions = {
      short: 'Sé muy conciso.',
      medium: 'Mantén una longitud moderada.',
      long: 'Puedes extenderte más para dar detalle.'
    };

    const toneInstructions: Record<string, string> = {
      professional: 'Tono profesional y confiable',
      casual: 'Tono casual y cercano',
      urgent: 'Tono urgente pero no desesperado',
      friendly: 'Tono amigable y accesible',
      luxury: 'Tono exclusivo y premium',
      technical: 'Tono técnico pero accesible',
      playful: 'Tono divertido y creativo'
    };

    const systemPrompt = `${promptConfig.system}

Idioma: ${language}
Tono: ${toneInstructions[tone] || toneInstructions.professional}
${lengthInstructions[length as keyof typeof lengthInstructions] || ''}

${promptConfig.format}`;

    const userPrompt = contextParts.length > 0
      ? `Genera contenido de marketing con el siguiente contexto:\n\n${contextParts.join('\n')}`
      : 'Genera contenido de marketing general.';

    // Call Groq API
    const response = await fetch(GROQ_API_URL, {
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
        temperature: 0.8,
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
    const generatedContent = data.choices[0]?.message?.content?.trim() || '';

    if (!generatedContent) {
      return NextResponse.json({
        error: 'No se pudo generar contenido'
      }, { status: 500 });
    }

    // Try to parse as JSON if expected
    let parsedContent = generatedContent;
    if (promptConfig.format.includes('JSON')) {
      try {
        const jsonMatch = generatedContent.match(/(\{[\s\S]*\}|\[[\s\S]*\])/);
        if (jsonMatch) {
          parsedContent = JSON.parse(jsonMatch[0]);
        }
      } catch {
        // Keep as string if JSON parsing fails
      }
    }

    return NextResponse.json({
      contentType,
      content: parsedContent,
      rawContent: generatedContent
    });

  } catch (error: any) {
    console.error('Error generating marketing content:', error);
    return NextResponse.json({
      error: 'Error al procesar la solicitud'
    }, { status: 500 });
  }
}
