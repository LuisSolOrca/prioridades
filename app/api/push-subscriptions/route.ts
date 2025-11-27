import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import connectDB from '@/lib/mongodb';
import PushSubscription from '@/models/PushSubscription';

// GET - Obtener suscripciones del usuario actual
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    await connectDB();

    const subscriptions = await PushSubscription.find({
      userId: (session.user as any).id
    }).select('endpoint userAgent createdAt');

    return NextResponse.json({
      subscriptions,
      count: subscriptions.length
    });
  } catch (error) {
    console.error('Error fetching push subscriptions:', error);
    return NextResponse.json(
      { error: 'Error al obtener suscripciones' },
      { status: 500 }
    );
  }
}

// POST - Crear nueva suscripción push
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const body = await request.json();
    const { subscription, userAgent } = body;

    if (!subscription?.endpoint || !subscription?.keys?.p256dh || !subscription?.keys?.auth) {
      return NextResponse.json(
        { error: 'Suscripción inválida' },
        { status: 400 }
      );
    }

    await connectDB();

    // Verificar si ya existe esta suscripción
    const existing = await PushSubscription.findOne({
      endpoint: subscription.endpoint
    });

    if (existing) {
      // Actualizar si es del mismo usuario, o retornar error
      if (existing.userId.toString() === (session.user as any).id) {
        existing.keys = subscription.keys;
        existing.userAgent = userAgent;
        await existing.save();
        return NextResponse.json({
          message: 'Suscripción actualizada',
          subscription: existing
        });
      } else {
        // Endpoint registrado por otro usuario - actualizar owner
        existing.userId = (session.user as any).id;
        existing.keys = subscription.keys;
        existing.userAgent = userAgent;
        await existing.save();
        return NextResponse.json({
          message: 'Suscripción transferida',
          subscription: existing
        });
      }
    }

    // Crear nueva suscripción
    const newSubscription = await PushSubscription.create({
      userId: (session.user as any).id,
      endpoint: subscription.endpoint,
      keys: {
        p256dh: subscription.keys.p256dh,
        auth: subscription.keys.auth
      },
      userAgent
    });

    return NextResponse.json({
      message: 'Suscripción creada',
      subscription: newSubscription
    }, { status: 201 });
  } catch (error) {
    console.error('Error creating push subscription:', error);
    return NextResponse.json(
      { error: 'Error al crear suscripción' },
      { status: 500 }
    );
  }
}

// DELETE - Eliminar suscripción push
export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const endpoint = searchParams.get('endpoint');

    if (!endpoint) {
      return NextResponse.json(
        { error: 'Endpoint requerido' },
        { status: 400 }
      );
    }

    await connectDB();

    const result = await PushSubscription.deleteOne({
      userId: (session.user as any).id,
      endpoint: decodeURIComponent(endpoint)
    });

    if (result.deletedCount === 0) {
      return NextResponse.json(
        { error: 'Suscripción no encontrada' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      message: 'Suscripción eliminada'
    });
  } catch (error) {
    console.error('Error deleting push subscription:', error);
    return NextResponse.json(
      { error: 'Error al eliminar suscripción' },
      { status: 500 }
    );
  }
}
