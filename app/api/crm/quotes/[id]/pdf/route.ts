import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import connectDB from '@/lib/mongodb';
import Quote from '@/models/Quote';
import { hasPermission } from '@/lib/permissions';
import PDFDocument from 'pdfkit';

export const dynamic = 'force-dynamic';

// Helper para formatear moneda
function formatCurrency(amount: number, currency: string): string {
  return new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: 2,
  }).format(amount);
}

// Helper para formatear fecha
function formatDate(date: Date): string {
  return new Intl.DateTimeFormat('es-MX', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(new Date(date));
}

// GET - Generar PDF de cotización
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    if (!hasPermission(session, 'viewCRM')) {
      return NextResponse.json({ error: 'Sin permiso para ver CRM' }, { status: 403 });
    }

    await connectDB();
    const { id } = await params;

    const quote = await Quote.findById(id)
      .populate('dealId', 'title')
      .populate('createdBy', 'name email')
      .lean();

    if (!quote) {
      return NextResponse.json({ error: 'Cotización no encontrada' }, { status: 404 });
    }

    // Crear PDF
    const doc = new PDFDocument({
      size: 'LETTER',
      margin: 50,
      info: {
        Title: `Cotización ${quote.quoteNumber}`,
        Author: (quote.createdBy as any)?.name || 'Sistema CRM',
      },
    });

    // Buffer para acumular el PDF
    const chunks: Buffer[] = [];
    doc.on('data', (chunk) => chunks.push(chunk));

    // Crear promise para cuando termine
    const pdfPromise = new Promise<Buffer>((resolve, reject) => {
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);
    });

    // Colores
    const primaryColor = '#2563eb';
    const textColor = '#1f2937';
    const lightGray = '#f3f4f6';

    // Encabezado
    doc.fontSize(24)
      .fillColor(primaryColor)
      .text('COTIZACIÓN', 50, 50);

    doc.fontSize(12)
      .fillColor(textColor)
      .text(quote.quoteNumber, 50, 80)
      .text(`Versión ${quote.version}`, 50, 95);

    // Fecha y validez (derecha)
    doc.fontSize(10)
      .text(`Fecha: ${formatDate(quote.createdAt)}`, 400, 50, { align: 'right' })
      .text(`Válida hasta: ${formatDate(quote.validUntil)}`, 400, 65, { align: 'right' });

    // Estado
    const statusLabels: Record<string, string> = {
      draft: 'Borrador',
      sent: 'Enviada',
      accepted: 'Aceptada',
      rejected: 'Rechazada',
      expired: 'Expirada',
    };

    doc.fontSize(10)
      .text(`Estado: ${statusLabels[quote.status] || quote.status}`, 400, 80, { align: 'right' });

    // Línea separadora
    doc.moveTo(50, 120)
      .lineTo(562, 120)
      .strokeColor(primaryColor)
      .lineWidth(2)
      .stroke();

    // Información del cliente
    let yPos = 140;
    doc.fontSize(12)
      .fillColor(primaryColor)
      .text('CLIENTE', 50, yPos);

    yPos += 20;
    doc.fontSize(10)
      .fillColor(textColor)
      .text(quote.clientName, 50, yPos);

    if (quote.contactName) {
      yPos += 15;
      doc.text(`Contacto: ${quote.contactName}`, 50, yPos);
    }
    if (quote.clientEmail || quote.contactEmail) {
      yPos += 15;
      doc.text(`Email: ${quote.contactEmail || quote.clientEmail}`, 50, yPos);
    }
    if (quote.clientPhone) {
      yPos += 15;
      doc.text(`Teléfono: ${quote.clientPhone}`, 50, yPos);
    }
    if (quote.clientAddress) {
      yPos += 15;
      doc.text(`Dirección: ${quote.clientAddress}`, 50, yPos, { width: 250 });
    }

    // Deal info (derecha)
    doc.fontSize(12)
      .fillColor(primaryColor)
      .text('OPORTUNIDAD', 350, 140);

    doc.fontSize(10)
      .fillColor(textColor)
      .text((quote.dealId as any)?.title || 'N/A', 350, 160, { width: 200 });

    // Tabla de productos
    yPos = Math.max(yPos + 40, 260);

    // Encabezado de tabla
    doc.rect(50, yPos, 512, 25)
      .fill(primaryColor);

    doc.fontSize(9)
      .fillColor('#ffffff')
      .text('Producto', 55, yPos + 8)
      .text('Cant.', 250, yPos + 8)
      .text('P. Unit.', 300, yPos + 8)
      .text('Desc.', 370, yPos + 8)
      .text('IVA', 420, yPos + 8)
      .text('Total', 470, yPos + 8, { align: 'right', width: 87 });

    yPos += 25;

    // Filas de productos
    const items = quote.items || [];
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      const isEven = i % 2 === 0;

      if (isEven) {
        doc.rect(50, yPos, 512, 35)
          .fill(lightGray);
      }

      doc.fontSize(9)
        .fillColor(textColor);

      // Nombre del producto (truncar si es muy largo)
      const productName = item.productName.length > 35
        ? item.productName.substring(0, 35) + '...'
        : item.productName;

      doc.text(productName, 55, yPos + 8);

      if (item.productSku) {
        doc.fontSize(7)
          .fillColor('#6b7280')
          .text(`SKU: ${item.productSku}`, 55, yPos + 20);
      }

      doc.fontSize(9)
        .fillColor(textColor)
        .text(item.quantity.toString(), 250, yPos + 12)
        .text(formatCurrency(item.unitPrice, quote.currency), 300, yPos + 12)
        .text(`${item.discount}%`, 370, yPos + 12)
        .text(`${item.taxRate}%`, 420, yPos + 12)
        .text(formatCurrency(item.total, quote.currency), 470, yPos + 12, { align: 'right', width: 87 });

      yPos += 35;

      // Nueva página si es necesario
      if (yPos > 650) {
        doc.addPage();
        yPos = 50;
      }
    }

    // Línea antes de totales
    doc.moveTo(350, yPos + 10)
      .lineTo(562, yPos + 10)
      .strokeColor('#d1d5db')
      .lineWidth(1)
      .stroke();

    yPos += 20;

    // Totales
    doc.fontSize(10)
      .fillColor(textColor)
      .text('Subtotal:', 370, yPos)
      .text(formatCurrency(quote.subtotal, quote.currency), 470, yPos, { align: 'right', width: 87 });

    yPos += 18;
    doc.text('Descuento:', 370, yPos)
      .text(`-${formatCurrency(quote.discountTotal, quote.currency)}`, 470, yPos, { align: 'right', width: 87 });

    yPos += 18;
    doc.text('IVA:', 370, yPos)
      .text(formatCurrency(quote.taxTotal, quote.currency), 470, yPos, { align: 'right', width: 87 });

    yPos += 18;
    doc.rect(350, yPos - 5, 212, 25)
      .fill(primaryColor);

    doc.fontSize(12)
      .fillColor('#ffffff')
      .text('TOTAL:', 370, yPos + 2)
      .text(formatCurrency(quote.total, quote.currency), 470, yPos + 2, { align: 'right', width: 87 });

    // Notas
    yPos += 50;
    if (quote.notes) {
      if (yPos > 600) {
        doc.addPage();
        yPos = 50;
      }

      doc.fontSize(11)
        .fillColor(primaryColor)
        .text('Notas:', 50, yPos);

      yPos += 18;
      doc.fontSize(9)
        .fillColor(textColor)
        .text(quote.notes, 50, yPos, { width: 500 });

      yPos += doc.heightOfString(quote.notes, { width: 500 }) + 20;
    }

    // Términos y condiciones
    if (quote.terms) {
      if (yPos > 550) {
        doc.addPage();
        yPos = 50;
      }

      doc.fontSize(11)
        .fillColor(primaryColor)
        .text('Términos y Condiciones:', 50, yPos);

      yPos += 18;
      doc.fontSize(8)
        .fillColor('#6b7280')
        .text(quote.terms, 50, yPos, { width: 500 });
    }

    // Pie de página
    const pageCount = doc.bufferedPageRange().count;
    for (let i = 0; i < pageCount; i++) {
      doc.switchToPage(i);
      doc.fontSize(8)
        .fillColor('#9ca3af')
        .text(
          `Página ${i + 1} de ${pageCount} | ${quote.quoteNumber}`,
          50,
          750,
          { align: 'center', width: 512 }
        );
    }

    // Finalizar
    doc.end();

    // Esperar a que termine
    const pdfBuffer = await pdfPromise;

    // Actualizar quote con timestamp de generación
    await Quote.findByIdAndUpdate(id, { pdfGeneratedAt: new Date() });

    // Retornar PDF
    return new NextResponse(pdfBuffer, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${quote.quoteNumber}.pdf"`,
        'Content-Length': pdfBuffer.length.toString(),
      },
    });
  } catch (error: any) {
    console.error('Error generating quote PDF:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
