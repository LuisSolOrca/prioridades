import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import connectDB from '@/lib/mongodb';
import Channel from '@/models/Channel';

/**
 * PATCH /api/projects/[id]/channels/reorder
 * Reordena canales
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    await connectDB();

    const body = await request.json();
    const { channels } = body;

    if (!Array.isArray(channels)) {
      return NextResponse.json(
        { error: 'Se requiere un array de canales' },
        { status: 400 }
      );
    }

    // Actualizar orden de cada canal
    const updatePromises = channels.map(({ id, order }: { id: string; order: number }) =>
      Channel.findByIdAndUpdate(id, { order })
    );

    await Promise.all(updatePromises);

    return NextResponse.json({ message: 'Canales reordenados correctamente' });
  } catch (error: any) {
    console.error('Error reordering channels:', error);
    return NextResponse.json(
      { error: error.message || 'Error reordenando canales' },
      { status: 500 }
    );
  }
}
