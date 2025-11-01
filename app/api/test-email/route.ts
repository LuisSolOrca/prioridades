import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { sendEmail, emailTemplates } from '@/lib/email';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    // Solo admins pueden enviar emails de prueba
    if ((session.user as any).role !== 'ADMIN') {
      return NextResponse.json({ error: 'Solo administradores pueden enviar emails de prueba' }, { status: 403 });
    }

    const body = await request.json();
    const { toEmail } = body;

    if (!toEmail) {
      return NextResponse.json({ error: 'toEmail es requerido' }, { status: 400 });
    }

    // Enviar email de prueba usando el template de nuevo comentario
    const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000';
    const emailContent = emailTemplates.newComment({
      priorityTitle: 'Implementar sistema de notificaciones por email',
      commentAuthor: 'Claude (Sistema de Prueba)',
      commentText: '¡Hola! Este es un correo de prueba del sistema de notificaciones. Si estás leyendo esto, significa que la configuración de email está funcionando correctamente. 🎉\n\nEl sistema está listo para enviar notificaciones cuando:\n• Alguien comente en tus prioridades\n• Se te asigne una nueva prioridad\n• Cambie el estado de tus prioridades',
      priorityUrl: `${baseUrl}/priorities`,
    });

    const result = await sendEmail({
      to: toEmail,
      subject: '🧪 ' + emailContent.subject + ' (Prueba)',
      html: emailContent.html,
    });

    if (result.success) {
      return NextResponse.json({
        success: true,
        message: 'Email de prueba enviado exitosamente',
        messageId: result.messageId,
      });
    } else {
      return NextResponse.json({
        success: false,
        error: 'Error al enviar el email',
        details: result.error,
      }, { status: 500 });
    }
  } catch (error: any) {
    console.error('Error sending test email:', error);
    return NextResponse.json({
      success: false,
      error: error.message,
    }, { status: 500 });
  }
}
