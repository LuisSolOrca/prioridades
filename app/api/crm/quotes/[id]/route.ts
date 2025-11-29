import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import connectDB from '@/lib/mongodb';
import Quote from '@/models/Quote';
import { hasPermission } from '@/lib/permissions';
import { triggerWorkflowsAsync } from '@/lib/crmWorkflowEngine';
import { triggerWebhooksAsync } from '@/lib/crm/webhookEngine';

export const dynamic = 'force-dynamic';

// GET - Obtener cotización
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

    const quote = await Quote.findById(id)
      .populate('dealId', 'title stage value clientId')
      .populate('createdBy', 'name email')
      .lean();

    if (!quote) {
      return NextResponse.json({ error: 'Cotización no encontrada' }, { status: 404 });
    }

    return NextResponse.json(quote);
  } catch (error: any) {
    console.error('Error fetching quote:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// PUT - Actualizar cotización
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    if (!hasPermission(session, 'canManageDeals')) {
      return NextResponse.json({ error: 'Sin permiso para gestionar deals' }, { status: 403 });
    }

    await connectDB();
    const { id } = await params;
    const body = await request.json();

    const existingQuote = await Quote.findById(id);
    if (!existingQuote) {
      return NextResponse.json({ error: 'Cotización no encontrada' }, { status: 404 });
    }

    // No permitir editar cotizaciones aceptadas o rechazadas
    if (['accepted', 'rejected'].includes(existingQuote.status)) {
      return NextResponse.json(
        { error: 'No se puede editar una cotización aceptada o rechazada' },
        { status: 400 }
      );
    }

    // Si se actualizan items, recalcular totales
    if (body.items) {
      body.items = body.items.map((item: any) => {
        const subtotal = item.quantity * item.unitPrice;
        const discountAmount = subtotal * (item.discount / 100);
        const afterDiscount = subtotal - discountAmount;
        const taxAmount = afterDiscount * (item.taxRate / 100);
        const total = afterDiscount + taxAmount;
        return {
          ...item,
          subtotal,
          discountAmount,
          taxAmount,
          total,
        };
      });
    }

    // Actualizar estado de tracking si aplica
    if (body.status === 'sent' && existingQuote.status !== 'sent') {
      body.sentAt = new Date();
      body.sentTo = body.sentTo || existingQuote.clientEmail;
    } else if (body.status === 'accepted' && existingQuote.status !== 'accepted') {
      body.acceptedAt = new Date();
    } else if (body.status === 'rejected' && existingQuote.status !== 'rejected') {
      body.rejectedAt = new Date();
    }

    const quote = await Quote.findByIdAndUpdate(
      id,
      { $set: body },
      { new: true, runValidators: true }
    )
      .populate('dealId', 'title stage value')
      .populate('createdBy', 'name')
      .lean();

    const userId = (session.user as any).id;

    // Disparar workflows según cambio de estado
    const quoteData = (quote || {}) as Record<string, any>;
    if (body.status === 'accepted' && existingQuote.status !== 'accepted') {
      triggerWorkflowsAsync('quote_accepted', {
        entityType: 'quote',
        entityId: id,
        entityName: quote?.quoteNumber,
        previousData: existingQuote.toObject(),
        newData: quoteData,
        userId,
      });

      // Webhook quote.accepted
      triggerWebhooksAsync('quote.accepted', {
        entityType: 'quote',
        entityId: id,
        entityName: quote?.quoteNumber as string,
        current: quoteData,
        previous: existingQuote.toObject(),
        userId,
        source: 'web',
      });
    } else if (body.status === 'rejected' && existingQuote.status !== 'rejected') {
      triggerWorkflowsAsync('quote_rejected', {
        entityType: 'quote',
        entityId: id,
        entityName: quote?.quoteNumber,
        previousData: existingQuote.toObject(),
        newData: quoteData,
        userId,
      });

      // Webhook quote.rejected
      triggerWebhooksAsync('quote.rejected', {
        entityType: 'quote',
        entityId: id,
        entityName: quote?.quoteNumber as string,
        current: quoteData,
        previous: existingQuote.toObject(),
        userId,
        source: 'web',
      });
    }

    return NextResponse.json(quote);
  } catch (error: any) {
    console.error('Error updating quote:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// DELETE - Eliminar cotización
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    if (!hasPermission(session, 'canManageDeals')) {
      return NextResponse.json({ error: 'Sin permiso para gestionar deals' }, { status: 403 });
    }

    await connectDB();
    const { id } = await params;

    const quote = await Quote.findById(id);
    if (!quote) {
      return NextResponse.json({ error: 'Cotización no encontrada' }, { status: 404 });
    }

    // No permitir eliminar cotizaciones aceptadas
    if (quote.status === 'accepted') {
      return NextResponse.json(
        { error: 'No se puede eliminar una cotización aceptada' },
        { status: 400 }
      );
    }

    await Quote.findByIdAndDelete(id);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error deleting quote:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
