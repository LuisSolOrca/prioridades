import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import EmailTracking from '@/models/EmailTracking';
import SequenceEnrollment from '@/models/SequenceEnrollment';

// GIF transparente 1x1 pixel (43 bytes)
const TRANSPARENT_GIF = Buffer.from(
  'R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7',
  'base64'
);

export const dynamic = 'force-dynamic';

// GET /api/track/open/[trackingId] - Registrar apertura de email
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ trackingId: string }> }
) {
  try {
    const { trackingId } = await params;

    // Obtener información del request
    const userAgent = request.headers.get('user-agent') || undefined;
    const forwardedFor = request.headers.get('x-forwarded-for');
    const ipAddress = forwardedFor?.split(',')[0].trim() ||
                      request.headers.get('x-real-ip') ||
                      undefined;

    // Conectar a DB y actualizar tracking
    await connectDB();

    const now = new Date();

    // Usar updateOne con upsert false para solo actualizar si existe
    const result = await EmailTracking.findOneAndUpdate(
      { trackingId },
      {
        $set: {
          lastOpenedAt: now,
          ...(userAgent && { userAgent }),
          ...(ipAddress && { ipAddress }),
        },
        $setOnInsert: {
          openedAt: now,
        },
        $inc: { openCount: 1 },
      },
      { new: true }
    );

    // Si encontramos el tracking, actualizar el estado
    if (result) {
      // Solo actualizar a 'opened' si no tiene un estado más avanzado
      if (result.status === 'sent' || result.status === 'delivered') {
        await EmailTracking.updateOne(
          { trackingId },
          { $set: { status: 'opened' } }
        );
      }

      // Si es la primera apertura, registrar la fecha
      if (!result.openedAt || result.openCount === 1) {
        await EmailTracking.updateOne(
          { trackingId, openedAt: { $exists: false } },
          { $set: { openedAt: now } }
        );
      }

      // Si el email pertenece a una secuencia, actualizar las stats del enrollment
      if (result.sequenceEnrollmentId) {
        await SequenceEnrollment.updateOne(
          { _id: result.sequenceEnrollmentId },
          { $inc: { emailsOpened: 1 } }
        );
      }
    }

    // Retornar GIF transparente con headers de no-cache
    return new NextResponse(TRANSPARENT_GIF, {
      status: 200,
      headers: {
        'Content-Type': 'image/gif',
        'Content-Length': TRANSPARENT_GIF.length.toString(),
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
      },
    });
  } catch (error) {
    console.error('Error tracking email open:', error);
    // Aún retornamos el GIF para no romper la visualización del email
    return new NextResponse(TRANSPARENT_GIF, {
      status: 200,
      headers: {
        'Content-Type': 'image/gif',
        'Content-Length': TRANSPARENT_GIF.length.toString(),
      },
    });
  }
}
