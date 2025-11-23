import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { notifyQuestion } from '@/lib/notifications';

/**
 * POST /api/notifications/question
 * Crea notificación cuando alguien hace una pregunta
 */
export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const body = await request.json();
    const { userId, askerName, questionText, projectId, projectName, messageId } = body;

    if (!userId || !askerName || !questionText || !projectId || !projectName || !messageId) {
      return NextResponse.json(
        { error: 'Faltan parámetros requeridos' },
        { status: 400 }
      );
    }

    await notifyQuestion(
      userId,
      askerName,
      questionText,
      projectId,
      projectName,
      messageId
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error creating question notification:', error);
    return NextResponse.json(
      { error: 'Error creando notificación' },
      { status: 500 }
    );
  }
}
