import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import connectDB from '@/lib/mongodb';
import Priority from '@/models/Priority';
import User from '@/models/User';
import StrategicInitiative from '@/models/StrategicInitiative';
import AIPromptConfig from '@/models/AIPromptConfig';
import { trackFeatureUsage } from '@/lib/gamification';

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

    // Conectar a la base de datos
    await connectDB();

    // Obtener todas las prioridades de la semana
    const priorities = await Priority.find({
      weekStart: new Date(weekStart),
      weekEnd: new Date(weekEnd)
    }).populate('userId', 'name email area isAreaLeader')
      .populate('initiativeIds', 'name color')
      .populate('initiativeId', 'name color')
      .lean();

    // Obtener todos los usuarios activos
    const users = await User.find({ isActive: true }).select('_id name area isAreaLeader').lean();

    // Obtener todas las iniciativas estratégicas
    const initiatives = await StrategicInitiative.find({ isActive: true }).lean();

    // Agrupar prioridades por área
    const areaMap = new Map<string, any>();

    users.forEach((user: any) => {
      const areaKey = user.area || 'Sin Área Asignada';
      if (!areaMap.has(areaKey)) {
        areaMap.set(areaKey, {
          area: areaKey,
          leader: null,
          users: [],
          priorities: [],
          stats: {
            total: 0,
            completed: 0,
            inRisk: 0,
            blocked: 0,
            onTime: 0
          }
        });
      }
      const areaData = areaMap.get(areaKey)!;
      areaData.users.push(user.name);
      if (user.isAreaLeader) {
        areaData.leader = user.name;
      }
    });

    // Agregar prioridades a cada área
    priorities.forEach((p: any) => {
      const userArea = p.userId?.area || 'Sin Área Asignada';
      const areaData = areaMap.get(userArea);

      if (areaData) {
        // Obtener nombres de iniciativas
        let initiativeNames = 'Sin iniciativa';
        if (p.initiativeIds && p.initiativeIds.length > 0) {
          initiativeNames = p.initiativeIds
            .filter((init: any) => init && init.name)
            .map((init: any) => init.name)
            .join(', ');
        } else if (p.initiativeId && p.initiativeId.name) {
          initiativeNames = p.initiativeId.name;
        }

        areaData.priorities.push({
          usuario: p.userId?.name || 'Usuario desconocido',
          titulo: p.title,
          descripcion: p.description || '',
          iniciativas: initiativeNames,
          estado: p.status,
          porcentajeCompletado: p.completionPercentage
        });

        // Actualizar estadísticas
        areaData.stats.total++;
        if (p.status === 'COMPLETADO') areaData.stats.completed++;
        if (p.status === 'EN_RIESGO') areaData.stats.inRisk++;
        if (p.status === 'BLOQUEADO') areaData.stats.blocked++;
        if (p.status === 'EN_TIEMPO') areaData.stats.onTime++;
      }
    });

    // Convertir a array y ordenar
    const areasContext = Array.from(areaMap.values())
      .filter(area => area.priorities.length > 0)
      .sort((a, b) => {
        if (a.area === 'Sin Área Asignada') return 1;
        if (b.area === 'Sin Área Asignada') return -1;
        return a.area.localeCompare(b.area);
      });

    // Calcular estadísticas globales
    const totalPriorities = priorities.length;
    const completedCount = priorities.filter((p: any) => p.status === 'COMPLETADO').length;
    const inRiskCount = priorities.filter((p: any) => p.status === 'EN_RIESGO').length;
    const blockedCount = priorities.filter((p: any) => p.status === 'BLOQUEADO').length;

    // Construir información de áreas
    let areasInfo = '';
    areasContext.forEach(area => {
      areasInfo += `\n## Área: ${area.area}\n`;
      areasInfo += `- Líder: ${area.leader || 'Sin líder asignado'}\n`;
      areasInfo += `- Miembros: ${area.users.length} personas\n`;
      areasInfo += `- Prioridades totales: ${area.stats.total}\n`;
      areasInfo += `- Completadas: ${area.stats.completed} | En riesgo: ${area.stats.inRisk} | Bloqueadas: ${area.stats.blocked} | En tiempo: ${area.stats.onTime}\n`;
      areasInfo += `\nPrioridades:\n`;
      area.priorities.forEach((p: any, idx: number) => {
        areasInfo += `${idx + 1}. **${p.titulo}** (${p.usuario}) - ${p.estado} - ${p.porcentajeCompletado}% completado\n`;
        areasInfo += `   Iniciativas: ${p.iniciativas}\n`;
        if (p.descripcion) {
          areasInfo += `   Descripción: ${p.descripcion.substring(0, 100)}${p.descripcion.length > 100 ? '...' : ''}\n`;
        }
      });
    });

    // Obtener configuración de prompts desde la base de datos
    const config = await AIPromptConfig.findOne({ promptType: 'area_analysis', isActive: true });

    let systemPrompt: string;
    let userPrompt: string;
    let temperature = 0.7;
    let maxTokens = 2500;

    if (config) {
      // Usar configuración personalizada de la base de datos
      systemPrompt = config.systemPrompt;
      userPrompt = config.userPromptTemplate
        .replace('{{areasInfo}}', areasInfo)
        .replace('{{initiativesContext}}', initiatives.map((init: any) => `- ${init.name}: ${init.description || 'Sin descripción'}`).join('\n'))
        .replace('{{totalAreas}}', areasContext.length.toString())
        .replace('{{totalPriorities}}', totalPriorities.toString())
        .replace('{{completedCount}}', completedCount.toString())
        .replace('{{inRiskCount}}', inRiskCount.toString())
        .replace('{{blockedCount}}', blockedCount.toString());
      temperature = config.temperature;
      maxTokens = config.maxTokens;
    } else {
      // Usar prompts por defecto si no hay configuración
      systemPrompt = `Eres un consultor experto en gestión estratégica y análisis organizacional por áreas. Tu tarea es analizar las prioridades semanales de una organización agrupadas por área/departamento y proporcionar insights valiosos.

Analiza:
1. **Rendimiento por área**: ¿Qué áreas están teniendo mejor desempeño? ¿Cuáles necesitan apoyo?
2. **Alineación estratégica por área**: ¿Qué iniciativas estratégicas están priorizando cada área?
3. **Liderazgo de área**: ¿Los líderes de área tienen visibilidad de las prioridades de su equipo?
4. **Interdependencias entre áreas**: Identifica posibles dependencias o colaboraciones entre áreas basándote en las iniciativas compartidas
5. **Riesgos y oportunidades por área**: ¿Qué áreas tienen más riesgos? ¿Qué oportunidades de mejora existen?
6. **Recomendaciones**: Proporciona 3-5 recomendaciones accionables para mejorar la ejecución organizacional y la coordinación entre áreas

Responde en español, de manera profesional pero concisa. Usa formato markdown con secciones claras.`;

      userPrompt = `Analiza las siguientes prioridades semanales del equipo organizadas por área:

${areasInfo}

**Iniciativas estratégicas disponibles:**
${initiatives.map((init: any) => `- ${init.name}: ${init.description || 'Sin descripción'}`).join('\n')}

**Resumen global:**
- Total de áreas activas: ${areasContext.length}
- Total de prioridades: ${totalPriorities}
- Prioridades completadas: ${completedCount}
- Prioridades en riesgo: ${inRiskCount}
- Prioridades bloqueadas: ${blockedCount}

Proporciona un análisis completo enfocado en las áreas, considerando el rendimiento por área, interdependencias, alineación estratégica, liderazgo y recomendaciones para mejorar la coordinación organizacional.`;
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
        temperature: temperature,
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

    // Trackear uso de análisis organizacional
    if (session.user?.id) {
      await trackFeatureUsage(session.user.id, 'aiOrgAnalysis');
    }

    return NextResponse.json({
      analysis,
      metadata: {
        totalAreas: areasContext.length,
        totalPriorities: totalPriorities,
        completed: completedCount,
        inRisk: inRiskCount,
        blocked: blockedCount,
        onTime: totalPriorities - completedCount - inRiskCount - blockedCount,
        areasSummary: areasContext.map(area => ({
          area: area.area,
          leader: area.leader,
          total: area.stats.total,
          completed: area.stats.completed,
          inRisk: area.stats.inRisk,
          blocked: area.stats.blocked
        }))
      }
    });

  } catch (error: any) {
    console.error('Error analyzing by area:', error);
    return NextResponse.json({
      error: 'Error al procesar la solicitud'
    }, { status: 500 });
  }
}
