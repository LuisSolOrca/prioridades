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

// Estilo base para todos los emails
const baseStyles = `
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
    color: white;
    padding: 30px;
    text-align: center;
  }
  .content {
    background: #f9fafb;
    padding: 30px;
  }
  .info-box {
    background: white;
    padding: 20px;
    border-left: 4px solid currentColor;
    border-radius: 5px;
    margin: 20px 0;
  }
  .button {
    display: inline-block;
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
    background: white;
  }
`;

// Helper para generar el HTML base con logo
const generateEmailHTML = (params: {
  headerGradient: string;
  headerTitle: string;
  content: string;
}) => {
  const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000';
  const logoUrl = `${baseUrl}/orca-logo.png`;

  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <style>${baseStyles}</style>
      </head>
      <body>
        <div class="email-container">
          <div class="logo-section">
            <img src="${logoUrl}" alt="Orca Logo" />
          </div>
          <div class="header" style="background: ${params.headerGradient};">
            <h1 style="margin: 0;">${params.headerTitle}</h1>
          </div>
          <div class="content">
            ${params.content}
          </div>
          <div class="footer">
            <p><strong>Sistema de Prioridades</strong> - Orca GRC</p>
            <p>Este es un correo automático.</p>
            <p>No respondas a este mensaje.</p>
          </div>
        </div>
      </body>
    </html>
  `;
};

// Templates de email
export const emailTemplates = {
  statusChange: (params: {
    priorityTitle: string;
    oldStatus: string;
    newStatus: string;
    priorityUrl: string;
  }) => ({
    subject: `⚠️ Cambio de estado: ${params.priorityTitle}`,
    html: generateEmailHTML({
      headerGradient: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
      headerTitle: '⚠️ Cambio de Estado',
      content: `
        <p>El estado de una prioridad ha cambiado:</p>
        <h3 style="color: #1f2937; margin: 15px 0;">${params.priorityTitle}</h3>
        <div class="info-box" style="border-color: #f59e0b; text-align: center;">
          <span style="background: #e5e7eb; color: #6b7280; padding: 8px 16px; border-radius: 20px; font-weight: 600;">${params.oldStatus}</span>
          <span style="font-size: 24px; margin: 0 10px;">→</span>
          <span style="background: #fef3c7; color: #92400e; padding: 8px 16px; border-radius: 20px; font-weight: 600;">${params.newStatus}</span>
        </div>
        <a href="${params.priorityUrl}" class="button" style="background: #f59e0b;">Ver Detalles</a>
      `
    }),
  }),

  newComment: (params: {
    priorityTitle: string;
    commentAuthor: string;
    commentText: string;
    priorityUrl: string;
  }) => ({
    subject: `💬 Nuevo comentario en: ${params.priorityTitle}`,
    html: generateEmailHTML({
      headerGradient: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      headerTitle: '💬 Nuevo Comentario',
      content: `
        <p>Se ha agregado un nuevo comentario en la prioridad:</p>
        <h3 style="color: #1f2937; margin: 15px 0;">${params.priorityTitle}</h3>
        <div class="info-box" style="border-color: #667eea;">
          <div style="font-weight: 600; color: #667eea; margin-bottom: 10px;">👤 ${params.commentAuthor}</div>
          <div style="color: #4b5563;">${params.commentText}</div>
        </div>
        <a href="${params.priorityUrl}" class="button" style="background: #667eea;">Ver Prioridad y Comentarios</a>
      `
    }),
  }),

  mention: (params: {
    mentionerName: string;
    priorityTitle: string;
    commentText: string;
    priorityUrl: string;
  }) => ({
    subject: `@️ ${params.mentionerName} te mencionó en: ${params.priorityTitle}`,
    html: generateEmailHTML({
      headerGradient: 'linear-gradient(135deg, #8b5cf6 0%, #6d28d9 100%)',
      headerTitle: '@️ Te mencionaron',
      content: `
        <p><strong>${params.mentionerName}</strong> te mencionó en:</p>
        <h3 style="color: #1f2937; margin: 15px 0;">${params.priorityTitle}</h3>
        <div class="info-box" style="border-color: #8b5cf6;">
          <div style="color: #4b5563;">${params.commentText}</div>
        </div>
        <a href="${params.priorityUrl}" class="button" style="background: #8b5cf6;">Ver Comentario</a>
      `
    }),
  }),

  priorityDueSoon: (params: {
    priorityTitle: string;
    completionPercentage: number;
    priorityUrl: string;
  }) => ({
    subject: `⏰ Prioridad vence pronto: ${params.priorityTitle}`,
    html: generateEmailHTML({
      headerGradient: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
      headerTitle: '⏰ Prioridad Vence Pronto',
      content: `
        <p>Esta prioridad vence <strong>mañana</strong>:</p>
        <h3 style="color: #1f2937; margin: 15px 0;">${params.priorityTitle}</h3>
        <div class="info-box" style="border-color: #ef4444;">
          <p style="color: #4b5563; margin: 0;">Progreso actual: <strong>${params.completionPercentage}%</strong></p>
          <p style="color: #6b7280; margin: 10px 0 0 0; font-size: 14px;">¿Necesitas ayuda para terminarla?</p>
        </div>
        <a href="${params.priorityUrl}" class="button" style="background: #ef4444;">Ver Prioridad</a>
      `
    }),
  }),

  completionMilestone: (params: {
    priorityTitle: string;
    milestone: number;
    priorityUrl: string;
  }) => {
    const emojis: Record<number, string> = { 25: '🎯', 50: '⚡', 75: '🚀', 100: '🎉' };
    const emoji = emojis[params.milestone] || '✓';
    return {
      subject: `${emoji} ¡${params.milestone}% completado! - ${params.priorityTitle}`,
      html: generateEmailHTML({
        headerGradient: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
        headerTitle: `${emoji} ¡Hito Alcanzado!`,
        content: `
          <p>¡Excelente progreso! Has alcanzado el <strong>${params.milestone}%</strong> de completado en:</p>
          <h3 style="color: #1f2937; margin: 15px 0;">${params.priorityTitle}</h3>
          <div class="info-box" style="border-color: #10b981; text-align: center;">
            <div style="font-size: 48px; margin: 10px 0;">${emoji}</div>
            <p style="color: #059669; font-weight: 600; font-size: 18px; margin: 10px 0;">¡${params.milestone}% Completado!</p>
            <p style="color: #6b7280; font-size: 14px; margin: 10px 0;">Sigue adelante, ¡vas muy bien!</p>
          </div>
          <a href="${params.priorityUrl}" class="button" style="background: #10b981;">Ver Prioridad</a>
        `
      }),
    };
  },

  priorityInactive: (params: {
    priorityTitle: string;
    daysInactive: number;
    priorityUrl: string;
  }) => ({
    subject: `🔔 Prioridad sin actividad: ${params.priorityTitle}`,
    html: generateEmailHTML({
      headerGradient: 'linear-gradient(135deg, #6b7280 0%, #4b5563 100%)',
      headerTitle: '🔔 Prioridad Sin Actividad',
      content: `
        <p>Esta prioridad no ha tenido actualizaciones en <strong>${params.daysInactive} días</strong>:</p>
        <h3 style="color: #1f2937; margin: 15px 0;">${params.priorityTitle}</h3>
        <div class="info-box" style="border-color: #6b7280;">
          <p style="color: #4b5563; margin: 0;">¿Está bloqueada o necesitas ayuda?</p>
          <p style="color: #6b7280; font-size: 14px; margin: 10px 0 0 0;">Considera actualizar el estado si hay algún impedimento.</p>
        </div>
        <a href="${params.priorityUrl}" class="button" style="background: #6b7280;">Actualizar Prioridad</a>
      `
    }),
  }),

  priorityUnblocked: (params: {
    priorityTitle: string;
    newStatus: string;
    priorityUrl: string;
  }) => ({
    subject: `✅ Prioridad desbloqueada: ${params.priorityTitle}`,
    html: generateEmailHTML({
      headerGradient: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
      headerTitle: '✅ ¡Prioridad Desbloqueada!',
      content: `
        <p>La prioridad ha sido desbloqueada:</p>
        <h3 style="color: #1f2937; margin: 15px 0;">${params.priorityTitle}</h3>
        <div class="info-box" style="border-color: #10b981;">
          <p style="color: #4b5563; margin: 0;">Nuevo estado: <strong>${params.newStatus}</strong></p>
          <p style="color: #059669; font-weight: 600; margin: 10px 0 0 0;">¡Sigue adelante!</p>
        </div>
        <a href="${params.priorityUrl}" class="button" style="background: #10b981;">Ver Prioridad</a>
      `
    }),
  }),

  weekCompleted: (params: {
    weekStr: string;
    priorityUrl: string;
  }) => ({
    subject: `🎉 ¡Felicitaciones! Completaste todas tus prioridades`,
    html: generateEmailHTML({
      headerGradient: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
      headerTitle: '🎉 ¡Semana Completada!',
      content: `
        <p>¡Excelente trabajo!</p>
        <div class="info-box" style="border-color: #f59e0b; text-align: center;">
          <div style="font-size: 64px; margin: 10px 0;">🎉</div>
          <p style="font-weight: 600; font-size: 18px; color: #1f2937; margin: 10px 0;">Has completado todas tus prioridades</p>
          <p style="color: #6b7280; font-size: 14px; margin: 10px 0;">Semana: ${params.weekStr}</p>
        </div>
        <a href="${params.priorityUrl}" class="button" style="background: #f59e0b;">Ver Analíticas</a>
      `
    }),
  }),

  weekStartReminder: (params: {
    priorityUrl: string;
  }) => ({
    subject: `📅 Nueva semana - Define tus prioridades`,
    html: generateEmailHTML({
      headerGradient: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
      headerTitle: '📅 ¡Nueva Semana!',
      content: `
        <p>Es lunes, momento perfecto para definir tus prioridades de esta semana.</p>
        <div class="info-box" style="border-color: #3b82f6;">
          <p style="color: #4b5563; margin: 0; font-weight: 600;">¿Qué vas a lograr esta semana?</p>
          <p style="color: #6b7280; font-size: 14px; margin: 10px 0 0 0;">Define hasta 5 prioridades estratégicas para comenzar con el pie derecho.</p>
        </div>
        <a href="${params.priorityUrl}" class="button" style="background: #3b82f6;">Definir Prioridades</a>
      `
    }),
  }),

  commentReply: (params: {
    replierName: string;
    priorityTitle: string;
    replyText: string;
    priorityUrl: string;
  }) => ({
    subject: `💬 ${params.replierName} respondió a tu comentario`,
    html: generateEmailHTML({
      headerGradient: 'linear-gradient(135deg, #06b6d4 0%, #0891b2 100%)',
      headerTitle: '💬 Nueva Respuesta',
      content: `
        <p><strong>${params.replierName}</strong> respondió a tu comentario en:</p>
        <h3 style="color: #1f2937; margin: 15px 0;">${params.priorityTitle}</h3>
        <div class="info-box" style="border-color: #06b6d4;">
          <div style="color: #4b5563;">${params.replyText}</div>
        </div>
        <a href="${params.priorityUrl}" class="button" style="background: #06b6d4;">Ver Respuesta</a>
      `
    }),
  }),

  weekendReminder: (params: {
    priorityUrl: string;
  }) => ({
    subject: `📅 Recordatorio de fin de semana - Actualiza tus prioridades`,
    html: generateEmailHTML({
      headerGradient: 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)',
      headerTitle: '📅 Recordatorio de Fin de Semana',
      content: `
        <p>Es momento de revisar y actualizar el progreso de tus prioridades de la semana.</p>
        <div class="info-box" style="border-color: #8b5cf6;">
          <p style="color: #4b5563; margin: 0; font-weight: 600;">¿Cómo va tu semana?</p>
          <p style="color: #6b7280; font-size: 14px; margin: 10px 0 0 0;">Actualiza el estado y porcentaje de completado de tus prioridades.</p>
        </div>
        <a href="${params.priorityUrl}" class="button" style="background: #8b5cf6;">Actualizar Prioridades</a>
      `
    }),
  }),
};
