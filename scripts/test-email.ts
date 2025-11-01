import nodemailer from 'nodemailer';

const EMAIL_USERNAME = 'orcaevolution@orcagrc.com';
const EMAIL_PASSWORD = 'rhllyxnkfgnrpshj';

// Configuración del transporter
const transporter = nodemailer.createTransport({
  host: 'smtp-mail.outlook.com',
  port: 587,
  secure: false,
  auth: {
    user: EMAIL_USERNAME,
    pass: EMAIL_PASSWORD,
  },
  tls: {
    ciphers: 'SSLv3',
    rejectUnauthorized: false,
  },
  connectionTimeout: 20000,
  greetingTimeout: 20000,
  socketTimeout: 20000,
});

async function sendTestEmail() {
  try {
    console.log('Verificando conexión con el servidor de email...');
    await transporter.verify();
    console.log('✓ Conexión exitosa con el servidor de email');

    console.log('\nEnviando email de prueba...');
    const info = await transporter.sendMail({
      from: `"Prioridades App - Prueba" <${EMAIL_USERNAME}>`,
      to: 'lgarcia@orcagrc.com',
      subject: '🧪 Prueba de Sistema de Notificaciones - Prioridades App',
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
              .test-box {
                background: white;
                padding: 20px;
                border-left: 4px solid #10b981;
                border-radius: 5px;
                margin: 20px 0;
              }
              .success-badge {
                display: inline-block;
                background: #10b981;
                color: white;
                padding: 8px 16px;
                border-radius: 20px;
                font-weight: 600;
                margin: 10px 0;
              }
              .footer {
                text-align: center;
                padding: 20px;
                color: #6b7280;
                font-size: 12px;
              }
              ul {
                list-style: none;
                padding: 0;
              }
              li {
                padding: 8px 0;
                border-bottom: 1px solid #e5e7eb;
              }
              li:last-child {
                border-bottom: none;
              }
            </style>
          </head>
          <body>
            <div class="header">
              <h1 style="margin: 0;">🧪 Email de Prueba</h1>
              <p style="margin: 10px 0 0 0; opacity: 0.9;">Sistema de Notificaciones</p>
            </div>
            <div class="content">
              <div class="test-box">
                <div class="success-badge">✓ Sistema Funcionando Correctamente</div>
                <h3 style="color: #1f2937; margin-top: 20px;">¡Hola Luis!</h3>
                <p>Este es un correo de prueba del sistema de notificaciones por email de la aplicación de Prioridades.</p>

                <p><strong>Configuración validada:</strong></p>
                <ul>
                  <li>✅ Servidor SMTP: smtp-mail.outlook.com</li>
                  <li>✅ Puerto: 587 (STARTTLS)</li>
                  <li>✅ Cuenta: ${EMAIL_USERNAME}</li>
                  <li>✅ Autenticación: Exitosa</li>
                  <li>✅ Templates HTML: Funcionando</li>
                </ul>

                <p style="margin-top: 20px;"><strong>El sistema está listo para enviar notificaciones cuando:</strong></p>
                <ul>
                  <li>💬 Alguien comente en tus prioridades</li>
                  <li>📋 Se te asigne una nueva prioridad</li>
                  <li>🔔 Cambie el estado de tus prioridades</li>
                </ul>

                <p style="margin-top: 20px; padding: 15px; background: #eff6ff; border-left: 3px solid #3b82f6; border-radius: 3px;">
                  <strong>💡 Nota:</strong> Los usuarios pueden configurar sus preferencias de notificación desde su perfil en la aplicación.
                </p>
              </div>

              <p style="text-align: center; color: #6b7280; font-size: 14px; margin-top: 20px;">
                <em>Si recibiste este email, el sistema de notificaciones está funcionando perfectamente.</em>
              </p>
            </div>
            <div class="footer">
              <p>Este es un correo de prueba del Sistema de Prioridades.</p>
              <p>Generado automáticamente por Claude Code</p>
            </div>
          </body>
        </html>
      `,
      text: `
        Email de Prueba - Sistema de Notificaciones

        ¡Hola Luis!

        Este es un correo de prueba del sistema de notificaciones por email.

        Configuración validada:
        - Servidor SMTP: smtp-mail.outlook.com
        - Puerto: 587 (STARTTLS)
        - Cuenta: ${EMAIL_USERNAME}
        - Autenticación: Exitosa

        El sistema está listo para enviar notificaciones cuando:
        - Alguien comente en tus prioridades
        - Se te asigne una nueva prioridad
        - Cambie el estado de tus prioridades

        Si recibiste este email, el sistema está funcionando correctamente.
      `
    });

    console.log('\n✓ Email enviado exitosamente!');
    console.log('Message ID:', info.messageId);
    console.log('Destinatario: lgarcia@orcagrc.com');
    console.log('\nRevisa tu bandeja de entrada (y spam por si acaso)');
  } catch (error) {
    console.error('\n✗ Error al enviar email:', error);
    throw error;
  }
}

sendTestEmail()
  .then(() => {
    console.log('\n✓ Proceso completado exitosamente');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n✗ Error en el proceso:', error);
    process.exit(1);
  });
