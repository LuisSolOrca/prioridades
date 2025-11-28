import { useSession } from 'next-auth/react';

export interface UserPermissions {
  viewDashboard: boolean;
  viewAreaDashboard: boolean;
  viewMyPriorities: boolean;
  viewReports: boolean;
  viewAnalytics: boolean;
  viewLeaderboard: boolean;
  viewAutomations: boolean;
  viewHistory: boolean;
  canReassignPriorities: boolean;
  canCreateMilestones: boolean;
  canEditHistoricalPriorities: boolean;
  canManageProjects: boolean;
  canManageKPIs: boolean;
  // CRM Permissions
  viewCRM: boolean;
  canManageDeals: boolean;
  canManageContacts: boolean;
  canManagePipelineStages: boolean;
}

const DEFAULT_PERMISSIONS: UserPermissions = {
  viewDashboard: true,
  viewAreaDashboard: true,
  viewMyPriorities: true,
  viewReports: true,
  viewAnalytics: true,
  viewLeaderboard: true,
  viewAutomations: true,
  viewHistory: true,
  canReassignPriorities: false,
  canCreateMilestones: true,
  canEditHistoricalPriorities: false,
  canManageProjects: false,
  canManageKPIs: false,
  // CRM Permissions - Por defecto todos pueden ver y gestionar CRM
  viewCRM: true,
  canManageDeals: true,
  canManageContacts: true,
  canManagePipelineStages: false,
};

export function usePermissions() {
  const { data: session } = useSession();
  const user = session?.user as any;

  // Si es admin, tiene todos los permisos por defecto
  const isAdmin = user?.role === 'ADMIN';

  // Obtener permisos del usuario o usar defaults
  const permissions: UserPermissions = {
    ...DEFAULT_PERMISSIONS,
    ...(user?.permissions || {}),
    // Admin siempre puede reasignar, gestionar proyectos y gestionar KPIs
    canReassignPriorities: isAdmin || user?.permissions?.canReassignPriorities || false,
    canManageProjects: isAdmin || user?.permissions?.canManageProjects || false,
    canManageKPIs: isAdmin || user?.permissions?.canManageKPIs || false,
    // CRM - Admin siempre puede gestionar pipeline stages
    canManagePipelineStages: isAdmin || user?.permissions?.canManagePipelineStages || false,
  };

  const hasPermission = (permission: keyof UserPermissions): boolean => {
    return permissions[permission] === true;
  };

  return {
    permissions,
    hasPermission,
    isAdmin,
  };
}
