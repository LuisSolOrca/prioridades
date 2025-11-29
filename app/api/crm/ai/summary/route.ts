import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import connectDB from '@/lib/mongodb';
import Deal from '@/models/Deal';
import Contact from '@/models/Contact';
import Client from '@/models/Client';
import Activity from '@/models/Activity';
import Product from '@/models/Product';
import Pipeline from '@/models/Pipeline';
import PipelineStage from '@/models/PipelineStage';
import { generateSummary } from '@/lib/crm/aiService';

// Ensure models are registered for populate
void Pipeline;
void PipelineStage;

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    await connectDB();

    const body = await request.json();
    const { entityType, entityId } = body;

    if (!entityType || !entityId) {
      return NextResponse.json(
        { error: 'entityType y entityId son requeridos' },
        { status: 400 }
      );
    }

    let entityData: any = {};
    let activities: any[] = [];
    let notes: string[] = [];
    let products: any[] = [];
    let customFields: Record<string, any> = {};

    if (entityType === 'deal') {
      const deal = await Deal.findById(entityId)
        .populate('clientId', 'name industry size')
        .populate('contactId', 'firstName lastName email')
        .populate('stageId', 'name')
        .populate('pipelineId', 'name')
        .lean() as any;

      if (!deal) {
        return NextResponse.json({ error: 'Deal no encontrado' }, { status: 404 });
      }

      entityData = {
        title: deal.title,
        value: deal.value,
        stage: deal.stageId?.name,
        probability: deal.probability,
        createdAt: deal.createdAt,
        expectedCloseDate: deal.expectedCloseDate,
        source: deal.source,
      };

      if (deal.clientId) {
        entityData.industry = deal.clientId.industry;
        entityData.size = deal.clientId.size;
      }

      // Get activities
      const dealActivities = await Activity.find({ dealId: entityId })
        .sort({ createdAt: -1 })
        .limit(20)
        .lean() as any[];

      activities = dealActivities.map((a: any) => ({
        type: a.type,
        title: a.title,
        date: new Date(a.createdAt).toLocaleDateString('es-MX'),
        outcome: a.outcome,
      }));

      // Extract notes from activities
      notes = dealActivities
        .filter((a: any) => a.type === 'note' && a.description)
        .map((a: any) => a.description)
        .slice(0, 5);

      // Get products if any
      if (deal.products && deal.products.length > 0) {
        const productIds = deal.products.map((p: any) => p.productId);
        const productDocs = await Product.find({ _id: { $in: productIds } }).lean();
        const productMap = new Map(productDocs.map((p: any) => [p._id.toString(), p]));

        products = deal.products.map((p: any) => {
          const prod = productMap.get(p.productId?.toString());
          return {
            name: prod?.name || 'Producto',
            quantity: p.quantity || 1,
            price: p.price || prod?.price || 0,
          };
        });
      }

      // Custom fields
      if (deal.customFields) {
        customFields = deal.customFields;
      }

    } else if (entityType === 'client') {
      const client = await Client.findById(entityId).lean() as any;

      if (!client) {
        return NextResponse.json({ error: 'Cliente no encontrado' }, { status: 404 });
      }

      entityData = {
        name: client.name,
        industry: client.industry,
        size: client.size,
        source: client.source,
        createdAt: client.createdAt,
      };

      // Get client activities
      const clientActivities = await Activity.find({ clientId: entityId })
        .sort({ createdAt: -1 })
        .limit(20)
        .lean() as any[];

      activities = clientActivities.map((a: any) => ({
        type: a.type,
        title: a.title,
        date: new Date(a.createdAt).toLocaleDateString('es-MX'),
        outcome: a.outcome,
      }));

      // Get client deals for context
      const clientDeals = await Deal.find({ clientId: entityId })
        .populate('stageId', 'name')
        .lean() as any[];

      const wonDeals = clientDeals.filter((d: any) => d.status === 'won').length;
      const totalValue = clientDeals.reduce((sum: number, d: any) => sum + (d.value || 0), 0);

      customFields = {
        'Total de deals': clientDeals.length,
        'Deals ganados': wonDeals,
        'Valor total': `$${totalValue.toLocaleString()}`,
      };

      if (client.customFields) {
        customFields = { ...customFields, ...client.customFields };
      }

    } else if (entityType === 'contact') {
      const contact = await Contact.findById(entityId)
        .populate('clientId', 'name industry')
        .lean() as any;

      if (!contact) {
        return NextResponse.json({ error: 'Contacto no encontrado' }, { status: 404 });
      }

      entityData = {
        name: `${contact.firstName} ${contact.lastName}`,
        createdAt: contact.createdAt,
        source: contact.source,
      };

      if (contact.clientId) {
        entityData.industry = contact.clientId.industry;
        customFields['Empresa'] = contact.clientId.name;
      }

      if (contact.position) customFields['Cargo'] = contact.position;
      if (contact.department) customFields['Departamento'] = contact.department;

      // Get contact activities
      const contactActivities = await Activity.find({ contactId: entityId })
        .sort({ createdAt: -1 })
        .limit(20)
        .lean() as any[];

      activities = contactActivities.map((a: any) => ({
        type: a.type,
        title: a.title,
        date: new Date(a.createdAt).toLocaleDateString('es-MX'),
        outcome: a.outcome,
      }));

      // Get contact deals
      const contactDeals = await Deal.find({ contactId: entityId }).lean() as any[];
      if (contactDeals.length > 0) {
        const totalValue = contactDeals.reduce((sum: number, d: any) => sum + (d.value || 0), 0);
        customFields['Deals asociados'] = contactDeals.length;
        customFields['Valor potencial'] = `$${totalValue.toLocaleString()}`;
      }

      if (contact.customFields) {
        customFields = { ...customFields, ...contact.customFields };
      }
    } else {
      return NextResponse.json(
        { error: 'entityType debe ser deal, client o contact' },
        { status: 400 }
      );
    }

    // Generate summary using AI
    const summary = await generateSummary({
      entityType,
      entityData,
      activities,
      notes,
      products,
      customFields,
    });

    return NextResponse.json({
      success: true,
      summary,
      entityType,
      entityId,
    });
  } catch (error: any) {
    console.error('Error generating summary:', error);
    return NextResponse.json(
      { error: error.message || 'Error al generar resumen' },
      { status: 500 }
    );
  }
}
