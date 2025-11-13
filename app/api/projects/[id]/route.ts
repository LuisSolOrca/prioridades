import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import connectDB from '@/lib/mongodb';
import Project from '@/models/Project';
import User from '@/models/User';
import mongoose from 'mongoose';

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    // Verificar permiso para editar proyectos
    await connectDB();
    const user = await User.findOne({ email: (session.user as any).email });
    const isAdmin = (session.user as any).role === 'ADMIN';

    // Validar ID
    if (!mongoose.Types.ObjectId.isValid(params.id)) {
      return NextResponse.json({ error: 'ID inválido' }, { status: 400 });
    }

    // Obtener el proyecto para verificar si es el PM asignado
    const existingProject = await Project.findById(params.id);
    if (!existingProject) {
      return NextResponse.json({ error: 'Proyecto no encontrado' }, { status: 404 });
    }

    const isProjectManager = existingProject.projectManager?.userId?.toString() === user?._id.toString();

    // Solo ADMIN o el PM asignado pueden editar
    if (!isAdmin && !isProjectManager) {
      return NextResponse.json({ error: 'No tienes permiso para editar este proyecto' }, { status: 403 });
    }

    const body = await request.json();

    const project = await Project.findByIdAndUpdate(
      params.id,
      {
        name: body.name,
        description: body.description,
        isActive: body.isActive,
        purpose: body.purpose,
        objectives: body.objectives,
        scope: body.scope,
        requirements: body.requirements,
        assumptions: body.assumptions,
        constraints: body.constraints,
        stakeholders: body.stakeholders,
        risks: body.risks,
        budget: body.budget,
        successCriteria: body.successCriteria,
        projectManager: body.projectManager,
      },
      { new: true, runValidators: true }
    );

    if (!project) {
      return NextResponse.json({ error: 'Proyecto no encontrado' }, { status: 404 });
    }

    return NextResponse.json(project);
  } catch (error: any) {
    console.error('Error updating project:', error);

    // Manejo de errores de duplicados
    if (error.code === 11000) {
      return NextResponse.json({ error: 'Ya existe un proyecto con ese nombre' }, { status: 400 });
    }

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

    // Verificar permiso para eliminar proyectos (solo ADMIN o PM del proyecto)
    await connectDB();
    const user = await User.findOne({ email: (session.user as any).email });
    const isAdmin = (session.user as any).role === 'ADMIN';

    // Validar ID
    if (!mongoose.Types.ObjectId.isValid(params.id)) {
      return NextResponse.json({ error: 'ID inválido' }, { status: 400 });
    }

    // Obtener el proyecto para verificar si es el PM asignado
    const existingProject = await Project.findById(params.id);
    if (!existingProject) {
      return NextResponse.json({ error: 'Proyecto no encontrado' }, { status: 404 });
    }

    const isProjectManager = existingProject.projectManager?.userId?.toString() === user?._id.toString();

    // Solo ADMIN o el PM asignado pueden eliminar
    if (!isAdmin && !isProjectManager) {
      return NextResponse.json({ error: 'No tienes permiso para eliminar este proyecto' }, { status: 403 });
    }

    // Verificar si hay prioridades usando este proyecto
    const Priority = mongoose.models.Priority || (await import('@/models/Priority')).default;
    const prioritiesCount = await Priority.countDocuments({ projectId: params.id });

    if (prioritiesCount > 0) {
      return NextResponse.json({
        error: `No se puede eliminar el proyecto porque tiene ${prioritiesCount} prioridad(es) asociada(s). Por favor, reasigna o elimina esas prioridades primero.`
      }, { status: 400 });
    }

    const project = await Project.findByIdAndDelete(params.id);

    if (!project) {
      return NextResponse.json({ error: 'Proyecto no encontrado' }, { status: 404 });
    }

    return NextResponse.json({ message: 'Proyecto eliminado correctamente' });
  } catch (error: any) {
    console.error('Error deleting project:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
