import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import connectDB from '@/lib/mongodb';
import EmailTracking from '@/models/EmailTracking';
import { hasPermission } from '@/lib/permissions';

export const dynamic = 'force-dynamic';

// GET - Obtener detalles de tracking de un email
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    if (!hasPermission(session, 'viewCRM')) {
      return NextResponse.json({ error: 'Sin permiso para ver CRM' }, { status: 403 });
    }

    await connectDB();
    const { id } = await params;

    // Buscar por _id o por trackingId
    const tracking = await EmailTracking.findOne({
      $or: [
        { _id: id },
        { trackingId: id },
      ],
    })
      .populate('dealId', 'title value')
      .populate('contactId', 'firstName lastName email')
      .populate('clientId', 'name')
      .populate('userId', 'name email')
      .populate('activityId')
      .lean();

    if (!tracking) {
      return NextResponse.json({ error: 'Tracking no encontrado' }, { status: 404 });
    }

    // Calcular métricas adicionales
    const metrics = {
      isOpened: tracking.openCount > 0,
      isClicked: tracking.clickCount > 0,
      isReplied: !!tracking.repliedAt,
      isBounced: !!tracking.bouncedAt,
      timeToOpen: tracking.openedAt && tracking.sentAt
        ? Math.round((new Date(tracking.openedAt).getTime() - new Date(tracking.sentAt).getTime()) / 1000 / 60)
        : null,
      timeToClick: tracking.clickedAt && tracking.sentAt
        ? Math.round((new Date(tracking.clickedAt).getTime() - new Date(tracking.sentAt).getTime()) / 1000 / 60)
        : null,
      uniqueLinksClicked: new Set(tracking.clickedLinks?.map(l => l.url) || []).size,
    };

    return NextResponse.json({
      ...tracking,
      metrics,
    });
  } catch (error: any) {
    console.error('Error fetching email tracking:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// PUT - Actualizar tracking (marcar como respondido, rebotado, etc.)
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    if (!hasPermission(session, 'viewCRM')) {
      return NextResponse.json({ error: 'Sin permiso para usar CRM' }, { status: 403 });
    }

    await connectDB();
    const { id } = await params;
    const body = await request.json();

    const updateData: any = {};

    // Permitir marcar como respondido
    if (body.replied === true) {
      updateData.repliedAt = new Date();
      updateData.status = 'replied';
    }

    // Permitir marcar como rebotado
    if (body.bounced === true) {
      updateData.bouncedAt = new Date();
      updateData.bounceReason = body.bounceReason || undefined;
      updateData.status = 'bounced';
    }

    // Permitir marcar como entregado
    if (body.delivered === true) {
      updateData.deliveredAt = new Date();
      if (!body.replied && !body.bounced) {
        updateData.status = 'delivered';
      }
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ error: 'No hay cambios para aplicar' }, { status: 400 });
    }

    const tracking = await EmailTracking.findOneAndUpdate(
      { $or: [{ _id: id }, { trackingId: id }] },
      { $set: updateData },
      { new: true }
    )
      .populate('dealId', 'title')
      .populate('contactId', 'firstName lastName')
      .lean();

    if (!tracking) {
      return NextResponse.json({ error: 'Tracking no encontrado' }, { status: 404 });
    }

    return NextResponse.json(tracking);
  } catch (error: any) {
    console.error('Error updating email tracking:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
