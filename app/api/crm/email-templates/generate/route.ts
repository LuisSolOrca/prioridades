import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { callGroqAPI } from '@/lib/crm/aiService';
import { hasPermission } from '@/lib/permissions';

export const dynamic = 'force-dynamic';

// Variables disponibles por scope
const AVAILABLE_VARIABLES = {
  common: [
    '{{contact.firstName}} - Nombre del contacto',
    '{{contact.lastName}} - Apellido del contacto',
    '{{contact.fullName}} - Nombre completo del contacto',
    '{{contact.email}} - Email del contacto',
    '{{contact.phone}} - Teléfono del contacto',
    '{{contact.position}} - Cargo del contacto',
    '{{client.name}} - Nombre de la empresa',
    '{{client.industry}} - Industria de la empresa',
    '{{client.website}} - Sitio web de la empresa',
    '{{deal.title}} - Título del negocio',
    '{{deal.value}} - Valor del negocio (formateado como moneda)',
    '{{deal.stage}} - Etapa del negocio',
    '{{user.name}} - Tu nombre',
    '{{user.email}} - Tu email',
    '{{user.phone}} - Tu teléfono',
    '{{user.signature}} - Tu firma personalizada',
    '{{today}} - Fecha de hoy',
    '{{tomorrow}} - Fecha de mañana',
    '{{nextWeek}} - Fecha en 7 días',
  ],
  workflows: [
    '{{priority.title}} - Título de la prioridad',
    '{{priority.status}} - Estado de la prioridad (EN_TIEMPO, EN_RIESGO, etc.)',
    '{{priority.completion}} - Porcentaje de completado',
    '{{priority.owner}} - Responsable de la prioridad',
  ],
};

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    if (!hasPermission(session, 'viewCRM')) {
      return NextResponse.json({ error: 'Sin permiso' }, { status: 403 });
    }

    const body = await request.json();
    const { description, scope = 'both', category = 'other', tone = 'professional' } = body;

    if (!description || description.trim().length < 10) {
      return NextResponse.json(
        { error: 'Por favor proporciona una descripción más detallada (mínimo 10 caracteres)' },
        { status: 400 }
      );
    }

    // Obtener variables disponibles según el scope
    let availableVars = [...AVAILABLE_VARIABLES.common];
    if (scope === 'workflows' || scope === 'both') {
      availableVars = [...availableVars, ...AVAILABLE_VARIABLES.workflows];
    }

    const categoryDescriptions: Record<string, string> = {
      outreach: 'Email de prospección para contactos nuevos',
      follow_up: 'Email de seguimiento después de una interacción',
      nurture: 'Email de nurturing para mantener la relación',
      closing: 'Email de cierre para cerrar negociaciones',
      other: 'Email general',
    };

    const toneDescriptions: Record<string, string> = {
      professional: 'profesional y formal',
      friendly: 'amigable pero profesional',
      persuasive: 'persuasivo enfocado en beneficios',
      urgent: 'con sentido de urgencia',
    };

    const systemPrompt = `Eres un experto en comunicación comercial y email marketing B2B. Tu tarea es generar plantillas de email profesionales y efectivas.

REGLAS IMPORTANTES:
1. Escribe en español
2. El tono debe ser ${toneDescriptions[tone] || 'profesional'}
3. El email debe ser conciso pero completo
4. DEBES usar las variables de personalización disponibles de forma natural en el contenido
5. Incluye un call-to-action claro
6. El asunto debe ser atractivo y conciso (máximo 60 caracteres)
7. El cuerpo debe tener formato HTML simple (usa <p>, <strong>, <br>, <ul>, <li> cuando sea necesario)

VARIABLES DISPONIBLES QUE PUEDES USAR:
${availableVars.join('\n')}

IMPORTANTE:
- Usa las variables más relevantes para el contexto descrito
- Las variables se escriben exactamente como se muestran (con dobles llaves)
- SIEMPRE personaliza usando al menos {{contact.firstName}} o {{contact.fullName}}
- Si es relevante, incluye datos del negocio como {{deal.title}} o {{deal.value}}

Responde ÚNICAMENTE con un JSON válido con esta estructura exacta (sin markdown, sin explicaciones):
{
  "subject": "Asunto del email con variables si aplica",
  "body": "<p>Contenido HTML del email con variables de personalización</p>"
}`;

    const userPrompt = `Genera una plantilla de email para el siguiente caso:

CATEGORÍA: ${categoryDescriptions[category] || 'Email general'}
DESCRIPCIÓN DEL USUARIO: ${description}

Recuerda:
- Usa las variables de personalización disponibles de forma natural
- El cuerpo debe ser HTML válido
- Responde SOLO con el JSON, sin texto adicional`;

    const result = await callGroqAPI(
      [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      { temperature: 0.7, maxTokens: 1500 }
    );

    // Parsear el resultado JSON
    try {
      // Extraer JSON de la respuesta (manejar posibles bloques de código markdown)
      const jsonMatch = result.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);

        // Validar que tenga subject y body
        if (!parsed.subject || !parsed.body) {
          throw new Error('Respuesta incompleta');
        }

        return NextResponse.json({
          subject: parsed.subject,
          body: parsed.body,
          variablesUsed: extractVariables(parsed.subject + parsed.body),
        });
      }
      throw new Error('No se encontró JSON válido en la respuesta');
    } catch (parseError) {
      console.error('Error parsing AI response:', parseError, result);
      return NextResponse.json(
        { error: 'Error al procesar la respuesta de la IA. Por favor intenta de nuevo.' },
        { status: 500 }
      );
    }
  } catch (error: any) {
    console.error('Error generating template:', error);
    return NextResponse.json(
      { error: error.message || 'Error al generar la plantilla' },
      { status: 500 }
    );
  }
}

// Función auxiliar para extraer las variables usadas en el texto
function extractVariables(text: string): string[] {
  const variableRegex = /\{\{[^}]+\}\}/g;
  const matches = text.match(variableRegex);
  return matches ? [...new Set(matches)] : [];
}
