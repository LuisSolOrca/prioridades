import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType, BorderStyle } from 'docx';

interface DynamicData {
  _id: string;
  commandType: string;
  commandData: any;
  createdAt: string;
  userId?: {
    name: string;
  };
}

// Format dynamic data for AI context
function formatDynamicForAI(dynamic: DynamicData): string {
  const { commandType, commandData } = dynamic;
  const title = commandData?.title || commandData?.question || commandData?.topic || 'Sin título';

  let content = `\n### ${commandType.toUpperCase()}: ${title}\n`;

  switch (commandType) {
    // === VOTACIONES SIMPLES ===
    case 'poll':
    case 'blind-vote':
      if (commandData.options && commandData.options.length > 0) {
        content += 'Opciones y votos:\n';
        const totalVotes = commandData.options.reduce((sum: number, opt: any) => sum + (opt.votes?.length || 0), 0);
        commandData.options.forEach((opt: any) => {
          const voteCount = opt.votes?.length || 0;
          const percentage = totalVotes > 0 ? ((voteCount / totalVotes) * 100).toFixed(1) : '0';
          content += `- ${opt.text}: ${voteCount} votos (${percentage}%)\n`;
        });
        content += `Total de votantes: ${totalVotes}\n`;
      }
      break;

    case 'dot-voting':
      if (commandData.options && commandData.options.length > 0) {
        content += `Puntos por usuario: ${commandData.totalDotsPerUser || 5}\n`;
        content += 'Opciones y puntos:\n';
        let totalDots = 0;
        const optionScores = commandData.options.map((opt: any) => {
          const dots = opt.dots?.reduce((sum: number, d: any) => sum + (d.count || 0), 0) || 0;
          totalDots += dots;
          return { text: opt.text, dots };
        }).sort((a: any, b: any) => b.dots - a.dots);

        optionScores.forEach((opt: any, idx: number) => {
          const medal = idx === 0 ? '🥇 ' : idx === 1 ? '🥈 ' : idx === 2 ? '🥉 ' : '';
          content += `${medal}${opt.text}: ${opt.dots} puntos\n`;
        });
        content += `Total de puntos asignados: ${totalDots}\n`;
      }
      break;

    // === BRAINSTORM E IDEAS ===
    case 'brainstorm':
      if (commandData.ideas && commandData.ideas.length > 0) {
        content += `Ideas generadas (${commandData.ideas.length}):\n`;
        const sortedIdeas = [...commandData.ideas].sort((a: any, b: any) =>
          (b.votes?.length || 0) - (a.votes?.length || 0)
        );
        sortedIdeas.forEach((idea: any) => {
          const authorName = idea.author?.name || idea.userName || 'Anónimo';
          const votes = idea.votes?.length || 0;
          content += `- ${idea.text} (por ${authorName}${votes > 0 ? `, ${votes} votos` : ''})\n`;
        });
      } else {
        content += 'No se generaron ideas.\n';
      }
      break;

    case 'mind-map':
      if (commandData.nodes && commandData.nodes.length > 0) {
        content += `Nodos del mapa mental (${commandData.nodes.length}):\n`;
        // Build tree structure
        const rootNodes = commandData.nodes.filter((n: any) => !n.parentId);
        const childNodes = commandData.nodes.filter((n: any) => n.parentId);

        rootNodes.forEach((node: any) => {
          content += `- ${node.label} (${node.userName || 'Anónimo'})\n`;
          const children = childNodes.filter((c: any) => c.parentId === node.id);
          children.forEach((child: any) => {
            content += `  └─ ${child.label} (${child.userName || 'Anónimo'})\n`;
          });
        });
      } else {
        content += 'Mapa mental vacío.\n';
      }
      break;

    // === PROS Y CONTRAS ===
    case 'pros-cons':
      const prosCount = commandData.pros?.length || 0;
      const consCount = commandData.cons?.length || 0;
      content += `Resumen: ${prosCount} pros, ${consCount} contras\n`;
      if (prosCount > 0) {
        content += '\n👍 Pros:\n';
        commandData.pros.forEach((item: any) => {
          const authorName = item.author?.name || 'Anónimo';
          content += `- ${item.text} (${authorName})\n`;
        });
      }
      if (consCount > 0) {
        content += '\n👎 Contras:\n';
        commandData.cons.forEach((item: any) => {
          const authorName = item.author?.name || 'Anónimo';
          content += `- ${item.text} (${authorName})\n`;
        });
      }
      break;

    // === MATRIZ DE DECISIÓN ===
    case 'decision-matrix':
      content += `Opciones evaluadas: ${commandData.options?.join(', ') || 'N/A'}\n`;
      content += `Criterios: ${commandData.criteria?.join(', ') || 'N/A'}\n`;
      if (commandData.cells && commandData.cells.length > 0) {
        // Calculate scores per option
        const optionScores: Record<string, number> = {};
        commandData.cells.forEach((cell: any) => {
          if (!optionScores[cell.option]) optionScores[cell.option] = 0;
          optionScores[cell.option] += cell.score || 0;
        });

        content += '\nPuntuaciones totales por opción:\n';
        Object.entries(optionScores)
          .sort(([,a], [,b]) => (b as number) - (a as number))
          .forEach(([option, score], idx) => {
            const medal = idx === 0 ? '🥇 ' : idx === 1 ? '🥈 ' : idx === 2 ? '🥉 ' : '';
            content += `${medal}${option}: ${score} puntos\n`;
          });

        content += '\nDetalle por criterio:\n';
        commandData.cells.forEach((cell: any) => {
          content += `- ${cell.option} / ${cell.criterion}: ${cell.score || 0}\n`;
        });
      }
      break;

    // === RANKING ===
    case 'ranking':
      if (commandData.options && commandData.options.length > 0) {
        content += `Opciones a rankear: ${commandData.options.join(', ')}\n`;
      }
      if (commandData.rankings && commandData.rankings.length > 0) {
        content += `\nRankings individuales (${commandData.rankings.length} participante${commandData.rankings.length > 1 ? 's' : ''}):\n`;
        commandData.rankings.forEach((r: any) => {
          const ranking = r.ranking || r.order || [];
          content += `- ${r.name || r.userName}: ${ranking.join(' > ')}\n`;
        });

        // Calculate consensus ranking
        const positionSums: Record<string, { sum: number; count: number }> = {};
        commandData.rankings.forEach((r: any) => {
          const ranking = r.ranking || r.order || [];
          ranking.forEach((option: string, index: number) => {
            if (!positionSums[option]) {
              positionSums[option] = { sum: 0, count: 0 };
            }
            positionSums[option].sum += index + 1;
            positionSums[option].count += 1;
          });
        });

        const consensusRanking = Object.entries(positionSums)
          .map(([option, data]) => ({
            option,
            avgPosition: data.sum / data.count
          }))
          .sort((a, b) => a.avgPosition - b.avgPosition);

        if (consensusRanking.length > 0) {
          content += '\nRanking consensuado (por posición promedio):\n';
          consensusRanking.forEach((item, index) => {
            const medal = index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `#${index + 1}`;
            content += `${medal} ${item.option} (pos. promedio: ${item.avgPosition.toFixed(1)})\n`;
          });
        }
      } else {
        content += 'No se han registrado rankings aún.\n';
      }
      break;

    // === ACCIONES Y TAREAS ===
    case 'action-items':
      if (commandData.items && commandData.items.length > 0) {
        const completed = commandData.items.filter((i: any) => i.completed).length;
        content += `Progreso: ${completed}/${commandData.items.length} completadas\n\n`;
        content += 'Acciones:\n';
        commandData.items.forEach((item: any) => {
          const status = item.completed ? '✅' : '⬜';
          const desc = item.description || item.text || 'Sin descripción';
          const assignee = item.assignedToName || item.assignee || 'Sin asignar';
          const dueDate = item.dueDate ? ` (vence: ${item.dueDate})` : '';
          content += `${status} ${desc} - Asignado a: ${assignee}${dueDate}\n`;
        });
      } else {
        content += 'No hay acciones registradas.\n';
      }
      break;

    case 'checklist':
      if (commandData.items && commandData.items.length > 0) {
        const checked = commandData.items.filter((i: any) => i.checked).length;
        content += `Progreso: ${checked}/${commandData.items.length} completados\n\n`;
        commandData.items.forEach((item: any) => {
          const status = item.checked ? '✅' : '⬜';
          const checkedBy = item.checked && item.checkedBy?.name ? ` (por ${item.checkedBy.name})` : '';
          content += `${status} ${item.text}${checkedBy}\n`;
        });
      } else {
        content += 'Checklist vacío.\n';
      }
      break;

    // === AGENDA Y PARKING LOT ===
    case 'agenda':
      if (commandData.items && commandData.items.length > 0) {
        const totalMinutes = commandData.items.reduce((sum: number, i: any) => sum + (i.timeMinutes || 0), 0);
        content += `Duración total estimada: ${totalMinutes} minutos\n\n`;
        commandData.items.forEach((item: any, idx: number) => {
          const status = item.completed ? '✅' : '⬜';
          content += `${status} ${idx + 1}. ${item.topic} (${item.timeMinutes || 0} min)`;
          if (item.speaker) content += ` - ${item.speaker}`;
          content += '\n';
        });
      } else {
        content += 'Agenda vacía.\n';
      }
      break;

    case 'parking-lot':
      if (commandData.items && commandData.items.length > 0) {
        content += `Temas pendientes (${commandData.items.length}):\n`;
        commandData.items.forEach((item: any) => {
          content += `- ${item.text} (agregado por ${item.userName || 'Anónimo'})\n`;
        });
      } else {
        content += 'No hay temas en el parking lot.\n';
      }
      break;

    // === ESTIMACIÓN ===
    case 'estimation-poker':
      content += `Tema a estimar: ${commandData.topic || title}\n`;
      if (commandData.estimates && commandData.estimates.length > 0) {
        content += `\nEstimaciones (${commandData.estimates.length} participantes):\n`;
        commandData.estimates.forEach((est: any) => {
          content += `- ${est.name || est.userName}: ${est.value}\n`;
        });

        // Calculate average (excluding ? and ∞)
        const numericEstimates = commandData.estimates
          .map((e: any) => parseInt(e.value))
          .filter((v: number) => !isNaN(v));

        if (numericEstimates.length > 0) {
          const avg = numericEstimates.reduce((a: number, b: number) => a + b, 0) / numericEstimates.length;
          content += `\nPromedio: ${avg.toFixed(1)}\n`;
        }

        if (commandData.finalEstimate) {
          content += `Estimación final acordada: ${commandData.finalEstimate}\n`;
        }
      } else {
        content += 'No hay estimaciones registradas.\n';
      }
      break;

    // === KUDOS Y RECONOCIMIENTOS ===
    case 'kudos-wall':
      if (commandData.kudos && commandData.kudos.length > 0) {
        content += `Reconocimientos (${commandData.kudos.length}):\n`;
        commandData.kudos.forEach((k: any) => {
          content += `- ${k.fromName || 'Alguien'} → ${k.toName || 'Alguien'}: "${k.message}"\n`;
        });
      } else {
        content += 'No hay kudos registrados.\n';
      }
      break;

    // === ICEBREAKER ===
    case 'icebreaker':
      if (commandData.responses && commandData.responses.length > 0) {
        content += `Respuestas (${commandData.responses.length}):\n`;
        commandData.responses.forEach((r: any) => {
          content += `- ${r.userName || 'Anónimo'}: "${r.text}"\n`;
        });
      } else {
        content += 'No hay respuestas registradas.\n';
      }
      break;

    // === RETROSPECTIVAS Y FRAMEWORKS ===
    case 'swot':
    case 'soar':
    case 'six-hats':
    case 'crazy-8s':
    case 'affinity-map':
    case 'rose-bud-thorn':
    case 'sailboat':
    case 'start-stop-continue':
    case 'retro':
    case 'retrospective':
    case 'scamper':
    case 'starbursting':
    case 'reverse-brainstorm':
    case 'worst-idea':
      if (commandData.sections && commandData.sections.length > 0) {
        const totalItems = commandData.sections.reduce((sum: number, s: any) => sum + (s.items?.length || 0), 0);
        content += `Total de aportes: ${totalItems}\n`;

        commandData.sections.forEach((section: any) => {
          const itemCount = section.items?.length || 0;
          content += `\n${section.icon || ''} ${section.title} (${itemCount}):\n`;
          if (section.items && section.items.length > 0) {
            section.items.forEach((item: any) => {
              content += `- ${item.text} (${item.userName || 'Anónimo'})\n`;
            });
          } else {
            content += '  (vacío)\n';
          }
        });
      }
      break;

    // === STANDUP ===
    case 'standup':
      if (commandData.entries && commandData.entries.length > 0) {
        content += `Participantes: ${commandData.entries.length}\n\n`;
        commandData.entries.forEach((entry: any) => {
          content += `📋 ${entry.userName || entry.name || 'Participante'}:\n`;
          content += `  • Ayer: ${entry.yesterday || 'N/A'}\n`;
          content += `  • Hoy: ${entry.today || 'N/A'}\n`;
          content += `  • Bloqueos: ${entry.blockers || 'Ninguno'}\n\n`;
        });
      } else {
        content += 'No hay entradas de standup.\n';
      }
      break;

    // === MOOD / ESTADO DE ÁNIMO ===
    case 'mood':
      if (commandData.moods && commandData.moods.length > 0) {
        content += `Participantes: ${commandData.moods.length}\n`;
        const moodCounts: Record<string, number> = {};
        commandData.moods.forEach((m: any) => {
          const mood = m.mood || 'Sin especificar';
          moodCounts[mood] = (moodCounts[mood] || 0) + 1;
          content += `- ${m.name || m.userName || 'Anónimo'}: ${mood}\n`;
        });

        content += '\nResumen de estados:\n';
        Object.entries(moodCounts)
          .sort(([,a], [,b]) => b - a)
          .forEach(([mood, count]) => {
            content += `  ${mood}: ${count} persona${count > 1 ? 's' : ''}\n`;
          });
      } else {
        content += 'No hay estados de ánimo registrados.\n';
      }
      break;

    // === TEAM HEALTH ===
    case 'team-health':
      if (commandData.areas && commandData.areas.length > 0) {
        content += 'Áreas evaluadas:\n';
        commandData.areas.forEach((area: any) => {
          const votes = area.votes || [];
          if (votes.length > 0) {
            const avgRating = votes.reduce((sum: number, v: any) => sum + (v.rating || 0), 0) / votes.length;
            const ratingEmoji = avgRating >= 4 ? '😀' : avgRating >= 3 ? '😐' : '😟';
            content += `\n${ratingEmoji} ${area.name} (promedio: ${avgRating.toFixed(1)}/5):\n`;
            votes.forEach((v: any) => {
              content += `  - ${v.userName || 'Anónimo'}: ${v.rating}/5\n`;
            });
          } else {
            content += `\n⬜ ${area.name}: Sin votos\n`;
          }
        });
      } else if (commandData.moods) {
        // Fallback for old format
        content += 'Estados de ánimo:\n';
        commandData.moods.forEach((mood: any) => {
          content += `- ${mood.name || mood.userName || 'Anónimo'}: ${mood.mood}\n`;
        });
      }
      break;

    // === VOTACIONES NUMÉRICAS ===
    case 'fist-of-five':
      if (commandData.votes && commandData.votes.length > 0) {
        const avg = commandData.votes.reduce((sum: number, v: any) => sum + (v.value || 0), 0) / commandData.votes.length;
        content += `Promedio: ${avg.toFixed(1)}/5\n`;
        content += `Votantes: ${commandData.votes.length}\n\n`;
        content += 'Votos individuales:\n';
        commandData.votes.forEach((vote: any) => {
          const emoji = vote.value >= 4 ? '✋' : vote.value >= 2 ? '✌️' : '✊';
          content += `- ${vote.name || vote.userName || 'Anónimo'}: ${emoji} ${vote.value}/5\n`;
        });
      } else {
        content += 'No hay votos registrados.\n';
      }
      break;

    case 'confidence-vote':
      if (commandData.votes && commandData.votes.length > 0) {
        const avg = commandData.votes.reduce((sum: number, v: any) => sum + (v.confidence || v.value || 0), 0) / commandData.votes.length;
        content += `Nivel de confianza promedio: ${avg.toFixed(1)}/5\n`;
        content += `Votantes: ${commandData.votes.length}\n\n`;
        content += 'Votos individuales:\n';
        commandData.votes.forEach((vote: any) => {
          const value = vote.confidence || vote.value || 0;
          const emoji = value >= 4 ? '😄' : value >= 3 ? '😐' : '😟';
          content += `- ${vote.userName || vote.name || 'Anónimo'}: ${emoji} ${value}/5\n`;
        });
      } else {
        content += 'No hay votos registrados.\n';
      }
      break;

    case 'nps':
      if (commandData.votes && commandData.votes.length > 0) {
        const scores = commandData.votes.map((v: any) => v.score ?? v.value ?? 0);
        const avg = scores.reduce((a: number, b: number) => a + b, 0) / scores.length;

        // Calculate NPS
        const promoters = scores.filter((s: number) => s >= 9).length;
        const detractors = scores.filter((s: number) => s <= 6).length;
        const nps = Math.round(((promoters - detractors) / scores.length) * 100);

        content += `NPS Score: ${nps}\n`;
        content += `Promedio: ${avg.toFixed(1)}/10\n`;
        content += `Promotores (9-10): ${promoters}, Pasivos (7-8): ${scores.length - promoters - detractors}, Detractores (0-6): ${detractors}\n\n`;
        content += 'Votos individuales:\n';
        commandData.votes.forEach((vote: any) => {
          const score = vote.score ?? vote.value ?? 0;
          const type = score >= 9 ? '👍' : score >= 7 ? '😐' : '👎';
          content += `- ${vote.userName || vote.name || 'Anónimo'}: ${type} ${score}/10\n`;
        });
      } else {
        content += 'No hay votos registrados.\n';
      }
      break;

    // === LOTUS BLOSSOM ===
    case 'lotus-blossom':
      content += `Idea central: ${commandData.centerIdea || title}\n`;
      if (commandData.petals && commandData.petals.length > 0) {
        const totalItems = commandData.petals.reduce((sum: number, p: any) => sum + (p.items?.length || 0), 0);
        content += `Total de ideas: ${totalItems}\n\n`;
        commandData.petals.forEach((petal: any) => {
          const itemCount = petal.items?.length || 0;
          content += `\n🌸 ${petal.title} (${itemCount}):\n`;
          if (petal.items && petal.items.length > 0) {
            petal.items.forEach((item: any) => {
              content += `- ${item.text} (${item.userName || 'Anónimo'})\n`;
            });
          } else {
            content += '  (vacío)\n';
          }
        });
      }
      break;

    // === 5 WHYS ===
    case 'five-whys':
      content += `Problema: ${commandData.problem || title}\n`;
      if (commandData.whys && commandData.whys.length > 0) {
        content += `\nCadena de porqués (${commandData.whys.length}):\n`;
        commandData.whys.forEach((why: any, idx: number) => {
          content += `\n${idx + 1}. ¿Por qué? ${why.question} (${why.userName || 'Anónimo'})\n`;
          if (why.answer) {
            content += `   Respuesta: ${why.answer} (${why.answeredByName || 'Anónimo'})\n`;
          }
        });
      }
      if (commandData.rootCause) {
        content += `\n🎯 Causa Raíz Identificada: ${commandData.rootCause}`;
        if (commandData.rootCauseByName) {
          content += ` (por ${commandData.rootCauseByName})`;
        }
        content += '\n';
      }
      break;

    // === IMPACT/EFFORT MATRIX ===
    case 'impact-effort':
      if (commandData.items && commandData.items.length > 0) {
        const quadrants = {
          'quick-wins': { name: 'Quick Wins (Alto Impacto / Bajo Esfuerzo)', items: [] as any[] },
          'big-bets': { name: 'Big Bets (Alto Impacto / Alto Esfuerzo)', items: [] as any[] },
          'fill-ins': { name: 'Fill-Ins (Bajo Impacto / Bajo Esfuerzo)', items: [] as any[] },
          'time-sinks': { name: 'Time Sinks (Bajo Impacto / Alto Esfuerzo)', items: [] as any[] }
        };

        commandData.items.forEach((item: any) => {
          const q = item.quadrant as keyof typeof quadrants;
          if (quadrants[q]) {
            quadrants[q].items.push(item);
          }
        });

        content += `Total de items: ${commandData.items.length}\n`;

        Object.entries(quadrants).forEach(([key, quadrant]) => {
          const emoji = key === 'quick-wins' ? '🚀' : key === 'big-bets' ? '🎯' : key === 'fill-ins' ? '📝' : '⚠️';
          content += `\n${emoji} ${quadrant.name} (${quadrant.items.length}):\n`;
          if (quadrant.items.length > 0) {
            quadrant.items.forEach((item: any) => {
              content += `- ${item.text} (${item.userName || 'Anónimo'})\n`;
            });
          } else {
            content += '  (vacío)\n';
          }
        });
      } else {
        content += 'No hay items en la matriz.\n';
      }
      break;

    // === OPPORTUNITY TREE ===
    case 'opportunity-tree':
      content += `Objetivo: ${commandData.objective || title}\n`;
      if (commandData.opportunities && commandData.opportunities.length > 0) {
        const totalSolutions = commandData.opportunities.reduce(
          (sum: number, o: any) => sum + (o.children?.length || 0), 0
        );
        content += `${commandData.opportunities.length} oportunidades, ${totalSolutions} soluciones\n`;

        commandData.opportunities.forEach((opp: any) => {
          content += `\n🔷 Oportunidad: ${opp.text} (${opp.userName || 'Anónimo'})\n`;
          if (opp.children && opp.children.length > 0) {
            opp.children.forEach((sol: any) => {
              content += `   └─ Solución: ${sol.text} (${sol.userName || 'Anónimo'})\n`;
            });
          }
        });
      } else {
        content += 'No hay oportunidades registradas.\n';
      }
      break;

    default:
      // Para tipos no reconocidos, mostrar JSON formateado
      content += 'Datos de la dinámica:\n';
      content += JSON.stringify(commandData, null, 2);
  }

  // Add closed status
  if (commandData.closed) {
    content += '\n[Estado: Cerrada]\n';
  }

  return content;
}

// Parse markdown to docx paragraphs
function parseMarkdownToDocx(markdown: string): Paragraph[] {
  const paragraphs: Paragraph[] = [];
  const lines = markdown.split('\n');

  let currentList: string[] = [];
  let inList = false;

  const flushList = () => {
    if (currentList.length > 0) {
      currentList.forEach(item => {
        paragraphs.push(
          new Paragraph({
            children: [new TextRun({ text: item })],
            bullet: { level: 0 },
            spacing: { after: 100 }
          })
        );
      });
      currentList = [];
    }
    inList = false;
  };

  for (const line of lines) {
    const trimmed = line.trim();

    if (!trimmed) {
      flushList();
      paragraphs.push(new Paragraph({ spacing: { after: 200 } }));
      continue;
    }

    // Headers
    if (trimmed.startsWith('## ')) {
      flushList();
      paragraphs.push(
        new Paragraph({
          children: [new TextRun({ text: trimmed.replace('## ', ''), bold: true, size: 28 })],
          heading: HeadingLevel.HEADING_2,
          spacing: { before: 400, after: 200 }
        })
      );
      continue;
    }

    if (trimmed.startsWith('### ')) {
      flushList();
      paragraphs.push(
        new Paragraph({
          children: [new TextRun({ text: trimmed.replace('### ', ''), bold: true, size: 24 })],
          heading: HeadingLevel.HEADING_3,
          spacing: { before: 300, after: 150 }
        })
      );
      continue;
    }

    if (trimmed.startsWith('# ')) {
      flushList();
      paragraphs.push(
        new Paragraph({
          children: [new TextRun({ text: trimmed.replace('# ', ''), bold: true, size: 32 })],
          heading: HeadingLevel.HEADING_1,
          spacing: { before: 400, after: 200 }
        })
      );
      continue;
    }

    // List items
    if (trimmed.startsWith('- ') || trimmed.startsWith('* ') || /^\d+\.\s/.test(trimmed)) {
      inList = true;
      const text = trimmed.replace(/^[-*]\s/, '').replace(/^\d+\.\s/, '');
      currentList.push(text);
      continue;
    }

    // Bold text handling
    flushList();
    const parts: TextRun[] = [];
    const boldRegex = /\*\*(.*?)\*\*/g;
    let lastIndex = 0;
    let match;

    while ((match = boldRegex.exec(trimmed)) !== null) {
      if (match.index > lastIndex) {
        parts.push(new TextRun({ text: trimmed.slice(lastIndex, match.index) }));
      }
      parts.push(new TextRun({ text: match[1], bold: true }));
      lastIndex = boldRegex.lastIndex;
    }

    if (lastIndex < trimmed.length) {
      parts.push(new TextRun({ text: trimmed.slice(lastIndex) }));
    }

    if (parts.length === 0) {
      parts.push(new TextRun({ text: trimmed }));
    }

    paragraphs.push(
      new Paragraph({
        children: parts,
        spacing: { after: 150 }
      })
    );
  }

  flushList();
  return paragraphs;
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const body = await request.json();
    const { dynamics, additionalContext, documentTitle } = body;

    if (!dynamics || !Array.isArray(dynamics) || dynamics.length === 0) {
      return NextResponse.json({
        error: 'Debes seleccionar al menos una dinámica'
      }, { status: 400 });
    }

    const apiKey = process.env.GROQ_API_KEY;

    if (!apiKey) {
      return NextResponse.json({
        error: 'API Key de Groq no configurada'
      }, { status: 500 });
    }

    // Format dynamics for AI context
    const dynamicsContext = dynamics.map(formatDynamicForAI).join('\n\n---\n');

    const systemPrompt = `Eres un experto en facilitación de equipos y redacción de documentos ejecutivos. Tu tarea es analizar los resultados de dinámicas de grupo colaborativas y generar un documento profesional bien estructurado.

El documento debe:
1. Tener un resumen ejecutivo al inicio
2. Sintetizar los principales hallazgos y conclusiones de cada dinámica
3. Identificar patrones, tendencias y puntos en común
4. Proponer recomendaciones accionables basadas en los datos
5. Ser conciso pero completo
6. Usar un tono profesional pero accesible

IMPORTANTE:
- Usa formato Markdown con encabezados (##, ###), listas y negritas
- Estructura el documento de forma lógica
- Destaca las decisiones clave y acciones pendientes
- Si hay votaciones, menciona los resultados claramente
- Responde en español`;

    const userPrompt = `Genera un documento profesional basado en las siguientes dinámicas de grupo:

${dynamicsContext}

${additionalContext ? `\nContexto adicional proporcionado por el usuario:\n${additionalContext}` : ''}

${documentTitle ? `\nEl título del documento debe ser: "${documentTitle}"` : '\nGenera un título apropiado para el documento.'}

Genera un documento completo y bien estructurado en formato Markdown.`;

    // Call Groq API
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
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
        temperature: 0.7,
        max_tokens: 4000,
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
    const content = data.choices[0]?.message?.content?.trim() || '';

    if (!content) {
      return NextResponse.json({
        error: 'No se pudo generar el documento'
      }, { status: 500 });
    }

    // Create DOCX document
    const docParagraphs = parseMarkdownToDocx(content);

    // Add header with date
    const headerParagraphs = [
      new Paragraph({
        children: [
          new TextRun({
            text: `Generado el ${new Date().toLocaleDateString('es-ES', {
              day: '2-digit',
              month: 'long',
              year: 'numeric',
              hour: '2-digit',
              minute: '2-digit'
            })}`,
            size: 20,
            color: '666666',
            italics: true
          })
        ],
        alignment: AlignmentType.RIGHT,
        spacing: { after: 400 }
      }),
      new Paragraph({
        border: {
          bottom: {
            color: 'CCCCCC',
            space: 1,
            style: BorderStyle.SINGLE,
            size: 6,
          }
        },
        spacing: { after: 400 }
      })
    ];

    const doc = new Document({
      sections: [{
        properties: {},
        children: [...headerParagraphs, ...docParagraphs]
      }]
    });

    const buffer = await Packer.toBuffer(doc);

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'Content-Disposition': `attachment; filename="${documentTitle || 'Documento'}_${Date.now()}.docx"`,
      }
    });

  } catch (error: any) {
    console.error('Error generating document:', error);
    return NextResponse.json({
      error: 'Error al procesar la solicitud'
    }, { status: 500 });
  }
}
