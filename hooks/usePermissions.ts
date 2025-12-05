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
  // CRM Permissions - defaults consistentes con modelo User
  viewCRM: true,
  canManageDeals: true,
  canManageContacts: true,
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

  const isAdmin = user?.role === 'ADMIN';
  const userPerms = user?.permissions || {};

  // Helper: Si el permiso está explícitamente definido, usarlo. Si no, usar default (admin=true, user=default)
  const getPermission = (key: keyof UserPermissions): boolean => {
    if (userPerms[key] !== undefined) {
      return userPerms[key];
    }
    // Si no está definido, admin tiene true, usuarios normales usan default
    return isAdmin ? true : DEFAULT_PERMISSIONS[key];
  };

  // Obtener permisos - los valores explícitos tienen precedencia sobre el rol
  const permissions: UserPermissions = {
    viewDashboard: getPermission('viewDashboard'),
    viewAreaDashboard: getPermission('viewAreaDashboard'),
    viewMyPriorities: getPermission('viewMyPriorities'),
    viewReports: getPermission('viewReports'),
    viewAnalytics: getPermission('viewAnalytics'),
    viewLeaderboard: getPermission('viewLeaderboard'),
    viewAutomations: getPermission('viewAutomations'),
    viewHistory: getPermission('viewHistory'),
    canReassignPriorities: getPermission('canReassignPriorities'),
    canCreateMilestones: getPermission('canCreateMilestones'),
    canEditHistoricalPriorities: getPermission('canEditHistoricalPriorities'),
    canManageProjects: getPermission('canManageProjects'),
    canManageKPIs: getPermission('canManageKPIs'),
    // CRM Permissions
    viewCRM: getPermission('viewCRM'),
    canManageDeals: getPermission('canManageDeals'),
    canManageContacts: getPermission('canManageContacts'),
    canManagePipelineStages: getPermission('canManagePipelineStages'),
    // Marketing Permissions
    viewMarketing: getPermission('viewMarketing'),
    canManageCampaigns: getPermission('canManageCampaigns'),
    canPublishCampaigns: getPermission('canPublishCampaigns'),
    canManageWhatsApp: getPermission('canManageWhatsApp'),
    canViewWebAnalytics: getPermission('canViewWebAnalytics'),
    canConfigureMarketingIntegrations: getPermission('canConfigureMarketingIntegrations'),
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
