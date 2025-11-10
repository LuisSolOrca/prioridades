import User from '@/models/User';

// Cache para el ID de Francisco Puente (evita múltiples queries)
let cachedDireccionGeneralUserId: string | null = null;
let cacheTimestamp: number = 0;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutos

/**
 * Obtiene el ID del usuario de Dirección General (Francisco Puente)
 * con cache para mejorar performance
 */
export async function getDireccionGeneralUserId(): Promise<string | null> {
  const now = Date.now();

  // Si tenemos cache válido, usarlo
  if (cachedDireccionGeneralUserId && (now - cacheTimestamp) < CACHE_DURATION) {
    return cachedDireccionGeneralUserId;
  }

  // Buscar usuario
  const direccionGeneralUser = await User.findOne({ name: /Francisco Puente/i }).lean();

  cachedDireccionGeneralUserId = direccionGeneralUser?._id.toString() || null;
  cacheTimestamp = now;

  return cachedDireccionGeneralUserId;
}

/**
 * Verifica si un usuario es Francisco Puente
 */
export async function isDireccionGeneral(userId: string): Promise<boolean> {
  const direccionGeneralUserId = await getDireccionGeneralUserId();
  return direccionGeneralUserId === userId;
}

/**
 * Filtra una lista de usuarios para excluir a Francisco Puente
 * excepto si el usuario actual ES Francisco Puente
 */
export function filterDireccionGeneralFromUsers(
  users: any[],
  currentUserId: string,
  direccionGeneralUserId: string | null
): any[] {
  if (!direccionGeneralUserId) return users;

  return users.filter(u => {
    const userId = u._id.toString();
    // Si es Francisco Puente y el usuario actual no es él, ocultarlo
    if (userId === direccionGeneralUserId) {
      return currentUserId === direccionGeneralUserId;
    }
    return true;
  });
}

/**
 * Añade filtros de query para excluir prioridades de Dirección General
 * SOLO Francisco Puente puede ver sus propias prioridades
 */
export function addDireccionGeneralFilter(
  query: any,
  currentUserId: string,
  direccionGeneralUserId: string | null
): void {
  if (!direccionGeneralUserId || currentUserId === direccionGeneralUserId) {
    return; // Francisco Puente ve todo
  }

  // Si ya hay un filtro de userId específico
  if (query.userId) {
    // Si el userId del query ES Francisco Puente, forzar resultado vacío
    if (query.userId === direccionGeneralUserId) {
      query._id = { $exists: false };
    }
  } else {
    // Si no hay filtro de userId, excluir a Francisco Puente
    query.userId = { $ne: direccionGeneralUserId };
  }
}
