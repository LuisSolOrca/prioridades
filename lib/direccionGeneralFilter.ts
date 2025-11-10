/**
 * ID hardcodeado del usuario de Dirección General (Francisco Puente)
 * Email: fpuente@orcagrc.com
 */
export const DIRECCION_GENERAL_USER_ID = '69056261c40e93d1b339a20d';

/**
 * Verifica si un usuario es Francisco Puente
 */
export function isDireccionGeneral(userId: string): boolean {
  return userId === DIRECCION_GENERAL_USER_ID;
}

/**
 * Filtra una lista de usuarios para excluir a Francisco Puente
 * excepto si el usuario actual ES Francisco Puente
 */
export function filterDireccionGeneralFromUsers(
  users: any[],
  currentUserId: string
): any[] {
  return users.filter(u => {
    const userId = u._id.toString();
    // Si es Francisco Puente y el usuario actual no es él, ocultarlo
    if (userId === DIRECCION_GENERAL_USER_ID) {
      return currentUserId === DIRECCION_GENERAL_USER_ID;
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
  currentUserId: string
): void {
  if (currentUserId === DIRECCION_GENERAL_USER_ID) {
    return; // Francisco Puente ve todo
  }

  // Si ya hay un filtro de userId específico
  if (query.userId) {
    // Si el userId del query ES Francisco Puente, forzar resultado vacío
    if (query.userId === DIRECCION_GENERAL_USER_ID) {
      query._id = { $exists: false };
    }
  } else {
    // Si no hay filtro de userId, excluir a Francisco Puente
    query.userId = { $ne: DIRECCION_GENERAL_USER_ID };
  }
}
