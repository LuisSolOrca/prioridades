import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import connectDB from '@/lib/mongodb';
import Client from '@/models/Client';
import Contact from '@/models/Contact';
import Deal from '@/models/Deal';
import Activity from '@/models/Activity';
import { findAllDuplicatePairs } from '@/lib/crm/duplicateDetection';

export const dynamic = 'force-dynamic';

/**
 * GET /api/crm/duplicates
 * Get list of potential duplicate records
 *
 * Query params:
 * - type: 'client' | 'contact' | 'all'
 * - limit: number (default 50)
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type') || 'all';
    const limit = parseInt(searchParams.get('limit') || '50');

    await connectDB();

    const results: any = {
      clients: [],
      contacts: [],
    };

    // Find client duplicates
    if (type === 'all' || type === 'client') {
      const clients = await Client.find({ isActive: true })
        .select('_id name phone industry website createdAt')
        .lean();

      const clientDuplicates = findAllDuplicatePairs(
        clients.map(c => ({
          _id: c._id.toString(),
          name: c.name,
          phone: c.phone,
        }))
      );

      // Enrich with full data
      results.clients = clientDuplicates.slice(0, limit).map(pair => {
        const client1 = clients.find(c => c._id.toString() === pair.record1._id);
        const client2 = clients.find(c => c._id.toString() === pair.record2._id);
        return {
          record1: client1,
          record2: client2,
          similarity: pair.similarity,
          matchedOn: pair.matchedOn,
        };
      });
    }

    // Find contact duplicates
    if (type === 'all' || type === 'contact') {
      const contacts = await Contact.find({ isActive: true })
        .select('_id firstName lastName email phone clientId position createdAt')
        .populate('clientId', 'name')
        .lean();

      const contactDuplicates = findAllDuplicatePairs(
        contacts.map(c => ({
          _id: c._id.toString(),
          name: `${c.firstName} ${c.lastName}`.trim(),
          email: c.email,
          phone: c.phone,
        }))
      );

      // Enrich with full data
      results.contacts = contactDuplicates.slice(0, limit).map(pair => {
        const contact1 = contacts.find(c => c._id.toString() === pair.record1._id);
        const contact2 = contacts.find(c => c._id.toString() === pair.record2._id);
        return {
          record1: contact1,
          record2: contact2,
          similarity: pair.similarity,
          matchedOn: pair.matchedOn,
        };
      });
    }

    return NextResponse.json(results);
  } catch (error: any) {
    console.error('Error fetching duplicates:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

/**
 * POST /api/crm/duplicates/merge
 * Merge two duplicate records
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const user = session.user as any;
    if (user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Solo administradores pueden fusionar registros' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { type, keepId, mergeId, mergeFields } = body;

    if (!type || !keepId || !mergeId) {
      return NextResponse.json(
        { error: 'Faltan campos requeridos: type, keepId, mergeId' },
        { status: 400 }
      );
    }

    await connectDB();

    if (type === 'client') {
      // Get both clients
      const [keepClient, mergeClient] = await Promise.all([
        Client.findById(keepId),
        Client.findById(mergeId),
      ]);

      if (!keepClient || !mergeClient) {
        return NextResponse.json(
          { error: 'Uno o ambos clientes no encontrados' },
          { status: 404 }
        );
      }

      // Merge specified fields
      if (mergeFields) {
        for (const field of mergeFields) {
          const mergeValue = (mergeClient as any)[field];
          const keepValue = (keepClient as any)[field];
          if (mergeValue && !keepValue) {
            (keepClient as any)[field] = mergeValue;
          }
        }
      }

      // Update all related records to point to keepId
      await Promise.all([
        // Update deals
        Deal.updateMany({ clientId: mergeId }, { clientId: keepId }),
        // Update contacts
        Contact.updateMany({ clientId: mergeId }, { clientId: keepId }),
        // Update activities
        Activity.updateMany({ clientId: mergeId }, { clientId: keepId }),
      ]);

      // Soft delete the merged client
      mergeClient.isActive = false;
      mergeClient.name = `[FUSIONADO] ${mergeClient.name}`;

      await Promise.all([
        keepClient.save(),
        mergeClient.save(),
      ]);

      return NextResponse.json({
        success: true,
        message: 'Clientes fusionados correctamente',
        keptRecord: keepClient,
      });
    } else if (type === 'contact') {
      // Get both contacts
      const [keepContact, mergeContact] = await Promise.all([
        Contact.findById(keepId),
        Contact.findById(mergeId),
      ]);

      if (!keepContact || !mergeContact) {
        return NextResponse.json(
          { error: 'Uno o ambos contactos no encontrados' },
          { status: 404 }
        );
      }

      // Merge specified fields
      if (mergeFields) {
        for (const field of mergeFields) {
          const mergeValue = (mergeContact as any)[field];
          const keepValue = (keepContact as any)[field];
          if (mergeValue && !keepValue) {
            (keepContact as any)[field] = mergeValue;
          }
        }
      }

      // Update all related records
      await Promise.all([
        // Update deals
        Deal.updateMany({ contactId: mergeId }, { contactId: keepId }),
        // Update activities
        Activity.updateMany({ contactId: mergeId }, { contactId: keepId }),
      ]);

      // Soft delete the merged contact
      mergeContact.isActive = false;
      mergeContact.firstName = `[FUSIONADO] ${mergeContact.firstName}`;

      await Promise.all([
        keepContact.save(),
        mergeContact.save(),
      ]);

      return NextResponse.json({
        success: true,
        message: 'Contactos fusionados correctamente',
        keptRecord: keepContact,
      });
    }

    return NextResponse.json(
      { error: 'Tipo no soportado' },
      { status: 400 }
    );
  } catch (error: any) {
    console.error('Error merging duplicates:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
