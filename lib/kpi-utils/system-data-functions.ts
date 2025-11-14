/**
 * Sistema de funciones para acceder a datos del sistema en fórmulas de KPIs
 *
 * Permite consultar prioridades, hitos, proyectos y usuarios con filtros avanzados
 */

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

export type DataType = 'priorities' | 'milestones' | 'projects' | 'users';

/**
 * Función para consultar datos del sistema
 */
export async function querySystemData(
  dataType: DataType,
  filters: SystemDataFilter = {},
  fields: string[] = []
): Promise<any[]> {
  try {
    const response = await fetch('/api/kpis/system-data', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ dataType, filters, fields })
    });

    if (!response.ok) {
      throw new Error(`Error querying ${dataType}: ${response.statusText}`);
    }

    const data = await response.json();
    return data.results || [];
  } catch (error) {
    console.error('Error in querySystemData:', error);
    return [];
  }
}

/**
 * FUNCIONES ESPECIALES PARA USAR EN FÓRMULAS
 */

/**
 * COUNT_PRIORITIES - Cuenta prioridades con filtros opcionales
 * Ejemplos:
 *  - COUNT_PRIORITIES() // Todas las prioridades
 *  - COUNT_PRIORITIES({status: "COMPLETADO"}) // Prioridades completadas
 *  - COUNT_PRIORITIES({userId: "123", status: "EN_TIEMPO"}) // Prioridades en tiempo de un usuario
 */
export async function COUNT_PRIORITIES(filters: SystemDataFilter = {}): Promise<number> {
  const results = await querySystemData('priorities', filters, ['_id']);
  return results.length;
}

/**
 * SUM_PRIORITIES - Suma un campo numérico de prioridades
 * Ejemplo: SUM_PRIORITIES('completionPercentage', {status: "COMPLETADO"})
 */
export async function SUM_PRIORITIES(field: string, filters: SystemDataFilter = {}): Promise<number> {
  const results = await querySystemData('priorities', filters, [field]);
  return results.reduce((sum, item) => sum + (item[field] || 0), 0);
}

/**
 * AVG_PRIORITIES - Promedio de un campo numérico de prioridades
 * Ejemplo: AVG_PRIORITIES('completionPercentage', {userId: "123"})
 */
export async function AVG_PRIORITIES(field: string, filters: SystemDataFilter = {}): Promise<number> {
  const results = await querySystemData('priorities', filters, [field]);
  if (results.length === 0) return 0;
  const sum = results.reduce((acc, item) => acc + (item[field] || 0), 0);
  return sum / results.length;
}

/**
 * COUNT_MILESTONES - Cuenta hitos con filtros opcionales
 */
export async function COUNT_MILESTONES(filters: SystemDataFilter = {}): Promise<number> {
  const results = await querySystemData('milestones', filters, ['_id']);
  return results.length;
}

/**
 * COUNT_PROJECTS - Cuenta proyectos con filtros opcionales
 */
export async function COUNT_PROJECTS(filters: SystemDataFilter = {}): Promise<number> {
  const results = await querySystemData('projects', filters, ['_id']);
  return results.length;
}

/**
 * COUNT_USERS - Cuenta usuarios con filtros opcionales
 */
export async function COUNT_USERS(filters: SystemDataFilter = {}): Promise<number> {
  const results = await querySystemData('users', filters, ['_id']);
  return results.length;
}

/**
 * GET_PRIORITIES - Obtiene array de prioridades para procesamiento avanzado
 */
export async function GET_PRIORITIES(filters: SystemDataFilter = {}, fields: string[] = []): Promise<any[]> {
  return await querySystemData('priorities', filters, fields);
}

/**
 * GET_MILESTONES - Obtiene array de hitos
 */
export async function GET_MILESTONES(filters: SystemDataFilter = {}, fields: string[] = []): Promise<any[]> {
  return await querySystemData('milestones', filters, fields);
}

/**
 * GET_PROJECTS - Obtiene array de proyectos
 */
export async function GET_PROJECTS(filters: SystemDataFilter = {}, fields: string[] = []): Promise<any[]> {
  return await querySystemData('projects', filters, fields);
}

/**
 * GET_USERS - Obtiene array de usuarios
 */
export async function GET_USERS(filters: SystemDataFilter = {}, fields: string[] = []): Promise<any[]> {
  return await querySystemData('users', filters, fields);
}

/**
 * Helpers para construir filtros de fecha comunes
 */
export const DateFilters = {
  // Semana actual
  thisWeek: () => {
    const now = new Date();
    const monday = new Date(now);
    monday.setDate(now.getDate() - now.getDay() + 1);
    monday.setHours(0, 0, 0, 0);

    const friday = new Date(monday);
    friday.setDate(monday.getDate() + 4);
    friday.setHours(23, 59, 59, 999);

    return {
      weekStart: monday.toISOString(),
      weekEnd: friday.toISOString()
    };
  },

  // Mes actual
  thisMonth: () => {
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), 1);
    const end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

    return {
      weekStart: start.toISOString(),
      weekEnd: end.toISOString()
    };
  },

  // Últimos N días
  lastNDays: (days: number) => {
    const now = new Date();
    const start = new Date(now);
    start.setDate(now.getDate() - days);
    start.setHours(0, 0, 0, 0);

    return {
      weekStart: start.toISOString(),
      weekEnd: now.toISOString()
    };
  }
};

/**
 * Función helper para calcular porcentajes
 */
export function PERCENTAGE(part: number, total: number): number {
  if (total === 0) return 0;
  return (part / total) * 100;
}

/**
 * Función helper para tasa de cumplimiento
 */
export async function COMPLETION_RATE(filters: SystemDataFilter = {}): Promise<number> {
  const total = await COUNT_PRIORITIES(filters);
  const completed = await COUNT_PRIORITIES({ ...filters, status: 'COMPLETADO' });
  return PERCENTAGE(completed, total);
}
