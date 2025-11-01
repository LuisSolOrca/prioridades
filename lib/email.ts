import nodemailer from 'nodemailer';

// Configuración del transporter de nodemailer con Outlook
const transporter = nodemailer.createTransport({
  host: 'smtp-mail.outlook.com',
  port: 587,
  secure: false, // true for 465, false for other ports
  auth: {
    user: process.env.EMAIL_USERNAME || 'orcaevolution@orcagrc.com',
    pass: process.env.EMAIL_PASSWORD || 'rhllyxnkfgnrpshj',
  },
  tls: {
    ciphers: 'SSLv3',
    rejectUnauthorized: false,
  },
  connectionTimeout: 20000,
  greetingTimeout: 20000,
  socketTimeout: 20000,
});

// Verificar la conexión del transporter
export async function verifyEmailConnection() {
  try {
    await transporter.verify();
    console.log('Email server is ready to send messages');
    return true;
  } catch (error) {
    console.error('Error connecting to email server:', error);
    return false;
  }
}

interface EmailOptions {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
}

export async function sendEmail({ to, subject, html, text }: EmailOptions) {
  try {
    const mailOptions = {
      from: `"Prioridades App" <${process.env.EMAIL_USERNAME || 'orcaevolution@orcagrc.com'}>`,
      to: Array.isArray(to) ? to.join(', ') : to,
      subject,
      html,
      text: text || html.replace(/<[^>]*>/g, ''), // Fallback a texto plano si no se proporciona
    };

    const info = await transporter.sendMail(mailOptions);
    console.log('Email sent successfully:', info.messageId);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('Error sending email:', error);
    return { success: false, error };
  }
}

// Templates de email
export const emailTemplates = {
  newComment: (params: {
    priorityTitle: string;
    commentAuthor: string;
    commentText: string;
    priorityUrl: string;
  }) => ({
    subject: `💬 Nuevo comentario en: ${params.priorityTitle}`,
    html: `
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
            }
            .header {
              background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
              color: white;
              padding: 30px;
              border-radius: 10px 10px 0 0;
              text-align: center;
            }
            .content {
              background: #f9fafb;
              padding: 30px;
              border: 1px solid #e5e7eb;
              border-top: none;
            }
            .comment-box {
              background: white;
              padding: 20px;
              border-left: 4px solid #667eea;
              border-radius: 5px;
              margin: 20px 0;
            }
            .author {
              font-weight: 600;
              color: #667eea;
              margin-bottom: 10px;
            }
            .button {
              display: inline-block;
              background: #667eea;
              color: white;
              padding: 12px 30px;
              text-decoration: none;
              border-radius: 5px;
              margin-top: 20px;
              font-weight: 600;
            }
            .footer {
              text-align: center;
              padding: 20px;
              color: #6b7280;
              font-size: 12px;
            }
          </style>
        </head>
        <body>
          <div class="header">
            <h1 style="margin: 0;">💬 Nuevo Comentario</h1>
          </div>
          <div class="content">
            <p>Hola,</p>
            <p>Se ha agregado un nuevo comentario en la prioridad:</p>
            <h3 style="color: #1f2937; margin: 15px 0;">${params.priorityTitle}</h3>

            <div class="comment-box">
              <div class="author">👤 ${params.commentAuthor}</div>
              <div style="color: #4b5563;">${params.commentText}</div>
            </div>

            <a href="${params.priorityUrl}" class="button">Ver Prioridad y Comentarios</a>
          </div>
          <div class="footer">
            <p>Este es un correo automático del Sistema de Prioridades.</p>
            <p>No respondas a este mensaje.</p>
          </div>
        </body>
      </html>
    `,
  }),

  priorityAssigned: (params: {
    userName: string;
    priorityTitle: string;
    priorityDescription?: string;
    weekLabel: string;
    priorityUrl: string;
  }) => ({
    subject: `📋 Nueva prioridad asignada: ${params.priorityTitle}`,
    html: `
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
            }
            .header {
              background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
              color: white;
              padding: 30px;
              border-radius: 10px 10px 0 0;
              text-align: center;
            }
            .content {
              background: #f9fafb;
              padding: 30px;
              border: 1px solid #e5e7eb;
              border-top: none;
            }
            .priority-box {
              background: white;
              padding: 20px;
              border-left: 4px solid #3b82f6;
              border-radius: 5px;
              margin: 20px 0;
            }
            .button {
              display: inline-block;
              background: #3b82f6;
              color: white;
              padding: 12px 30px;
              text-decoration: none;
              border-radius: 5px;
              margin-top: 20px;
              font-weight: 600;
            }
            .footer {
              text-align: center;
              padding: 20px;
              color: #6b7280;
              font-size: 12px;
            }
          </style>
        </head>
        <body>
          <div class="header">
            <h1 style="margin: 0;">📋 Nueva Prioridad</h1>
          </div>
          <div class="content">
            <p>Hola ${params.userName},</p>
            <p>Se te ha asignado una nueva prioridad para la semana:</p>
            <p style="font-weight: 600; color: #667eea;">${params.weekLabel}</p>

            <div class="priority-box">
              <h3 style="margin-top: 0; color: #1f2937;">${params.priorityTitle}</h3>
              ${params.priorityDescription ? `<p style="color: #4b5563;">${params.priorityDescription}</p>` : ''}
            </div>

            <a href="${params.priorityUrl}" class="button">Ver Detalles de la Prioridad</a>
          </div>
          <div class="footer">
            <p>Este es un correo automático del Sistema de Prioridades.</p>
            <p>No respondas a este mensaje.</p>
          </div>
        </body>
      </html>
    `,
  }),

  priorityStatusChange: (params: {
    priorityTitle: string;
    oldStatus: string;
    newStatus: string;
    priorityUrl: string;
  }) => ({
    subject: `🔔 Cambio de estado: ${params.priorityTitle}`,
    html: `
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
            }
            .header {
              background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
              color: white;
              padding: 30px;
              border-radius: 10px 10px 0 0;
              text-align: center;
            }
            .content {
              background: #f9fafb;
              padding: 30px;
              border: 1px solid #e5e7eb;
              border-top: none;
            }
            .status-change {
              background: white;
              padding: 20px;
              border-radius: 5px;
              margin: 20px 0;
              text-align: center;
            }
            .status-badge {
              display: inline-block;
              padding: 8px 16px;
              border-radius: 20px;
              font-weight: 600;
              margin: 10px;
            }
            .button {
              display: inline-block;
              background: #f59e0b;
              color: white;
              padding: 12px 30px;
              text-decoration: none;
              border-radius: 5px;
              margin-top: 20px;
              font-weight: 600;
            }
            .footer {
              text-align: center;
              padding: 20px;
              color: #6b7280;
              font-size: 12px;
            }
          </style>
        </head>
        <body>
          <div class="header">
            <h1 style="margin: 0;">🔔 Cambio de Estado</h1>
          </div>
          <div class="content">
            <p>El estado de una prioridad ha cambiado:</p>
            <h3 style="color: #1f2937; margin: 15px 0;">${params.priorityTitle}</h3>

            <div class="status-change">
              <span class="status-badge" style="background: #e5e7eb; color: #6b7280;">${params.oldStatus}</span>
              <span style="font-size: 24px;">→</span>
              <span class="status-badge" style="background: #dbeafe; color: #1e40af;">${params.newStatus}</span>
            </div>

            <a href="${params.priorityUrl}" class="button">Ver Detalles</a>
          </div>
          <div class="footer">
            <p>Este es un correo automático del Sistema de Prioridades.</p>
            <p>No respondas a este mensaje.</p>
          </div>
        </body>
      </html>
    `,
  }),
};
