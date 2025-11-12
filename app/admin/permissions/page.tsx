'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import Navbar from '@/components/Navbar';

interface User {
  _id: string;
  name: string;
  email: string;
  role: string;
  area?: string;
  isActive: boolean;
  permissions?: {
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
  };
}

export default function PermissionsManagementPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
    } else if (session && (session.user as any).role !== 'ADMIN') {
      router.push('/dashboard');
    } else if (status === 'authenticated') {
      loadUsers();
    }
  }, [status, session, router]);

  const loadUsers = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/users');
      const data = await response.json();

      // Asegurar que todos los usuarios tengan permisos definidos con valores por defecto
      const usersWithPermissions = (Array.isArray(data) ? data : []).map((user: User) => ({
        ...user,
        permissions: user.permissions || {
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
        }
      }));

      setUsers(usersWithPermissions);
    } catch (error) {
      console.error('Error loading users:', error);
    } finally {
      setLoading(false);
    }
  };

  const handlePermissionChange = (permission: string, value: boolean) => {
    if (!selectedUser) return;

    setSelectedUser({
      ...selectedUser,
      permissions: {
        ...selectedUser.permissions,
        [permission]: value,
      } as User['permissions'],
    });
  };

  const handleSavePermissions = async () => {
    if (!selectedUser) return;

    try {
      setSaving(true);
      const response = await fetch(`/api/users/${selectedUser._id}/permissions`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ permissions: selectedUser.permissions }),
      });

      if (response.ok) {
        alert('Permisos actualizados exitosamente');
        await loadUsers();
        setSelectedUser(null);
      } else {
        alert('Error al actualizar permisos');
      }
    } catch (error) {
      console.error('Error saving permissions:', error);
      alert('Error al actualizar permisos');
    } finally {
      setSaving(false);
    }
  };

  if (loading || status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-400">Cargando...</p>
        </div>
      </div>
    );
  }

  const permissionLabels = {
    viewDashboard: 'Dashboard',
    viewAreaDashboard: 'Dashboard por Área',
    viewMyPriorities: 'Mis Prioridades',
    viewReports: 'Reportes',
    viewAnalytics: 'Analítica',
    viewLeaderboard: 'Leaderboard',
    viewAutomations: 'Automatizaciones',
    viewHistory: 'Historial',
    canReassignPriorities: 'Reasignar Prioridades',
    canCreateMilestones: 'Crear Hitos',
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Navbar />
      <div className="pt-16 main-content max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => router.push('/dashboard')}
            className="text-blue-600 dark:text-blue-400 hover:underline mb-4 flex items-center gap-2"
          >
            ← Volver al Dashboard
          </button>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
            🔐 Gestión de Permisos por Usuario
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">
            Configura los permisos de acceso y funcionalidades para cada usuario
          </p>
        </div>

        {/* Lista de Usuarios */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-900">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Usuario
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Email
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Rol
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Área
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Estado
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                {users.map((user) => (
                  <tr key={user._id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
                        {user.name}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-500 dark:text-gray-400">{user.email}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        user.role === 'ADMIN'
                          ? 'bg-purple-100 dark:bg-purple-900 text-purple-800 dark:text-purple-200'
                          : 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200'
                      }`}>
                        {user.role}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-500 dark:text-gray-400">
                        {user.area || '-'}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        user.isActive
                          ? 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200'
                          : 'bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200'
                      }`}>
                        {user.isActive ? 'Activo' : 'Inactivo'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <button
                        onClick={() => setSelectedUser(user)}
                        className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 font-medium"
                      >
                        ⚙️ Gestionar Permisos
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Modal de Permisos */}
        {selectedUser && (
          <div
            className="fixed inset-0 bg-black bg-opacity-50 dark:bg-opacity-70 flex items-center justify-center z-50 p-4"
            onClick={() => setSelectedUser(null)}
          >
            <div
              className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="sticky top-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4 flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-100">
                    🔐 Permisos de {selectedUser.name}
                  </h2>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                    {selectedUser.email} • {selectedUser.role}
                  </p>
                </div>
                <button
                  onClick={() => setSelectedUser(null)}
                  className="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 text-2xl"
                >
                  ×
                </button>
              </div>

              {/* Permisos */}
              <div className="p-6 space-y-6">
                {/* Permisos de Visualización */}
                <div>
                  <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-100 mb-4">
                    📊 Acceso a Pantallas
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {(['viewDashboard', 'viewAreaDashboard', 'viewMyPriorities', 'viewReports', 'viewAnalytics', 'viewLeaderboard', 'viewAutomations', 'viewHistory'] as const).map((permission) => (
                      <label
                        key={permission}
                        className="flex items-center space-x-3 p-3 rounded-lg bg-gray-50 dark:bg-gray-700 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600 transition"
                      >
                        <input
                          type="checkbox"
                          checked={selectedUser.permissions?.[permission] ?? true}
                          onChange={(e) => handlePermissionChange(permission, e.target.checked)}
                          className="w-5 h-5 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                        />
                        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                          {permissionLabels[permission]}
                        </span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Permisos de Acción */}
                <div>
                  <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-100 mb-4">
                    ⚡ Permisos de Acción
                  </h3>
                  <div className="space-y-3">
                    <label className="flex items-start space-x-3 p-4 rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 cursor-pointer hover:bg-blue-100 dark:hover:bg-blue-900/30 transition">
                      <input
                        type="checkbox"
                        checked={selectedUser.permissions?.canReassignPriorities ?? false}
                        onChange={(e) => handlePermissionChange('canReassignPriorities', e.target.checked)}
                        className="w-5 h-5 text-blue-600 rounded focus:ring-2 focus:ring-blue-500 mt-0.5"
                      />
                      <div>
                        <span className="text-sm font-semibold text-gray-800 dark:text-gray-100 block">
                          {permissionLabels.canReassignPriorities}
                        </span>
                        <span className="text-xs text-gray-600 dark:text-gray-400">
                          Permite al usuario asignar prioridades a otros usuarios
                        </span>
                      </div>
                    </label>

                    <label className="flex items-start space-x-3 p-4 rounded-lg bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 cursor-pointer hover:bg-orange-100 dark:hover:bg-orange-900/30 transition">
                      <input
                        type="checkbox"
                        checked={selectedUser.permissions?.canCreateMilestones ?? true}
                        onChange={(e) => handlePermissionChange('canCreateMilestones', e.target.checked)}
                        className="w-5 h-5 text-orange-600 rounded focus:ring-2 focus:ring-orange-500 mt-0.5"
                      />
                      <div>
                        <span className="text-sm font-semibold text-gray-800 dark:text-gray-100 block">
                          {permissionLabels.canCreateMilestones}
                        </span>
                        <span className="text-xs text-gray-600 dark:text-gray-400">
                          Permite al usuario crear y gestionar hitos
                        </span>
                      </div>
                    </label>
                  </div>
                </div>

                {/* Nota para Administradores */}
                {selectedUser.role === 'ADMIN' && (
                  <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
                    <div className="flex items-start gap-3">
                      <span className="text-yellow-600 dark:text-yellow-400 text-xl">⚠️</span>
                      <div>
                        <p className="text-sm font-semibold text-yellow-800 dark:text-yellow-200">
                          Usuario Administrador
                        </p>
                        <p className="text-xs text-yellow-700 dark:text-yellow-300 mt-1">
                          Los administradores tienen acceso completo al sistema por defecto, pero puedes personalizar sus permisos si es necesario.
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="sticky bottom-0 bg-gray-50 dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700 px-6 py-4 flex justify-end gap-3">
                <button
                  onClick={() => setSelectedUser(null)}
                  className="px-4 py-2 text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition font-medium"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleSavePermissions}
                  disabled={saving}
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {saving ? 'Guardando...' : '💾 Guardar Cambios'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
