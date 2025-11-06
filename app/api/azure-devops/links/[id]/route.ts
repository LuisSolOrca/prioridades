import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import connectDB from '@/lib/mongodb';
import AzureDevOpsWorkItem from '@/models/AzureDevOpsWorkItem';
import Priority from '@/models/Priority';

/**
 * DELETE - Elimina un vínculo entre prioridad y Azure DevOps
 * Solo accesible para admins del área Tecnología
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    // Verificar que sea admin del área Tecnología
    const user = session.user as any;
    if (user.role !== 'ADMIN' || user.area !== 'Tecnología') {
      return NextResponse.json(
        { error: 'Solo administradores del área Tecnología pueden acceder a esta funcionalidad' },
        { status: 403 }
      );
    }

    await connectDB();

    const linkId = params.id;

    // Buscar el vínculo
    const link = await AzureDevOpsWorkItem.findById(linkId);

    if (!link) {
      return NextResponse.json(
        { error: 'Vínculo no encontrado' },
        { status: 404 }
      );
    }

    // Obtener la prioridad para eliminar la información de Azure DevOps
    const priority = await Priority.findById(link.priorityId);

    if (priority && priority.azureDevOps) {
      // Eliminar la información de Azure DevOps de la prioridad
      priority.azureDevOps = undefined;
      await priority.save();
    }

    // Eliminar el vínculo
    await AzureDevOpsWorkItem.findByIdAndDelete(linkId);

    return NextResponse.json({
      success: true,
      message: 'Vínculo eliminado correctamente'
    });
  } catch (error) {
    console.error('Error eliminando vínculo de Azure DevOps:', error);
    return NextResponse.json(
      { error: 'Error al eliminar vínculo' },
      { status: 500 }
    );
  }
}
