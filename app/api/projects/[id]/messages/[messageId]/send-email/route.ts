import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import connectDB from '@/lib/mongodb';
import ChannelMessage from '@/models/ChannelMessage';
import User from '@/models/User';
import Project from '@/models/Project';
import { sendEmail } from '@/lib/email';

export const dynamic = 'force-dynamic';

// Mapeo de tipos de comando a nombres legibles
const COMMAND_TYPE_NAMES: Record<string, string> = {
  'poll': 'Encuesta',
  'dot-voting': 'Dot Voting',
  'blind-vote': 'Votación Ciega',
  'fist-of-five': 'Puño de Cinco',
  'confidence-vote': 'Voto de Confianza',
  'nps': 'NPS',
  'brainstorm': 'Brainstorming',
  'mind-map': 'Mapa Mental',
  'pros-cons': 'Pros y Contras',
  'decision-matrix': 'Matriz de Decisión',
  'ranking': 'Ranking',
  'retrospective': 'Retrospectiva',
  'retro': 'Retrospectiva',
  'team-health': 'Salud del Equipo',
  'mood': 'Estado de Ánimo',
  'action-items': 'Action Items',
  'checklist': 'Checklist',
  'agenda': 'Agenda',
  'parking-lot': 'Parking Lot',
  'pomodoro': 'Pomodoro',
  'estimation-poker': 'Planning Poker',
  'kudos-wall': 'Muro de Kudos',
  'icebreaker': 'Icebreaker',
  'five-whys': '5 Porqués',
  'fishbone': 'Diagrama de Espina de Pescado',
  'lean-canvas': 'Lean Canvas',
  'swot': 'SWOT',
  'soar': 'SOAR',
  'raci': 'RACI',
  'risk-matrix': 'Matriz de Riesgos',
  'rice': 'RICE',
};

/**
 * Extrae los IDs de participantes únicos de una dinámica
 */
function extractParticipants(commandType: string, commandData: any): string[] {
  const participantIds = new Set<string>();

  // Agregar creador
  if (commandData.createdBy) {
    participantIds.add(commandData.createdBy);
  }

  // Extraer según el tipo de dinámica
  switch (commandType) {
    case 'poll':
    case 'dot-voting':
    case 'blind-vote':
      commandData.options?.forEach((opt: any) => {
        opt.votes?.forEach((v: any) => {
          if (typeof v === 'string') participantIds.add(v);
          else if (v?.oduserId) participantIds.add(v.userId);
        });
        opt.dots?.forEach((d: any) => {
          if (d?.userId) participantIds.add(d.userId);
        });
      });
      break;

    case 'brainstorm':
      commandData.ideas?.forEach((idea: any) => {
        if (idea.author?.id) participantIds.add(idea.author.id);
        idea.votes?.forEach((v: string) => participantIds.add(v));
      });
      break;

    case 'retrospective':
    case 'retro':
      commandData.items?.forEach((item: any) => {
        if (item.author?.id) participantIds.add(item.author.id);
        item.votes?.forEach((v: string) => participantIds.add(v));
      });
      commandData.sections?.forEach((section: any) => {
        section.items?.forEach((item: any) => {
          if (item.author?.id) participantIds.add(item.author.id);
          if (item.userId) participantIds.add(item.userId);
        });
      });
      break;

    case 'pros-cons':
      commandData.pros?.forEach((item: any) => {
        if (item.author?.id) participantIds.add(item.author.id);
      });
      commandData.cons?.forEach((item: any) => {
        if (item.author?.id) participantIds.add(item.author.id);
      });
      break;

    case 'action-items':
    case 'checklist':
    case 'parking-lot':
      commandData.items?.forEach((item: any) => {
        if (item.userId) participantIds.add(item.userId);
        if (item.createdBy) participantIds.add(item.createdBy);
        if (item.assignedTo) participantIds.add(item.assignedTo);
        if (item.checkedBy?.id) participantIds.add(item.checkedBy.id);
      });
      break;

    case 'fist-of-five':
    case 'confidence-vote':
    case 'nps':
    case 'roman-voting':
      commandData.votes?.forEach((vote: any) => {
        if (vote.userId) participantIds.add(vote.userId);
      });
      break;

    case 'team-health':
    case 'mood':
      commandData.areas?.forEach((area: any) => {
        area.votes?.forEach((vote: any) => {
          if (vote.userId) participantIds.add(vote.userId);
        });
      });
      commandData.moods?.forEach((mood: any) => {
        if (mood.userId) participantIds.add(mood.userId);
      });
      break;

    case 'mind-map':
      commandData.nodes?.forEach((node: any) => {
        if (node.userId) participantIds.add(node.userId);
      });
      break;

    case 'five-whys':
      commandData.whys?.forEach((why: any) => {
        if (why.userId) participantIds.add(why.userId);
      });
      break;

    case 'kudos-wall':
      commandData.kudos?.forEach((kudo: any) => {
        if (kudo.fromUserId) participantIds.add(kudo.fromUserId);
        if (kudo.toUserId) participantIds.add(kudo.toUserId);
      });
      break;

    case 'estimation-poker':
      commandData.estimates?.forEach((est: any) => {
        if (est.userId) participantIds.add(est.userId);
      });
      break;

    // Para dinámicas con secciones genéricas (SWOT, SOAR, etc.)
    default:
      commandData.sections?.forEach((section: any) => {
        section.items?.forEach((item: any) => {
          if (item.userId) participantIds.add(item.userId);
          if (item.author?.id) participantIds.add(item.author.id);
        });
      });
      // Para dinámicas con blocks (lean-canvas, team-canvas)
      if (commandData.blocks) {
        Object.values(commandData.blocks).forEach((block: any) => {
          block.items?.forEach((item: any) => {
            if (item.userId) participantIds.add(item.userId);
          });
        });
      }
      break;
  }

  return Array.from(participantIds);
}

/**
 * Genera el HTML COMPLETO de los resultados de la dinámica
 */
function generateDynamicResultsHTML(commandType: string, commandData: any): string {
  const typeName = COMMAND_TYPE_NAMES[commandType] || commandType;
  const title = commandData.title || commandData.question || commandData.topic || 'Sin título';

  let resultsHTML = `
    <div style="background: #f9fafb; border-radius: 8px; padding: 20px; margin-bottom: 20px;">
      <h3 style="color: #1f2937; margin: 0 0 15px 0;">${title}</h3>
      <span style="background: #e0e7ff; color: #4338ca; padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: 600;">
        ${typeName}
      </span>
    </div>
  `;

  // Generar resultados COMPLETOS según el tipo
  switch (commandType) {
    case 'brainstorm':
      if (commandData.ideas?.length > 0) {
        const sortedIdeas = [...commandData.ideas].sort((a, b) => (b.votes?.length || 0) - (a.votes?.length || 0));
        resultsHTML += `
          <div style="margin-bottom: 15px;">
            <h4 style="color: #1f2937; margin: 0 0 15px 0; font-size: 16px;">💡 Todas las Ideas (${commandData.ideas.length})</h4>
            ${sortedIdeas.map((idea: any, i: number) => `
              <div style="background: white; padding: 12px; margin: 8px 0; border-radius: 6px; border-left: 3px solid ${i === 0 ? '#f59e0b' : '#e5e7eb'};">
                <div style="display: flex; justify-content: space-between; align-items: flex-start;">
                  <span style="color: #374151; flex: 1;">${i === 0 ? '🏆 ' : `${i + 1}. `}${idea.text}</span>
                  <span style="color: #6b7280; font-size: 12px; margin-left: 10px; white-space: nowrap;">👍 ${idea.votes?.length || 0}</span>
                </div>
                <div style="color: #9ca3af; font-size: 11px; margin-top: 4px;">— ${idea.author?.name || 'Anónimo'}</div>
              </div>
            `).join('')}
          </div>
        `;
      }
      break;

    case 'poll':
    case 'dot-voting':
    case 'blind-vote':
      if (commandData.options?.length > 0) {
        const totalVotes = commandData.options.reduce((sum: number, opt: any) =>
          sum + (opt.votes?.length || opt.dots?.length || 0), 0);
        const sortedOptions = [...commandData.options].sort((a, b) =>
          (b.votes?.length || b.dots?.length || 0) - (a.votes?.length || a.dots?.length || 0));
        resultsHTML += `
          <div style="margin-bottom: 15px;">
            <h4 style="color: #1f2937; margin: 0 0 15px 0; font-size: 16px;">📊 Resultados Completos (${totalVotes} votos)</h4>
            ${sortedOptions.map((opt: any, i: number) => {
              const votes = opt.votes?.length || opt.dots?.length || 0;
              const percentage = totalVotes > 0 ? Math.round((votes / totalVotes) * 100) : 0;
              return `
                <div style="background: white; padding: 12px; margin: 8px 0; border-radius: 6px; ${i === 0 ? 'border: 2px solid #3b82f6;' : ''}">
                  <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
                    <span style="color: #374151; font-weight: ${i === 0 ? '600' : '400'};">${i === 0 ? '🥇 ' : ''}${opt.text}</span>
                    <span style="color: #1f2937; font-weight: 600;">${votes} votos (${percentage}%)</span>
                  </div>
                  <div style="background: #e5e7eb; border-radius: 4px; height: 10px; overflow: hidden;">
                    <div style="background: ${i === 0 ? '#3b82f6' : '#9ca3af'}; height: 100%; width: ${percentage}%;"></div>
                  </div>
                </div>
              `;
            }).join('')}
          </div>
        `;
      }
      break;

    case 'retrospective':
      const retroColumns = ['well', 'improve', 'actions'];
      const retroColumnConfig: Record<string, { name: string; color: string; bg: string }> = {
        well: { name: '✅ Fue Bien', color: '#10b981', bg: '#f0fdf4' },
        improve: { name: '⚠️ A Mejorar', color: '#f59e0b', bg: '#fffbeb' },
        actions: { name: '💡 Acciones', color: '#3b82f6', bg: '#eff6ff' }
      };
      if (commandData.items?.length > 0) {
        resultsHTML += `<div style="margin-bottom: 15px;">`;
        retroColumns.forEach(col => {
          const items = commandData.items.filter((i: any) => i.column === col);
          const config = retroColumnConfig[col];
          if (items.length > 0) {
            resultsHTML += `
              <div style="background: ${config.bg}; border-radius: 8px; padding: 15px; margin-bottom: 15px; border-left: 4px solid ${config.color};">
                <h4 style="color: ${config.color}; margin: 0 0 10px 0;">${config.name} (${items.length})</h4>
                ${items.map((item: any) => `
                  <div style="background: white; padding: 10px; margin: 6px 0; border-radius: 6px; font-size: 14px;">
                    <div style="color: #374151;">${item.text}</div>
                    <div style="color: #9ca3af; font-size: 11px; margin-top: 4px;">— ${item.author?.name || 'Anónimo'} ${item.votes?.length ? `• 👍 ${item.votes.length}` : ''}</div>
                  </div>
                `).join('')}
              </div>
            `;
          }
        });
        resultsHTML += `</div>`;
      }
      break;

    case 'retro':
      // Retro con secciones (rose-bud-thorn, etc.)
      if (commandData.sections?.length > 0) {
        resultsHTML += `<div style="margin-bottom: 15px;">`;
        commandData.sections.forEach((section: any) => {
          if (section.items?.length > 0) {
            resultsHTML += `
              <div style="background: #f9fafb; border-radius: 8px; padding: 15px; margin-bottom: 15px;">
                <h4 style="color: #1f2937; margin: 0 0 10px 0;">${section.icon || ''} ${section.title} (${section.items.length})</h4>
                ${section.items.map((item: any) => `
                  <div style="background: white; padding: 10px; margin: 6px 0; border-radius: 6px; font-size: 14px;">
                    <div style="color: #374151;">${item.text}</div>
                    <div style="color: #9ca3af; font-size: 11px; margin-top: 4px;">— ${item.author?.name || item.userName || 'Anónimo'}</div>
                  </div>
                `).join('')}
              </div>
            `;
          }
        });
        resultsHTML += `</div>`;
      }
      break;

    case 'pros-cons':
      resultsHTML += `
        <table style="width: 100%; border-collapse: separate; border-spacing: 15px 0; margin-bottom: 15px;">
          <tr>
            <td style="vertical-align: top; width: 50%;">
              <div style="background: #f0fdf4; border-radius: 8px; padding: 15px; border-left: 4px solid #10b981;">
                <h4 style="color: #10b981; margin: 0 0 10px 0;">✅ Pros (${commandData.pros?.length || 0})</h4>
                ${(commandData.pros || []).map((item: any) => `
                  <div style="background: white; padding: 10px; margin: 6px 0; border-radius: 6px; font-size: 14px;">
                    <div style="color: #166534;">${item.text}</div>
                    <div style="color: #9ca3af; font-size: 11px; margin-top: 4px;">— ${item.author?.name || 'Anónimo'}</div>
                  </div>
                `).join('')}
              </div>
            </td>
            <td style="vertical-align: top; width: 50%;">
              <div style="background: #fef2f2; border-radius: 8px; padding: 15px; border-left: 4px solid #ef4444;">
                <h4 style="color: #ef4444; margin: 0 0 10px 0;">❌ Contras (${commandData.cons?.length || 0})</h4>
                ${(commandData.cons || []).map((item: any) => `
                  <div style="background: white; padding: 10px; margin: 6px 0; border-radius: 6px; font-size: 14px;">
                    <div style="color: #991b1b;">${item.text}</div>
                    <div style="color: #9ca3af; font-size: 11px; margin-top: 4px;">— ${item.author?.name || 'Anónimo'}</div>
                  </div>
                `).join('')}
              </div>
            </td>
          </tr>
        </table>
      `;
      break;

    case 'action-items':
      if (commandData.items?.length > 0) {
        const completed = commandData.items.filter((i: any) => i.completed).length;
        const pending = commandData.items.length - completed;
        resultsHTML += `
          <div style="margin-bottom: 15px;">
            <h4 style="color: #1f2937; margin: 0 0 15px 0; font-size: 16px;">
              📋 Action Items - ${completed} completadas, ${pending} pendientes
            </h4>
            ${commandData.items.map((item: any) => `
              <div style="background: white; padding: 12px; margin: 8px 0; border-radius: 6px; border-left: 3px solid ${item.completed ? '#10b981' : '#f59e0b'};">
                <div style="display: flex; align-items: flex-start; gap: 10px;">
                  <span style="font-size: 16px;">${item.completed ? '✅' : '⬜'}</span>
                  <div style="flex: 1;">
                    <div style="color: #374151; ${item.completed ? 'text-decoration: line-through; color: #9ca3af;' : ''}">${item.description}</div>
                    <div style="color: #6b7280; font-size: 12px; margin-top: 4px;">
                      👤 ${item.assignedToName || 'Sin asignar'}
                      ${item.dueDate ? `• 📅 ${new Date(item.dueDate).toLocaleDateString('es-ES')}` : ''}
                    </div>
                  </div>
                </div>
              </div>
            `).join('')}
          </div>
        `;
      }
      break;

    case 'checklist':
      if (commandData.items?.length > 0) {
        const checked = commandData.items.filter((i: any) => i.checked).length;
        resultsHTML += `
          <div style="margin-bottom: 15px;">
            <h4 style="color: #1f2937; margin: 0 0 15px 0; font-size: 16px;">
              ✅ Checklist - ${checked}/${commandData.items.length} completados
            </h4>
            ${commandData.items.map((item: any) => `
              <div style="background: white; padding: 10px; margin: 6px 0; border-radius: 6px; display: flex; align-items: center; gap: 10px;">
                <span style="font-size: 16px;">${item.checked ? '✅' : '⬜'}</span>
                <span style="color: ${item.checked ? '#9ca3af' : '#374151'}; ${item.checked ? 'text-decoration: line-through;' : ''}">${item.text}</span>
                ${item.checkedBy ? `<span style="color: #9ca3af; font-size: 11px; margin-left: auto;">— ${item.checkedBy.name}</span>` : ''}
              </div>
            `).join('')}
          </div>
        `;
      }
      break;

    case 'fist-of-five':
    case 'confidence-vote':
    case 'nps':
      if (commandData.votes?.length > 0) {
        const voteGroups: Record<number, number> = {};
        commandData.votes.forEach((v: any) => {
          const value = v.value || v.vote || 0;
          voteGroups[value] = (voteGroups[value] || 0) + 1;
        });
        const avgVote = commandData.votes.reduce((sum: number, v: any) => sum + (v.value || v.vote || 0), 0) / commandData.votes.length;

        resultsHTML += `
          <div style="margin-bottom: 15px;">
            <h4 style="color: #1f2937; margin: 0 0 15px 0; font-size: 16px;">
              🗳️ Resultados (${commandData.votes.length} votos) - Promedio: ${avgVote.toFixed(1)}
            </h4>
            <div style="background: white; padding: 15px; border-radius: 8px;">
              ${Object.entries(voteGroups).sort((a, b) => Number(b[0]) - Number(a[0])).map(([value, count]) => `
                <div style="display: flex; align-items: center; margin: 8px 0;">
                  <span style="width: 40px; font-weight: 600; color: #374151;">${value}</span>
                  <div style="flex: 1; background: #e5e7eb; border-radius: 4px; height: 20px; margin: 0 10px; overflow: hidden;">
                    <div style="background: #3b82f6; height: 100%; width: ${(count / commandData.votes.length) * 100}%;"></div>
                  </div>
                  <span style="width: 60px; text-align: right; color: #6b7280;">${count} (${Math.round((count / commandData.votes.length) * 100)}%)</span>
                </div>
              `).join('')}
            </div>
          </div>
        `;
      }
      break;

    case 'five-whys':
      resultsHTML += `<div style="margin-bottom: 15px;">`;
      if (commandData.problem) {
        resultsHTML += `
          <div style="background: #fef3c7; border-radius: 8px; padding: 15px; margin-bottom: 15px; border-left: 4px solid #f59e0b;">
            <h4 style="color: #92400e; margin: 0 0 5px 0;">❓ Problema</h4>
            <p style="color: #1f2937; margin: 0;">${commandData.problem}</p>
          </div>
        `;
      }
      if (commandData.whys?.length > 0) {
        commandData.whys.forEach((why: any, i: number) => {
          resultsHTML += `
            <div style="background: white; padding: 15px; margin: 10px 0; border-radius: 8px; border-left: 4px solid #6366f1;">
              <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 8px;">
                <span style="background: #6366f1; color: white; width: 24px; height: 24px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 12px; font-weight: 600;">${i + 1}</span>
                <span style="color: #6366f1; font-weight: 600;">¿Por qué ${why.why}?</span>
              </div>
              <p style="color: #374151; margin: 0 0 0 34px;">${why.answer}</p>
              <p style="color: #9ca3af; font-size: 11px; margin: 5px 0 0 34px;">— ${why.userName}</p>
            </div>
          `;
        });
      }
      if (commandData.rootCause) {
        resultsHTML += `
          <div style="background: #f0fdf4; border-radius: 8px; padding: 15px; margin-top: 15px; border-left: 4px solid #10b981;">
            <h4 style="color: #059669; margin: 0 0 5px 0;">🎯 Causa Raíz Identificada</h4>
            <p style="color: #1f2937; margin: 0; font-weight: 600;">${commandData.rootCause}</p>
          </div>
        `;
      }
      resultsHTML += `</div>`;
      break;

    case 'parking-lot':
      if (commandData.items?.length > 0) {
        resultsHTML += `
          <div style="margin-bottom: 15px;">
            <h4 style="color: #1f2937; margin: 0 0 15px 0; font-size: 16px;">🅿️ Parking Lot (${commandData.items.length} temas)</h4>
            ${commandData.items.map((item: any, i: number) => `
              <div style="background: white; padding: 12px; margin: 8px 0; border-radius: 6px; border-left: 3px solid #6366f1;">
                <div style="color: #374151;">${i + 1}. ${item.text}</div>
                <div style="color: #9ca3af; font-size: 11px; margin-top: 4px;">— ${item.userName || item.author?.name || 'Anónimo'}</div>
              </div>
            `).join('')}
          </div>
        `;
      }
      break;

    // Para dinámicas con secciones genéricas (SWOT, SOAR, Six Hats, etc.)
    default:
      if (commandData.sections?.length > 0) {
        resultsHTML += `<div style="margin-bottom: 15px;">`;
        commandData.sections.forEach((section: any) => {
          const totalItems = section.items?.length || 0;
          if (totalItems > 0) {
            resultsHTML += `
              <div style="background: #f9fafb; border-radius: 8px; padding: 15px; margin-bottom: 15px; border-left: 4px solid ${section.color || '#6366f1'};">
                <h4 style="color: #1f2937; margin: 0 0 10px 0;">${section.icon || ''} ${section.title} (${totalItems})</h4>
                ${section.items.map((item: any) => `
                  <div style="background: white; padding: 10px; margin: 6px 0; border-radius: 6px; font-size: 14px;">
                    <div style="color: #374151;">${item.text}</div>
                    <div style="color: #9ca3af; font-size: 11px; margin-top: 4px;">— ${item.author?.name || item.userName || 'Anónimo'}</div>
                  </div>
                `).join('')}
              </div>
            `;
          }
        });
        resultsHTML += `</div>`;
      } else if (commandData.blocks) {
        // Para lean-canvas, team-canvas
        resultsHTML += `<div style="margin-bottom: 15px;">`;
        Object.entries(commandData.blocks).forEach(([key, block]: [string, any]) => {
          if (block.items?.length > 0) {
            resultsHTML += `
              <div style="background: #f9fafb; border-radius: 8px; padding: 15px; margin-bottom: 15px;">
                <h4 style="color: #1f2937; margin: 0 0 10px 0; text-transform: capitalize;">${key.replace(/([A-Z])/g, ' $1').trim()} (${block.items.length})</h4>
                ${block.items.map((item: any) => `
                  <div style="background: white; padding: 10px; margin: 6px 0; border-radius: 6px; font-size: 14px;">
                    <div style="color: #374151;">${item.text || item.content}</div>
                  </div>
                `).join('')}
              </div>
            `;
          }
        });
        resultsHTML += `</div>`;
      } else {
        // Estadísticas básicas
        const stats: string[] = [];
        if (commandData.ideas?.length) stats.push(`${commandData.ideas.length} ideas`);
        if (commandData.items?.length) stats.push(`${commandData.items.length} items`);
        if (commandData.votes?.length) stats.push(`${commandData.votes.length} votos`);
        if (stats.length > 0) {
          resultsHTML += `
            <div style="background: white; padding: 15px; border-radius: 8px; margin-bottom: 15px;">
              <p style="color: #6b7280; margin: 0;">${stats.join(' • ')}</p>
            </div>
          `;
        }
      }
      break;
  }

  return resultsHTML;
}

/**
 * POST - Enviar dinámica por correo a los participantes
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; messageId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const { id: projectId, messageId } = await params;

    await connectDB();

    // Obtener el mensaje/dinámica
    const message = await ChannelMessage.findById(messageId).populate('userId', 'name email');
    if (!message) {
      return NextResponse.json({ error: 'Dinámica no encontrada' }, { status: 404 });
    }

    if (!message.commandType || !message.commandData) {
      return NextResponse.json({ error: 'Este mensaje no es una dinámica' }, { status: 400 });
    }

    // Obtener el proyecto
    const project = await Project.findById(projectId);
    if (!project) {
      return NextResponse.json({ error: 'Proyecto no encontrado' }, { status: 404 });
    }

    // Buscar mensaje con screenshot de la dinámica (se crea al cerrar)
    // Busca mensajes con "Captura de" que contengan attachments de imagen
    let screenshotUrl = '';
    const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000';
    try {
      // Buscar por contenido que mencione el tipo de dinámica o el título
      const dynamicTitle = message.commandData.title || message.commandData.question || message.commandData.topic || '';
      const screenshotMessages = await ChannelMessage.find({
        channelId: message.channelId,
        $or: [
          { content: { $regex: `Captura de \\*\\*${message.commandType}\\*\\*`, $options: 'i' } },
          { content: { $regex: `📸.*${message.commandType}`, $options: 'i' } }
        ],
        attachments: { $exists: true, $ne: [] },
        createdAt: { $gte: new Date(message.createdAt) }
      }).populate('attachments').sort({ createdAt: -1 }).limit(5);

      // Buscar el attachment de imagen más reciente
      for (const msg of screenshotMessages) {
        if (msg.attachments?.length > 0) {
          const attachment = msg.attachments[0] as any;
          if (attachment.url && attachment.mimeType?.startsWith('image/')) {
            screenshotUrl = attachment.url.startsWith('http') ? attachment.url : `${baseUrl}${attachment.url}`;
            break;
          }
        }
      }
    } catch (err) {
      console.log('No screenshot found for dynamic:', err);
    }

    // Extraer participantes
    const participantIds = extractParticipants(message.commandType, message.commandData);

    if (participantIds.length === 0) {
      return NextResponse.json({ error: 'No hay participantes para enviar el correo' }, { status: 400 });
    }

    // Obtener emails de los participantes
    const participants = await User.find({
      _id: { $in: participantIds },
      isActive: true
    }).select('name email');

    if (participants.length === 0) {
      return NextResponse.json({ error: 'No se encontraron participantes activos' }, { status: 400 });
    }

    const emails = participants.map(p => p.email).filter(Boolean);

    if (emails.length === 0) {
      return NextResponse.json({ error: 'No hay emails válidos de participantes' }, { status: 400 });
    }

    // Generar contenido del email
    const typeName = COMMAND_TYPE_NAMES[message.commandType] || message.commandType;
    const title = message.commandData.title || message.commandData.question || message.commandData.topic || 'Sin título';
    const channelUrl = `${baseUrl}/channels/${message.channelId}`;

    const resultsHTML = generateDynamicResultsHTML(message.commandType, message.commandData);

    const screenshotSection = screenshotUrl ? `
      <div style="margin: 25px 0; text-align: center;">
        <h4 style="color: #6b7280; margin: 0 0 15px 0;">📸 Captura de la Dinámica</h4>
        <img src="${screenshotUrl}" alt="Captura de ${title}" style="max-width: 100%; border-radius: 8px; border: 1px solid #e5e7eb; box-shadow: 0 2px 8px rgba(0,0,0,0.1);" />
      </div>
    ` : '';

    const emailHTML = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <style>
            body {
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
              line-height: 1.6;
              color: #333;
              max-width: 600px;
              margin: 0 auto;
              padding: 20px;
              background: #f3f4f6;
            }
            .email-container {
              background: white;
              border-radius: 12px;
              overflow: hidden;
              box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
            }
            .logo-section {
              background: white;
              padding: 20px;
              text-align: center;
              border-bottom: 2px solid #e5e7eb;
            }
            .logo-section img {
              max-width: 150px;
              height: auto;
            }
            .header {
              background: linear-gradient(135deg, #6366f1 0%, #4f46e5 100%);
              color: white;
              padding: 30px;
              text-align: center;
            }
            .content {
              padding: 30px;
            }
            .button {
              display: inline-block;
              background: #6366f1;
              color: white;
              padding: 12px 30px;
              text-decoration: none;
              border-radius: 8px;
              margin-top: 20px;
              font-weight: 600;
            }
            .footer {
              text-align: center;
              padding: 20px;
              color: #6b7280;
              font-size: 12px;
              background: #f9fafb;
            }
          </style>
        </head>
        <body>
          <div class="email-container">
            <div class="logo-section">
              <img src="${baseUrl}/orca-logo.png" alt="Orca Logo" />
            </div>
            <div class="header">
              <h1 style="margin: 0;">📋 Resumen de Dinámica</h1>
              <p style="margin: 10px 0 0 0; opacity: 0.9;">${typeName}</p>
            </div>
            <div class="content">
              <p style="color: #6b7280;">
                ${(session.user as any).name || 'Un usuario'} te ha enviado el resumen de una dinámica del proyecto <strong>${project.name}</strong>.
              </p>

              ${screenshotSection}

              ${resultsHTML}

              <div style="text-align: center; margin-top: 30px;">
                <a href="${channelUrl}" class="button">Ver en el Canal</a>
              </div>
            </div>
            <div class="footer">
              <p><strong>Sistema de Prioridades</strong> - Orca GRC</p>
              <p>Enviado por ${(session.user as any).name || 'Usuario'}</p>
            </div>
          </div>
        </body>
      </html>
    `;

    // Enviar correo
    const result = await sendEmail({
      to: emails,
      subject: `📋 Resumen: ${typeName} - "${title}" | ${project.name}`,
      html: emailHTML
    });

    if (!result.success) {
      console.error('Error sending dynamic email:', result.error);
      return NextResponse.json({ error: 'Error al enviar el correo' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: `Correo enviado a ${emails.length} participante(s)`,
      recipients: emails.length
    });

  } catch (error: any) {
    console.error('Error sending dynamic email:', error);
    return NextResponse.json({ error: error.message || 'Error interno' }, { status: 500 });
  }
}
