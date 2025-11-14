import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import fs from 'fs';
import path from 'path';
import { marked } from 'marked';

const PDFDocument = require('pdfkit');

/**
 * GET - Genera y descarga el PDF de documentación de funciones del sistema
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    // Leer el archivo markdown
    const docPath = path.join(process.cwd(), 'docs', 'SYSTEM_DATA_FUNCTIONS.md');
    const markdownContent = fs.readFileSync(docPath, 'utf-8');

    // Convertir markdown a HTML
    const htmlContent = await marked(markdownContent);

    // Crear PDF
    const doc = new PDFDocument({
      margins: { top: 50, bottom: 50, left: 50, right: 50 },
      size: 'LETTER',
      info: {
        Title: 'Funciones del Sistema para KPIs',
        Author: 'Sistema de Prioridades',
        Subject: 'Documentación de Funciones del Sistema',
        Keywords: 'KPI, Funciones, Sistema, Prioridades'
      }
    });

    // Buffer para almacenar el PDF
    const chunks: Uint8Array[] = [];
    doc.on('data', (chunk: Uint8Array) => chunks.push(chunk));

    // Configurar estilos
    const titleFont = 'Helvetica-Bold';
    const headingFont = 'Helvetica-Bold';
    const bodyFont = 'Helvetica';
    const codeFont = 'Courier';

    // Colores
    const primaryColor = '#2563eb';
    const secondaryColor = '#4b5563';
    const codeBackground = '#f3f4f6';

    // Título principal
    doc.fontSize(24)
       .fillColor(primaryColor)
       .font(titleFont)
       .text('Funciones del Sistema para KPIs', { align: 'center' });

    doc.moveDown();
    doc.fontSize(12)
       .fillColor(secondaryColor)
       .font(bodyFont)
       .text('Documentación Completa', { align: 'center' });

    doc.moveDown(2);

    // Procesar el contenido markdown línea por línea
    const lines = markdownContent.split('\n');
    let inCodeBlock = false;
    let codeContent = '';

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      // Detectar bloques de código
      if (line.startsWith('```')) {
        if (inCodeBlock) {
          // Finalizar bloque de código
          doc.fontSize(9)
             .fillColor('#000000')
             .font(codeFont);

          // Fondo gris para código
          const codeLines = codeContent.trim().split('\n');
          codeLines.forEach(codeLine => {
            doc.text(codeLine, { indent: 20 });
          });

          doc.moveDown(0.5);
          codeContent = '';
          inCodeBlock = false;
        } else {
          // Iniciar bloque de código
          inCodeBlock = true;
          doc.moveDown(0.5);
        }
        continue;
      }

      if (inCodeBlock) {
        codeContent += line + '\n';
        continue;
      }

      // Títulos nivel 1 (##)
      if (line.startsWith('# ')) {
        doc.addPage();
        doc.fontSize(20)
           .fillColor(primaryColor)
           .font(headingFont)
           .text(line.substring(2));
        doc.moveDown();
        continue;
      }

      // Títulos nivel 2 (##)
      if (line.startsWith('## ')) {
        doc.moveDown();
        doc.fontSize(16)
           .fillColor(primaryColor)
           .font(headingFont)
           .text(line.substring(3));
        doc.moveDown(0.5);
        continue;
      }

      // Títulos nivel 3 (###)
      if (line.startsWith('### ')) {
        doc.moveDown(0.5);
        doc.fontSize(14)
           .fillColor(primaryColor)
           .font(headingFont)
           .text(line.substring(4));
        doc.moveDown(0.3);
        continue;
      }

      // Líneas horizontales
      if (line === '---') {
        doc.moveDown();
        doc.strokeColor('#d1d5db')
           .lineWidth(1)
           .moveTo(50, doc.y)
           .lineTo(562, doc.y)
           .stroke();
        doc.moveDown();
        continue;
      }

      // Lista con viñetas
      if (line.startsWith('- ')) {
        doc.fontSize(10)
           .fillColor(secondaryColor)
           .font(bodyFont)
           .text('• ' + line.substring(2), { indent: 20 });
        continue;
      }

      // Texto en negrita con **
      if (line.includes('**')) {
        const parts = line.split('**');
        doc.fontSize(10).fillColor(secondaryColor);

        for (let j = 0; j < parts.length; j++) {
          if (j % 2 === 1) {
            doc.font(headingFont).text(parts[j], { continued: j < parts.length - 1 });
          } else {
            doc.font(bodyFont).text(parts[j], { continued: j < parts.length - 1 });
          }
        }
        doc.moveDown(0.3);
        continue;
      }

      // Texto normal
      if (line.trim()) {
        doc.fontSize(10)
           .fillColor(secondaryColor)
           .font(bodyFont)
           .text(line.trim());
        doc.moveDown(0.3);
      } else {
        doc.moveDown(0.5);
      }

      // Evitar overflow de página
      if (doc.y > 700) {
        doc.addPage();
      }
    }

    // Pie de página en todas las páginas
    const pages = doc.bufferedPageRange();
    for (let i = 0; i < pages.count; i++) {
      doc.switchToPage(i);
      doc.fontSize(8)
         .fillColor('#9ca3af')
         .text(
           `Página ${i + 1} de ${pages.count}`,
           50,
           doc.page.height - 50,
           { align: 'center' }
         );
      doc.text(
        `Generado: ${new Date().toLocaleDateString('es-MX')}`,
        50,
        doc.page.height - 35,
        { align: 'center' }
      );
    }

    // Finalizar el PDF
    doc.end();

    // Esperar a que se complete la generación
    const pdfBuffer = await new Promise<Buffer>((resolve) => {
      doc.on('end', () => {
        resolve(Buffer.concat(chunks));
      });
    });

    // Retornar el PDF
    return new NextResponse(pdfBuffer, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': 'attachment; filename="Funciones-Sistema-KPIs.pdf"',
        'Content-Length': pdfBuffer.length.toString(),
      },
    });

  } catch (error: any) {
    console.error('Error generating PDF:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
