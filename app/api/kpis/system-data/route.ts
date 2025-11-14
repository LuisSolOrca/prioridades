import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import connectDB from '@/lib/mongodb';
import Priority from '@/models/Priority';
import Milestone from '@/models/Milestone';
import Project from '@/models/Project';
import User from '@/models/User';

/**
 * POST - Consulta datos del sistema para usar en fórmulas de KPIs
 * Body: {
 *   dataType: 'priorities' | 'milestones' | 'projects' | 'users',
 *   filters: { [key: string]: any },
 *   fields: string[] // Campos a retornar
 * }
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    await connectDB();

    const body = await request.json();
    const { dataType, filters = {}, fields = [] } = body;

    let query: any = {};
    let model: any;
    let populateFields: string[] = [];

    // Construir query según el tipo de dato
    switch (dataType) {
      case 'priorities':
        model = Priority;

        // Filtros disponibles
        if (filters.status) query.status = filters.status;
        if (filters.type) query.type = filters.type;
        if (filters.userId) query.userId = filters.userId;
        if (filters.initiativeId) query.initiativeIds = filters.initiativeId;
        if (filters.projectId) query.projectId = filters.projectId;
        if (filters.clientId) query.clientId = filters.clientId;
        if (filters.isCarriedOver !== undefined) query.isCarriedOver = filters.isCarriedOver;

        // Filtros de fecha
        if (filters.weekStart || filters.weekEnd) {
          query.weekStart = {};
          if (filters.weekStart) query.weekStart.$gte = new Date(filters.weekStart);
          if (filters.weekEnd) query.weekEnd = { $lte: new Date(filters.weekEnd) };
        }

        // Filtros de rango de completionPercentage
        if (filters.completionMin !== undefined || filters.completionMax !== undefined) {
          query.completionPercentage = {};
          if (filters.completionMin !== undefined) query.completionPercentage.$gte = filters.completionMin;
          if (filters.completionMax !== undefined) query.completionPercentage.$lte = filters.completionMax;
        }

        populateFields = ['userId', 'initiativeIds', 'projectId', 'clientId'];
        break;

      case 'milestones':
        model = Milestone;

        if (filters.userId) query.userId = filters.userId;
        if (filters.projectId) query.projectId = filters.projectId;
        if (filters.isCompleted !== undefined) query.isCompleted = filters.isCompleted;

        // Filtros de fecha
        if (filters.dueDateStart || filters.dueDateEnd) {
          query.dueDate = {};
          if (filters.dueDateStart) query.dueDate.$gte = new Date(filters.dueDateStart);
          if (filters.dueDateEnd) query.dueDate.$lte = new Date(filters.dueDateEnd);
        }

        populateFields = ['userId', 'projectId'];
        break;

      case 'projects':
        model = Project;

        if (filters.isActive !== undefined) query.isActive = filters.isActive;
        if (filters.projectManagerId) query['projectManager.userId'] = filters.projectManagerId;

        populateFields = ['projectManager.userId'];
        break;

      case 'users':
        model = User;

        if (filters.role) query.role = filters.role;
        if (filters.area) query.area = filters.area;
        if (filters.isActive !== undefined) query.isActive = filters.isActive;
        if (filters.isAreaLeader !== undefined) query.isAreaLeader = filters.isAreaLeader;
        break;

      default:
        return NextResponse.json({ error: 'Tipo de dato no válido' }, { status: 400 });
    }

    // Ejecutar query
    let queryBuilder = model.find(query);

    // Poblar referencias si es necesario
    if (populateFields.length > 0 && dataType !== 'users') {
      populateFields.forEach(field => {
        queryBuilder = queryBuilder.populate(field, 'name email area');
      });
    }

    // Seleccionar solo los campos solicitados (si se especificaron)
    if (fields.length > 0) {
      queryBuilder = queryBuilder.select(fields.join(' '));
    }

    const results = await queryBuilder.lean();

    return NextResponse.json({
      dataType,
      count: results.length,
      results
    });

  } catch (error: any) {
    console.error('Error fetching system data:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
