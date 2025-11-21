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

  performanceReport: (params: {
    userName: string;
    periodLabel: string;
    reportType: 'SEMANAL' | 'MENSUAL';
    currentStats: {
      totalPriorities: number;
      completedPriorities: number;
      delayedPriorities: number;
      totalTasks: number;
      completedTasks: number;
      totalHoursReported: number;
      averageCompletionPercentage: number;
    };
    comparison: {
      prioritiesChange: number;
      completionRateChange: number;
      tasksChange: number;
      hoursChange: number;
      delayedChange: number;
    };
    topPriorities: Array<{
      title: string;
      status: string;
      completionPercentage: number;
      tasksCompleted: number;
      totalTasks: number;
    }>;
    dashboardUrl: string;
    aiAnalysis?: string;
  }) => {
    const formatChange = (value: number): string => {
      if (value > 0) return `<span style="color: #10b981;">▲ ${value.toFixed(1)}%</span>`;
      if (value < 0) return `<span style="color: #ef4444;">▼ ${Math.abs(value).toFixed(1)}%</span>`;
      return '<span style="color: #6b7280;">= 0%</span>';
    };

    const formatChangeInverse = (value: number): string => {
      // Para métricas negativas (menos retrasadas es mejor)
      if (value < 0) return `<span style="color: #10b981;">▼ ${Math.abs(value).toFixed(1)}%</span>`;
      if (value > 0) return `<span style="color: #ef4444;">▲ ${value.toFixed(1)}%</span>`;
      return '<span style="color: #6b7280;">= 0%</span>';
    };

    const formatPercentChange = (value: number): string => {
      if (value > 0) return `<span style="color: #10b981;">▲ ${value.toFixed(1)} puntos</span>`;
      if (value < 0) return `<span style="color: #ef4444;">▼ ${Math.abs(value).toFixed(1)} puntos</span>`;
      return '<span style="color: #6b7280;">= Sin cambio</span>';
    };

    const completionRate = params.currentStats.totalPriorities > 0
      ? (params.currentStats.completedPriorities / params.currentStats.totalPriorities * 100).toFixed(1)
      : '0';

    const taskCompletionRate = params.currentStats.totalTasks > 0
      ? (params.currentStats.completedTasks / params.currentStats.totalTasks * 100).toFixed(1)
      : '0';

    const statusEmoji: Record<string, string> = {
      'EN_TIEMPO': '🟢',
      'EN_RIESGO': '🟡',
      'BLOQUEADO': '🔴',
      'COMPLETADO': '✅',
      'REPROGRAMADO': '🔄',
    };

    const topPrioritiesHTML = params.topPriorities.length > 0
      ? params.topPriorities.map(p => `
          <div style="background: #f9fafb; padding: 12px; margin: 8px 0; border-radius: 6px; border-left: 3px solid #3b82f6;">
            <div style="display: flex; justify-content: space-between; align-items: center;">
              <div style="flex: 1;">
                <div style="font-weight: 600; color: #1f2937; margin-bottom: 4px;">
                  ${statusEmoji[p.status] || '⚪'} ${p.title}
                </div>
                <div style="font-size: 12px; color: #6b7280;">
                  ${p.tasksCompleted}/${p.totalTasks} tareas completadas
                </div>
              </div>
              <div style="text-align: right; margin-left: 10px;">
                <div style="font-size: 20px; font-weight: 700; color: #3b82f6;">
                  ${p.completionPercentage}%
                </div>
              </div>
            </div>
          </div>
        `).join('')
      : '<p style="color: #6b7280; text-align: center;">No hay prioridades en este período</p>';

    return {
      subject: `📊 Reporte de Rendimiento ${params.reportType === 'SEMANAL' ? 'Semanal' : 'Mensual'} - ${params.periodLabel}`,
      html: generateEmailHTML({
        headerGradient: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)',
        headerTitle: `📊 Reporte de Rendimiento ${params.reportType === 'SEMANAL' ? 'Semanal' : 'Mensual'}`,
        content: `
          <p style="font-size: 16px; color: #1f2937;">Hola <strong>${params.userName}</strong>,</p>
          <p style="color: #6b7280;">Aquí está tu reporte de rendimiento para: <strong>${params.periodLabel}</strong></p>

          <!-- Resumen General -->
          <div class="info-box" style="border-color: #6366f1; margin-top: 25px;">
            <h3 style="color: #6366f1; margin-top: 0; margin-bottom: 15px;">📈 Resumen General</h3>
            <table style="width: 100%; border-collapse: collapse;">
              <tr>
                <td style="padding: 10px 0; border-bottom: 1px solid #e5e7eb;">
                  <span style="color: #6b7280;">Prioridades Atendidas</span>
                </td>
                <td style="padding: 10px 0; border-bottom: 1px solid #e5e7eb; text-align: right;">
                  <strong style="color: #1f2937; font-size: 18px;">${params.currentStats.totalPriorities}</strong>
                  <div style="font-size: 12px; margin-top: 2px;">${formatChange(params.comparison.prioritiesChange)}</div>
                </td>
              </tr>
              <tr>
                <td style="padding: 10px 0; border-bottom: 1px solid #e5e7eb;">
                  <span style="color: #6b7280;">Tasa de Completitud</span>
                </td>
                <td style="padding: 10px 0; border-bottom: 1px solid #e5e7eb; text-align: right;">
                  <strong style="color: #1f2937; font-size: 18px;">${completionRate}%</strong>
                  <div style="font-size: 12px; margin-top: 2px;">${formatPercentChange(params.comparison.completionRateChange)}</div>
                </td>
              </tr>
              <tr>
                <td style="padding: 10px 0; border-bottom: 1px solid #e5e7eb;">
                  <span style="color: #6b7280;">Prioridades Retrasadas</span>
                </td>
                <td style="padding: 10px 0; border-bottom: 1px solid #e5e7eb; text-align: right;">
                  <strong style="color: #1f2937; font-size: 18px;">${params.currentStats.delayedPriorities}</strong>
                  <div style="font-size: 12px; margin-top: 2px;">${formatChangeInverse(params.comparison.delayedChange)}</div>
                </td>
              </tr>
              <tr>
                <td style="padding: 10px 0; border-bottom: 1px solid #e5e7eb;">
                  <span style="color: #6b7280;">Tareas Ejecutadas</span>
                </td>
                <td style="padding: 10px 0; border-bottom: 1px solid #e5e7eb; text-align: right;">
                  <strong style="color: #1f2937; font-size: 18px;">${params.currentStats.completedTasks} / ${params.currentStats.totalTasks}</strong>
                  <div style="font-size: 12px; margin-top: 2px;">${formatChange(params.comparison.tasksChange)}</div>
                </td>
              </tr>
              <tr>
                <td style="padding: 10px 0;">
                  <span style="color: #6b7280;">Horas Reportadas</span>
                </td>
                <td style="padding: 10px 0; text-align: right;">
                  <strong style="color: #1f2937; font-size: 18px;">${params.currentStats.totalHoursReported.toFixed(1)}h</strong>
                  <div style="font-size: 12px; margin-top: 2px;">${formatChange(params.comparison.hoursChange)}</div>
                </td>
              </tr>
            </table>
          </div>

          <!-- Indicadores Clave -->
          <div style="margin: 25px 0;">
            <h3 style="color: #1f2937; margin-bottom: 15px;">🎯 Indicadores Clave</h3>
            <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px;">
              <div style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); padding: 15px; border-radius: 8px; color: white;">
                <div style="font-size: 12px; opacity: 0.9;">Completadas</div>
                <div style="font-size: 28px; font-weight: 700; margin: 5px 0;">${params.currentStats.completedPriorities}</div>
              </div>
              <div style="background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%); padding: 15px; border-radius: 8px; color: white;">
                <div style="font-size: 12px; opacity: 0.9;">Retrasadas</div>
                <div style="font-size: 28px; font-weight: 700; margin: 5px 0;">${params.currentStats.delayedPriorities}</div>
              </div>
            </div>
          </div>

          <!-- Top Prioridades -->
          <div style="margin: 25px 0;">
            <h3 style="color: #1f2937; margin-bottom: 15px;">⭐ Top Prioridades del Período</h3>
            ${topPrioritiesHTML}
          </div>

          <!-- Análisis Profesional con IA -->
          ${params.aiAnalysis ? `
            <div class="info-box" style="border-color: #8b5cf6; background: linear-gradient(135deg, #f5f3ff 0%, #ede9fe 100%); margin: 25px 0; box-shadow: 0 4px 6px rgba(139, 92, 246, 0.1);">
              <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 12px;">
                <div style="background: #8b5cf6; width: 40px; height: 40px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 20px;">
                  🤖
                </div>
                <h3 style="color: #6d28d9; margin: 0; font-size: 16px;">Análisis Profesional con IA</h3>
              </div>
              <p style="color: #5b21b6; margin: 0; font-size: 14px; line-height: 1.6;">
                ${params.aiAnalysis}
              </p>
            </div>
          ` : ''}

          <!-- Insight de Rendimiento (Fallback si no hay IA) -->
          ${!params.aiAnalysis ? (params.comparison.completionRateChange > 0 ? `
            <div class="info-box" style="border-color: #10b981; background: #f0fdf4; margin: 25px 0;">
              <p style="color: #047857; font-weight: 600; margin: 0;">🎉 ¡Excelente trabajo!</p>
              <p style="color: #065f46; margin: 10px 0 0 0; font-size: 14px;">
                Tu tasa de completitud aumentó ${params.comparison.completionRateChange.toFixed(1)} puntos en comparación con el período anterior. ¡Sigue así!
              </p>
            </div>
          ` : params.comparison.completionRateChange < -5 ? `
            <div class="info-box" style="border-color: #f59e0b; background: #fffbeb; margin: 25px 0;">
              <p style="color: #d97706; font-weight: 600; margin: 0;">💪 Oportunidad de Mejora</p>
              <p style="color: #92400e; margin: 10px 0 0 0; font-size: 14px;">
                Tu tasa de completitud disminuyó ${Math.abs(params.comparison.completionRateChange).toFixed(1)} puntos. Considera revisar tus prioridades y eliminar bloqueos.
              </p>
            </div>
          ` : `
            <div class="info-box" style="border-color: #3b82f6; background: #eff6ff; margin: 25px 0;">
              <p style="color: #2563eb; font-weight: 600; margin: 0;">📊 Rendimiento Estable</p>
              <p style="color: #1e40af; margin: 10px 0 0 0; font-size: 14px;">
                Tu rendimiento se mantiene consistente. Continúa con tu ritmo de trabajo.
              </p>
            </div>
          `) : ''}

          <div style="text-align: center; margin-top: 30px;">
            <a href="${params.dashboardUrl}" class="button" style="background: #6366f1;">Ver Dashboard Completo</a>
          </div>

          <p style="color: #9ca3af; font-size: 13px; margin-top: 30px; text-align: center;">
            Este reporte compara tu rendimiento con el período anterior para ayudarte a identificar tendencias y áreas de mejora.
          </p>
        `
      }),
    };
  },
};
