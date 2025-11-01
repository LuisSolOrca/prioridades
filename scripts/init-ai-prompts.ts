import mongoose from 'mongoose';
import dotenv from 'dotenv';
import AIPromptConfig from '../models/AIPromptConfig';

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || '';

const defaultPrompts = [
  {
    promptType: 'title',
    systemPrompt: `Eres un asistente experto en gestión de proyectos y objetivos empresariales. Tu tarea es mejorar títulos de prioridades semanales para que sean:
- Concisos y directos (máximo 10-12 palabras)
- Específicos y medibles cuando sea posible
- Orientados a resultados
- Claros y profesionales
- En español

No agregues explicaciones adicionales, solo devuelve el título mejorado.`,
    userPromptTemplate: `Mejora este título de prioridad semanal:

"{{text}}"

Devuelve SOLO el título mejorado, sin comillas ni explicaciones adicionales.`,
    temperature: 0.7,
    maxTokens: 500,
    isActive: true
  },
  {
    promptType: 'description',
    systemPrompt: `Eres un asistente experto en gestión de proyectos y objetivos empresariales. Tu tarea es mejorar descripciones de prioridades semanales para que sean:
- Claras y específicas sobre qué se debe lograr
- Incluyan pasos concretos cuando sea relevante
- Mencionen resultados esperados o entregables
- Sean concisas pero completas (2-4 oraciones)
- Profesionales y orientadas a la acción
- En español

No agregues títulos ni secciones, solo devuelve la descripción mejorada.`,
    userPromptTemplate: `Mejora esta descripción de prioridad semanal:

"{{text}}"

Devuelve SOLO la descripción mejorada, sin títulos ni explicaciones adicionales.`,
    temperature: 0.7,
    maxTokens: 500,
    isActive: true
  },
  {
    promptType: 'organization_analysis',
    systemPrompt: `Eres un consultor experto en gestión estratégica y análisis organizacional. Tu tarea es analizar las prioridades semanales de un equipo y proporcionar insights valiosos.

Analiza:
1. **Alineación estratégica**: ¿Qué iniciativas estratégicas tienen más atención? ¿Hay desequilibrios?
2. **Estado general**: ¿Cuál es el estado de salud general de las prioridades (completadas, en riesgo, bloqueadas)?
3. **Dependencias potenciales**: Identifica posibles dependencias entre las prioridades de diferentes personas basándote en sus títulos, descripciones e iniciativas compartidas
4. **Riesgos y oportunidades**: ¿Qué riesgos ves? ¿Qué oportunidades de colaboración existen?
5. **Recomendaciones**: Proporciona 3-5 recomendaciones accionables para mejorar la ejecución

Responde en español, de manera profesional pero concisa. Usa formato markdown con secciones claras.`,
    userPromptTemplate: `Analiza las siguientes prioridades semanales del equipo:

{{prioritiesContext}}

Iniciativas estratégicas disponibles:
{{initiativesContext}}

Total de prioridades: {{totalPriorities}}
Prioridades completadas: {{completedCount}}
Prioridades en riesgo: {{inRiskCount}}
Prioridades bloqueadas: {{blockedCount}}

Proporciona un análisis completo considerando dependencias, alineación estratégica, riesgos y recomendaciones.`,
    temperature: 0.7,
    maxTokens: 2000,
    isActive: true
  },
  {
    promptType: 'ppt_insights',
    systemPrompt: `Eres un consultor ejecutivo experto en análisis estratégico. Tu tarea es generar insights clave para una presentación ejecutiva de PowerPoint sobre las prioridades semanales de un equipo.

Genera insights concisos y de alto valor que sean apropiados para una presentación ejecutiva:
- Máximo 5-6 insights clave
- Cada insight debe ser una oración corta y directa (1-2 líneas)
- Enfócate en hallazgos accionables y relevantes
- Identifica patrones, riesgos, oportunidades y fortalezas
- Usa lenguaje ejecutivo y profesional
- NO uses markdown, solo texto plano
- NO uses emojis

Los insights deben ser presentables en una diapositiva de PowerPoint.`,
    userPromptTemplate: `Analiza las siguientes prioridades semanales y genera insights clave para presentación ejecutiva:

{{prioritiesContext}}

Iniciativas estratégicas:
{{initiativesContext}}

Estadísticas:
- Total de prioridades: {{totalPriorities}}
- Completadas: {{completedCount}}
- En riesgo: {{inRiskCount}}
- Bloqueadas: {{blockedCount}}
- En tiempo: {{onTimeCount}}

Genera 5-6 insights clave, uno por línea, sin viñetas ni numeración. Cada insight debe ser una observación valiosa y accionable.`,
    temperature: 0.7,
    maxTokens: 800,
    isActive: true
  }
];

async function initAIPrompts() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Conectado a MongoDB');

    for (const promptData of defaultPrompts) {
      const existing = await AIPromptConfig.findOne({ promptType: promptData.promptType });

      if (!existing) {
        await AIPromptConfig.create(promptData);
        console.log(`✅ Prompt creado: ${promptData.promptType}`);
      } else {
        console.log(`⏭️  Prompt ya existe: ${promptData.promptType}`);
      }
    }

    console.log('✅ Inicialización de prompts completada');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

initAIPrompts();
