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
  // Marketing Permissions
  viewMarketing: boolean;
  canManageCampaigns: boolean;
  canPublishCampaigns: boolean;
  canManageWhatsApp: boolean;
  canViewWebAnalytics: boolean;
  canConfigureMarketingIntegrations: boolean;
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
  // CRM Permissions - Por defecto solo admins tienen acceso
  viewCRM: false,
  canManageDeals: false,
  canManageContacts: false,
  canManagePipelineStages: false,
  // Marketing Permissions
  viewMarketing: true,
  canManageCampaigns: true,
  canPublishCampaigns: false,
  canManageWhatsApp: false,
  canViewWebAnalytics: true,
  canConfigureMarketingIntegrations: false,
};

export function usePermissions() {
  const { data: session, status } = useSession();
  const isLoading = status === 'loading';
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
    // CRM - Admin siempre tiene acceso completo
    viewCRM: isAdmin || user?.permissions?.viewCRM || false,
    canManageDeals: isAdmin || user?.permissions?.canManageDeals || false,
    canManageContacts: isAdmin || user?.permissions?.canManageContacts || false,
    canManagePipelineStages: isAdmin || user?.permissions?.canManagePipelineStages || false,
    // Marketing - Admin siempre tiene acceso completo
    viewMarketing: isAdmin || user?.permissions?.viewMarketing || DEFAULT_PERMISSIONS.viewMarketing,
    canManageCampaigns: isAdmin || user?.permissions?.canManageCampaigns || DEFAULT_PERMISSIONS.canManageCampaigns,
    canPublishCampaigns: isAdmin || user?.permissions?.canPublishCampaigns || false,
    canManageWhatsApp: isAdmin || user?.permissions?.canManageWhatsApp || false,
    canViewWebAnalytics: isAdmin || user?.permissions?.canViewWebAnalytics || DEFAULT_PERMISSIONS.canViewWebAnalytics,
    canConfigureMarketingIntegrations: isAdmin || user?.permissions?.canConfigureMarketingIntegrations || false,
  };

  const hasPermission = (permission: keyof UserPermissions): boolean => {
    return permissions[permission] === true;
  };

  return {
    permissions,
    hasPermission,
    isAdmin,
    isLoading,
  };
}
