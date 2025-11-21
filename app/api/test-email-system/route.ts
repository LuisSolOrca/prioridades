import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { verifyEmailConnection, sendEmail } from '@/lib/email';

/**
 * GET /api/test-email-system
 * Diagnóstico del sistema de correo (Admin only)
 */
export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    }

    const diagnostics = {
      timestamp: new Date().toISOString(),
      emailConfig: {
        hasEmailUsername: !!process.env.EMAIL_USERNAME,
        hasEmailPassword: !!process.env.EMAIL_PASSWORD,
        emailUsername: process.env.EMAIL_USERNAME || 'orcaevolution@orcagrc.com',
        smtpHost: 'smtp-mail.outlook.com',
        smtpPort: 587,
      },
      connectionTest: {
        status: 'testing...',
        details: null as any,
      },
    };

    // Verificar conexión SMTP
    try {
      const connectionOk = await verifyEmailConnection();
      diagnostics.connectionTest.status = connectionOk ? 'success' : 'failed';
      diagnostics.connectionTest.details = connectionOk
        ? 'Conexión SMTP exitosa'
        : 'No se pudo conectar al servidor SMTP';
    } catch (error: any) {
      diagnostics.connectionTest.status = 'error';
      diagnostics.connectionTest.details = error.message;
    }

    return NextResponse.json(diagnostics);
  } catch (error: any) {
    console.error('Error en diagnóstico de email:', error);
    return NextResponse.json(
      { error: 'Error ejecutando diagnóstico', details: error.message },
      { status: 500 }
    );
  }
}

/**
 * POST /api/test-email-system
 * Envía un correo de prueba simple (Admin only)
 */
export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    }

    const { testEmail } = await request.json();

    if (!testEmail) {
      return NextResponse.json(
        { error: 'Se requiere testEmail' },
        { status: 400 }
      );
    }

    console.log(`📧 Intentando enviar correo de prueba a: ${testEmail}`);

    const result = await sendEmail({
      to: testEmail,
      subject: '🧪 Prueba de Sistema de Correo - Prioridades App',
      html: `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
          </head>
          <body style="font-family: Arial, sans-serif; padding: 20px; background: #f3f4f6;">
            <div style="max-width: 600px; margin: 0 auto; background: white; padding: 30px; border-radius: 8px;">
              <h1 style="color: #3b82f6; margin-top: 0;">✅ Sistema de Correo Funcionando</h1>
              <p style="color: #4b5563; line-height: 1.6;">
                Este es un correo de prueba del sistema de reportes automáticos.
              </p>
              <p style="color: #4b5563; line-height: 1.6;">
                Si estás viendo este mensaje, significa que:
              </p>
              <ul style="color: #4b5563; line-height: 1.6;">
                <li>La configuración SMTP está correcta</li>
                <li>Las credenciales de correo funcionan</li>
                <li>El servidor puede enviar correos exitosamente</li>
              </ul>
              <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 20px 0;">
              <p style="color: #9ca3af; font-size: 12px;">
                Enviado desde: ${process.env.EMAIL_USERNAME || 'orcaevolution@orcagrc.com'}<br>
                Fecha: ${new Date().toLocaleString('es-ES')}
              </p>
            </div>
          </body>
        </html>
      `,
    });

    if (result.success) {
      console.log(`✅ Correo de prueba enviado exitosamente a ${testEmail}`, result.messageId);
      return NextResponse.json({
        success: true,
        message: 'Correo de prueba enviado exitosamente',
        messageId: result.messageId,
        sentTo: testEmail,
      });
    } else {
      console.error(`❌ Error enviando correo de prueba a ${testEmail}:`, result.error);
      return NextResponse.json({
        success: false,
        error: 'Error al enviar correo',
        details: result.error,
        sentTo: testEmail,
      }, { status: 500 });
    }
  } catch (error: any) {
    console.error('Error en test de email:', error);
    return NextResponse.json(
      { error: 'Error ejecutando prueba', details: error.message },
      { status: 500 }
    );
  }
}
