import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import EmailTracking from '@/models/EmailTracking';
import SequenceEnrollment from '@/models/SequenceEnrollment';

export const dynamic = 'force-dynamic';

// GET /api/track/click/[trackingId]?url=... - Registrar clic en link
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ trackingId: string }> }
) {
  try {
    const { trackingId } = await params;
    const { searchParams } = new URL(request.url);
    const targetUrl = searchParams.get('url');

    // Validar URL
    if (!targetUrl) {
      return NextResponse.json(
        { error: 'URL no proporcionada' },
        { status: 400 }
      );
    }

    // Decodificar URL
    let decodedUrl: string;
    try {
      decodedUrl = decodeURIComponent(targetUrl);
    } catch {
      decodedUrl = targetUrl;
    }

    // Validar que sea una URL válida
    try {
      new URL(decodedUrl);
    } catch {
      // Si no es una URL válida, redirigir al home
      return NextResponse.redirect(new URL('/', request.url));
    }

    // Conectar a DB y actualizar tracking
    await connectDB();

    const now = new Date();

    // Actualizar tracking
    const result = await EmailTracking.findOneAndUpdate(
      { trackingId },
      {
        $set: { lastClickedAt: now },
        $setOnInsert: { clickedAt: now },
        $inc: { clickCount: 1 },
        $push: {
          clickedLinks: {
            url: decodedUrl,
            clickedAt: now,
          },
        },
      },
      { new: true }
    );

    // Si encontramos el tracking, actualizar el estado
    if (result) {
      // Solo actualizar a 'clicked' si no tiene un estado más avanzado (replied)
      if (['sent', 'delivered', 'opened'].includes(result.status)) {
        await EmailTracking.updateOne(
          { trackingId },
          { $set: { status: 'clicked' } }
        );
      }

      // Si es el primer clic, registrar la fecha
      if (!result.clickedAt || result.clickCount === 1) {
        await EmailTracking.updateOne(
          { trackingId, clickedAt: { $exists: false } },
          { $set: { clickedAt: now } }
        );
      }

      // También contar como apertura si no se había abierto antes
      if (!result.openedAt) {
        await EmailTracking.updateOne(
          { trackingId },
          {
            $set: { openedAt: now, lastOpenedAt: now },
            $inc: { openCount: 1 },
          }
        );
      }

      // Si el email pertenece a una secuencia y es el PRIMER click, actualizar las stats del enrollment
      if (result.sequenceEnrollmentId && result.clickCount === 1) {
        const updateData: any = { $inc: { emailsClicked: 1 } };
        // Si no se había abierto antes, también contar como apertura
        if (!result.openedAt) {
          updateData.$inc.emailsOpened = 1;
        }
        await SequenceEnrollment.updateOne(
          { _id: result.sequenceEnrollmentId },
          updateData
        );
      }
    }

    // Redirigir a la URL destino
    return NextResponse.redirect(decodedUrl);
  } catch (error) {
    console.error('Error tracking email click:', error);

    // En caso de error, intentar redirigir a la URL original
    const targetUrl = new URL(request.url).searchParams.get('url');
    if (targetUrl) {
      try {
        return NextResponse.redirect(decodeURIComponent(targetUrl));
      } catch {
        // Si falla el redirect, ir al home
      }
    }

    return NextResponse.redirect(new URL('/', request.url));
  }
}
