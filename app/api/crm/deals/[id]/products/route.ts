import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import connectDB from '@/lib/mongodb';
import Deal from '@/models/Deal';
import DealProduct from '@/models/DealProduct';
import Product from '@/models/Product';
import { hasPermission } from '@/lib/permissions';

export const dynamic = 'force-dynamic';

// GET - Obtener productos de un deal
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
    const { id: dealId } = await params;

    // Verificar que el deal existe
    const deal = await Deal.findById(dealId);
    if (!deal) {
      return NextResponse.json({ error: 'Deal no encontrado' }, { status: 404 });
    }

    const products = await DealProduct.find({ dealId })
      .populate('productId', 'name sku price currency category')
      .sort({ order: 1 })
      .lean();

    // Calcular totales
    const totals = {
      subtotal: products.reduce((sum, p) => sum + p.subtotal, 0),
      discountAmount: products.reduce((sum, p) => sum + p.discountAmount, 0),
      taxAmount: products.reduce((sum, p) => sum + p.taxAmount, 0),
      total: products.reduce((sum, p) => sum + p.total, 0),
      itemCount: products.length,
    };

    return NextResponse.json({ products, totals });
  } catch (error: any) {
    console.error('Error fetching deal products:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST - Agregar producto al deal
export async function POST(
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
    const { id: dealId } = await params;
    const body = await request.json();

    // Verificar que el deal existe
    const deal = await Deal.findById(dealId);
    if (!deal) {
      return NextResponse.json({ error: 'Deal no encontrado' }, { status: 404 });
    }

    // Verificar que el producto existe
    const product = await Product.findById(body.productId);
    if (!product) {
      return NextResponse.json({ error: 'Producto no encontrado' }, { status: 404 });
    }

    // Obtener el último orden
    const lastProduct = await DealProduct.findOne({ dealId }).sort({ order: -1 });
    const order = lastProduct ? lastProduct.order + 1 : 0;

    // Calcular precio según cantidad (pricing tiers)
    let unitPrice = body.unitPrice ?? product.price;
    if (!body.unitPrice && product.pricingTiers && product.pricingTiers.length > 0) {
      const quantity = body.quantity || 1;
      const sortedTiers = [...product.pricingTiers].sort((a, b) => b.minQuantity - a.minQuantity);
      for (const tier of sortedTiers) {
        if (quantity >= tier.minQuantity) {
          unitPrice = tier.price;
          break;
        }
      }
    }

    const quantity = body.quantity || 1;
    const discount = body.discount || 0;
    const taxRate = body.taxRate ?? product.taxRate ?? 16;

    // Calcular totales
    const subtotal = quantity * unitPrice;
    const discountAmount = subtotal * (discount / 100);
    const afterDiscount = subtotal - discountAmount;
    const taxAmount = afterDiscount * (taxRate / 100);
    const total = afterDiscount + taxAmount;

    const dealProduct = await DealProduct.create({
      dealId,
      productId: product._id,
      productName: product.name,
      productSku: product.sku,
      quantity,
      unitPrice,
      discount,
      taxRate,
      subtotal,
      discountAmount,
      taxAmount,
      total,
      notes: body.notes,
      order,
    });

    // Actualizar valor del deal
    await updateDealValue(dealId);

    const populatedProduct = await DealProduct.findById(dealProduct._id)
      .populate('productId', 'name sku price currency category')
      .lean();

    return NextResponse.json(populatedProduct, { status: 201 });
  } catch (error: any) {
    console.error('Error adding product to deal:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// PUT - Actualizar productos del deal (reordenar o actualizar múltiples)
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
    const { id: dealId } = await params;
    const body = await request.json();

    // Si viene un array de productos, es reordenamiento
    if (Array.isArray(body.products)) {
      const updates = body.products.map((item: { _id: string; order: number }) =>
        DealProduct.findByIdAndUpdate(item._id, { order: item.order })
      );
      await Promise.all(updates);

      return NextResponse.json({ success: true });
    }

    // Si viene un producto individual, actualizar
    if (body._id) {
      const { _id, ...updateData } = body;

      // Recalcular totales
      if (updateData.quantity !== undefined || updateData.unitPrice !== undefined || updateData.discount !== undefined) {
        const existing = await DealProduct.findById(_id);
        if (!existing) {
          return NextResponse.json({ error: 'Línea no encontrada' }, { status: 404 });
        }

        const quantity = updateData.quantity ?? existing.quantity;
        const unitPrice = updateData.unitPrice ?? existing.unitPrice;
        const discount = updateData.discount ?? existing.discount;
        const taxRate = updateData.taxRate ?? existing.taxRate;

        updateData.subtotal = quantity * unitPrice;
        updateData.discountAmount = updateData.subtotal * (discount / 100);
        const afterDiscount = updateData.subtotal - updateData.discountAmount;
        updateData.taxAmount = afterDiscount * (taxRate / 100);
        updateData.total = afterDiscount + updateData.taxAmount;
      }

      const updated = await DealProduct.findByIdAndUpdate(
        _id,
        { $set: updateData },
        { new: true, runValidators: true }
      )
        .populate('productId', 'name sku price currency category')
        .lean();

      // Actualizar valor del deal
      await updateDealValue(dealId);

      return NextResponse.json(updated);
    }

    return NextResponse.json({ error: 'Datos inválidos' }, { status: 400 });
  } catch (error: any) {
    console.error('Error updating deal products:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// DELETE - Eliminar producto del deal
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
    const { id: dealId } = await params;
    const { searchParams } = new URL(request.url);
    const productLineId = searchParams.get('lineId');

    if (!productLineId) {
      return NextResponse.json({ error: 'ID de línea requerido' }, { status: 400 });
    }

    const deleted = await DealProduct.findOneAndDelete({
      _id: productLineId,
      dealId,
    });

    if (!deleted) {
      return NextResponse.json({ error: 'Línea no encontrada' }, { status: 404 });
    }

    // Actualizar valor del deal
    await updateDealValue(dealId);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error deleting deal product:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// Helper para actualizar el valor del deal basado en los productos
async function updateDealValue(dealId: string) {
  const totals = await DealProduct.aggregate([
    { $match: { dealId: dealId } },
    {
      $group: {
        _id: null,
        total: { $sum: '$total' },
      },
    },
  ]);

  const newValue = totals[0]?.total || 0;

  // Solo actualizar si hay productos, de lo contrario mantener el valor manual
  if (totals.length > 0) {
    await Deal.findByIdAndUpdate(dealId, { value: newValue });
  }
}
