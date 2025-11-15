/**
 * Sistema de funciones para acceder a datos del sistema - VERSIÓN SERVIDOR
 *
 * Esta versión accede directamente a la base de datos sin hacer fetch HTTP
 * Ahora soporta búsqueda por NOMBRE además de por ID
 */

import connectDB from '@/lib/mongodb';
import Priority from '@/models/Priority';
import Milestone from '@/models/Milestone';
import Project from '@/models/Project';
import User from '@/models/User';

export interface SystemDataFilter {
  // Filtros comunes
  status?: string;
  type?: string;
  userId?: string; // Mantener por compatibilidad
  userName?: string; // NUEVO: Buscar por nombre de usuario
  isActive?: boolean;

  // Filtros específicos de prioridades
  initiativeId?: string; // Mantener por compatibilidad
  initiativeName?: string; // NUEVO: Buscar por nombre de iniciativa
  projectId?: string; // Mantener por compatibilidad
  projectName?: string; // NUEVO: Buscar por nombre de proyecto
  clientId?: string; // Mantener por compatibilidad
  clientName?: string; // NUEVO: Buscar por nombre de cliente
  isCarriedOver?: boolean;
  weekStart?: string;
  weekEnd?: string;
  completionMin?: number;
  completionMax?: number;

  // Filtros específicos de hitos
  isCompleted?: boolean;
  dueDateStart?: string;
  dueDateEnd?: string;

  // Filtros específicos de proyectos
  projectManagerId?: string; // Mantener por compatibilidad
  projectManagerName?: string; // NUEVO: Buscar por nombre de gerente

  // Filtros específicos de usuarios
  role?: string;
  area?: string;
  isAreaLeader?: boolean;
}

/**
 * Helper: Resolver nombre de usuario a ID
 */
async function resolveUserIdByName(userName: string): Promise<string | null> {
  const user: any = await User.findOne({ name: userName, isActive: true }).select('_id').lean();
  return user ? user._id.toString() : null;
}

/**
 * Helper: Resolver nombre de iniciativa a ID
 */
async function resolveInitiativeIdByName(initiativeName: string): Promise<string | null> {
  const StrategicInitiative = require('@/models/StrategicInitiative').default;
  const initiative: any = await StrategicInitiative.findOne({ name: initiativeName, isActive: true }).select('_id').lean();
  return initiative ? initiative._id.toString() : null;
}

/**
 * Helper: Resolver nombre de proyecto a ID
 */
async function resolveProjectIdByName(projectName: string): Promise<string | null> {
  const project: any = await Project.findOne({ name: projectName, isActive: true }).select('_id').lean();
  return project ? project._id.toString() : null;
}

/**
 * Helper: Resolver nombre de cliente a ID
 */
async function resolveClientIdByName(clientName: string): Promise<string | null> {
  try {
    const Client = require('@/models/Client').default;
    const client: any = await Client.findOne({ name: clientName, isActive: true }).select('_id').lean();
    return client ? client._id.toString() : null;
  } catch (error) {
    console.log('Client model not found');
    return null;
  }
}

/**
 * COUNT_PRIORITIES - Versión servidor con soporte de nombres
 */
export async function COUNT_PRIORITIES(filters: SystemDataFilter = {}): Promise<number> {
  await connectDB();

  const query: any = {};

  // Filtros básicos
  if (filters.status) query.status = filters.status;
  if (filters.type) query.type = filters.type;
  if (filters.isCarriedOver !== undefined) query.isCarriedOver = filters.isCarriedOver;

  // Resolver userName a userId
  if (filters.userName) {
    const userId = await resolveUserIdByName(filters.userName);
    if (userId) query.userId = userId;
  } else if (filters.userId) {
    query.userId = filters.userId;
  }

  // Resolver initiativeName a initiativeId
  if (filters.initiativeName) {
    const initiativeId = await resolveInitiativeIdByName(filters.initiativeName);
    if (initiativeId) query.initiativeIds = initiativeId;
  } else if (filters.initiativeId) {
    query.initiativeIds = filters.initiativeId;
  }

  // Resolver projectName a projectId
  if (filters.projectName) {
    const projectId = await resolveProjectIdByName(filters.projectName);
    if (projectId) query.projectId = projectId;
  } else if (filters.projectId) {
    query.projectId = filters.projectId;
  }

  // Resolver clientName a clientId
  if (filters.clientName) {
    const clientId = await resolveClientIdByName(filters.clientName);
    if (clientId) query.clientId = clientId;
  } else if (filters.clientId) {
    query.clientId = filters.clientId;
  }

  // Filtros de fechas
  if (filters.weekStart || filters.weekEnd) {
    query.weekStart = {};
    if (filters.weekStart) query.weekStart.$gte = new Date(filters.weekStart);
    if (filters.weekEnd) query.weekEnd = { $lte: new Date(filters.weekEnd) };
  }

  // Filtros de completitud
  if (filters.completionMin !== undefined || filters.completionMax !== undefined) {
    query.completionPercentage = {};
    if (filters.completionMin !== undefined) query.completionPercentage.$gte = filters.completionMin;
    if (filters.completionMax !== undefined) query.completionPercentage.$lte = filters.completionMax;
  }

  console.log('[COUNT_PRIORITIES Server] Query:', query);
  const count = await Priority.countDocuments(query);
  console.log('[COUNT_PRIORITIES Server] Count:', count);

  return count;
}

/**
 * SUM_PRIORITIES - Versión servidor con soporte de nombres
 */
export async function SUM_PRIORITIES(field: string, filters: SystemDataFilter = {}): Promise<number> {
  await connectDB();

  const query: any = {};

  if (filters.status) query.status = filters.status;
  if (filters.type) query.type = filters.type;

  // Resolver userName a userId
  if (filters.userName) {
    const userId = await resolveUserIdByName(filters.userName);
    if (userId) query.userId = userId;
  } else if (filters.userId) {
    query.userId = filters.userId;
  }

  // Resolver initiativeName a initiativeId
  if (filters.initiativeName) {
    const initiativeId = await resolveInitiativeIdByName(filters.initiativeName);
    if (initiativeId) query.initiativeIds = initiativeId;
  } else if (filters.initiativeId) {
    query.initiativeIds = filters.initiativeId;
  }

  // Resolver projectName a projectId
  if (filters.projectName) {
    const projectId = await resolveProjectIdByName(filters.projectName);
    if (projectId) query.projectId = projectId;
  } else if (filters.projectId) {
    query.projectId = filters.projectId;
  }

  const results = await Priority.find(query).select(field).lean();
  const sum = results.reduce((acc, item) => acc + ((item as any)[field] || 0), 0);

  return sum;
}

/**
 * AVG_PRIORITIES - Versión servidor con soporte de nombres
 */
export async function AVG_PRIORITIES(field: string, filters: SystemDataFilter = {}): Promise<number> {
  await connectDB();

  const query: any = {};

  if (filters.status) query.status = filters.status;
  if (filters.type) query.type = filters.type;

  // Resolver userName a userId
  if (filters.userName) {
    const userId = await resolveUserIdByName(filters.userName);
    if (userId) query.userId = userId;
  } else if (filters.userId) {
    query.userId = filters.userId;
  }

  // Resolver initiativeName a initiativeId
  if (filters.initiativeName) {
    const initiativeId = await resolveInitiativeIdByName(filters.initiativeName);
    if (initiativeId) query.initiativeIds = initiativeId;
  } else if (filters.initiativeId) {
    query.initiativeIds = filters.initiativeId;
  }

  // Resolver projectName a projectId
  if (filters.projectName) {
    const projectId = await resolveProjectIdByName(filters.projectName);
    if (projectId) query.projectId = projectId;
  } else if (filters.projectId) {
    query.projectId = filters.projectId;
  }

  const results = await Priority.find(query).select(field).lean();
  if (results.length === 0) return 0;

  const sum = results.reduce((acc, item) => acc + ((item as any)[field] || 0), 0);
  return sum / results.length;
}

/**
 * COUNT_MILESTONES - Versión servidor con soporte de nombres
 */
export async function COUNT_MILESTONES(filters: SystemDataFilter = {}): Promise<number> {
  await connectDB();

  const query: any = {};

  // Resolver userName a userId
  if (filters.userName) {
    const userId = await resolveUserIdByName(filters.userName);
    if (userId) query.userId = userId;
  } else if (filters.userId) {
    query.userId = filters.userId;
  }

  // Resolver projectName a projectId
  if (filters.projectName) {
    const projectId = await resolveProjectIdByName(filters.projectName);
    if (projectId) query.projectId = projectId;
  } else if (filters.projectId) {
    query.projectId = filters.projectId;
  }

  if (filters.isCompleted !== undefined) query.isCompleted = filters.isCompleted;

  if (filters.dueDateStart || filters.dueDateEnd) {
    query.dueDate = {};
    if (filters.dueDateStart) query.dueDate.$gte = new Date(filters.dueDateStart);
    if (filters.dueDateEnd) query.dueDate.$lte = new Date(filters.dueDateEnd);
  }

  return await Milestone.countDocuments(query);
}

/**
 * COUNT_PROJECTS - Versión servidor con soporte de nombres
 */
export async function COUNT_PROJECTS(filters: SystemDataFilter = {}): Promise<number> {
  await connectDB();

  const query: any = {};

  if (filters.isActive !== undefined) query.isActive = filters.isActive;

  // Resolver projectManagerName a projectManagerId
  if (filters.projectManagerName) {
    const managerId = await resolveUserIdByName(filters.projectManagerName);
    if (managerId) query['projectManager.userId'] = managerId;
  } else if (filters.projectManagerId) {
    query['projectManager.userId'] = filters.projectManagerId;
  }

  return await Project.countDocuments(query);
}

/**
 * COUNT_USERS - Versión servidor
 */
export async function COUNT_USERS(filters: SystemDataFilter = {}): Promise<number> {
  await connectDB();

  const query: any = {};

  if (filters.role) query.role = filters.role;
  if (filters.area) query.area = filters.area;
  if (filters.isActive !== undefined) query.isActive = filters.isActive;
  if (filters.isAreaLeader !== undefined) query.isAreaLeader = filters.isAreaLeader;

  return await User.countDocuments(query);
}

/**
 * PERCENTAGE - Helper function
 */
export function PERCENTAGE(part: number, total: number): number {
  if (total === 0) return 0;
  return (part / total) * 100;
}

/**
 * COMPLETION_RATE - Versión servidor con soporte de nombres
 */
export async function COMPLETION_RATE(filters: SystemDataFilter = {}): Promise<number> {
  console.log('[COMPLETION_RATE Server] Filtros recibidos:', filters);
  const total = await COUNT_PRIORITIES(filters);
  console.log('[COMPLETION_RATE Server] Total prioridades:', total);
  const completed = await COUNT_PRIORITIES({ ...filters, status: 'COMPLETADO' });
  console.log('[COMPLETION_RATE Server] Prioridades completadas:', completed);
  const rate = PERCENTAGE(completed, total);
  console.log('[COMPLETION_RATE Server] Tasa calculada:', rate);
  return rate;
}
