import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import connectDB from '@/lib/mongodb';
import Activity from '@/models/Activity';
import Contact from '@/models/Contact';
import Deal from '@/models/Deal';
import Client from '@/models/Client';
import { hasPermission } from '@/lib/permissions';
import { createTrackedEmail } from '@/lib/emailTracking';
import nodemailer from 'nodemailer';

export const dynamic = 'force-dynamic';

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

// POST - Enviar email con tracking
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    if (!hasPermission(session, 'viewCRM')) {
      return NextResponse.json({ error: 'Sin permiso para usar CRM' }, { status: 403 });
    }

    await connectDB();

    const body = await request.json();
    const userId = (session.user as any).id;

    // Validar campos requeridos
    if (!body.to || !body.subject || !body.body) {
      return NextResponse.json(
        { error: 'Email, asunto y cuerpo son requeridos' },
        { status: 400 }
      );
    }

    // Obtener información del contacto/deal/cliente si se proporcionan
    let contactData = null;
    let dealData = null;
    let clientData = null;

    if (body.contactId) {
      contactData = await Contact.findById(body.contactId).lean();
    }
    if (body.dealId) {
      dealData = await Deal.findById(body.dealId)
        .populate('clientId', 'name')
        .lean();
      if (dealData?.clientId && !body.clientId) {
        clientData = dealData.clientId;
      }
    }
    if (body.clientId && !clientData) {
      clientData = await Client.findById(body.clientId).lean();
    }

    // Crear actividad de tipo email
    const activity = await Activity.create({
      type: 'email',
      title: `Email: ${body.subject}`,
      description: body.body.replace(/<[^>]*>/g, ' ').substring(0, 500),
      dealId: body.dealId,
      contactId: body.contactId,
      clientId: body.clientId || clientData?._id,
      createdBy: userId,
      isCompleted: true,
      completedAt: new Date(),
    });

    // Preparar nombre del destinatario
    const recipientName = contactData
      ? `${contactData.firstName} ${contactData.lastName}`
      : body.toName || undefined;

    // Crear email con tracking
    const { trackingId, html: trackedHtml, tracking } = await createTrackedEmail({
      activityId: activity._id,
      dealId: body.dealId,
      contactId: body.contactId,
      clientId: body.clientId || clientData?._id,
      userId,
      subject: body.subject,
      recipientEmail: body.to,
      recipientName,
      bodyHtml: body.body,
    });

    // Enviar email
    const senderEmail = process.env.EMAIL_USERNAME || 'orcaevolution@orcagrc.com';
    const senderName = (session.user as any).name || 'Equipo de Ventas';

    const mailOptions = {
      from: `"${senderName}" <${senderEmail}>`,
      to: body.to,
      cc: body.cc || undefined,
      bcc: body.bcc || undefined,
      replyTo: (session.user as any).email || senderEmail,
      subject: body.subject,
      html: trackedHtml,
      // Incluir attachments si se proporcionan
      attachments: body.attachments || undefined,
    };

    const info = await transporter.sendMail(mailOptions);

    // Actualizar actividad con información del email enviado
    await Activity.findByIdAndUpdate(activity._id, {
      metadata: {
        emailTrackingId: trackingId,
        messageId: info.messageId,
        sentTo: body.to,
      },
    });

    return NextResponse.json({
      success: true,
      messageId: info.messageId,
      trackingId,
      activityId: activity._id,
    });
  } catch (error: any) {
    console.error('Error sending email:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
