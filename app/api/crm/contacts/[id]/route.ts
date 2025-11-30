import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import connectDB from '@/lib/mongodb';
import Contact from '@/models/Contact';
import mongoose from 'mongoose';
import { hasPermission } from '@/lib/permissions';
import { triggerWorkflowsSync } from '@/lib/crmWorkflowEngine';
import { triggerWebhooksAsync } from '@/lib/crm/webhookEngine';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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

    if (!mongoose.Types.ObjectId.isValid(params.id)) {
      return NextResponse.json({ error: 'ID inválido' }, { status: 400 });
    }

    const contact = await Contact.findById(params.id)
      .populate('clientId', 'name')
      .populate('createdBy', 'name');

    if (!contact) {
      return NextResponse.json({ error: 'Contacto no encontrado' }, { status: 404 });
    }

    return NextResponse.json(contact);
  } catch (error: any) {
    console.error('Error fetching contact:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    // Verificar permiso para gestionar contactos
    if (!hasPermission(session, 'canManageContacts')) {
      return NextResponse.json({ error: 'Sin permiso para editar contactos' }, { status: 403 });
    }

    await connectDB();

    if (!mongoose.Types.ObjectId.isValid(params.id)) {
      return NextResponse.json({ error: 'ID inválido' }, { status: 400 });
    }

    const body = await request.json();
    const userId = (session.user as any).id;

    // Obtener contacto actual para comparar cambios
    const currentContact = await Contact.findById(params.id);
    if (!currentContact) {
      return NextResponse.json({ error: 'Contacto no encontrado' }, { status: 404 });
    }
    const previousData = currentContact.toObject();

    const contact = await Contact.findByIdAndUpdate(
      params.id,
      body,
      { new: true, runValidators: true }
    )
      .populate('clientId', 'name')
      .populate('createdBy', 'name');

    if (!contact) {
      return NextResponse.json({ error: 'Contacto no encontrado' }, { status: 404 });
    }

    // Disparar workflow de contact_updated
    const contactData = contact.toJSON?.() || contact;
    await triggerWorkflowsSync('contact_updated', {
      entityType: 'contact',
      entityId: params.id,
      entityName: `${contact.firstName} ${contact.lastName}`,
      previousData,
      newData: contactData,
      changedFields: Object.keys(body),
      userId,
    });

    // Webhook contact.updated
    triggerWebhooksAsync('contact.updated', {
      entityType: 'contact',
      entityId: params.id,
      entityName: `${contact.firstName} ${contact.lastName}`,
      current: contactData as Record<string, any>,
      previous: previousData,
      changes: Object.keys(body),
      userId,
      source: 'web',
    });

    return NextResponse.json(contact);
  } catch (error: any) {
    console.error('Error updating contact:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    // Verificar permiso para gestionar contactos
    if (!hasPermission(session, 'canManageContacts')) {
      return NextResponse.json({ error: 'Sin permiso para eliminar contactos' }, { status: 403 });
    }

    await connectDB();

    if (!mongoose.Types.ObjectId.isValid(params.id)) {
      return NextResponse.json({ error: 'ID inválido' }, { status: 400 });
    }

    // Verificar si hay deals asociados
    const Deal = mongoose.models.Deal || (await import('@/models/Deal')).default;
    const dealsCount = await Deal.countDocuments({ contactId: params.id });

    if (dealsCount > 0) {
      return NextResponse.json({
        error: `No se puede eliminar el contacto porque tiene ${dealsCount} deal(s) asociado(s).`
      }, { status: 400 });
    }

    // Obtener contacto antes de eliminar
    const contact = await Contact.findById(params.id);
    if (!contact) {
      return NextResponse.json({ error: 'Contacto no encontrado' }, { status: 404 });
    }

    const contactData = contact.toObject();
    const userId = (session.user as any).id;

    await Contact.findByIdAndDelete(params.id);

    // Webhook contact.deleted
    triggerWebhooksAsync('contact.deleted', {
      entityType: 'contact',
      entityId: params.id,
      entityName: `${contactData.firstName} ${contactData.lastName}`,
      current: contactData,
      userId,
      source: 'web',
    });

    return NextResponse.json({ message: 'Contacto eliminado correctamente' });
  } catch (error: any) {
    console.error('Error deleting contact:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
