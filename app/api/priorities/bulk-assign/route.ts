import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import connectDB from '@/lib/mongodb';
import Priority from '@/models/Priority';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    // Solo admins pueden hacer asignación masiva
    if ((session.user as any).role !== 'ADMIN') {
      return NextResponse.json({ error: 'Solo administradores pueden hacer asignación masiva' }, { status: 403 });
    }

    await connectDB();

    const body = await request.json();
    const { priorityIds, clientId, projectId } = body;

    // Validaciones
    if (!priorityIds || !Array.isArray(priorityIds) || priorityIds.length === 0) {
      return NextResponse.json({ error: 'Debes proporcionar al menos un ID de prioridad' }, { status: 400 });
    }

    if (!clientId && !projectId) {
      return NextResponse.json({ error: 'Debes proporcionar al menos un clientId o projectId para asignar' }, { status: 400 });
    }

    // Construir el objeto de actualización
    const updateData: any = {
      wasEdited: true,
      lastEditedAt: new Date(),
      updatedAt: new Date()
    };

    if (clientId !== undefined) {
      updateData.clientId = clientId;
    }

    if (projectId !== undefined) {
      updateData.projectId = projectId;
    }

    // Actualizar todas las prioridades seleccionadas
    const result = await Priority.updateMany(
      { _id: { $in: priorityIds } },
      { $set: updateData }
    );

    return NextResponse.json({
      success: true,
      updated: result.modifiedCount,
      matched: result.matchedCount,
      message: `Se actualizaron ${result.modifiedCount} de ${result.matchedCount} prioridades`
    });

  } catch (error: any) {
    console.error('Error en asignación masiva:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
