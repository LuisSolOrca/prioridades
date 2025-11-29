import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import connectDB from '@/lib/mongodb';
import { sendTestWebhook } from '@/lib/crm/webhookEngine';

// POST - Enviar webhook de prueba
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession();
    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const user = session.user as any;
    if (user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Solo administradores' }, { status: 403 });
    }

    const { id } = await params;
    await connectDB();

    const result = await sendTestWebhook(id);

    if (!result.success) {
      return NextResponse.json(
        {
          success: false,
          error: result.error,
          log: result.log,
        },
        { status: result.error === 'Webhook no encontrado' ? 404 : 400 }
      );
    }

    return NextResponse.json({
      success: true,
      log: result.log,
    });
  } catch (error: any) {
    console.error('Error sending test webhook:', error);
    return NextResponse.json(
      { error: 'Error al enviar webhook de prueba' },
      { status: 500 }
    );
  }
}
