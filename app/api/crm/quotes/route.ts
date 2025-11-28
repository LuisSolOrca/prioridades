import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import connectDB from '@/lib/mongodb';
import Quote from '@/models/Quote';
import Deal from '@/models/Deal';
import DealProduct from '@/models/DealProduct';
import Client from '@/models/Client';
import Contact from '@/models/Contact';
import { hasPermission } from '@/lib/permissions';

export const dynamic = 'force-dynamic';

// GET - Listar cotizaciones
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    if (!hasPermission(session, 'viewCRM')) {
      return NextResponse.json({ error: 'Sin permiso para ver CRM' }, { status: 403 });
    }

    await connectDB();

    const { searchParams } = new URL(request.url);
    const dealId = searchParams.get('dealId');
    const status = searchParams.get('status');
    const limit = parseInt(searchParams.get('limit') || '50');
    const page = parseInt(searchParams.get('page') || '1');

    const query: any = {};

    if (dealId) {
      query.dealId = dealId;
    }

    if (status) {
      query.status = status;
    }

    const skip = (page - 1) * limit;

    const [quotes, total] = await Promise.all([
      Quote.find(query)
        .populate('dealId', 'title stage value')
        .populate('createdBy', 'name')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Quote.countDocuments(query),
    ]);

    return NextResponse.json({
      quotes,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error: any) {
    console.error('Error fetching quotes:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST - Crear cotización desde un deal
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    if (!hasPermission(session, 'canManageDeals')) {
      return NextResponse.json({ error: 'Sin permiso para gestionar deals' }, { status: 403 });
    }

    await connectDB();
    const body = await request.json();

    // Verificar que el deal existe
    const deal = await Deal.findById(body.dealId)
      .populate('clientId')
      .populate('contactId');

    if (!deal) {
      return NextResponse.json({ error: 'Deal no encontrado' }, { status: 404 });
    }

    // Obtener productos del deal
    const dealProducts = await DealProduct.find({ dealId: body.dealId })
      .populate('productId')
      .sort({ order: 1 })
      .lean();

    if (dealProducts.length === 0) {
      return NextResponse.json(
        { error: 'El deal no tiene productos. Agrega productos antes de crear una cotización.' },
        { status: 400 }
      );
    }

    // Preparar items de la cotización
    const items = dealProducts.map((dp: any) => ({
      productId: dp.productId._id,
      productName: dp.productName,
      productSku: dp.productSku,
      description: dp.productId?.description || '',
      quantity: dp.quantity,
      unitPrice: dp.unitPrice,
      discount: dp.discount,
      taxRate: dp.taxRate,
      subtotal: dp.subtotal,
      discountAmount: dp.discountAmount,
      taxAmount: dp.taxAmount,
      total: dp.total,
    }));

    // Generar número de cotización
    const quoteNumber = await (Quote as any).generateQuoteNumber();

    // Obtener versión (si hay cotizaciones previas para este deal)
    const previousQuotes = await Quote.countDocuments({ dealId: body.dealId });
    const version = previousQuotes + 1;

    // Calcular fecha de validez (30 días por defecto)
    const validUntil = body.validUntil
      ? new Date(body.validUntil)
      : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

    // Obtener información del cliente
    const client = deal.clientId as any;
    const contact = deal.contactId as any;

    const quote = await Quote.create({
      dealId: body.dealId,
      quoteNumber,
      version,
      status: 'draft',
      validUntil,
      items,
      currency: body.currency || deal.currency || 'MXN',
      terms: body.terms,
      notes: body.notes,
      internalNotes: body.internalNotes,
      // Cliente info
      clientName: client?.name || 'Cliente no especificado',
      clientEmail: client?.email,
      clientPhone: client?.phone,
      clientAddress: client?.address,
      contactName: contact?.name,
      contactEmail: contact?.email,
      // Usuario
      createdBy: (session.user as any).id,
    });

    const populatedQuote = await Quote.findById(quote._id)
      .populate('dealId', 'title stage value')
      .populate('createdBy', 'name')
      .lean();

    return NextResponse.json(populatedQuote, { status: 201 });
  } catch (error: any) {
    console.error('Error creating quote:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
