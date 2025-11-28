import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import connectDB from '@/lib/mongodb';
import Client from '@/models/Client';
import Contact from '@/models/Contact';
import { findDuplicates, DuplicateCheckResult } from '@/lib/crm/duplicateDetection';

export const dynamic = 'force-dynamic';

/**
 * GET /api/crm/duplicates/check
 * Check for potential duplicates before creating a record
 *
 * Query params:
 * - type: 'client' | 'contact'
 * - name: string (for clients)
 * - email: string (for contacts)
 * - phone: string (optional)
 * - excludeId: string (optional, exclude this ID from results - useful for updates)
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type');
    const name = searchParams.get('name');
    const email = searchParams.get('email');
    const phone = searchParams.get('phone');
    const excludeId = searchParams.get('excludeId');

    if (!type || !['client', 'contact'].includes(type)) {
      return NextResponse.json(
        { error: 'Tipo inválido. Debe ser "client" o "contact"' },
        { status: 400 }
      );
    }

    await connectDB();

    let result: DuplicateCheckResult;

    if (type === 'client') {
      if (!name) {
        return NextResponse.json(
          { error: 'El nombre es requerido para verificar clientes' },
          { status: 400 }
        );
      }

      // Get all active clients
      const query: any = { isActive: true };
      if (excludeId) {
        query._id = { $ne: excludeId };
      }

      const clients = await Client.find(query)
        .select('_id name phone')
        .lean();

      result = findDuplicates(
        { name, phone: phone || undefined },
        clients.map(c => ({
          _id: c._id.toString(),
          name: c.name,
          phone: c.phone,
        }))
      );
    } else {
      // Contact
      if (!email && !name) {
        return NextResponse.json(
          { error: 'Email o nombre es requerido para verificar contactos' },
          { status: 400 }
        );
      }

      // Get all active contacts
      const query: any = { isActive: true };
      if (excludeId) {
        query._id = { $ne: excludeId };
      }

      const contacts = await Contact.find(query)
        .select('_id firstName lastName email phone')
        .lean();

      const contactsFormatted = contacts.map(c => ({
        _id: c._id.toString(),
        name: `${c.firstName} ${c.lastName}`.trim(),
        email: c.email,
        phone: c.phone,
      }));

      result = findDuplicates(
        {
          name: name || undefined,
          email: email || undefined,
          phone: phone || undefined,
        },
        contactsFormatted
      );
    }

    return NextResponse.json(result);
  } catch (error: any) {
    console.error('Error checking duplicates:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
