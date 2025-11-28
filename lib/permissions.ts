import { Session } from 'next-auth';

export type Permission =
  | 'viewDashboard'
  | 'viewAreaDashboard'
  | 'viewMyPriorities'
  | 'viewReports'
  | 'viewAnalytics'
  | 'viewLeaderboard'
  | 'viewAutomations'
  | 'viewHistory'
  | 'canReassignPriorities'
  | 'canCreateMilestones'
  | 'canEditHistoricalPriorities'
  // CRM Permissions
  | 'viewCRM'
  | 'canManageDeals'
  | 'canManageContacts'
  | 'canManagePipelineStages';

/**
 * Verifica si un usuario tiene un permiso específico
 * @param session - Sesión de NextAuth
 * @param permission - Permiso a verificar
 * @returns true si el usuario tiene el permiso, false en caso contrario
 */
export function hasPermission(session: Session | null, permission: Permission): boolean {
  if (!session || !session.user) {
    return false;
  }

  const user = session.user as any;

  // Los admins siempre tienen ciertos permisos
  if (user.role === 'ADMIN') {
    if (permission === 'canReassignPriorities' || permission === 'canEditHistoricalPriorities') {
      return true;
    }
  }

  // Verificar permisos del usuario
  if (user.permissions && typeof user.permissions[permission] === 'boolean') {
    return user.permissions[permission];
  }

  // Valores por defecto si no hay permisos definidos
  const defaultPermissions: Record<Permission, boolean> = {
    viewDashboard: true,
    viewAreaDashboard: true,
    viewMyPriorities: true,
    viewReports: true,
    viewAnalytics: true,
    viewLeaderboard: true,
    viewAutomations: true,
    viewHistory: true,
    canReassignPriorities: user.role === 'ADMIN',
    canCreateMilestones: true,
    canEditHistoricalPriorities: false,
    // CRM Permissions
    viewCRM: true,
    canManageDeals: true,
    canManageContacts: true,
    canManagePipelineStages: user.role === 'ADMIN',
  };

  return defaultPermissions[permission] ?? false;
}
