import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import connectDB from '@/lib/mongodb';
import Client from '@/models/Client';
import mongoose from 'mongoose';

export const dynamic = 'force-dynamic';

// GET /api/clients/[id] - Obtener un cliente por ID
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    await connectDB();

    const { id } = await params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ error: 'ID inválido' }, { status: 400 });
    }

    const client = await Client.findById(id);

    if (!client) {
      return NextResponse.json({ error: 'Cliente no encontrado' }, { status: 404 });
    }

    return NextResponse.json(client);
  } catch (error: any) {
    console.error('Error fetching client:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    await connectDB();

    const { id } = await params;
    const body = await request.json();

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ error: 'ID inválido' }, { status: 400 });
    }

    const client = await Client.findByIdAndUpdate(
      id,
      {
        name: body.name,
        description: body.description,
        isActive: body.isActive,
      },
      { new: true, runValidators: true }
    );

    if (!client) {
      return NextResponse.json({ error: 'Cliente no encontrado' }, { status: 404 });
    }

    return NextResponse.json(client);
  } catch (error: any) {
    console.error('Error updating client:', error);

    // Manejo de errores de duplicados
    if (error.code === 11000) {
      return NextResponse.json({ error: 'Ya existe un cliente con ese nombre' }, { status: 400 });
    }

    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    await connectDB();

    const { id } = await params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ error: 'ID inválido' }, { status: 400 });
    }

    // Verificar si hay prioridades usando este cliente
    const Priority = mongoose.models.Priority || (await import('@/models/Priority')).default;
    const prioritiesCount = await Priority.countDocuments({ clientId: id });

    if (prioritiesCount > 0) {
      return NextResponse.json({
        error: `No se puede eliminar el cliente porque tiene ${prioritiesCount} prioridad(es) asociada(s). Por favor, reasigna o elimina esas prioridades primero.`
      }, { status: 400 });
    }

    const client = await Client.findByIdAndDelete(id);

    if (!client) {
      return NextResponse.json({ error: 'Cliente no encontrado' }, { status: 404 });
    }

    return NextResponse.json({ message: 'Cliente eliminado correctamente' });
  } catch (error: any) {
    console.error('Error deleting client:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
