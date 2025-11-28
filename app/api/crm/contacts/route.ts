import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import connectDB from '@/lib/mongodb';
import Contact from '@/models/Contact';
import Client from '@/models/Client';
import { hasPermission } from '@/lib/permissions';
import { triggerWorkflowsAsync } from '@/lib/crmWorkflowEngine';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    // Verificar permiso para ver CRM
    if (!hasPermission(session, 'viewCRM')) {
      return NextResponse.json({ error: 'Sin permiso para ver CRM' }, { status: 403 });
    }

    await connectDB();

    const { searchParams } = new URL(request.url);
    const clientId = searchParams.get('clientId');
    const search = searchParams.get('search');
    const activeOnly = searchParams.get('activeOnly') === 'true';

    const query: any = {};

    if (clientId) {
      query.clientId = clientId;
    }

    if (activeOnly) {
      query.isActive = true;
    }

    if (search) {
      query.$or = [
        { firstName: { $regex: search, $options: 'i' } },
        { lastName: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
      ];
    }

    const contacts = await Contact.find(query)
      .populate('clientId', 'name')
      .populate('createdBy', 'name')
      .sort({ lastName: 1, firstName: 1 })
      .lean();

    return NextResponse.json(contacts);
  } catch (error: any) {
    console.error('Error fetching contacts:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    // Verificar permiso para gestionar contactos
    if (!hasPermission(session, 'canManageContacts')) {
      return NextResponse.json({ error: 'Sin permiso para gestionar contactos' }, { status: 403 });
    }

    await connectDB();

    const body = await request.json();

    // Verificar que el cliente existe
    const client = await Client.findById(body.clientId);
    if (!client) {
      return NextResponse.json({ error: 'Cliente no encontrado' }, { status: 404 });
    }

    const contact = await Contact.create({
      ...body,
      createdBy: (session.user as any).id,
    });

    const populatedContact = await Contact.findById(contact._id)
      .populate('clientId', 'name')
      .populate('createdBy', 'name');

    // Disparar workflow de contact_created
    const contactData = populatedContact?.toJSON?.() || populatedContact || {};
    triggerWorkflowsAsync('contact_created', {
      entityType: 'contact',
      entityId: contact._id,
      entityName: `${contact.firstName} ${contact.lastName}`,
      newData: contactData as Record<string, any>,
      userId: (session.user as any).id,
    });

    return NextResponse.json(populatedContact, { status: 201 });
  } catch (error: any) {
    console.error('Error creating contact:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
