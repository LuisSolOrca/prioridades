'use client';

import { usePermissions } from '@/hooks/usePermissions';
import { useRouter } from 'next/navigation';

interface PermissionGuardProps {
  children: React.ReactNode;
  permission: 'viewDashboard' | 'viewAreaDashboard' | 'viewMyPriorities' | 'viewReports' | 'viewAnalytics' | 'viewLeaderboard' | 'viewAutomations' | 'viewHistory';
  fallbackPath?: string;
}

export default function PermissionGuard({ children, permission, fallbackPath = '/dashboard' }: PermissionGuardProps) {
  const { hasPermission } = usePermissions();
  const router = useRouter();

  if (!hasPermission(permission)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-center p-8 bg-white dark:bg-gray-800 rounded-lg shadow-md max-w-md">
          <div className="text-6xl mb-4">🔒</div>
          <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-100 mb-2">
            Acceso Denegado
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            No tienes permiso para acceder a esta sección.
          </p>
          <button
            onClick={() => router.push(fallbackPath)}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
          >
            Volver al Dashboard
          </button>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
