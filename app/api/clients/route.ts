import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import connectDB from '@/lib/mongodb';
import Client from '@/models/Client';
import { triggerWorkflowsSync } from '@/lib/crmWorkflowEngine';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    await connectDB();

    const { searchParams } = new URL(request.url);
    const activeOnly = searchParams.get('activeOnly') === 'true';

    let query: any = {};

    if (activeOnly) {
      query.isActive = true;
    }

    const clients = await Client.find(query)
      .sort({ name: 1 })
      .lean();

    return NextResponse.json(clients);
  } catch (error: any) {
    console.error('Error fetching clients:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    await connectDB();

    const body = await request.json();

    const client = await Client.create({
      name: body.name,
      description: body.description || '',
      isActive: body.isActive !== undefined ? body.isActive : true,
    });

    // Disparar workflow de client_created
    await triggerWorkflowsSync('client_created', {
      entityType: 'client',
      entityId: client._id,
      entityName: client.name,
      newData: client.toJSON?.() || client,
      userId: (session.user as any).id,
    });

    return NextResponse.json(client, { status: 201 });
  } catch (error: any) {
    console.error('Error creating client:', error);

    // Manejo de errores de duplicados
    if (error.code === 11000) {
      return NextResponse.json({ error: 'Ya existe un cliente con ese nombre' }, { status: 400 });
    }

    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
