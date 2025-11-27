import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';

/**
 * Extrae información semántica relevante de una dinámica para el resumen
 */
function extractDynamicContext(msg: any): string | null {
  const { commandType, commandData, content } = msg;
  const userName = msg.userId?.name || 'Usuario';
  const timestamp = new Date(msg.createdAt).toLocaleString('es-ES', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  });

  if (!commandData) return null;

  const closed = commandData.closed ? ' [FINALIZADA]' : ' [EN CURSO]';

  switch (commandType) {
    // === VOTACIONES ===
    case 'poll':
    case 'vote': {
      const options = commandData.options || [];
      const totalVotes = options.reduce((sum: number, o: any) => sum + (o.votes?.length || 0), 0);
      const winner = options.reduce((prev: any, curr: any) =>
        (curr.votes?.length || 0) > (prev.votes?.length || 0) ? curr : prev, options[0]);
      const results = options.map((o: any) => `"${o.text}": ${o.votes?.length || 0} votos`).join(', ');
      return `[${timestamp}] 📊 ENCUESTA${closed}: "${commandData.question || content}"
   Opciones: ${results}
   ${winner && totalVotes > 0 ? `→ Ganador: "${winner.text}" con ${winner.votes?.length || 0} votos` : '→ Sin votos aún'}`;
    }

    case 'dot-voting': {
      const options = commandData.options || [];
      const totalPoints = options.reduce((sum: number, o: any) => sum + (o.points || 0), 0);
      const sorted = [...options].sort((a: any, b: any) => (b.points || 0) - (a.points || 0));
      const top3 = sorted.slice(0, 3).map((o: any, i: number) => `${i + 1}. "${o.text}" (${o.points || 0} pts)`).join(', ');
      return `[${timestamp}] 🔵 DOT VOTING${closed}: "${commandData.title || content}"
   Top opciones: ${top3}
   Total: ${totalPoints} puntos distribuidos`;
    }

    case 'blind-vote': {
      const options = commandData.options || [];
      if (!commandData.closed) {
        return `[${timestamp}] 🙈 VOTO OCULTO EN CURSO: "${commandData.question || content}" (resultados ocultos hasta finalizar)`;
      }
      const results = options.map((o: any) => `"${o.text}": ${o.votes?.length || 0}`).join(', ');
      return `[${timestamp}] 🙈 VOTO OCULTO${closed}: "${commandData.question || content}"
   Resultados: ${results}`;
    }

    case 'nps': {
      const responses = commandData.responses || [];
      if (responses.length === 0) return `[${timestamp}] 📈 NPS${closed}: "${commandData.question || content}" - Sin respuestas aún`;
      const avg = (responses.reduce((sum: number, r: any) => sum + r.score, 0) / responses.length).toFixed(1);
      const promoters = responses.filter((r: any) => r.score >= 9).length;
      const detractors = responses.filter((r: any) => r.score <= 6).length;
      const npsScore = Math.round(((promoters - detractors) / responses.length) * 100);
      return `[${timestamp}] 📈 NPS${closed}: "${commandData.question || content}"
   Puntuación NPS: ${npsScore} (promedio: ${avg}/10, ${responses.length} respuestas)`;
    }

    case 'fist-of-five':
    case 'confidence-vote': {
      const votes = commandData.votes || [];
      if (votes.length === 0) return `[${timestamp}] ✋ FIST OF FIVE${closed}: "${commandData.question || content}" - Sin votos aún`;
      const avg = (votes.reduce((sum: number, v: any) => sum + v.vote, 0) / votes.length).toFixed(1);
      const distribution = [1, 2, 3, 4, 5].map(n => `${n}: ${votes.filter((v: any) => v.vote === n).length}`).join(', ');
      return `[${timestamp}] ✋ VOTO DE CONFIANZA${closed}: "${commandData.question || content}"
   Promedio: ${avg}/5 (${votes.length} votos) - Distribución: ${distribution}`;
    }

    case 'roman-voting': {
      const votes = commandData.votes || [];
      const thumbsUp = votes.filter((v: any) => v.vote === 'up').length;
      const thumbsDown = votes.filter((v: any) => v.vote === 'down').length;
      const thumbsSide = votes.filter((v: any) => v.vote === 'side').length;
      return `[${timestamp}] 👍 VOTACIÓN ROMANA${closed}: "${commandData.question || content}"
   A favor: ${thumbsUp}, En contra: ${thumbsDown}, Neutral: ${thumbsSide}`;
    }

    // === IDEACIÓN ===
    case 'brainstorm': {
      const ideas = commandData.ideas || [];
      const topIdeas = [...ideas].sort((a: any, b: any) => (b.votes?.length || 0) - (a.votes?.length || 0)).slice(0, 5);
      const ideaList = topIdeas.map((i: any) => `• "${i.text}" (${i.votes?.length || 0} votos)`).join('\n   ');
      return `[${timestamp}] 💡 BRAINSTORM${closed}: "${commandData.question || content}"
   ${ideas.length} ideas generadas. Top ideas:
   ${ideaList || '(sin ideas aún)'}`;
    }

    case 'mind-map': {
      const nodes = commandData.nodes || [];
      const mainTopics = nodes.filter((n: any) => !n.parentId || n.parentId === 'root').slice(0, 5);
      return `[${timestamp}] 🧠 MAPA MENTAL${closed}: "${commandData.centralTopic || content}"
   ${nodes.length} nodos. Temas principales: ${mainTopics.map((n: any) => n.text).join(', ') || 'ninguno'}`;
    }

    case 'pros-cons': {
      const pros = commandData.pros || [];
      const cons = commandData.cons || [];
      return `[${timestamp}] ⚖️ PROS Y CONTRAS${closed}: "${commandData.topic || content}"
   ✅ Pros (${pros.length}): ${pros.slice(0, 3).map((p: any) => p.text).join(', ') || 'ninguno'}
   ❌ Contras (${cons.length}): ${cons.slice(0, 3).map((c: any) => c.text).join(', ') || 'ninguno'}`;
    }

    case 'decision-matrix': {
      const options = commandData.options || [];
      const criteria = commandData.criteria || [];
      const winner = options.reduce((prev: any, curr: any) =>
        (curr.totalScore || 0) > (prev.totalScore || 0) ? curr : prev, options[0]);
      return `[${timestamp}] 📊 MATRIZ DE DECISIÓN${closed}: "${commandData.title || content}"
   ${options.length} opciones evaluadas con ${criteria.length} criterios
   ${winner && winner.totalScore ? `→ Mejor opción: "${winner.name}" (puntuación: ${winner.totalScore})` : ''}`;
    }

    case 'ranking': {
      const items = commandData.items || [];
      const rankings = commandData.rankings || [];
      if (rankings.length === 0) return `[${timestamp}] 🏆 RANKING${closed}: "${commandData.title || content}" - Sin rankings aún`;
      // Calcular ranking promedio
      const avgRanks: Record<string, number[]> = {};
      rankings.forEach((r: any) => {
        r.order?.forEach((itemId: string, idx: number) => {
          if (!avgRanks[itemId]) avgRanks[itemId] = [];
          avgRanks[itemId].push(idx + 1);
        });
      });
      const sorted = items.map((item: any) => ({
        text: item.text,
        avgRank: avgRanks[item.id] ? (avgRanks[item.id].reduce((a: number, b: number) => a + b, 0) / avgRanks[item.id].length) : 999
      })).sort((a: any, b: any) => a.avgRank - b.avgRank);
      return `[${timestamp}] 🏆 RANKING${closed}: "${commandData.title || content}"
   Orden final: ${sorted.slice(0, 5).map((s: any, i: number) => `${i + 1}. ${s.text}`).join(', ')}`;
    }

    case 'brainwriting': {
      const rounds = commandData.rounds || [];
      const totalIdeas = rounds.reduce((sum: number, r: any) => sum + (r.ideas?.length || 0), 0);
      return `[${timestamp}] ✍️ BRAINWRITING${closed}: "${commandData.topic || content}"
   ${totalIdeas} ideas generadas en ${rounds.length} rondas`;
    }

    // === RETROSPECTIVAS ===
    case 'retro':
    case 'retrospective': {
      const sections = commandData.sections || [];
      const summary = sections.map((s: any) => `${s.title || s.name}: ${s.items?.length || 0}`).join(', ');
      const allItems = sections.flatMap((s: any) => (s.items || []).map((i: any) => ({ ...i, section: s.title || s.name })));
      const topVoted = allItems.sort((a: any, b: any) => (b.votes?.length || 0) - (a.votes?.length || 0)).slice(0, 3);
      return `[${timestamp}] 🔄 RETROSPECTIVA${closed}: "${commandData.title || content}"
   Secciones: ${summary}
   ${topVoted.length > 0 ? `Más votados: ${topVoted.map((i: any) => `"${i.text}" (${i.section})`).join(', ')}` : ''}`;
    }

    case 'sailboat': {
      const wind = commandData.wind || [];
      const anchor = commandData.anchor || [];
      const rocks = commandData.rocks || [];
      const island = commandData.island || [];
      return `[${timestamp}] ⛵ SAILBOAT${closed}: "${commandData.title || content}"
   🌬️ Viento (impulsa): ${wind.slice(0, 2).map((i: any) => i.text).join(', ') || 'ninguno'}
   ⚓ Ancla (frena): ${anchor.slice(0, 2).map((i: any) => i.text).join(', ') || 'ninguno'}
   🪨 Rocas (riesgos): ${rocks.slice(0, 2).map((i: any) => i.text).join(', ') || 'ninguno'}
   🏝️ Isla (meta): ${island.slice(0, 2).map((i: any) => i.text).join(', ') || 'ninguno'}`;
    }

    case 'start-stop-continue': {
      const start = commandData.start || [];
      const stop = commandData.stop || [];
      const continueItems = commandData.continue || [];
      return `[${timestamp}] 🚦 START-STOP-CONTINUE${closed}
   ▶️ Empezar: ${start.slice(0, 2).map((i: any) => i.text).join(', ') || 'ninguno'}
   ⏹️ Dejar: ${stop.slice(0, 2).map((i: any) => i.text).join(', ') || 'ninguno'}
   🔄 Continuar: ${continueItems.slice(0, 2).map((i: any) => i.text).join(', ') || 'ninguno'}`;
    }

    case '4ls': {
      const liked = commandData.liked || [];
      const learned = commandData.learned || [];
      const lacked = commandData.lacked || [];
      const longedFor = commandData.longedFor || [];
      return `[${timestamp}] 4️⃣ 4Ls RETROSPECTIVE${closed}
   ❤️ Liked: ${liked.length} items, 📚 Learned: ${learned.length} items
   😕 Lacked: ${lacked.length} items, 🌟 Longed For: ${longedFor.length} items`;
    }

    case 'mad-sad-glad': {
      const mad = commandData.mad || [];
      const sad = commandData.sad || [];
      const glad = commandData.glad || [];
      return `[${timestamp}] 😤 MAD-SAD-GLAD${closed}
   😠 Mad: ${mad.slice(0, 2).map((i: any) => i.text).join(', ') || 'ninguno'}
   😢 Sad: ${sad.slice(0, 2).map((i: any) => i.text).join(', ') || 'ninguno'}
   😊 Glad: ${glad.slice(0, 2).map((i: any) => i.text).join(', ') || 'ninguno'}`;
    }

    case 'starfish': {
      const keepDoing = commandData.keepDoing || [];
      const lessDoing = commandData.lessDoing || [];
      const moreDoing = commandData.moreDoing || [];
      const stopDoing = commandData.stopDoing || [];
      const startDoing = commandData.startDoing || [];
      return `[${timestamp}] ⭐ STARFISH${closed}
   Seguir: ${keepDoing.length}, Más: ${moreDoing.length}, Menos: ${lessDoing.length}, Parar: ${stopDoing.length}, Empezar: ${startDoing.length}`;
    }

    // === ANÁLISIS Y ESTRATEGIA ===
    case 'swot': {
      const strengths = commandData.strengths || [];
      const weaknesses = commandData.weaknesses || [];
      const opportunities = commandData.opportunities || [];
      const threats = commandData.threats || [];
      return `[${timestamp}] 📋 ANÁLISIS SWOT${closed}: "${commandData.title || content}"
   💪 Fortalezas: ${strengths.slice(0, 2).map((i: any) => i.text).join(', ') || 'ninguno'}
   😓 Debilidades: ${weaknesses.slice(0, 2).map((i: any) => i.text).join(', ') || 'ninguno'}
   🚀 Oportunidades: ${opportunities.slice(0, 2).map((i: any) => i.text).join(', ') || 'ninguno'}
   ⚠️ Amenazas: ${threats.slice(0, 2).map((i: any) => i.text).join(', ') || 'ninguno'}`;
    }

    case 'five-whys': {
      const problem = commandData.problem || '';
      const whys = commandData.whys || [];
      const rootCause = whys[whys.length - 1]?.answer || 'No identificada';
      return `[${timestamp}] ❓ 5 PORQUÉS${closed}
   Problema: "${problem}"
   ${whys.length} niveles analizados
   → Causa raíz: "${rootCause}"`;
    }

    case 'fishbone': {
      const problem = commandData.problem || '';
      const categories = commandData.categories || [];
      const totalCauses = categories.reduce((sum: number, c: any) => sum + (c.causes?.length || 0), 0);
      return `[${timestamp}] 🐟 DIAGRAMA ISHIKAWA${closed}
   Problema: "${problem}"
   ${totalCauses} causas identificadas en ${categories.length} categorías`;
    }

    case 'impact-effort': {
      const items = commandData.items || [];
      const quickWins = items.filter((i: any) => i.impact === 'high' && i.effort === 'low');
      const bigBets = items.filter((i: any) => i.impact === 'high' && i.effort === 'high');
      return `[${timestamp}] 📊 MATRIZ IMPACTO-ESFUERZO${closed}
   ${items.length} items clasificados
   🎯 Quick Wins: ${quickWins.map((i: any) => i.text).slice(0, 3).join(', ') || 'ninguno'}
   🚀 Big Bets: ${bigBets.map((i: any) => i.text).slice(0, 3).join(', ') || 'ninguno'}`;
    }

    case 'risk-matrix': {
      const risks = commandData.risks || [];
      const highRisks = risks.filter((r: any) => r.severity === 'high' || r.probability === 'high');
      return `[${timestamp}] ⚠️ MATRIZ DE RIESGOS${closed}
   ${risks.length} riesgos identificados, ${highRisks.length} de alto impacto
   ${highRisks.slice(0, 3).map((r: any) => `• ${r.text}`).join('\n   ') || '(sin riesgos altos)'}`;
    }

    case 'pre-mortem': {
      const failures = commandData.failures || [];
      return `[${timestamp}] 💀 PRE-MORTEM${closed}: "${commandData.project || content}"
   ${failures.length} posibles puntos de fallo identificados
   ${failures.slice(0, 3).map((f: any) => `• ${f.text}`).join('\n   ') || ''}`;
    }

    // === DECISIONES Y ACCIONES ===
    case 'decision': {
      return `[${timestamp}] ✅ DECISIÓN REGISTRADA por ${userName}: "${commandData.decision}"
   ${commandData.context ? `Contexto: ${commandData.context}` : ''}`;
    }

    case 'daci': {
      const roles = commandData.roles || [];
      const driver = roles.find((r: any) => r.role === 'driver')?.userName || 'No asignado';
      const approver = roles.find((r: any) => r.role === 'approver')?.userName || 'No asignado';
      return `[${timestamp}] 🎯 DACI${closed}: "${commandData.decision || content}"
   Driver: ${driver}, Approver: ${approver}
   Estado: ${commandData.status || 'draft'}`;
    }

    case 'action-items': {
      const items = commandData.items || [];
      const completed = items.filter((i: any) => i.completed).length;
      const pending = items.filter((i: any) => !i.completed);
      return `[${timestamp}] ✅ ACTION ITEMS${closed}
   ${completed}/${items.length} completados
   Pendientes: ${pending.slice(0, 5).map((i: any) => `• ${i.text} (${i.assignee || 'sin asignar'})`).join('\n   ') || 'ninguno'}`;
    }

    case 'checklist': {
      const items = commandData.items || [];
      const checked = items.filter((i: any) => i.checked).length;
      return `[${timestamp}] ☑️ CHECKLIST${closed}: "${commandData.title || content}"
   ${checked}/${items.length} completados`;
    }

    case 'moscow': {
      const must = commandData.must || [];
      const should = commandData.should || [];
      const could = commandData.could || [];
      const wont = commandData.wont || [];
      return `[${timestamp}] 📋 MoSCoW${closed}: "${commandData.title || content}"
   Must: ${must.length}, Should: ${should.length}, Could: ${could.length}, Won't: ${wont.length}
   Críticos (Must): ${must.slice(0, 3).map((i: any) => i.text).join(', ') || 'ninguno'}`;
    }

    // === OTRAS DINÁMICAS IMPORTANTES ===
    case 'standup':
    case 'daily-standup': {
      const updates = commandData.updates || [];
      return `[${timestamp}] 🌅 DAILY STANDUP${closed}
   ${updates.length} participantes reportaron
   ${updates.slice(0, 3).map((u: any) => `• ${u.userName}: Hizo: ${u.yesterday?.slice(0, 50) || '-'}, Hará: ${u.today?.slice(0, 50) || '-'}`).join('\n   ')}`;
    }

    case 'estimation-poker': {
      const stories = commandData.stories || [];
      const estimated = stories.filter((s: any) => s.finalEstimate !== undefined);
      return `[${timestamp}] 🃏 PLANNING POKER${closed}
   ${estimated.length}/${stories.length} historias estimadas
   ${estimated.slice(0, 3).map((s: any) => `• "${s.title}": ${s.finalEstimate} pts`).join('\n   ')}`;
    }

    case 'team-health': {
      const categories = commandData.categories || [];
      const avgHealth = categories.length > 0
        ? (categories.reduce((sum: number, c: any) => sum + (c.averageScore || 0), 0) / categories.length).toFixed(1)
        : 'N/A';
      const lowAreas = categories.filter((c: any) => (c.averageScore || 0) < 3);
      return `[${timestamp}] 💚 TEAM HEALTH CHECK${closed}
   Salud promedio: ${avgHealth}/5
   ${lowAreas.length > 0 ? `⚠️ Áreas de atención: ${lowAreas.map((c: any) => c.name).join(', ')}` : '✅ Todas las áreas saludables'}`;
    }

    case 'mood': {
      const moods = commandData.moods || [];
      if (moods.length === 0) return `[${timestamp}] 😊 CHECK-IN DE ÁNIMO${closed} - Sin respuestas`;
      const avgMood = (moods.reduce((sum: number, m: any) => sum + m.mood, 0) / moods.length).toFixed(1);
      return `[${timestamp}] 😊 CHECK-IN DE ÁNIMO${closed}
   Promedio: ${avgMood}/5 (${moods.length} respuestas)`;
    }

    case 'kudos-wall': {
      const kudos = commandData.kudos || [];
      return `[${timestamp}] 🎉 KUDOS WALL${closed}
   ${kudos.length} reconocimientos dados
   ${kudos.slice(0, 3).map((k: any) => `• ${k.from} → ${k.to}: "${k.message?.slice(0, 40)}..."`).join('\n   ')}`;
    }

    case 'celebrate': {
      return `[${timestamp}] 🎉 CELEBRACIÓN: ${userName} reconoció a ${commandData.userName}: "${commandData.achievement}"`;
    }

    case 'question': {
      let formatted = `[${timestamp}] ❓ PREGUNTA de ${userName} a ${commandData.askedTo}: "${commandData.question}"`;
      if (commandData.answered && commandData.answer) {
        formatted += `\n   ✅ RESPUESTA: "${commandData.answer}"`;
      } else {
        formatted += `\n   ⏳ PENDIENTE DE RESPUESTA`;
      }
      return formatted;
    }

    case 'blocker':
    case 'blockers': {
      const blockers = commandData.blockers || [commandData];
      return `[${timestamp}] 🚫 BLOCKER${closed}
   ${blockers.map((b: any) => `• ${b.description || b.text} ${b.resolved ? '(RESUELTO)' : '(ACTIVO)'}`).join('\n   ')}`;
    }

    case 'incident': {
      return `[${timestamp}] 🚨 INCIDENTE${closed}: "${commandData.title || content}"
   Severidad: ${commandData.severity || 'No especificada'}
   Estado: ${commandData.status || 'Abierto'}`;
    }

    // === CANVAS Y FRAMEWORKS ===
    case 'lean-canvas': {
      const sections = commandData.sections || [];
      const filledSections = sections.filter((s: any) => s.items?.length > 0).length;
      return `[${timestamp}] 📋 LEAN CANVAS${closed}
   ${filledSections}/${sections.length} secciones completadas`;
    }

    case 'vpc': {
      const sections = commandData.sections || [];
      const totalItems = sections.reduce((sum: number, s: any) => sum + (s.items?.length || 0), 0);
      return `[${timestamp}] 💎 VALUE PROPOSITION CANVAS${closed}
   ${totalItems} elementos en ${sections.length} secciones`;
    }

    case 'customer-journey': {
      const stages = commandData.stages || [];
      return `[${timestamp}] 🗺️ CUSTOMER JOURNEY${closed}
   ${stages.length} etapas mapeadas`;
    }

    case 'persona': {
      return `[${timestamp}] 👤 PERSONA${closed}: "${commandData.name || content}"
   ${commandData.goals?.length || 0} objetivos, ${commandData.frustrations?.length || 0} frustraciones`;
    }

    // === PNL ===
    case 'wheel-of-life': {
      const areas = commandData.areas || [];
      const avgScore = areas.length > 0
        ? (areas.reduce((sum: number, a: any) => sum + (a.currentScore || 0), 0) / areas.length).toFixed(1)
        : 'N/A';
      const lowAreas = areas.filter((a: any) => (a.currentScore || 0) < 5);
      return `[${timestamp}] 🎡 RUEDA DE LA VIDA${closed}
   Promedio: ${avgScore}/10
   ${lowAreas.length > 0 ? `Áreas a mejorar: ${lowAreas.map((a: any) => a.area).join(', ')}` : ''}`;
    }

    case 'values-wheel': {
      const values = commandData.values || [];
      return `[${timestamp}] 🧭 RUEDA DE VALORES${closed}
   ${values.length} valores identificados
   ${values.slice(0, 3).map((v: any) => `• ${v.name} (importancia: ${v.importance}/10)`).join('\n   ')}`;
    }

    // Default: intentar extraer información básica
    default:
      // Si tiene título o pregunta, incluirlo
      if (commandData.title || commandData.question || commandData.topic) {
        const title = commandData.title || commandData.question || commandData.topic;
        const itemCount =
          (commandData.items?.length || 0) +
          (commandData.ideas?.length || 0) +
          (commandData.options?.length || 0) +
          (commandData.sections?.reduce((sum: number, s: any) => sum + (s.items?.length || 0), 0) || 0);
        return `[${timestamp}] 📌 ${commandType.toUpperCase()}${closed}: "${title}"${itemCount > 0 ? ` (${itemCount} elementos)` : ''}`;
      }
      return null;
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const body = await request.json();
    const { messages, maxMessages = 100 } = body;

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

    // Contar dinámicas para estadísticas
    const dynamicsCount = recentMessages.filter((m: any) => m.commandType && m.commandData).length;
    const regularMessagesCount = recentMessages.length - dynamicsCount;

    // Extraer y contar hashtags de los mensajes
    const tagCounts: Record<string, number> = {};
    recentMessages.forEach((msg: any) => {
      if (msg.tags && Array.isArray(msg.tags)) {
        msg.tags.forEach((tag: string) => {
          tagCounts[tag] = (tagCounts[tag] || 0) + 1;
        });
      }
    });

    // Ordenar tags por frecuencia
    const topTags = Object.entries(tagCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 15)
      .map(([tag, count]) => `#${tag} (${count})`);

    // Formatear mensajes para el contexto
    const chatContext = recentMessages.map((msg: any) => {
      const userName = msg.userId?.name || 'Usuario';
      const timestamp = new Date(msg.createdAt).toLocaleString('es-ES', {
        day: '2-digit',
        month: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
      });

      // Intentar extraer contexto de dinámica
      if (msg.commandType && msg.commandData) {
        const dynamicContext = extractDynamicContext(msg);
        if (dynamicContext) return dynamicContext;
      }

      // Para mensajes normales, usar el contenido
      const tagsStr = msg.tags?.length > 0 ? ` [Tags: ${msg.tags.map((t: string) => `#${t}`).join(', ')}]` : '';
      return `[${timestamp}] ${userName}: ${msg.content}${tagsStr}`;
    }).join('\n\n');

    // Contexto de tags para el prompt
    const tagsContext = topTags.length > 0
      ? `\n\n📌 HASHTAGS MÁS USADOS:\n${topTags.join(', ')}`
      : '';

    const systemPrompt = `Eres un asistente experto en análisis de conversaciones de equipos de trabajo. Tu tarea es generar un resumen ejecutivo completo que ponga al día a alguien que no ha estado presente.

IMPORTANTE - El chat contiene tres tipos de contenido:
1. **Mensajes de texto**: Conversaciones normales entre usuarios
2. **Dinámicas colaborativas**: Actividades estructuradas como votaciones, brainstorms, retrospectivas, análisis SWOT, etc. Estas están marcadas con emojis y etiquetas como [FINALIZADA] o [EN CURSO]
3. **Hashtags (#tags)**: Etiquetas usadas para categorizar temas importantes. Los mensajes pueden tener tags como #urgente, #decision, #blocker, #idea, etc.

El resumen DEBE incluir:

## 📊 Resumen de Actividad
- Número de mensajes y dinámicas analizadas
- Período de tiempo cubierto

## 🎯 Decisiones y Resultados Clave
- Resultados de votaciones y encuestas (quién/qué ganó)
- Decisiones tomadas (busca "DECISIÓN REGISTRADA" y DACI)
- Conclusiones de análisis (SWOT, 5 Porqués, Matrices)

## 💡 Ideas y Propuestas Principales
- Top ideas de brainstorms
- Propuestas más votadas
- Quick wins identificados

## 🔄 Estado del Equipo
- Resultados de retrospectivas (qué funciona, qué no)
- Health checks y mood del equipo
- Kudos y celebraciones

## ⚠️ Puntos de Atención
- Blockers activos
- Riesgos identificados
- Preguntas sin responder
- Tareas pendientes

## 👥 Participación
- Quiénes han sido más activos
- Quiénes tienen tareas asignadas

## 🏷️ Temas Principales (Hashtags)
- Tags más usados y su contexto
- Temas recurrentes identificados
- Agrupa la información por tema cuando sea relevante

REGLAS:
- Prioriza la información de las dinámicas sobre los mensajes de texto
- Menciona si las dinámicas están [FINALIZADAS] o [EN CURSO]
- Incluye datos específicos: números, porcentajes, nombres de ganadores
- Usa español
- Sé conciso pero no omitas información importante de las dinámicas`;

    const userPrompt = `Analiza este historial de chat (${regularMessagesCount} mensajes + ${dynamicsCount} dinámicas colaborativas) y genera un resumen ejecutivo:
${tagsContext}

${chatContext}

Genera un resumen completo que permita a alguien ponerse al día rápidamente.`;

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
        temperature: 0.4,
        max_tokens: 2500,
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
      dynamicsAnalyzed: dynamicsCount,
      tagsFound: Object.keys(tagCounts).length,
      topTags: topTags.slice(0, 10),
      generatedAt: new Date().toISOString()
    });

  } catch (error: any) {
    console.error('Error generating chat summary:', error);
    return NextResponse.json({
      error: 'Error al procesar la solicitud'
    }, { status: 500 });
  }
}
