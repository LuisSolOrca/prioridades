import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import connectDB from '@/lib/mongodb';
import Priority from '@/models/Priority';
import User from '@/models/User';
import { executeWorkflowsForPriority } from '@/lib/workflows';

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const currentUser = session.user as any;

    await connectDB();

    // Verificar que el usuario actual es líder de área
    const leader = await User.findById(currentUser.id);
    if (!leader || !leader.isAreaLeader) {
      return NextResponse.json(
        { error: 'Solo los líderes de área pueden reasignar prioridades' },
        { status: 403 }
      );
    }

    const leaderArea = leader.area;
    if (!leaderArea) {
      return NextResponse.json(
        { error: 'El líder no tiene un área asignada' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { newUserId } = body;

    if (!newUserId) {
      return NextResponse.json(
        { error: 'El ID del nuevo usuario es requerido' },
        { status: 400 }
      );
    }

    // Obtener la prioridad (sin populate para evitar problemas de validación)
    const priority = await Priority.findById(params.id);

    if (!priority) {
      return NextResponse.json(
        { error: 'Prioridad no encontrada' },
        { status: 404 }
      );
    }

    // Verificar que la prioridad pertenece al área del líder
    const currentPriorityUser = await User.findById(priority.userId);
    if (!currentPriorityUser || currentPriorityUser.area !== leaderArea) {
      return NextResponse.json(
        { error: 'Esta prioridad no pertenece a tu área' },
        { status: 403 }
      );
    }

    // Verificar que el nuevo usuario pertenece al área del líder
    const newUser = await User.findById(newUserId);
    if (!newUser) {
      return NextResponse.json(
        { error: 'Usuario destino no encontrado' },
        { status: 404 }
      );
    }

    if (newUser.area !== leaderArea) {
      return NextResponse.json(
        { error: 'Solo puedes reasignar prioridades a usuarios de tu área' },
        { status: 403 }
      );
    }

    // Guardar usuario anterior para workflows
    const previousUserId = currentPriorityUser._id.toString();
    const previousOwnerName = currentPriorityUser.name;
    const newOwnerName = newUser.name;

    // Reasignar la prioridad usando findByIdAndUpdate para evitar problemas de validación
    const updatedPriority = await Priority.findByIdAndUpdate(
      params.id,
      { userId: newUserId },
      { new: true, runValidators: false } // No ejecutar validadores para evitar problemas con initiativeIds
    )
      .populate('userId', 'name email area')
      .populate('initiativeIds', 'name color');

    // Ejecutar workflows de reasignación (asíncrono, no bloquea la respuesta)
    executeWorkflowsForPriority(
      updatedPriority!._id,
      'priority_reassigned',
      undefined, // previousStatus
      undefined, // previousCompletion
      previousUserId,
      newUserId,
      previousOwnerName,
      newOwnerName
    ).catch((error) => {
      console.error('Error ejecutando workflows de reasignación:', error);
    });

    return NextResponse.json({
      message: 'Prioridad reasignada exitosamente',
      priority: updatedPriority
    });
  } catch (error: any) {
    console.error('Error reassigning priority:', error);
    return NextResponse.json(
      { error: 'Error al reasignar la prioridad' },
      { status: 500 }
    );
  }
}
