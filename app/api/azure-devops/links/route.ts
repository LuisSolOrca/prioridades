import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import connectDB from '@/lib/mongodb';
import AzureDevOpsWorkItem from '@/models/AzureDevOpsWorkItem';

/**
 * GET - Obtiene todos los vínculos entre prioridades y Azure DevOps
 * Solo accesible para admins del área Tecnología
 */
export async function GET(request: NextRequest) {
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

    // Obtener todos los vínculos con información poblada de usuario y prioridad
    const links = await AzureDevOpsWorkItem.find()
      .populate('userId', 'name email area')
      .populate('priorityId', 'title status weekStart weekEnd')
      .sort({ createdAt: -1 })
      .lean();

    return NextResponse.json({
      success: true,
      links: links
    });
  } catch (error) {
    console.error('Error obteniendo vínculos de Azure DevOps:', error);
    return NextResponse.json(
      { error: 'Error al obtener vínculos' },
      { status: 500 }
    );
  }
}
