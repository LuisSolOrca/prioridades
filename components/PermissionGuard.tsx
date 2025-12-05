'use client';

import { usePermissions, UserPermissions } from '@/hooks/usePermissions';
import AccessDenied from '@/components/AccessDenied';
import Navbar from '@/components/Navbar';
import { Loader2 } from 'lucide-react';

interface PermissionGuardProps {
  children: React.ReactNode;
  permission: keyof UserPermissions;
  requireAdmin?: boolean;
  showNavbar?: boolean;
  customMessage?: string;
}

// Mapeo de permisos a nombres legibles
const PERMISSION_LABELS: Record<keyof UserPermissions, string> = {
  viewDashboard: 'Ver Dashboard',
  viewAreaDashboard: 'Ver Dashboard de Área',
  viewMyPriorities: 'Ver Mis Prioridades',
  viewReports: 'Ver Reportes',
  viewAnalytics: 'Ver Analíticas',
  viewLeaderboard: 'Ver Leaderboard',
  viewAutomations: 'Ver Automatizaciones',
  viewHistory: 'Ver Historial',
  canReassignPriorities: 'Reasignar Prioridades',
  canCreateMilestones: 'Crear Hitos',
  canEditHistoricalPriorities: 'Editar Prioridades Históricas',
  canManageProjects: 'Gestionar Proyectos',
  canManageKPIs: 'Gestionar KPIs',
  viewCRM: 'Ver CRM',
  canManageDeals: 'Gestionar Deals',
  canManageContacts: 'Gestionar Contactos',
  canManagePipelineStages: 'Gestionar Etapas de Pipeline',
  // Marketing permissions
  viewMarketing: 'Ver Marketing Hub',
  canManageCampaigns: 'Gestionar Campañas',
  canPublishCampaigns: 'Publicar Campañas',
  canManageWhatsApp: 'Gestionar WhatsApp Business',
  canViewWebAnalytics: 'Ver Web Analytics',
  canConfigureMarketingIntegrations: 'Configurar Integraciones de Marketing',
};

export default function PermissionGuard({
  children,
  permission,
  requireAdmin = false,
  showNavbar = true,
  customMessage,
}: PermissionGuardProps) {
  const { hasPermission, isAdmin, isLoading } = usePermissions();

  // Mostrar loading mientras se cargan los permisos
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  // Verificar si requiere admin
  if (requireAdmin && !isAdmin) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        {showNavbar && <Navbar />}
        <div className={showNavbar ? 'pt-16' : ''}>
          <AccessDenied
            title="Acceso Restringido"
            message={customMessage || "Esta sección es exclusiva para administradores."}
            requiredRole="Administrador"
          />
        </div>
      </div>
    );
  }

  // Verificar permiso específico
  if (!hasPermission(permission)) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        {showNavbar && <Navbar />}
        <div className={showNavbar ? 'pt-16' : ''}>
          <AccessDenied
            title="Acceso Denegado"
            message={customMessage || `No tienes permiso para acceder a esta sección.`}
            requiredRole={PERMISSION_LABELS[permission]}
          />
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
