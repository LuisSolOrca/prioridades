import Notification from '@/models/Notification';
import User from '@/models/User';
import Project from '@/models/Project';
import { sendEmail, emailTemplates } from './email';
import connectDB from './mongodb';

// Tipos de dinámicas y sus etiquetas en español
const DYNAMIC_TYPE_LABELS: Record<string, string> = {
  // Votaciones
  'poll': 'Encuesta',
  'dot-voting': 'Dot Voting',
  'blind-vote': 'Votación Ciega',
  'fist-of-five': 'Puño de Cinco',
  'confidence-vote': 'Voto de Confianza',
  'nps': 'NPS',
  'roman-voting': 'Votación Romana',
  'ranking': 'Ranking',
  // Ideación
  'brainstorm': 'Lluvia de Ideas',
  'mind-map': 'Mapa Mental',
  'pros-cons': 'Pros y Contras',
  'decision-matrix': 'Matriz de Decisión',
  'scamper': 'SCAMPER',
  'starbursting': 'Starbursting',
  'reverse-brainstorm': 'Brainstorm Inverso',
  'worst-idea': 'Peor Idea',
  'lotus-blossom': 'Lotus Blossom',
  'brainwriting': 'Brainwriting 6-3-5',
  'how-might-we': 'How Might We',
  // Retrospectivas
  'retrospective': 'Retrospectiva',
  'team-health': 'Salud del Equipo',
  'mood': 'Estado de Ánimo',
  'rose-bud-thorn': 'Rosa-Brote-Espina',
  'sailboat': 'Sailboat',
  'start-stop-continue': 'Start-Stop-Continue',
  '4ls': '4Ls',
  'pre-mortem': 'Pre-Mortem',
  'starfish': 'Starfish',
  'mad-sad-glad': 'Mad Sad Glad',
  'hot-air-balloon': 'Hot Air Balloon',
  'kalm': 'KALM',
  // Gestión
  'action-items': 'Acciones',
  'checklist': 'Checklist',
  'agenda': 'Agenda',
  'parking-lot': 'Parking Lot',
  'pomodoro': 'Pomodoro',
  'estimation-poker': 'Planning Poker',
  'standup': 'Standup',
  'lean-coffee': 'Lean Coffee',
  'working-agreements': 'Working Agreements',
  // Análisis
  'swot': 'SWOT',
  'soar': 'SOAR',
  'six-hats': 'Sombreros de Bono',
  'crazy-8s': 'Crazy 8s',
  'affinity-map': 'Mapa de Afinidad',
  'five-whys': '5 Porqués',
  'impact-effort': 'Impacto vs Esfuerzo',
  'fishbone': 'Diagrama Ishikawa',
  'assumption-mapping': 'Assumption Mapping',
  'risk-matrix': 'Matriz de Riesgos',
  // Frameworks
  'kudos-wall': 'Muro de Kudos',
  'icebreaker': 'Icebreaker',
  'inception-deck': 'Inception Deck',
  'delegation-poker': 'Delegation Poker',
  'moving-motivators': 'Moving Motivators',
  'opportunity-tree': 'Opportunity Tree',
  'user-story-mapping': 'User Story Mapping',
  'raci': 'Matriz RACI',
  'lean-canvas': 'Lean Canvas',
  'customer-journey': 'Customer Journey Map',
  'rice': 'RICE Scoring',
  'persona': 'Persona',
  'team-canvas': 'Team Canvas',
  'empathy-map': 'Mapa de Empatía',
  'moscow': 'MoSCoW',
  'roadmap': 'Roadmap',
  'okr': 'OKR',
  'capacity': 'Capacidad',
  'dependency-map': 'Mapa de Dependencias',
  'vote-points': 'Votación por Puntos',
  // Dinámicas adicionales
  'hopes-fears': 'Hopes & Fears',
  'kano-model': 'Modelo Kano',
  'futures-wheel': 'Futures Wheel',
  'vpc': 'Value Proposition Canvas',
  'daci': 'DACI Framework',
  'innovation-matrix': 'Matriz de Innovación',
  'open-space': 'Open Space',
  'lightning-demos': 'Lightning Demos',
  'storyboard': 'Storyboard',
  'jtbd-canvas': 'Jobs to Be Done Canvas',
  'odd-one-out': 'Odd One Out',
  'impact-mapping': 'Impact Mapping',
  // PNL (Programación Neuro-Lingüística)
  'timeline-board': 'Línea de Tiempo (PNL)',
  'reframing-board': 'Reencuadre (PNL)',
  'perceptual-positions': 'Posiciones Perceptuales (PNL)',
  'values-wheel': 'Rueda de Valores (PNL)',
  'wheel-of-life': 'Rueda de la Vida (PNL)',
  'swish-pattern': 'Patrón Swish (PNL)',
  'action-triads': 'Tríadas de Acción (PNL)',
  'vakog-board': 'VAKOG Board (PNL)',
  'anchor-mapping': 'Mapeo de Anclajes (PNL)',
  'metamodel-board': 'Metamodelo (PNL)',
  'metaphor-canvas': 'Lienzo de Metáforas (PNL)',
};

interface DynamicSummary {
  title: string;
  summary: string;
  recommendations: string[];
  stats: Record<string, any>;
  detailedResultsHTML: string; // HTML con todos los resultados detallados
}

// Helper para generar barras de progreso en HTML
function progressBar(percent: number, color: string = '#6366f1'): string {
  return `<div style="background:#e5e7eb;border-radius:4px;height:8px;width:100%;margin-top:4px;">
    <div style="background:${color};border-radius:4px;height:8px;width:${Math.min(percent, 100)}%;"></div>
  </div>`;
}

// Helper para generar item de lista
function listItem(text: string, subtext?: string, badge?: string): string {
  return `<div style="padding:10px 12px;background:#f9fafb;border-radius:6px;margin:6px 0;">
    <div style="display:flex;justify-content:space-between;align-items:center;">
      <span style="color:#1f2937;">${text}</span>
      ${badge ? `<span style="background:#6366f1;color:white;padding:2px 8px;border-radius:4px;font-size:12px;">${badge}</span>` : ''}
    </div>
    ${subtext ? `<div style="color:#6b7280;font-size:12px;margin-top:4px;">${subtext}</div>` : ''}
  </div>`;
}

/**
 * Genera un resumen contextual basado en el tipo de dinámica y sus datos
 */
export function generateDynamicSummary(commandType: string, commandData: any): DynamicSummary {
  const title = commandData.title || commandData.question || commandData.topic || 'Sin título';
  const typeLabel = DYNAMIC_TYPE_LABELS[commandType] || commandType;

  let summary = '';
  let recommendations: string[] = [];
  let stats: Record<string, any> = {};
  let detailedResultsHTML = '';

  switch (commandType) {
    // === VOTACIONES ===
    case 'poll':
    case 'vote-points':
      const options = commandData.options || [];
      const totalVotes = options.reduce((sum: number, opt: any) => sum + (opt.votes?.length || 0), 0);
      const winner = options.reduce((prev: any, curr: any) =>
        (curr.votes?.length || 0) > (prev.votes?.length || 0) ? curr : prev, options[0]);
      stats = { totalVotes, optionsCount: options.length, winner: winner?.text };
      summary = `${totalVotes} votos emitidos en ${options.length} opciones.`;
      if (winner && totalVotes > 0) {
        recommendations.push(`Opción ganadora: "${winner.text}" con ${winner.votes?.length || 0} votos`);
      }
      // Resultados detallados
      const sortedOptions = [...options].sort((a, b) => (b.votes?.length || 0) - (a.votes?.length || 0));
      detailedResultsHTML = `<h4 style="color:#1f2937;margin:0 0 12px 0;">📊 Resultados de la Votación</h4>
        ${sortedOptions.map((opt: any, idx: number) => {
          const votes = opt.votes?.length || 0;
          const percent = totalVotes > 0 ? Math.round((votes / totalVotes) * 100) : 0;
          const isWinner = idx === 0 && votes > 0;
          return `<div style="padding:12px;background:${isWinner ? '#ecfdf5' : '#f9fafb'};border-radius:8px;margin:8px 0;${isWinner ? 'border:2px solid #10b981;' : ''}">
            <div style="display:flex;justify-content:space-between;align-items:center;">
              <span style="color:#1f2937;font-weight:${isWinner ? '600' : '400'};">${isWinner ? '🏆 ' : ''}${opt.text}</span>
              <span style="color:#6366f1;font-weight:600;">${votes} votos (${percent}%)</span>
            </div>
            ${progressBar(percent, isWinner ? '#10b981' : '#6366f1')}
          </div>`;
        }).join('')}`;
      break;

    case 'dot-voting':
      const dotOptions = commandData.options || [];
      const totalPoints = dotOptions.reduce((sum: number, opt: any) => sum + (opt.points || 0), 0);
      const dotWinner = dotOptions.reduce((prev: any, curr: any) =>
        (curr.points || 0) > (prev.points || 0) ? curr : prev, dotOptions[0]);
      stats = { totalPoints, winner: dotWinner?.text };
      summary = `${totalPoints} puntos distribuidos.`;
      if (dotWinner) {
        recommendations.push(`Mayor prioridad: "${dotWinner.text}" con ${dotWinner.points || 0} puntos`);
      }
      const sortedDotOptions = [...dotOptions].sort((a, b) => (b.points || 0) - (a.points || 0));
      detailedResultsHTML = `<h4 style="color:#1f2937;margin:0 0 12px 0;">🎯 Priorización por Puntos</h4>
        ${sortedDotOptions.map((opt: any, idx: number) => {
          const points = opt.points || 0;
          const percent = totalPoints > 0 ? Math.round((points / totalPoints) * 100) : 0;
          const isWinner = idx === 0 && points > 0;
          return `<div style="padding:12px;background:${isWinner ? '#fef3c7' : '#f9fafb'};border-radius:8px;margin:8px 0;${isWinner ? 'border:2px solid #f59e0b;' : ''}">
            <div style="display:flex;justify-content:space-between;align-items:center;">
              <span style="color:#1f2937;font-weight:${isWinner ? '600' : '400'};">${isWinner ? '⭐ ' : ''}${opt.text}</span>
              <span style="color:#f59e0b;font-weight:600;">${points} pts (${percent}%)</span>
            </div>
            ${progressBar(percent, isWinner ? '#f59e0b' : '#6366f1')}
          </div>`;
        }).join('')}`;
      break;

    case 'blind-vote':
      const blindOptions = commandData.options || [];
      const blindVotes = blindOptions.reduce((sum: number, opt: any) => sum + (opt.votes?.length || 0), 0);
      const blindWinner = blindOptions.reduce((prev: any, curr: any) =>
        (curr.votes?.length || 0) > (prev.votes?.length || 0) ? curr : prev, blindOptions[0]);
      stats = { totalVotes: blindVotes, winner: blindWinner?.text };
      summary = `Votación secreta completada con ${blindVotes} votos.`;
      if (blindWinner) {
        recommendations.push(`Resultado: "${blindWinner.text}" fue la opción elegida`);
      }
      break;

    case 'nps':
      const npsVotes = commandData.votes || [];
      const avgScore = npsVotes.length > 0
        ? (npsVotes.reduce((sum: number, v: any) => sum + v.score, 0) / npsVotes.length).toFixed(1)
        : 0;
      const promoters = npsVotes.filter((v: any) => v.score >= 9).length;
      const detractors = npsVotes.filter((v: any) => v.score <= 6).length;
      const npsScore = npsVotes.length > 0
        ? Math.round(((promoters - detractors) / npsVotes.length) * 100)
        : 0;
      stats = { avgScore, npsScore, responses: npsVotes.length, promoters, detractors };
      summary = `NPS: ${npsScore} (${npsVotes.length} respuestas, promedio ${avgScore}/10)`;
      if (npsScore >= 50) recommendations.push('Excelente NPS - mantener las buenas prácticas');
      else if (npsScore >= 0) recommendations.push('NPS neutral - identificar áreas de mejora');
      else recommendations.push('NPS negativo - acciones urgentes requeridas');
      break;

    case 'confidence-vote':
    case 'fist-of-five':
      const confVotes = commandData.votes || [];
      const avgConf = confVotes.length > 0
        ? (confVotes.reduce((sum: number, v: any) => sum + (v.value || v.score || 0), 0) / confVotes.length).toFixed(1)
        : 0;
      stats = { avgConfidence: avgConf, responses: confVotes.length };
      summary = `Confianza promedio: ${avgConf}/5 con ${confVotes.length} participantes.`;
      if (Number(avgConf) < 3) recommendations.push('Confianza baja - revisar impedimentos antes de continuar');
      break;

    case 'roman-voting':
      const romanVotes = commandData.votes || [];
      const thumbsUp = romanVotes.filter((v: any) => v.vote === 'up').length;
      const thumbsDown = romanVotes.filter((v: any) => v.vote === 'down').length;
      const sideways = romanVotes.filter((v: any) => v.vote === 'sideways').length;
      stats = { thumbsUp, thumbsDown, sideways, total: romanVotes.length };
      summary = `👍 ${thumbsUp} | 👎 ${thumbsDown} | ✊ ${sideways}`;
      if (thumbsDown > thumbsUp) recommendations.push('Mayoría en contra - revisar la propuesta');
      else if (thumbsUp > romanVotes.length / 2) recommendations.push('Propuesta aprobada por mayoría');
      break;

    // === IDEACIÓN ===
    case 'brainstorm':
      const ideas = commandData.ideas || [];
      const totalIdeas = ideas.length;
      const totalIdeaVotes = ideas.reduce((sum: number, i: any) => sum + (i.votes?.length || 0), 0);
      const sortedIdeas = [...ideas].sort((a, b) => (b.votes?.length || 0) - (a.votes?.length || 0));
      const topIdeas = sortedIdeas.slice(0, 3);
      stats = { totalIdeas, totalVotes: totalIdeaVotes, topIdeas: topIdeas.map((i: any) => i.text) };
      summary = `${totalIdeas} ideas generadas, ${totalIdeaVotes} votos totales.`;
      if (topIdeas.length > 0) {
        recommendations.push(`Top ideas: ${topIdeas.map((i: any) => `"${i.text?.substring(0, 30)}..."`).join(', ')}`);
        recommendations.push('Considera crear prioridades con /quick-priority para las mejores ideas');
      }
      detailedResultsHTML = `<h4 style="color:#1f2937;margin:0 0 12px 0;">💡 Ideas Generadas (${totalIdeas})</h4>
        ${sortedIdeas.map((idea: any, idx: number) => {
          const votes = idea.votes?.length || 0;
          const isTop = idx < 3 && votes > 0;
          return `<div style="padding:12px;background:${isTop ? '#eff6ff' : '#f9fafb'};border-radius:8px;margin:8px 0;${isTop ? 'border-left:4px solid #3b82f6;' : ''}">
            <div style="display:flex;justify-content:space-between;align-items:flex-start;">
              <div style="flex:1;">
                <span style="color:#1f2937;">${isTop ? `<strong>#${idx + 1}</strong> ` : ''}${idea.text}</span>
                ${idea.author?.name ? `<div style="color:#6b7280;font-size:12px;margin-top:4px;">por ${idea.author.name}</div>` : ''}
              </div>
              <span style="color:#3b82f6;font-weight:600;margin-left:12px;">👍 ${votes}</span>
            </div>
          </div>`;
        }).join('')}`;
      break;

    case 'mind-map':
      const nodes = commandData.nodes || [];
      stats = { totalNodes: nodes.length };
      summary = `Mapa mental con ${nodes.length} nodos creados.`;
      recommendations.push('Revisa los nodos principales para identificar temas clave');
      break;

    // === RETROSPECTIVAS ===
    case 'retrospective':
    case 'rose-bud-thorn':
    case 'sailboat':
    case 'start-stop-continue':
    case '4ls':
    case 'starfish':
    case 'mad-sad-glad':
    case 'hot-air-balloon':
    case 'kalm':
    case 'swot':
    case 'soar':
    case 'six-hats':
    case 'crazy-8s':
    case 'affinity-map':
    case 'scamper':
    case 'starbursting':
    case 'reverse-brainstorm':
    case 'worst-idea':
    case 'empathy-map':
    case 'moscow':
    case 'pre-mortem':
    case 'how-might-we':
      const sections = commandData.sections || [];
      let totalItems = 0;
      const sectionStats: Record<string, number> = {};
      sections.forEach((s: any) => {
        const count = s.items?.length || 0;
        totalItems += count;
        sectionStats[s.title || s.id] = count;
      });
      stats = { totalItems, sections: sectionStats };
      summary = `${totalItems} items en ${sections.length} secciones.`;
      const topSection = Object.entries(sectionStats).sort(([,a], [,b]) => (b as number) - (a as number))[0];
      if (topSection) {
        recommendations.push(`Sección más activa: "${topSection[0]}" con ${topSection[1]} items`);
      }
      recommendations.push('Crear acciones concretas con /action-items basado en los insights');
      // Resultados detallados por sección
      const sectionColors = ['#ef4444', '#f59e0b', '#10b981', '#3b82f6', '#8b5cf6', '#ec4899'];
      detailedResultsHTML = sections.map((section: any, sIdx: number) => {
        const color = sectionColors[sIdx % sectionColors.length];
        const items = section.items || [];
        return `<div style="margin-bottom:20px;">
          <h4 style="color:${color};margin:0 0 10px 0;padding:8px 12px;background:${color}15;border-left:4px solid ${color};border-radius:0 6px 6px 0;">
            ${section.title || section.id} (${items.length})
          </h4>
          ${items.length > 0 ? items.map((item: any) => `
            <div style="padding:10px 12px;background:#f9fafb;border-radius:6px;margin:6px 0 6px 16px;">
              <span style="color:#1f2937;">${item.text || item.content}</span>
              ${item.userName ? `<div style="color:#6b7280;font-size:11px;margin-top:4px;">— ${item.userName}</div>` : ''}
            </div>
          `).join('') : '<p style="color:#9ca3af;font-style:italic;margin-left:16px;">Sin items</p>'}
        </div>`;
      }).join('');
      break;

    // === ANÁLISIS ===
    case 'decision-matrix':
      const dmOptions = commandData.options || [];
      const criteria = commandData.criteria || [];
      const matrixWinner = dmOptions.reduce((prev: any, curr: any) => {
        const prevScore = prev.scores?.reduce((s: number, sc: any) => s + (sc.average || 0), 0) || 0;
        const currScore = curr.scores?.reduce((s: number, sc: any) => s + (sc.average || 0), 0) || 0;
        return currScore > prevScore ? curr : prev;
      }, dmOptions[0]);
      stats = { optionsCount: dmOptions.length, criteriaCount: criteria.length, winner: matrixWinner?.text };
      summary = `Matriz con ${dmOptions.length} opciones y ${criteria.length} criterios evaluados.`;
      if (matrixWinner) {
        recommendations.push(`Opción recomendada: "${matrixWinner.text}"`);
      }
      break;

    case 'five-whys':
      const whys = commandData.whys || [];
      const rootCause = commandData.rootCause;
      stats = { whysCount: whys.length, hasRootCause: !!rootCause };
      summary = `Análisis de ${whys.length} niveles de "por qué".`;
      if (rootCause) {
        recommendations.push(`Causa raíz identificada: "${rootCause}"`);
        recommendations.push('Definir acciones correctivas con /action-items');
      }
      break;

    case 'fishbone':
      const categories = commandData.categories || [];
      const totalCauses = categories.reduce((sum: number, c: any) => sum + (c.causes?.length || 0), 0);
      stats = { categories: categories.length, totalCauses };
      summary = `Diagrama con ${categories.length} categorías y ${totalCauses} causas identificadas.`;
      recommendations.push('Priorizar las causas principales con /impact-effort');
      break;

    case 'impact-effort':
      const items = commandData.items || [];
      const quickWins = items.filter((i: any) => i.impact >= 3 && i.effort <= 2).length;
      const bigBets = items.filter((i: any) => i.impact >= 3 && i.effort >= 3).length;
      stats = { totalItems: items.length, quickWins, bigBets };
      summary = `${items.length} elementos evaluados: ${quickWins} quick wins, ${bigBets} big bets.`;
      if (quickWins > 0) {
        recommendations.push(`Priorizar ${quickWins} quick wins (alto impacto, bajo esfuerzo)`);
      }
      break;

    case 'risk-matrix':
      const risks = commandData.risks || [];
      const highRisks = risks.filter((r: any) => (r.probability || 0) * (r.impact || 0) >= 9).length;
      const mediumRisks = risks.filter((r: any) => {
        const score = (r.probability || 0) * (r.impact || 0);
        return score >= 4 && score < 9;
      }).length;
      stats = { totalRisks: risks.length, highRisks, mediumRisks };
      summary = `${risks.length} riesgos identificados: ${highRisks} críticos, ${mediumRisks} medios.`;
      if (highRisks > 0) {
        recommendations.push(`⚠️ ${highRisks} riesgos críticos requieren atención inmediata`);
      }
      break;

    // === PRIORIZACIÓN ===
    case 'rice':
      const riceItems = commandData.items || [];
      const sortedRice = [...riceItems].sort((a, b) => (b.riceScore || 0) - (a.riceScore || 0));
      const topRice = sortedRice.slice(0, 3);
      stats = { totalItems: riceItems.length, topItems: topRice.map((i: any) => ({ name: i.name, score: i.riceScore })) };
      summary = `${riceItems.length} items priorizados con RICE.`;
      if (topRice.length > 0) {
        recommendations.push(`Top prioridades: ${topRice.map((i: any) => `"${i.name}" (${i.riceScore?.toFixed(0)})`).join(', ')}`);
      }
      break;

    case 'estimation-poker':
      const estimates = commandData.estimates || [];
      const consensus = commandData.consensus;
      stats = { participantsCount: estimates.length, consensus };
      summary = `${estimates.length} estimaciones recibidas.`;
      if (consensus) {
        recommendations.push(`Consenso alcanzado: ${consensus} puntos`);
      } else {
        recommendations.push('Sin consenso - considerar discusión adicional');
      }
      break;

    // === EQUIPOS ===
    case 'team-health':
      const healthItems = commandData.items || [];
      const avgHealth = healthItems.length > 0
        ? (healthItems.reduce((sum: number, i: any) => {
            const votes = i.votes || [];
            const avg = votes.length > 0
              ? votes.reduce((s: number, v: any) => s + v.value, 0) / votes.length
              : 0;
            return sum + avg;
          }, 0) / healthItems.length).toFixed(1)
        : 0;
      stats = { avgHealth, areasCount: healthItems.length };
      summary = `Salud promedio del equipo: ${avgHealth}/5 en ${healthItems.length} áreas.`;
      const lowAreas = healthItems.filter((i: any) => {
        const votes = i.votes || [];
        const avg = votes.length > 0 ? votes.reduce((s: number, v: any) => s + v.value, 0) / votes.length : 0;
        return avg < 3;
      });
      if (lowAreas.length > 0) {
        recommendations.push(`Áreas a mejorar: ${lowAreas.map((a: any) => a.title).join(', ')}`);
      }
      break;

    case 'mood':
      const moods = commandData.responses || commandData.moods || [];
      const avgMood = moods.length > 0
        ? (moods.reduce((sum: number, m: any) => sum + (m.value || m.score || 3), 0) / moods.length).toFixed(1)
        : 0;
      stats = { avgMood, responses: moods.length };
      summary = `Estado de ánimo promedio: ${avgMood}/5 con ${moods.length} respuestas.`;
      break;

    // === GESTIÓN ===
    case 'action-items':
      const actions = commandData.items || [];
      const completed = actions.filter((a: any) => a.completed).length;
      const pending = actions.length - completed;
      stats = { total: actions.length, completed, pending };
      summary = `${actions.length} acciones: ${completed} completadas, ${pending} pendientes.`;
      if (pending > 0) {
        recommendations.push(`${pending} acciones pendientes de seguimiento`);
      }
      break;

    case 'checklist':
      const checkItems = commandData.items || [];
      const checked = checkItems.filter((i: any) => i.checked).length;
      const checkPending = checkItems.length - checked;
      stats = { total: checkItems.length, checked, pending: checkPending };
      summary = `Checklist: ${checked}/${checkItems.length} completados.`;
      break;

    case 'lean-coffee':
      const topics = commandData.topics || [];
      const discussed = topics.filter((t: any) => t.discussed).length;
      stats = { totalTopics: topics.length, discussed };
      summary = `${discussed}/${topics.length} temas discutidos.`;
      if (topics.length - discussed > 0) {
        recommendations.push(`${topics.length - discussed} temas pendientes para próxima sesión`);
      }
      break;

    // === FRAMEWORKS ===
    case 'lean-canvas':
      const blocks = commandData.blocks || {};
      const filledBlocks = Object.values(blocks).filter((b: any) => b && (Array.isArray(b) ? b.length > 0 : true)).length;
      stats = { filledBlocks, totalBlocks: 9 };
      summary = `Lean Canvas: ${filledBlocks}/9 bloques completados.`;
      if (filledBlocks < 9) {
        recommendations.push('Completar todos los bloques del canvas para visión completa');
      }
      break;

    case 'customer-journey':
      const stages = commandData.stages || [];
      stats = { stagesCount: stages.length };
      summary = `Customer Journey con ${stages.length} etapas mapeadas.`;
      break;

    case 'user-story-mapping':
      const activities = commandData.activities || [];
      const releases = commandData.releases || [];
      const totalStories = activities.reduce((sum: number, a: any) =>
        sum + (a.stories?.length || 0), 0);
      stats = { activities: activities.length, releases: releases.length, stories: totalStories };
      summary = `Story Map: ${activities.length} actividades, ${totalStories} historias, ${releases.length} releases.`;
      break;

    case 'raci':
      const raciTasks = commandData.tasks || [];
      const roles = commandData.roles || [];
      stats = { tasks: raciTasks.length, roles: roles.length };
      summary = `Matriz RACI: ${raciTasks.length} tareas x ${roles.length} roles definidos.`;
      break;

    case 'working-agreements':
      const agreements = commandData.categories?.reduce((sum: number, c: any) =>
        sum + (c.agreements?.length || 0), 0) || 0;
      stats = { totalAgreements: agreements };
      summary = `${agreements} acuerdos de trabajo definidos.`;
      recommendations.push('Revisar los acuerdos periódicamente en retrospectivas');
      break;

    // === DINÁMICAS ADICIONALES ===
    case 'hopes-fears':
      const hopesFearsItems = commandData.items || [];
      const hopes = hopesFearsItems.filter((i: any) => i.type === 'hope');
      const fears = hopesFearsItems.filter((i: any) => i.type === 'fear');
      const totalHFVotes = hopesFearsItems.reduce((sum: number, i: any) => sum + (i.votes?.length || 0), 0);
      stats = { hopes: hopes.length, fears: fears.length, totalVotes: totalHFVotes };
      summary = `${hopes.length} esperanzas y ${fears.length} temores identificados.`;
      if (fears.length > hopes.length) {
        recommendations.push('Más temores que esperanzas - considera acciones para mitigar preocupaciones');
      }
      detailedResultsHTML = `
        <h4 style="color:#10b981;margin:0 0 12px 0;">🌟 Esperanzas (${hopes.length})</h4>
        ${hopes.map((h: any) => `<div style="padding:10px;background:#ecfdf5;border-radius:6px;margin:6px 0;">
          <span style="color:#1f2937;">${h.text}</span>
          <span style="color:#10b981;font-size:12px;margin-left:8px;">👍 ${h.votes?.length || 0}</span>
          ${h.userName ? `<div style="color:#6b7280;font-size:11px;margin-top:4px;">— ${h.userName}</div>` : ''}
        </div>`).join('')}
        <h4 style="color:#ef4444;margin:20px 0 12px 0;">😰 Temores (${fears.length})</h4>
        ${fears.map((f: any) => `<div style="padding:10px;background:#fef2f2;border-radius:6px;margin:6px 0;">
          <span style="color:#1f2937;">${f.text}</span>
          <span style="color:#ef4444;font-size:12px;margin-left:8px;">👍 ${f.votes?.length || 0}</span>
          ${f.userName ? `<div style="color:#6b7280;font-size:11px;margin-top:4px;">— ${f.userName}</div>` : ''}
        </div>`).join('')}`;
      break;

    case 'kano-model':
      const kanoFeatures = commandData.features || [];
      const kanoCats: Record<string, number> = { 'must-be': 0, 'one-dimensional': 0, 'attractive': 0, 'indifferent': 0, 'reverse': 0 };
      kanoFeatures.forEach((f: any) => { if (f.category && kanoCats[f.category] !== undefined) kanoCats[f.category]++; });
      stats = { totalFeatures: kanoFeatures.length, categories: kanoCats };
      summary = `${kanoFeatures.length} características clasificadas con modelo Kano.`;
      if (kanoCats['attractive'] > 0) {
        recommendations.push(`${kanoCats['attractive']} características "Attractive" pueden generar diferenciación`);
      }
      const kanoLabels: Record<string, { emoji: string; name: string; color: string }> = {
        'must-be': { emoji: '⚠️', name: 'Must-Be', color: '#ef4444' },
        'one-dimensional': { emoji: '📈', name: 'Performance', color: '#3b82f6' },
        'attractive': { emoji: '✨', name: 'Attractive', color: '#10b981' },
        'indifferent': { emoji: '😐', name: 'Indifferent', color: '#6b7280' },
        'reverse': { emoji: '🔄', name: 'Reverse', color: '#8b5cf6' }
      };
      detailedResultsHTML = Object.entries(kanoLabels).map(([key, cfg]) => {
        const items = kanoFeatures.filter((f: any) => f.category === key);
        if (items.length === 0) return '';
        return `<div style="margin-bottom:16px;">
          <h4 style="color:${cfg.color};margin:0 0 8px 0;">${cfg.emoji} ${cfg.name} (${items.length})</h4>
          ${items.map((f: any) => `<div style="padding:8px 12px;background:#f9fafb;border-left:3px solid ${cfg.color};margin:4px 0;">
            ${f.text}${f.userName ? ` <span style="color:#9ca3af;font-size:11px;">— ${f.userName}</span>` : ''}
          </div>`).join('')}
        </div>`;
      }).join('');
      break;

    case 'futures-wheel':
      const fwNodes = commandData.nodes || [];
      const fwL1 = fwNodes.filter((n: any) => n.level === 1).length;
      const fwL2 = fwNodes.filter((n: any) => n.level === 2).length;
      const fwL3 = fwNodes.filter((n: any) => n.level === 3).length;
      stats = { totalNodes: fwNodes.length, level1: fwL1, level2: fwL2, level3: fwL3, centralTrend: commandData.centralTrend };
      summary = `Futures Wheel: ${fwNodes.length} impactos analizados (${fwL1} primarios, ${fwL2} secundarios, ${fwL3} terciarios).`;
      if (fwL3 > 0) {
        recommendations.push('Análisis profundo completado hasta el tercer nivel de impacto');
      }
      detailedResultsHTML = `
        <div style="text-align:center;padding:16px;background:#f3f4f6;border-radius:8px;margin-bottom:16px;">
          <strong style="color:#1f2937;">🎯 Tendencia Central:</strong>
          <p style="color:#6366f1;font-size:16px;margin:8px 0 0 0;">${commandData.centralTrend || 'No definida'}</p>
        </div>
        <h4 style="color:#3b82f6;margin:0 0 8px 0;">1️⃣ Impactos Primarios (${fwL1})</h4>
        ${fwNodes.filter((n: any) => n.level === 1).map((n: any) => `<div style="padding:8px;background:#eff6ff;border-radius:4px;margin:4px 0;">${n.text}</div>`).join('')}
        ${fwL2 > 0 ? `<h4 style="color:#8b5cf6;margin:16px 0 8px 0;">2️⃣ Impactos Secundarios (${fwL2})</h4>
        ${fwNodes.filter((n: any) => n.level === 2).map((n: any) => `<div style="padding:8px;background:#f5f3ff;border-radius:4px;margin:4px 0;">${n.text}</div>`).join('')}` : ''}
        ${fwL3 > 0 ? `<h4 style="color:#ec4899;margin:16px 0 8px 0;">3️⃣ Impactos Terciarios (${fwL3})</h4>
        ${fwNodes.filter((n: any) => n.level === 3).map((n: any) => `<div style="padding:8px;background:#fdf2f8;border-radius:4px;margin:4px 0;">${n.text}</div>`).join('')}` : ''}`;
      break;

    case 'vpc':
      const vpcSections = commandData.sections || [];
      const vpcTotalItems = vpcSections.reduce((sum: number, s: any) => sum + (s.items?.length || 0), 0);
      const customerItems = vpcSections.filter((s: any) => s.side === 'customer').reduce((sum: number, s: any) => sum + (s.items?.length || 0), 0);
      const valueItems = vpcSections.filter((s: any) => s.side === 'value').reduce((sum: number, s: any) => sum + (s.items?.length || 0), 0);
      stats = { totalItems: vpcTotalItems, customerSide: customerItems, valueSide: valueItems };
      summary = `Value Proposition Canvas: ${vpcTotalItems} elementos (${customerItems} cliente, ${valueItems} propuesta).`;
      if (customerItems > 0 && valueItems > 0) {
        recommendations.push('Validar que cada Pain tenga un Pain Reliever correspondiente');
      }
      detailedResultsHTML = vpcSections.map((section: any) => {
        const items = section.items || [];
        if (items.length === 0) return '';
        const sideColor = section.side === 'customer' ? '#f59e0b' : '#10b981';
        return `<div style="margin-bottom:16px;">
          <h4 style="color:${sideColor};margin:0 0 8px 0;">${section.title} (${items.length})</h4>
          ${items.map((i: any) => `<div style="padding:8px;background:#f9fafb;border-left:3px solid ${sideColor};margin:4px 0;">
            ${i.text}${i.userName ? ` <span style="color:#9ca3af;font-size:11px;">— ${i.userName}</span>` : ''}
          </div>`).join('')}
        </div>`;
      }).join('');
      break;

    case 'daci':
      const daciRoles = commandData.roles || [];
      const daciStatus = commandData.status || 'draft';
      const daciDecision = commandData.decision || '';
      const roleCount: Record<string, number> = { driver: 0, approver: 0, contributor: 0, informed: 0 };
      daciRoles.forEach((r: any) => { if (r.role && roleCount[r.role] !== undefined) roleCount[r.role]++; });
      stats = { ...roleCount, status: daciStatus, hasDecision: !!daciDecision };
      summary = `DACI: ${roleCount.driver} Driver, ${roleCount.approver} Approver, ${roleCount.contributor} Contributors, ${roleCount.informed} Informed. Estado: ${daciStatus}.`;
      if (daciStatus === 'approved') {
        recommendations.push('Decisión aprobada - comunicar a los Informed');
      } else if (roleCount.driver === 0) {
        recommendations.push('Asignar un Driver para impulsar la decisión');
      }
      const daciRoleConfig: Record<string, { emoji: string; name: string; color: string }> = {
        driver: { emoji: '🎯', name: 'Driver', color: '#3b82f6' },
        approver: { emoji: '✅', name: 'Approver', color: '#ef4444' },
        contributor: { emoji: '💡', name: 'Contributor', color: '#10b981' },
        informed: { emoji: '📢', name: 'Informed', color: '#6b7280' }
      };
      detailedResultsHTML = `
        <div style="padding:12px;background:#f3f4f6;border-radius:8px;margin-bottom:16px;">
          <strong>📋 Decisión:</strong> ${daciDecision || 'No definida'}
          <div style="margin-top:8px;"><strong>Estado:</strong> <span style="color:${daciStatus === 'approved' ? '#10b981' : daciStatus === 'rejected' ? '#ef4444' : '#f59e0b'};">${daciStatus.toUpperCase()}</span></div>
        </div>
        ${Object.entries(daciRoleConfig).map(([key, cfg]) => {
          const members = daciRoles.filter((r: any) => r.role === key);
          return `<div style="margin-bottom:12px;">
            <strong style="color:${cfg.color};">${cfg.emoji} ${cfg.name} (${members.length})</strong>
            ${members.length > 0 ? `<div style="margin-top:4px;">${members.map((m: any) => `<span style="background:${cfg.color}20;color:${cfg.color};padding:2px 8px;border-radius:4px;margin:2px;display:inline-block;">${m.userName}</span>`).join('')}</div>` : '<p style="color:#9ca3af;font-size:12px;margin:4px 0;">Sin asignar</p>'}
          </div>`;
        }).join('')}`;
      break;

    case 'innovation-matrix':
      const innovItems = commandData.items || [];
      const innovQuadrants: Record<string, number> = { 'incremental': 0, 'breakthrough': 0, 'disruptive': 0, 'radical': 0 };
      innovItems.forEach((i: any) => {
        const quad = i.quadrant || i.type;
        if (quad && innovQuadrants[quad] !== undefined) innovQuadrants[quad]++;
      });
      stats = { totalItems: innovItems.length, quadrants: innovQuadrants };
      summary = `Matriz de Innovación: ${innovItems.length} iniciativas clasificadas.`;
      if (innovQuadrants['disruptive'] > 0 || innovQuadrants['radical'] > 0) {
        recommendations.push('Iniciativas disruptivas/radicales requieren mayor inversión y tolerancia al riesgo');
      }
      break;

    case 'open-space':
      const osTopics = commandData.topics || [];
      const osDiscussed = osTopics.filter((t: any) => t.discussed || t.completed).length;
      stats = { totalTopics: osTopics.length, discussed: osDiscussed };
      summary = `Open Space: ${osDiscussed}/${osTopics.length} temas discutidos.`;
      if (osTopics.length - osDiscussed > 0) {
        recommendations.push(`${osTopics.length - osDiscussed} temas pendientes para próxima sesión`);
      }
      detailedResultsHTML = `<h4 style="color:#1f2937;margin:0 0 12px 0;">🗣️ Temas del Open Space</h4>
        ${osTopics.map((t: any) => `<div style="padding:10px;background:${t.discussed ? '#ecfdf5' : '#f9fafb'};border-radius:6px;margin:6px 0;">
          <span style="color:#1f2937;">${t.discussed ? '✅ ' : '⏳ '}${t.title || t.text}</span>
          ${t.proposedBy || t.userName ? `<div style="color:#6b7280;font-size:11px;margin-top:4px;">Propuesto por ${t.proposedBy || t.userName}</div>` : ''}
        </div>`).join('')}`;
      break;

    case 'lightning-demos':
      const ldDemos = commandData.demos || commandData.items || [];
      const ldCompleted = ldDemos.filter((d: any) => d.completed || d.presented).length;
      stats = { totalDemos: ldDemos.length, completed: ldCompleted };
      summary = `Lightning Demos: ${ldCompleted}/${ldDemos.length} demos presentados.`;
      detailedResultsHTML = `<h4 style="color:#1f2937;margin:0 0 12px 0;">⚡ Demos Presentados</h4>
        ${ldDemos.map((d: any) => `<div style="padding:10px;background:#f9fafb;border-radius:6px;margin:6px 0;">
          <strong style="color:#1f2937;">${d.title || d.name}</strong>
          ${d.description ? `<p style="color:#6b7280;font-size:13px;margin:4px 0 0 0;">${d.description}</p>` : ''}
          ${d.userName ? `<div style="color:#9ca3af;font-size:11px;margin-top:4px;">— ${d.userName}</div>` : ''}
        </div>`).join('')}`;
      break;

    case 'storyboard':
      const sbFrames = commandData.frames || commandData.scenes || [];
      stats = { totalFrames: sbFrames.length };
      summary = `Storyboard: ${sbFrames.length} escenas/frames creados.`;
      recommendations.push('Revisar la secuencia narrativa con el equipo');
      detailedResultsHTML = `<h4 style="color:#1f2937;margin:0 0 12px 0;">🎬 Escenas del Storyboard</h4>
        <div style="display:grid;gap:12px;">
        ${sbFrames.map((f: any, idx: number) => `<div style="padding:12px;background:#f9fafb;border-radius:8px;border-left:4px solid #6366f1;">
          <strong style="color:#6366f1;">Escena ${idx + 1}</strong>
          <p style="color:#1f2937;margin:8px 0 0 0;">${f.description || f.text || f.content}</p>
          ${f.userName ? `<div style="color:#9ca3af;font-size:11px;margin-top:8px;">— ${f.userName}</div>` : ''}
        </div>`).join('')}
        </div>`;
      break;

    case 'jtbd-canvas':
      const jtbdSections = commandData.sections || [];
      const jtbdTotalItems = jtbdSections.reduce((sum: number, s: any) => sum + (s.items?.length || 0), 0);
      stats = { totalItems: jtbdTotalItems, sections: jtbdSections.length };
      summary = `Jobs to Be Done Canvas: ${jtbdTotalItems} elementos en ${jtbdSections.length} secciones.`;
      recommendations.push('Validar los jobs identificados con entrevistas a usuarios');
      detailedResultsHTML = jtbdSections.map((section: any) => {
        const items = section.items || [];
        if (items.length === 0) return '';
        return `<div style="margin-bottom:16px;">
          <h4 style="color:#6366f1;margin:0 0 8px 0;">${section.title || section.key} (${items.length})</h4>
          ${items.map((i: any) => `<div style="padding:8px;background:#f9fafb;border-radius:4px;margin:4px 0;">
            ${i.text}${i.userName ? ` <span style="color:#9ca3af;font-size:11px;">— ${i.userName}</span>` : ''}
          </div>`).join('')}
        </div>`;
      }).join('');
      break;

    case 'odd-one-out':
      const oooItems = commandData.items || commandData.options || [];
      const oooVotes = oooItems.reduce((sum: number, i: any) => sum + (i.votes?.length || 0), 0);
      const oooWinner = oooItems.reduce((prev: any, curr: any) =>
        (curr.votes?.length || 0) > (prev.votes?.length || 0) ? curr : prev, oooItems[0]);
      stats = { totalItems: oooItems.length, totalVotes: oooVotes, oddOne: oooWinner?.text };
      summary = `Odd One Out: ${oooVotes} votos en ${oooItems.length} opciones.`;
      if (oooWinner && oooVotes > 0) {
        recommendations.push(`"${oooWinner.text}" identificado como el "odd one out" con ${oooWinner.votes?.length || 0} votos`);
      }
      break;

    case 'team-canvas':
      const tcSections = commandData.sections || [];
      const tcTotalItems = tcSections.reduce((sum: number, s: any) => sum + (s.items?.length || 0), 0);
      stats = { totalItems: tcTotalItems, sections: tcSections.length };
      summary = `Team Canvas: ${tcTotalItems} elementos definidos para el equipo.`;
      recommendations.push('Revisar el canvas con todo el equipo para alineación');
      detailedResultsHTML = tcSections.map((section: any, idx: number) => {
        const items = section.items || [];
        const colors = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];
        const color = colors[idx % colors.length];
        return `<div style="margin-bottom:16px;">
          <h4 style="color:${color};margin:0 0 8px 0;">${section.title || section.name} (${items.length})</h4>
          ${items.map((i: any) => `<div style="padding:8px;background:#f9fafb;border-left:3px solid ${color};margin:4px 0;">
            ${i.text || i.content}${i.userName ? ` <span style="color:#9ca3af;font-size:11px;">— ${i.userName}</span>` : ''}
          </div>`).join('')}
        </div>`;
      }).join('');
      break;

    case 'persona':
      const personaData = commandData;
      const personaName = personaData.name || personaData.title || 'Sin nombre';
      const personaFields = ['goals', 'frustrations', 'behaviors', 'needs', 'demographics'];
      const filledFields = personaFields.filter(f => personaData[f] && (Array.isArray(personaData[f]) ? personaData[f].length > 0 : true)).length;
      stats = { name: personaName, filledFields, totalFields: personaFields.length };
      summary = `Persona "${personaName}": ${filledFields}/${personaFields.length} secciones completadas.`;
      recommendations.push('Validar la persona con datos reales de usuarios');
      break;

    case 'impact-mapping':
      const imGoals = commandData.goals || [];
      const imActors = commandData.actors || [];
      const imImpacts = commandData.impacts || [];
      const imDeliverables = commandData.deliverables || [];
      stats = { goals: imGoals.length, actors: imActors.length, impacts: imImpacts.length, deliverables: imDeliverables.length };
      summary = `Impact Mapping: ${imGoals.length} objetivos, ${imActors.length} actores, ${imImpacts.length} impactos, ${imDeliverables.length} entregables.`;
      recommendations.push('Priorizar entregables basándose en el impacto esperado');
      break;

    // === PNL (Programación Neuro-Lingüística) ===
    case 'timeline-board':
      const tlEvents = commandData.events || [];
      const tlPast = tlEvents.filter((e: any) => e.period === 'past').length;
      const tlPresent = tlEvents.filter((e: any) => e.period === 'present').length;
      const tlFuture = tlEvents.filter((e: any) => e.period === 'future').length;
      stats = { totalEvents: tlEvents.length, past: tlPast, present: tlPresent, future: tlFuture };
      summary = `Línea de Tiempo: ${tlEvents.length} eventos (${tlPast} pasado, ${tlPresent} presente, ${tlFuture} futuro).`;
      if (tlFuture > 0) {
        recommendations.push('Visualizar el futuro deseado ayuda a clarificar metas');
      }
      const periodConfig: Record<string, { emoji: string; label: string; color: string }> = {
        past: { emoji: '⏪', label: 'Pasado', color: '#6b7280' },
        present: { emoji: '📍', label: 'Presente', color: '#3b82f6' },
        future: { emoji: '🚀', label: 'Futuro', color: '#10b981' }
      };
      detailedResultsHTML = Object.entries(periodConfig).map(([key, cfg]) => {
        const events = tlEvents.filter((e: any) => e.period === key);
        if (events.length === 0) return '';
        return `<div style="margin-bottom:16px;">
          <h4 style="color:${cfg.color};margin:0 0 8px 0;">${cfg.emoji} ${cfg.label} (${events.length})</h4>
          ${events.map((e: any) => `<div style="padding:10px;background:#f9fafb;border-left:3px solid ${cfg.color};margin:4px 0;">
            <strong>${e.text}</strong>
            ${e.date ? `<div style="color:#9ca3af;font-size:11px;margin-top:4px;">📅 ${e.date}</div>` : ''}
            ${e.learnings ? `<div style="color:#6b7280;font-size:12px;margin-top:4px;">💡 ${e.learnings}</div>` : ''}
            ${e.userName ? `<div style="color:#9ca3af;font-size:11px;margin-top:4px;">— ${e.userName}</div>` : ''}
          </div>`).join('')}
        </div>`;
      }).join('');
      break;

    case 'reframing-board':
      const rfReframes = commandData.reframes || [];
      const rfTypes: Record<string, number> = { content: 0, context: 0, intention: 0 };
      rfReframes.forEach((r: any) => { if (r.type && rfTypes[r.type] !== undefined) rfTypes[r.type]++; });
      const rfTotalVotes = rfReframes.reduce((sum: number, r: any) => sum + (r.votes?.length || 0), 0);
      stats = { totalReframes: rfReframes.length, types: rfTypes, totalVotes: rfTotalVotes };
      summary = `Reencuadre: ${rfReframes.length} perspectivas alternativas generadas.`;
      recommendations.push('Los reencuadres más votados pueden ser los más útiles para el equipo');
      const rfTypeConfig: Record<string, { emoji: string; label: string; color: string }> = {
        content: { emoji: '📝', label: 'Contenido', color: '#3b82f6' },
        context: { emoji: '🌍', label: 'Contexto', color: '#10b981' },
        intention: { emoji: '🎯', label: 'Intención', color: '#8b5cf6' }
      };
      detailedResultsHTML = `<h4 style="color:#1f2937;margin:0 0 12px 0;">🔄 Reencuadres Generados</h4>
        ${rfReframes.map((r: any) => {
          const typeCfg = rfTypeConfig[r.type] || rfTypeConfig.content;
          return `<div style="padding:12px;background:#f9fafb;border-radius:8px;margin:8px 0;">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">
              <span style="background:${typeCfg.color}20;color:${typeCfg.color};padding:2px 8px;border-radius:4px;font-size:12px;">${typeCfg.emoji} ${typeCfg.label}</span>
              <span style="color:#6366f1;font-size:12px;">👍 ${r.votes?.length || 0}</span>
            </div>
            <div style="color:#ef4444;font-size:13px;margin-bottom:4px;">❌ ${r.originalView}</div>
            <div style="color:#10b981;font-size:13px;">✅ ${r.reframedView}</div>
            ${r.userName ? `<div style="color:#9ca3af;font-size:11px;margin-top:8px;">— ${r.userName}</div>` : ''}
          </div>`;
        }).join('')}`;
      break;

    case 'perceptual-positions':
      const ppPerspectives = commandData.perspectives || [];
      const ppPositions: Record<string, number> = { '1st': 0, '2nd': 0, '3rd': 0 };
      ppPerspectives.forEach((p: any) => { if (p.position && ppPositions[p.position] !== undefined) ppPositions[p.position]++; });
      stats = { totalPerspectives: ppPerspectives.length, positions: ppPositions, situation: commandData.situation };
      summary = `Posiciones Perceptuales: ${ppPerspectives.length} perspectivas (${ppPositions['1st']} 1ª, ${ppPositions['2nd']} 2ª, ${ppPositions['3rd']} 3ª).`;
      if (ppPositions['3rd'] > 0) {
        recommendations.push('La 3ª posición (observador) ofrece insights valiosos para resolver conflictos');
      }
      const ppPosConfig: Record<string, { emoji: string; label: string; color: string }> = {
        '1st': { emoji: '👤', label: '1ª Posición (Yo)', color: '#3b82f6' },
        '2nd': { emoji: '🤝', label: '2ª Posición (El Otro)', color: '#10b981' },
        '3rd': { emoji: '👁️', label: '3ª Posición (Observador)', color: '#8b5cf6' }
      };
      detailedResultsHTML = `
        ${commandData.situation ? `<div style="padding:12px;background:#f3f4f6;border-radius:8px;margin-bottom:16px;">
          <strong>🎭 Situación:</strong> ${commandData.situation}
          ${commandData.otherParty ? `<div style="margin-top:4px;"><strong>🤝 Otra Parte:</strong> ${commandData.otherParty}</div>` : ''}
        </div>` : ''}
        ${Object.entries(ppPosConfig).map(([key, cfg]) => {
          const persp = ppPerspectives.filter((p: any) => p.position === key);
          if (persp.length === 0) return '';
          return `<div style="margin-bottom:16px;">
            <h4 style="color:${cfg.color};margin:0 0 8px 0;">${cfg.emoji} ${cfg.label} (${persp.length})</h4>
            ${persp.map((p: any) => `<div style="padding:10px;background:#f9fafb;border-left:3px solid ${cfg.color};margin:4px 0;">
              <p style="color:#1f2937;margin:0;">${p.insight}</p>
              ${p.feelings ? `<p style="color:#ec4899;font-size:12px;margin:4px 0 0 0;">💭 ${p.feelings}</p>` : ''}
              ${p.needs ? `<p style="color:#f59e0b;font-size:12px;margin:4px 0 0 0;">🎯 ${p.needs}</p>` : ''}
              ${p.userName ? `<div style="color:#9ca3af;font-size:11px;margin-top:8px;">— ${p.userName}</div>` : ''}
            </div>`).join('')}
          </div>`;
        }).join('')}`;
      break;

    case 'values-wheel':
      const vwValues = commandData.values || [];
      const vwAvgImportance = vwValues.length > 0
        ? (vwValues.reduce((sum: number, v: any) => sum + (v.importance || 0), 0) / vwValues.length).toFixed(1)
        : 0;
      const vwAvgCurrent = vwValues.length > 0
        ? (vwValues.reduce((sum: number, v: any) => sum + (v.currentState || 0), 0) / vwValues.length).toFixed(1)
        : 0;
      const vwGaps = vwValues.filter((v: any) => (v.importance || 0) - (v.currentState || 0) >= 3);
      stats = { totalValues: vwValues.length, avgImportance: vwAvgImportance, avgCurrent: vwAvgCurrent, gapsCount: vwGaps.length };
      summary = `Rueda de Valores: ${vwValues.length} valores (importancia promedio: ${vwAvgImportance}, estado actual: ${vwAvgCurrent}).`;
      if (vwGaps.length > 0) {
        recommendations.push(`${vwGaps.length} valores con brecha significativa entre importancia y estado actual`);
      }
      detailedResultsHTML = `<h4 style="color:#1f2937;margin:0 0 12px 0;">🧭 Valores Identificados</h4>
        ${vwValues.sort((a: any, b: any) => (b.importance || 0) - (a.importance || 0)).map((v: any) => {
          const gap = (v.importance || 0) - (v.currentState || 0);
          const gapColor = gap >= 3 ? '#ef4444' : gap >= 1 ? '#f59e0b' : '#10b981';
          return `<div style="padding:12px;background:#f9fafb;border-radius:8px;margin:8px 0;">
            <div style="display:flex;justify-content:space-between;align-items:center;">
              <strong style="color:#1f2937;">${v.name}</strong>
              <span style="color:${gapColor};font-size:12px;">Gap: ${gap > 0 ? '+' : ''}${gap}</span>
            </div>
            <div style="display:flex;gap:16px;margin-top:8px;font-size:13px;">
              <span>⭐ Importancia: ${v.importance}/10</span>
              <span>📊 Estado actual: ${v.currentState}/10</span>
            </div>
            ${v.notes ? `<p style="color:#6b7280;font-size:12px;margin:8px 0 0 0;">${v.notes}</p>` : ''}
            ${v.userName ? `<div style="color:#9ca3af;font-size:11px;margin-top:8px;">— ${v.userName}</div>` : ''}
          </div>`;
        }).join('')}`;
      break;

    case 'wheel-of-life':
      const wolAreas = commandData.areas || [];
      const wolAvgCurrent = wolAreas.length > 0
        ? (wolAreas.reduce((sum: number, a: any) => sum + (a.currentScore || 0), 0) / wolAreas.length).toFixed(1)
        : 0;
      const wolAvgDesired = wolAreas.length > 0
        ? (wolAreas.reduce((sum: number, a: any) => sum + (a.desiredScore || 0), 0) / wolAreas.length).toFixed(1)
        : 0;
      const wolLowAreas = wolAreas.filter((a: any) => (a.currentScore || 0) < 5);
      stats = { totalAreas: wolAreas.length, avgCurrent: wolAvgCurrent, avgDesired: wolAvgDesired, lowAreasCount: wolLowAreas.length };
      summary = `Rueda de la Vida: ${wolAreas.length} áreas evaluadas (promedio actual: ${wolAvgCurrent}/10, deseado: ${wolAvgDesired}/10).`;
      if (wolLowAreas.length > 0) {
        recommendations.push(`${wolLowAreas.length} áreas con puntuación baja (<5) requieren atención`);
      }
      detailedResultsHTML = `<h4 style="color:#1f2937;margin:0 0 12px 0;">🎡 Áreas de la Vida</h4>
        ${wolAreas.map((a: any) => {
          const current = a.currentScore || 0;
          const desired = a.desiredScore || 0;
          const scoreColor = current >= 8 ? '#10b981' : current >= 5 ? '#f59e0b' : '#ef4444';
          return `<div style="padding:12px;background:#f9fafb;border-radius:8px;margin:8px 0;">
            <div style="display:flex;justify-content:space-between;align-items:center;">
              <strong style="color:#1f2937;">${a.area}</strong>
              <span style="color:${scoreColor};font-weight:600;">${current}/10</span>
            </div>
            <div style="display:flex;gap:8px;margin-top:8px;">
              <div style="flex:1;">
                <div style="font-size:11px;color:#6b7280;margin-bottom:2px;">Actual: ${current}</div>
                ${progressBar((current / 10) * 100, scoreColor)}
              </div>
              <div style="flex:1;">
                <div style="font-size:11px;color:#6b7280;margin-bottom:2px;">Deseado: ${desired}</div>
                ${progressBar((desired / 10) * 100, '#8b5cf6')}
              </div>
            </div>
            ${a.actions ? `<p style="color:#6b7280;font-size:12px;margin:8px 0 0 0;">📋 ${a.actions}</p>` : ''}
            ${a.userName ? `<div style="color:#9ca3af;font-size:11px;margin-top:8px;">— ${a.userName}</div>` : ''}
          </div>`;
        }).join('')}`;
      break;

    case 'swish-pattern':
      const spEntries = commandData.entries || [];
      const spTotalReps = spEntries.reduce((sum: number, e: any) => sum + (e.repetitions || 0), 0);
      stats = { totalEntries: spEntries.length, totalRepetitions: spTotalReps, behavior: commandData.behavior };
      summary = `Patrón Swish: ${spEntries.length} patrones creados con ${spTotalReps} repeticiones totales.`;
      recommendations.push('Practicar el patrón Swish al menos 5 veces para anclar el nuevo comportamiento');
      detailedResultsHTML = `
        ${commandData.behavior ? `<div style="padding:12px;background:#f3f4f6;border-radius:8px;margin-bottom:16px;">
          <strong>🎯 Comportamiento a Cambiar:</strong> ${commandData.behavior}
        </div>` : ''}
        <h4 style="color:#1f2937;margin:0 0 12px 0;">⚡ Patrones Swish</h4>
        ${spEntries.map((e: any, idx: number) => `<div style="padding:12px;background:#f9fafb;border-radius:8px;margin:8px 0;">
          <div style="font-weight:600;color:#6366f1;margin-bottom:8px;">Patrón ${idx + 1} <span style="background:#6366f120;padding:2px 8px;border-radius:4px;font-size:12px;">🔄 ${e.repetitions || 0} reps</span></div>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">
            <div style="padding:8px;background:#fef2f2;border-radius:6px;">
              <div style="font-size:11px;color:#ef4444;margin-bottom:4px;">❌ Imagen Actual</div>
              <p style="color:#1f2937;font-size:13px;margin:0;">${e.currentImage}</p>
            </div>
            <div style="padding:8px;background:#ecfdf5;border-radius:6px;">
              <div style="font-size:11px;color:#10b981;margin-bottom:4px;">✅ Imagen Deseada</div>
              <p style="color:#1f2937;font-size:13px;margin:0;">${e.desiredImage}</p>
            </div>
          </div>
          ${e.trigger ? `<div style="margin-top:8px;font-size:12px;"><strong>🎯 Disparador:</strong> ${e.trigger}</div>` : ''}
          ${e.resources ? `<div style="margin-top:4px;font-size:12px;"><strong>💪 Recursos:</strong> ${e.resources}</div>` : ''}
          ${e.userName ? `<div style="color:#9ca3af;font-size:11px;margin-top:8px;">— ${e.userName}</div>` : ''}
        </div>`).join('')}`;
      break;

    case 'action-triads':
      const atTriads = commandData.triads || [];
      stats = { totalTriads: atTriads.length, goal: commandData.goal };
      summary = `Tríadas de Acción: ${atTriads.length} estados definidos para lograr el objetivo.`;
      recommendations.push('Practicar la fisiología y el enfoque identificados para entrar en el estado deseado');
      detailedResultsHTML = `
        ${commandData.goal ? `<div style="padding:12px;background:#f3f4f6;border-radius:8px;margin-bottom:16px;">
          <strong>🎯 Objetivo:</strong> ${commandData.goal}
        </div>` : ''}
        <h4 style="color:#1f2937;margin:0 0 12px 0;">🔺 Tríadas de Acción</h4>
        ${atTriads.map((t: any, idx: number) => `<div style="padding:12px;background:linear-gradient(135deg, #fef3c720, #f3e8ff20);border-radius:8px;margin:8px 0;border:1px solid #e5e7eb;">
          <div style="font-weight:600;color:#6366f1;margin-bottom:12px;">Estado ${idx + 1}: ${t.state}</div>
          <div style="display:grid;grid-template-columns:repeat(3, 1fr);gap:8px;">
            <div style="padding:8px;background:white;border-radius:6px;text-align:center;">
              <div style="font-size:20px;">🧘</div>
              <div style="font-size:11px;color:#6b7280;margin:4px 0;">Fisiología</div>
              <p style="color:#1f2937;font-size:12px;margin:0;">${t.physiology || '-'}</p>
            </div>
            <div style="padding:8px;background:white;border-radius:6px;text-align:center;">
              <div style="font-size:20px;">🎯</div>
              <div style="font-size:11px;color:#6b7280;margin:4px 0;">Enfoque</div>
              <p style="color:#1f2937;font-size:12px;margin:0;">${t.focus || '-'}</p>
            </div>
            <div style="padding:8px;background:white;border-radius:6px;text-align:center;">
              <div style="font-size:20px;">💬</div>
              <div style="font-size:11px;color:#6b7280;margin:4px 0;">Lenguaje</div>
              <p style="color:#1f2937;font-size:12px;margin:0;">${t.language || '-'}</p>
            </div>
          </div>
          ${t.userName ? `<div style="color:#9ca3af;font-size:11px;margin-top:12px;text-align:right;">— ${t.userName}</div>` : ''}
        </div>`).join('')}`;
      break;

    case 'vakog-board':
      const vkEntries = commandData.entries || [];
      const vkSystems: Record<string, number> = { visual: 0, auditory: 0, kinesthetic: 0, olfactory: 0, gustatory: 0 };
      vkEntries.forEach((e: any) => { if (e.system && vkSystems[e.system] !== undefined) vkSystems[e.system]++; });
      const dominantSystem = Object.entries(vkSystems).sort(([,a], [,b]) => b - a)[0];
      stats = { totalEntries: vkEntries.length, systems: vkSystems, dominant: dominantSystem?.[0] };
      summary = `VAKOG Board: ${vkEntries.length} preferencias sensoriales identificadas.`;
      if (dominantSystem && dominantSystem[1] > 0) {
        recommendations.push(`Sistema sensorial dominante: ${dominantSystem[0]} - adaptar comunicación a este canal`);
      }
      const vkSystemConfig: Record<string, { emoji: string; label: string; color: string }> = {
        visual: { emoji: '👁️', label: 'Visual', color: '#3b82f6' },
        auditory: { emoji: '👂', label: 'Auditivo', color: '#10b981' },
        kinesthetic: { emoji: '✋', label: 'Kinestésico', color: '#ef4444' },
        olfactory: { emoji: '👃', label: 'Olfativo', color: '#8b5cf6' },
        gustatory: { emoji: '👅', label: 'Gustativo', color: '#f59e0b' }
      };
      detailedResultsHTML = Object.entries(vkSystemConfig).map(([key, cfg]) => {
        const entries = vkEntries.filter((e: any) => e.system === key);
        if (entries.length === 0) return '';
        return `<div style="margin-bottom:16px;">
          <h4 style="color:${cfg.color};margin:0 0 8px 0;">${cfg.emoji} ${cfg.label} (${entries.length})</h4>
          ${entries.map((e: any) => `<div style="padding:10px;background:#f9fafb;border-left:3px solid ${cfg.color};margin:4px 0;">
            <p style="color:#1f2937;margin:0 0 4px 0;"><strong>Preferencia:</strong> ${e.preference}</p>
            ${e.strategies ? `<p style="color:#6b7280;font-size:12px;margin:0;"><strong>Estrategias:</strong> ${e.strategies}</p>` : ''}
            ${e.userName ? `<div style="color:#9ca3af;font-size:11px;margin-top:8px;">— ${e.userName}</div>` : ''}
          </div>`).join('')}
        </div>`;
      }).join('');
      break;

    case 'anchor-mapping':
      const amAnchors = commandData.anchors || [];
      const amAvgIntensity = amAnchors.length > 0
        ? (amAnchors.reduce((sum: number, a: any) => sum + (a.intensity || 0), 0) / amAnchors.length).toFixed(1)
        : 0;
      stats = { totalAnchors: amAnchors.length, avgIntensity: amAvgIntensity, goal: commandData.goal };
      summary = `Mapeo de Anclajes: ${amAnchors.length} anclajes identificados (intensidad promedio: ${amAvgIntensity}/10).`;
      recommendations.push('Reforzar los anclajes positivos y neutralizar los negativos');
      detailedResultsHTML = `
        ${commandData.goal ? `<div style="padding:12px;background:#f3f4f6;border-radius:8px;margin-bottom:16px;">
          <strong>🎯 Objetivo:</strong> ${commandData.goal}
        </div>` : ''}
        <h4 style="color:#1f2937;margin:0 0 12px 0;">⚓ Anclajes Mapeados</h4>
        ${amAnchors.map((a: any) => {
          const intensity = a.intensity || 0;
          const intensityColor = intensity >= 7 ? '#10b981' : intensity >= 4 ? '#f59e0b' : '#ef4444';
          return `<div style="padding:12px;background:#f9fafb;border-radius:8px;margin:8px 0;">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">
              <strong style="color:#1f2937;">💪 ${a.resource}</strong>
              <span style="background:${intensityColor}20;color:${intensityColor};padding:2px 8px;border-radius:4px;font-size:12px;">Intensidad: ${intensity}/10</span>
            </div>
            <div style="font-size:13px;margin-bottom:4px;"><strong>📍 Situación:</strong> ${a.situation || '-'}</div>
            <div style="font-size:13px;margin-bottom:4px;"><strong>⚡ Estímulo:</strong> ${a.stimulus || '-'}</div>
            <div style="font-size:13px;"><strong>🔗 Asociación:</strong> ${a.association || '-'}</div>
            ${a.userName ? `<div style="color:#9ca3af;font-size:11px;margin-top:8px;">— ${a.userName}</div>` : ''}
          </div>`;
        }).join('')}`;
      break;

    case 'metamodel-board':
      const mmPatterns = commandData.patterns || [];
      const mmTypes: Record<string, number> = { generalization: 0, deletion: 0, distortion: 0 };
      mmPatterns.forEach((p: any) => { if (p.type && mmTypes[p.type] !== undefined) mmTypes[p.type]++; });
      stats = { totalPatterns: mmPatterns.length, types: mmTypes };
      summary = `Metamodelo: ${mmPatterns.length} patrones de lenguaje analizados (${mmTypes.generalization} generalización, ${mmTypes.deletion} eliminación, ${mmTypes.distortion} distorsión).`;
      recommendations.push('Usar preguntas del metamodelo para recuperar información específica');
      const mmTypeConfig: Record<string, { emoji: string; label: string; color: string; desc: string }> = {
        generalization: { emoji: '🌐', label: 'Generalización', color: '#3b82f6', desc: 'Todos, siempre, nunca...' },
        deletion: { emoji: '✂️', label: 'Eliminación', color: '#ef4444', desc: 'Información omitida' },
        distortion: { emoji: '🔀', label: 'Distorsión', color: '#8b5cf6', desc: 'Interpretaciones subjetivas' }
      };
      detailedResultsHTML = Object.entries(mmTypeConfig).map(([key, cfg]) => {
        const patterns = mmPatterns.filter((p: any) => p.type === key);
        if (patterns.length === 0) return '';
        return `<div style="margin-bottom:16px;">
          <h4 style="color:${cfg.color};margin:0 0 4px 0;">${cfg.emoji} ${cfg.label} (${patterns.length})</h4>
          <p style="color:#6b7280;font-size:12px;margin:0 0 8px 0;">${cfg.desc}</p>
          ${patterns.map((p: any) => `<div style="padding:10px;background:#f9fafb;border-radius:8px;margin:4px 0;">
            <div style="color:#ef4444;font-size:13px;margin-bottom:4px;">❌ <strong>Original:</strong> "${p.original}"</div>
            <div style="color:#3b82f6;font-size:13px;margin-bottom:4px;">❓ <strong>Desafío:</strong> "${p.challenge}"</div>
            ${p.clarified ? `<div style="color:#10b981;font-size:13px;">✅ <strong>Clarificado:</strong> "${p.clarified}"</div>` : ''}
            ${p.userName ? `<div style="color:#9ca3af;font-size:11px;margin-top:8px;">— ${p.userName}</div>` : ''}
          </div>`).join('')}
        </div>`;
      }).join('');
      break;

    case 'metaphor-canvas':
      const mcEntries = commandData.entries || [];
      const mcSections: Record<string, number> = { current: 0, desired: 0, characters: 0, obstacles: 0, resources: 0, transformation: 0 };
      mcEntries.forEach((e: any) => { if (e.section && mcSections[e.section] !== undefined) mcSections[e.section]++; });
      stats = { totalEntries: mcEntries.length, sections: mcSections, situation: commandData.situation };
      summary = `Lienzo de Metáforas: ${mcEntries.length} elementos narrativos creados.`;
      recommendations.push('La transformación del héroe refleja el cambio deseado en la situación real');
      const mcSectionConfig: Record<string, { emoji: string; label: string; color: string }> = {
        current: { emoji: '📖', label: 'Metáfora Actual', color: '#ef4444' },
        desired: { emoji: '✨', label: 'Metáfora Deseada', color: '#10b981' },
        characters: { emoji: '👥', label: 'Personajes', color: '#3b82f6' },
        obstacles: { emoji: '🪨', label: 'Obstáculos', color: '#f59e0b' },
        resources: { emoji: '⚔️', label: 'Recursos', color: '#8b5cf6' },
        transformation: { emoji: '🦋', label: 'Transformación', color: '#ec4899' }
      };
      detailedResultsHTML = `
        ${commandData.situation ? `<div style="padding:12px;background:#f3f4f6;border-radius:8px;margin-bottom:16px;">
          <strong>🎭 Situación:</strong> ${commandData.situation}
        </div>` : ''}
        ${Object.entries(mcSectionConfig).map(([key, cfg]) => {
          const entries = mcEntries.filter((e: any) => e.section === key);
          if (entries.length === 0) return '';
          return `<div style="margin-bottom:16px;">
            <h4 style="color:${cfg.color};margin:0 0 8px 0;">${cfg.emoji} ${cfg.label} (${entries.length})</h4>
            ${entries.map((e: any) => `<div style="padding:8px;background:#f9fafb;border-left:3px solid ${cfg.color};margin:4px 0;">
              ${e.text}${e.userName ? ` <span style="color:#9ca3af;font-size:11px;">— ${e.userName}</span>` : ''}
            </div>`).join('')}
          </div>`;
        }).join('')}`;
      break;

    default:
      summary = `${typeLabel} completada.`;
  }

  return { title, summary, recommendations, stats, detailedResultsHTML };
}

/**
 * Extrae los IDs de todos los participantes de una dinámica
 */
export function extractParticipants(commandType: string, commandData: any): string[] {
  const participants = new Set<string>();

  // Siempre incluir al creador
  if (commandData.createdBy) {
    const creatorId = typeof commandData.createdBy === 'string'
      ? commandData.createdBy
      : commandData.createdBy?.toString?.() || commandData.createdBy?._id?.toString?.();
    if (creatorId) participants.add(creatorId);
  }

  // Extraer participantes según el tipo de dinámica
  const extractFromArray = (items: any[], fields: string[]) => {
    items?.forEach(item => {
      fields.forEach(field => {
        if (item[field]) {
          if (Array.isArray(item[field])) {
            item[field].forEach((id: string) => participants.add(id));
          } else if (typeof item[field] === 'string') {
            participants.add(item[field]);
          } else if (item[field].id) {
            participants.add(item[field].id);
          }
        }
      });
    });
  };

  // Votaciones
  if (commandData.votes) {
    commandData.votes.forEach((v: any) => {
      if (v.voterId) participants.add(v.voterId);
      if (v.userId) participants.add(v.userId);
    });
  }

  // Opciones con votos (polls, dot-voting, etc)
  if (commandData.options) {
    commandData.options.forEach((opt: any) => {
      // votes puede ser array de strings/ObjectIds
      if (opt.votes && Array.isArray(opt.votes)) {
        opt.votes.forEach((v: any) => {
          const id = typeof v === 'string' ? v : v?.toString?.() || v?._id?.toString?.();
          if (id) participants.add(id);
        });
      }
      // voters puede ser array de objetos con oderId
      if (opt.voters && Array.isArray(opt.voters)) {
        opt.voters.forEach((v: any) => {
          const id = typeof v === 'string' ? v : v?.oderId || v?.userId || v?.toString?.();
          if (id) participants.add(id);
        });
      }
    });
  }

  // Ideas (brainstorm)
  if (commandData.ideas) {
    commandData.ideas.forEach((idea: any) => {
      if (idea.author?.id) participants.add(idea.author.id);
      idea.votes?.forEach((v: string) => participants.add(v));
    });
  }

  // Secciones (retros)
  if (commandData.sections) {
    commandData.sections.forEach((section: any) => {
      section.items?.forEach((item: any) => {
        if (item.userId) participants.add(item.userId);
      });
    });
  }

  // Nodos (mind-map)
  if (commandData.nodes) {
    commandData.nodes.forEach((node: any) => {
      if (node.createdBy) participants.add(node.createdBy);
    });
  }

  // Items genéricos
  if (commandData.items) {
    extractFromArray(commandData.items, ['userId', 'createdBy', 'assignee', 'responsible', 'votes']);
  }

  // Risks
  if (commandData.risks) {
    extractFromArray(commandData.risks, ['createdBy', 'owner']);
  }

  // Responses/moods
  if (commandData.responses) {
    extractFromArray(commandData.responses, ['userId']);
  }
  if (commandData.moods) {
    extractFromArray(commandData.moods, ['userId']);
  }

  // Rankings
  if (commandData.rankings) {
    extractFromArray(commandData.rankings, ['userId']);
  }

  // Participants array (si existe)
  if (commandData.participants) {
    commandData.participants.forEach((p: any) => {
      if (typeof p === 'string') participants.add(p);
      else if (p.id) participants.add(p.id);
      else if (p.userId) participants.add(p.userId);
    });
  }

  // === DINÁMICAS ADICIONALES ===

  // Entries genéricos (timeline-board, metaphor-canvas, swish-pattern, vakog-board)
  if (commandData.entries) {
    extractFromArray(commandData.entries, ['userId', 'createdBy', 'votes']);
  }

  // Reframes (reframing-board)
  if (commandData.reframes) {
    extractFromArray(commandData.reframes, ['userId', 'votes']);
  }

  // Perspectives (perceptual-positions)
  if (commandData.perspectives) {
    extractFromArray(commandData.perspectives, ['userId']);
  }

  // Values (values-wheel)
  if (commandData.values) {
    extractFromArray(commandData.values, ['userId']);
  }

  // Areas (wheel-of-life)
  if (commandData.areas) {
    extractFromArray(commandData.areas, ['userId']);
  }

  // Triads (action-triads)
  if (commandData.triads) {
    extractFromArray(commandData.triads, ['userId']);
  }

  // Anchors (anchor-mapping)
  if (commandData.anchors) {
    extractFromArray(commandData.anchors, ['userId']);
  }

  // Patterns (metamodel-board)
  if (commandData.patterns) {
    extractFromArray(commandData.patterns, ['userId']);
  }

  // Features (kano-model)
  if (commandData.features) {
    extractFromArray(commandData.features, ['userId']);
  }

  // Roles (daci)
  if (commandData.roles) {
    extractFromArray(commandData.roles, ['userId']);
  }

  // Topics (open-space, lean-coffee)
  if (commandData.topics) {
    extractFromArray(commandData.topics, ['userId', 'proposedBy']);
  }

  // Demos (lightning-demos)
  if (commandData.demos) {
    extractFromArray(commandData.demos, ['userId', 'presenterId']);
  }

  // Frames/Scenes (storyboard)
  if (commandData.frames) {
    extractFromArray(commandData.frames, ['userId', 'createdBy']);
  }
  if (commandData.scenes) {
    extractFromArray(commandData.scenes, ['userId', 'createdBy']);
  }

  // Impact Mapping
  if (commandData.goals) {
    extractFromArray(commandData.goals, ['userId', 'createdBy']);
  }
  if (commandData.actors) {
    extractFromArray(commandData.actors, ['userId', 'createdBy']);
  }
  if (commandData.impacts) {
    extractFromArray(commandData.impacts, ['userId', 'createdBy']);
  }
  if (commandData.deliverables) {
    extractFromArray(commandData.deliverables, ['userId', 'createdBy']);
  }

  // Events (timeline-board)
  if (commandData.events) {
    extractFromArray(commandData.events, ['userId']);
  }

  return Array.from(participants);
}

interface NotifyDynamicClosedParams {
  projectId: string;
  channelId: string;
  messageId: string;
  commandType: string;
  commandData: any;
  closedByUserId: string;
  closedByUserName: string;
}

/**
 * Envía notificaciones a todos los participantes cuando una dinámica se cierra
 */
export async function notifyDynamicClosed(params: NotifyDynamicClosedParams) {
  try {
    await connectDB();

    const { projectId, channelId, messageId, commandType, commandData, closedByUserId, closedByUserName } = params;

    console.log(`[DYNAMIC_NOTIFICATION] Starting for ${commandType}, closedBy: ${closedByUserId}`);
    console.log(`[DYNAMIC_NOTIFICATION] commandData keys:`, Object.keys(commandData || {}));

    // Generar resumen contextual
    const summary = generateDynamicSummary(commandType, commandData);
    const typeLabel = DYNAMIC_TYPE_LABELS[commandType] || commandType;

    // Obtener todos los participantes (incluyendo al que cerró)
    const participantIds = extractParticipants(commandType, commandData);

    console.log(`[DYNAMIC_NOTIFICATION] Extracted ${participantIds.length} participants:`, participantIds);

    if (participantIds.length === 0) {
      console.log('[DYNAMIC_NOTIFICATION] No participants to notify');
      return;
    }

    // Obtener información del proyecto
    const project = await Project.findById(projectId).select('name').lean();
    const projectName = (project as any)?.name || 'Proyecto';

    // Construir mensaje de notificación
    const title = `✅ ${typeLabel} "${summary.title}" se ha cerrado`;
    let message = summary.summary;
    if (summary.recommendations.length > 0) {
      message += `\n📋 ${summary.recommendations[0]}`;
    }

    // Obtener usuarios activos
    const users = await User.find({
      _id: { $in: participantIds },
      isActive: true
    }).select('_id email name emailNotifications').lean();

    const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000';
    const channelUrl = `${baseUrl}/channels/${projectId}?message=${messageId}`;

    // Crear notificaciones internas para cada usuario
    const notificationPromises = users.map(async (user: any) => {
      try {
        await Notification.create({
          userId: user._id,
          type: 'CHANNEL_MENTION',
          title,
          message,
          projectId,
          messageId,
          actionUrl: `/channels/${projectId}?message=${messageId}`
        });
      } catch (err) {
        console.error(`[DYNAMIC_NOTIFICATION] Error creating notification for user ${user._id}:`, err);
      }
    });

    await Promise.all(notificationPromises);

    // Obtener emails de usuarios que no han deshabilitado notificaciones
    const emailRecipients = users
      .filter((user: any) => user.emailNotifications?.enabled !== false && user.email)
      .map((user: any) => user.email);

    // Enviar un solo email con BCC a todos los destinatarios
    if (emailRecipients.length > 0) {
      const emailContent = emailTemplates.dynamicClosed({
        userName: 'Equipo', // Nombre genérico para email masivo
        dynamicType: typeLabel,
        dynamicTitle: summary.title,
        closedBy: closedByUserName,
        projectName,
        summary: summary.summary,
        recommendations: summary.recommendations,
        stats: summary.stats,
        channelUrl,
        detailedResultsHTML: summary.detailedResultsHTML
      });

      try {
        await sendEmail({
          to: process.env.EMAIL_USERNAME || 'orcaevolution@orcagrc.com', // From address as To
          bcc: emailRecipients, // Todos los destinatarios en BCC
          subject: emailContent.subject,
          html: emailContent.html
        });
        console.log(`[DYNAMIC_NOTIFICATION] Email sent to ${emailRecipients.length} recipients via BCC`);
      } catch (emailErr) {
        console.error('[DYNAMIC_NOTIFICATION] Error sending email:', emailErr);
      }
    }

    console.log(`[DYNAMIC_NOTIFICATION] Notified ${users.length} participants for ${commandType} "${summary.title}"`);

  } catch (error) {
    console.error('[DYNAMIC_NOTIFICATION] Error:', error);
  }
}
