import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import connectDB from '@/lib/mongodb';
import User from '@/models/User';
import Project from '@/models/Project';
import StrategicInitiative from '@/models/StrategicInitiative';
import Client from '@/models/Client';

/**
 * GET - Obtiene datos para autocompletado en el editor de fórmulas
 * Retorna listas de usuarios, proyectos, iniciativas, áreas, clientes, etc.
 */
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    await connectDB();

    // Obtener usuarios activos
    const users = await User.find({ isActive: true })
      .select('name email area role isAreaLeader')
      .lean();

    // Obtener proyectos activos
    const projects = await Project.find({ isActive: true })
      .select('name description')
      .lean();

    // Obtener iniciativas activas
    const initiatives = await StrategicInitiative.find({ isActive: true })
      .select('name description color')
      .lean();

    // Obtener clientes únicos (si existe el modelo)
    let clients: any[] = [];
    try {
      clients = await Client.find({ isActive: true })
        .select('name')
        .lean();
    } catch (error) {
      // Si el modelo Client no existe, ignorar
      console.log('Client model not found, skipping');
    }

    // Obtener áreas únicas de usuarios
    const areas = [...new Set(users.map(u => u.area).filter(Boolean))].sort();

    // Preparar datos para autocompletado
    const autocompleteData = {
      users: users.map((u: any) => ({
        id: u._id.toString(),
        name: u.name,
        email: u.email,
        area: u.area,
        role: u.role,
        isAreaLeader: u.isAreaLeader,
        label: `${u.name} (${u.email})`,
        value: u.name, // Usaremos el nombre en las fórmulas
      })),
      projects: projects.map((p: any) => ({
        id: p._id.toString(),
        name: p.name,
        description: p.description,
        label: p.name,
        value: p.name,
      })),
      initiatives: initiatives.map((i: any) => ({
        id: i._id.toString(),
        name: i.name,
        description: i.description,
        color: i.color,
        label: i.name,
        value: i.name,
      })),
      clients: clients.map((c: any) => ({
        id: c._id.toString(),
        name: c.name,
        label: c.name,
        value: c.name,
      })),
      areas: areas.map(area => ({
        label: area,
        value: area,
      })),
      statuses: [
        { label: 'COMPLETADO', value: 'COMPLETADO', description: 'Prioridad completada' },
        { label: 'EN_TIEMPO', value: 'EN_TIEMPO', description: 'Prioridad en tiempo' },
        { label: 'EN_RIESGO', value: 'EN_RIESGO', description: 'Prioridad en riesgo' },
        { label: 'BLOQUEADO', value: 'BLOQUEADO', description: 'Prioridad bloqueada' },
        { label: 'REPROGRAMADO', value: 'REPROGRAMADO', description: 'Prioridad reprogramada' },
      ],
      roles: [
        { label: 'ADMIN', value: 'ADMIN', description: 'Administrador del sistema' },
        { label: 'USER', value: 'USER', description: 'Usuario estándar' },
      ],
      fields: [
        { label: 'completionPercentage', value: 'completionPercentage', description: 'Porcentaje de completitud' },
      ],
    };

    return NextResponse.json(autocompleteData);
  } catch (error: any) {
    console.error('Error fetching autocomplete data:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
