import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import connectDB from '@/lib/mongodb';
import Project from '@/models/Project';

// GET /api/projects - Obtener todos los proyectos
export async function GET() {
  try {
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    await connectDB();
    const projects = await Project.find().sort({ name: 1 });
    return NextResponse.json(projects);
  } catch (error) {
    console.error('Error fetching projects:', error);
    return NextResponse.json({ error: 'Error al obtener proyectos' }, { status: 500 });
  }
}

// POST /api/projects - Crear un nuevo proyecto
export async function POST(req: Request) {
  try {
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const body = await req.json();
    const { name, description } = body;

    if (!name || name.trim() === '') {
      return NextResponse.json({ error: 'El nombre del proyecto es requerido' }, { status: 400 });
    }

    await connectDB();

    // Verificar si ya existe un proyecto con ese nombre
    const existingProject = await Project.findOne({ name: name.trim() });
    if (existingProject) {
      return NextResponse.json({ error: 'Ya existe un proyecto con ese nombre' }, { status: 400 });
    }

    const project = await Project.create({
      name: name.trim(),
      description: description?.trim() || '',
      isActive: true
    });

    return NextResponse.json(project, { status: 201 });
  } catch (error) {
    console.error('Error creating project:', error);
    return NextResponse.json({ error: 'Error al crear proyecto' }, { status: 500 });
  }
}
