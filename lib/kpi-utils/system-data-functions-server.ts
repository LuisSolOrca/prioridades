/**
 * Sistema de funciones para acceder a datos del sistema - VERSIÓN SERVIDOR
 *
 * Esta versión accede directamente a la base de datos sin hacer fetch HTTP
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
  userId?: string;
  isActive?: boolean;

  // Filtros específicos de prioridades
  initiativeId?: string;
  projectId?: string;
  clientId?: string;
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
  projectManagerId?: string;

  // Filtros específicos de usuarios
  role?: string;
  area?: string;
  isAreaLeader?: boolean;
}

/**
 * COUNT_PRIORITIES - Versión servidor
 */
export async function COUNT_PRIORITIES(filters: SystemDataFilter = {}): Promise<number> {
  await connectDB();

  const query: any = {};

  if (filters.status) query.status = filters.status;
  if (filters.type) query.type = filters.type;
  if (filters.userId) query.userId = filters.userId;
  if (filters.initiativeId) query.initiativeIds = filters.initiativeId;
  if (filters.projectId) query.projectId = filters.projectId;
  if (filters.clientId) query.clientId = filters.clientId;
  if (filters.isCarriedOver !== undefined) query.isCarriedOver = filters.isCarriedOver;

  if (filters.weekStart || filters.weekEnd) {
    query.weekStart = {};
    if (filters.weekStart) query.weekStart.$gte = new Date(filters.weekStart);
    if (filters.weekEnd) query.weekEnd = { $lte: new Date(filters.weekEnd) };
  }

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
 * SUM_PRIORITIES - Versión servidor
 */
export async function SUM_PRIORITIES(field: string, filters: SystemDataFilter = {}): Promise<number> {
  await connectDB();

  const query: any = {};

  if (filters.status) query.status = filters.status;
  if (filters.type) query.type = filters.type;
  if (filters.userId) query.userId = filters.userId;
  if (filters.initiativeId) query.initiativeIds = filters.initiativeId;
  if (filters.projectId) query.projectId = filters.projectId;

  const results = await Priority.find(query).select(field).lean();
  const sum = results.reduce((acc, item) => acc + ((item as any)[field] || 0), 0);

  return sum;
}

/**
 * AVG_PRIORITIES - Versión servidor
 */
export async function AVG_PRIORITIES(field: string, filters: SystemDataFilter = {}): Promise<number> {
  await connectDB();

  const query: any = {};

  if (filters.status) query.status = filters.status;
  if (filters.type) query.type = filters.type;
  if (filters.userId) query.userId = filters.userId;
  if (filters.initiativeId) query.initiativeIds = filters.initiativeId;
  if (filters.projectId) query.projectId = filters.projectId;

  const results = await Priority.find(query).select(field).lean();
  if (results.length === 0) return 0;

  const sum = results.reduce((acc, item) => acc + ((item as any)[field] || 0), 0);
  return sum / results.length;
}

/**
 * COUNT_MILESTONES - Versión servidor
 */
export async function COUNT_MILESTONES(filters: SystemDataFilter = {}): Promise<number> {
  await connectDB();

  const query: any = {};

  if (filters.userId) query.userId = filters.userId;
  if (filters.projectId) query.projectId = filters.projectId;
  if (filters.isCompleted !== undefined) query.isCompleted = filters.isCompleted;

  if (filters.dueDateStart || filters.dueDateEnd) {
    query.dueDate = {};
    if (filters.dueDateStart) query.dueDate.$gte = new Date(filters.dueDateStart);
    if (filters.dueDateEnd) query.dueDate.$lte = new Date(filters.dueDateEnd);
  }

  return await Milestone.countDocuments(query);
}

/**
 * COUNT_PROJECTS - Versión servidor
 */
export async function COUNT_PROJECTS(filters: SystemDataFilter = {}): Promise<number> {
  await connectDB();

  const query: any = {};

  if (filters.isActive !== undefined) query.isActive = filters.isActive;
  if (filters.projectManagerId) query['projectManager.userId'] = filters.projectManagerId;

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
 * COMPLETION_RATE - Versión servidor
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
