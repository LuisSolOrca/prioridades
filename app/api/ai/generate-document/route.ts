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
    case 'poll':
    case 'blind-vote':
    case 'dot-voting':
      if (commandData.options) {
        content += 'Opciones y votos:\n';
        commandData.options.forEach((opt: any) => {
          const voteCount = opt.votes?.length || opt.dots?.length || 0;
          content += `- ${opt.text}: ${voteCount} votos\n`;
        });
      }
      break;

    case 'brainstorm':
      if (commandData.ideas) {
        content += 'Ideas generadas:\n';
        commandData.ideas.forEach((idea: any) => {
          content += `- ${idea.text} (por ${idea.userName})\n`;
        });
      }
      break;

    case 'pros-cons':
      if (commandData.pros) {
        content += 'Pros:\n';
        commandData.pros.forEach((item: any) => {
          content += `- ${item.text}\n`;
        });
      }
      if (commandData.cons) {
        content += 'Contras:\n';
        commandData.cons.forEach((item: any) => {
          content += `- ${item.text}\n`;
        });
      }
      break;

    case 'decision-matrix':
      content += `Opciones: ${commandData.options?.join(', ') || 'N/A'}\n`;
      content += `Criterios: ${commandData.criteria?.join(', ') || 'N/A'}\n`;
      if (commandData.cells) {
        content += 'Evaluaciones:\n';
        commandData.cells.forEach((cell: any) => {
          content += `- ${cell.option} / ${cell.criterion}: ${cell.score || 0}\n`;
        });
      }
      break;

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
        if (commandData.rankings.length > 0) {
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
        }
      } else {
        content += 'No se han registrado rankings aún.\n';
      }
      break;

    case 'action-items':
      if (commandData.items) {
        content += 'Acciones:\n';
        commandData.items.forEach((item: any) => {
          const status = item.completed ? '✓' : '○';
          content += `${status} ${item.text} (${item.assignee || 'Sin asignar'})\n`;
        });
      }
      break;

    case 'swot':
    case 'soar':
    case 'six-hats':
    case 'crazy-8s':
    case 'affinity-map':
    case 'rose-bud-thorn':
    case 'sailboat':
    case 'start-stop-continue':
      if (commandData.sections) {
        commandData.sections.forEach((section: any) => {
          content += `\n${section.icon || ''} ${section.title}:\n`;
          section.items?.forEach((item: any) => {
            content += `- ${item.text} (${item.userName})\n`;
          });
        });
      }
      break;

    case 'standup':
      if (commandData.entries) {
        content += 'Entradas del standup:\n';
        commandData.entries.forEach((entry: any) => {
          content += `\n${entry.userName}:\n`;
          content += `  Ayer: ${entry.yesterday || 'N/A'}\n`;
          content += `  Hoy: ${entry.today || 'N/A'}\n`;
          content += `  Bloqueos: ${entry.blockers || 'Ninguno'}\n`;
        });
      }
      break;

    case 'mood':
    case 'team-health':
      if (commandData.moods) {
        content += 'Estados de ánimo:\n';
        commandData.moods.forEach((mood: any) => {
          content += `- ${mood.userName}: ${mood.mood} (${mood.comment || 'Sin comentario'})\n`;
        });
      }
      break;

    case 'fist-of-five':
    case 'confidence-vote':
    case 'nps':
      if (commandData.votes) {
        content += 'Votos:\n';
        commandData.votes.forEach((vote: any) => {
          content += `- ${vote.userName}: ${vote.value}\n`;
        });
      }
      break;

    default:
      content += JSON.stringify(commandData, null, 2);
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
