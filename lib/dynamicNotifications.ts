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
};

interface DynamicSummary {
  title: string;
  summary: string;
  recommendations: string[];
  stats: Record<string, any>;
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
      const topIdeas = [...ideas].sort((a, b) => (b.votes?.length || 0) - (a.votes?.length || 0)).slice(0, 3);
      stats = { totalIdeas, totalVotes: totalIdeaVotes, topIdeas: topIdeas.map((i: any) => i.text) };
      summary = `${totalIdeas} ideas generadas, ${totalIdeaVotes} votos totales.`;
      if (topIdeas.length > 0) {
        recommendations.push(`Top ideas: ${topIdeas.map((i: any) => `"${i.text?.substring(0, 30)}..."`).join(', ')}`);
        recommendations.push('Considera crear prioridades con /quick-priority para las mejores ideas');
      }
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

    default:
      summary = `${typeLabel} completada.`;
  }

  return { title, summary, recommendations, stats };
}

/**
 * Extrae los IDs de todos los participantes de una dinámica
 */
export function extractParticipants(commandType: string, commandData: any): string[] {
  const participants = new Set<string>();

  // Siempre incluir al creador
  if (commandData.createdBy) {
    participants.add(commandData.createdBy);
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

  // Opciones con votos
  if (commandData.options) {
    extractFromArray(commandData.options, ['votes', 'voters']);
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

    // Generar resumen contextual
    const summary = generateDynamicSummary(commandType, commandData);
    const typeLabel = DYNAMIC_TYPE_LABELS[commandType] || commandType;

    // Obtener todos los participantes (incluyendo al que cerró)
    const participantIds = extractParticipants(commandType, commandData);

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
        channelUrl
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
