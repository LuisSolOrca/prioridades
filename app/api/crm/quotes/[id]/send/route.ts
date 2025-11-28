import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import connectDB from '@/lib/mongodb';
import Quote from '@/models/Quote';
import { hasPermission } from '@/lib/permissions';
import nodemailer from 'nodemailer';
import { triggerWorkflowsAsync } from '@/lib/crmWorkflowEngine';

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

// Configuración del transporter
const transporter = nodemailer.createTransport({
  host: 'smtp-mail.outlook.com',
  port: 587,
  secure: false,
  auth: {
    user: process.env.EMAIL_USERNAME || 'orcaevolution@orcagrc.com',
    pass: process.env.EMAIL_PASSWORD || '',
  },
  tls: {
    ciphers: 'SSLv3',
    rejectUnauthorized: false,
  },
  connectionTimeout: 20000,
  greetingTimeout: 20000,
  socketTimeout: 20000,
});

// POST - Enviar cotización por email
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    if (!hasPermission(session, 'canManageDeals')) {
      return NextResponse.json({ error: 'Sin permiso para gestionar deals' }, { status: 403 });
    }

    await connectDB();
    const { id } = await params;
    const body = await request.json();

    const quote = await Quote.findById(id)
      .populate('dealId', 'title')
      .populate('createdBy', 'name email')
      .lean();

    if (!quote) {
      return NextResponse.json({ error: 'Cotización no encontrada' }, { status: 404 });
    }

    // Verificar que hay un email destino
    const toEmail = body.email || quote.contactEmail || quote.clientEmail;
    if (!toEmail) {
      return NextResponse.json(
        { error: 'No hay dirección de email para enviar la cotización' },
        { status: 400 }
      );
    }

    // Generar PDF
    const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000';
    const pdfResponse = await fetch(`${baseUrl}/api/crm/quotes/${id}/pdf`, {
      headers: {
        Cookie: request.headers.get('cookie') || '',
      },
    });

    if (!pdfResponse.ok) {
      return NextResponse.json(
        { error: 'Error al generar el PDF de la cotización' },
        { status: 500 }
      );
    }

    const pdfBuffer = Buffer.from(await pdfResponse.arrayBuffer());

    // Preparar email
    const senderName = (quote.createdBy as any)?.name || 'Equipo de Ventas';
    const senderEmail = process.env.EMAIL_USERNAME || 'orcaevolution@orcagrc.com';
    const subject = body.subject || `Cotización ${quote.quoteNumber} - ${quote.clientName}`;

    // Construir HTML del email
    const emailHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%); padding: 30px; border-radius: 10px 10px 0 0;">
    <h1 style="color: white; margin: 0; font-size: 24px;">Cotización ${quote.quoteNumber}</h1>
    <p style="color: rgba(255,255,255,0.9); margin: 10px 0 0 0;">Versión ${quote.version}</p>
  </div>

  <div style="background: #f8fafc; padding: 30px; border: 1px solid #e2e8f0; border-top: none;">
    <p style="margin: 0 0 20px 0;">Estimado/a <strong>${quote.contactName || quote.clientName}</strong>,</p>

    <p style="margin: 0 0 20px 0;">${body.message || 'Le hacemos llegar nuestra cotización según lo conversado. Adjunto encontrará el documento con el detalle de productos y condiciones.'}</p>

    <div style="background: white; border: 1px solid #e2e8f0; border-radius: 8px; padding: 20px; margin: 20px 0;">
      <h3 style="margin: 0 0 15px 0; color: #2563eb;">Resumen</h3>
      <table style="width: 100%; border-collapse: collapse;">
        <tr>
          <td style="padding: 8px 0; border-bottom: 1px solid #e2e8f0;">Productos:</td>
          <td style="padding: 8px 0; border-bottom: 1px solid #e2e8f0; text-align: right;">${quote.items?.length || 0} items</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; border-bottom: 1px solid #e2e8f0;">Subtotal:</td>
          <td style="padding: 8px 0; border-bottom: 1px solid #e2e8f0; text-align: right;">${formatCurrency(quote.subtotal, quote.currency)}</td>
        </tr>
        ${quote.discountTotal > 0 ? `
        <tr>
          <td style="padding: 8px 0; border-bottom: 1px solid #e2e8f0;">Descuento:</td>
          <td style="padding: 8px 0; border-bottom: 1px solid #e2e8f0; text-align: right; color: #10b981;">-${formatCurrency(quote.discountTotal, quote.currency)}</td>
        </tr>
        ` : ''}
        <tr>
          <td style="padding: 8px 0; border-bottom: 1px solid #e2e8f0;">IVA:</td>
          <td style="padding: 8px 0; border-bottom: 1px solid #e2e8f0; text-align: right;">${formatCurrency(quote.taxTotal, quote.currency)}</td>
        </tr>
        <tr>
          <td style="padding: 12px 0; font-weight: bold; font-size: 18px;">Total:</td>
          <td style="padding: 12px 0; text-align: right; font-weight: bold; font-size: 18px; color: #2563eb;">${formatCurrency(quote.total, quote.currency)}</td>
        </tr>
      </table>
    </div>

    <div style="background: #fef3c7; border: 1px solid #f59e0b; border-radius: 8px; padding: 15px; margin: 20px 0;">
      <p style="margin: 0; color: #92400e;">
        <strong>Validez:</strong> Esta cotización es válida hasta el ${formatDate(quote.validUntil)}.
      </p>
    </div>

    <p style="margin: 20px 0 0 0;">Para cualquier duda o aclaración, no dude en contactarnos.</p>

    <p style="margin: 20px 0 0 0;">
      Saludos cordiales,<br>
      <strong>${senderName}</strong>
    </p>
  </div>

  <div style="background: #1f2937; padding: 20px; border-radius: 0 0 10px 10px; text-align: center;">
    <p style="color: rgba(255,255,255,0.7); margin: 0; font-size: 12px;">
      Este email fue enviado desde el sistema CRM.<br>
      Por favor, revise el archivo adjunto para ver la cotización completa.
    </p>
  </div>
</body>
</html>
`;

    // Enviar email con nodemailer
    const mailOptions = {
      from: `"${senderName}" <${senderEmail}>`,
      to: toEmail,
      cc: body.cc || undefined,
      replyTo: (quote.createdBy as any)?.email || senderEmail,
      subject,
      html: emailHtml,
      attachments: [
        {
          filename: `${quote.quoteNumber}.pdf`,
          content: pdfBuffer,
          contentType: 'application/pdf',
        },
      ],
    };

    const info = await transporter.sendMail(mailOptions);

    // Actualizar estado de la cotización
    const updatedQuote = await Quote.findByIdAndUpdate(id, {
      status: 'sent',
      sentAt: new Date(),
      sentTo: toEmail,
    }, { new: true });

    // Disparar workflow de quote_sent
    const userId = (session.user as any).id;
    const quoteData = (updatedQuote?.toJSON?.() || updatedQuote || {}) as Record<string, any>;
    triggerWorkflowsAsync('quote_sent', {
      entityType: 'quote',
      entityId: id,
      entityName: quote.quoteNumber,
      newData: quoteData,
      userId,
    });

    return NextResponse.json({
      success: true,
      messageId: info.messageId,
      sentTo: toEmail,
    });
  } catch (error: any) {
    console.error('Error sending quote:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
