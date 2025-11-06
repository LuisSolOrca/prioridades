'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import Navbar from '@/components/Navbar';

interface AzureLink {
  _id: string;
  userId: {
    _id: string;
    name: string;
    email: string;
  };
  priorityId: {
    _id: string;
    title: string;
    status: string;
    weekStart: string;
  };
  workItemId: number;
  workItemType: string;
  organization: string;
  project: string;
  lastSyncDate?: string;
  lastSyncedState?: string;
}

export default function AzureLinksManagementPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [links, setLinks] = useState<AzureLink[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filterUser, setFilterUser] = useState('');
  const [filterWorkItem, setFilterWorkItem] = useState('');
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
    } else if (status === 'authenticated') {
      // Verificar que sea admin del área Tecnología
      const user = session?.user as any;
      if (user.role !== 'ADMIN' || user.area !== 'Tecnología') {
        router.push('/dashboard');
      } else {
        fetchLinks();
      }
    }
  }, [status, session, router]);

  const fetchLinks = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/azure-devops/links');

      if (!response.ok) {
        throw new Error('Error al cargar los vínculos');
      }

      const data = await response.json();
      setLinks(data.links || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteLink = async (linkId: string) => {
    if (!confirm('¿Estás seguro de que deseas eliminar este vínculo? Esta acción no se puede deshacer.')) {
      return;
    }

    try {
      setDeletingId(linkId);
      const response = await fetch(`/api/azure-devops/links/${linkId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Error al eliminar el vínculo');
      }

      // Actualizar la lista
      setLinks(links.filter(link => link._id !== linkId));
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Error al eliminar el vínculo');
    } finally {
      setDeletingId(null);
    }
  };

  const filteredLinks = links.filter(link => {
    const matchesUser = !filterUser ||
      link.userId.name.toLowerCase().includes(filterUser.toLowerCase()) ||
      link.userId.email.toLowerCase().includes(filterUser.toLowerCase());

    const matchesWorkItem = !filterWorkItem ||
      link.workItemId.toString().includes(filterWorkItem) ||
      link.priorityId.title.toLowerCase().includes(filterWorkItem.toLowerCase());

    return matchesUser && matchesWorkItem;
  });

  if (status === 'loading' || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-gray-600 dark:text-gray-400">Cargando...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Navbar />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Gestión de Vínculos Azure DevOps
          </h1>
          <p className="mt-2 text-gray-600 dark:text-gray-400">
            Administra todos los vínculos entre prioridades y work items de Azure DevOps
          </p>
        </div>

        {/* Error message */}
        {error && (
          <div className="mb-6 p-4 bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-200 rounded-lg">
            {error}
          </div>
        )}

        {/* Filters */}
        <div className="mb-6 grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Filtrar por Usuario
            </label>
            <input
              type="text"
              value={filterUser}
              onChange={(e) => setFilterUser(e.target.value)}
              placeholder="Nombre o email del usuario..."
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:text-white"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Filtrar por Work Item / Prioridad
            </label>
            <input
              type="text"
              value={filterWorkItem}
              onChange={(e) => setFilterWorkItem(e.target.value)}
              placeholder="ID de work item o título de prioridad..."
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:text-white"
            />
          </div>
        </div>

        {/* Stats */}
        <div className="mb-6 grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow">
            <div className="text-sm text-gray-600 dark:text-gray-400">Total de Vínculos</div>
            <div className="text-2xl font-bold text-gray-900 dark:text-white">{links.length}</div>
          </div>

          <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow">
            <div className="text-sm text-gray-600 dark:text-gray-400">Vínculos Filtrados</div>
            <div className="text-2xl font-bold text-gray-900 dark:text-white">{filteredLinks.length}</div>
          </div>

          <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow">
            <div className="text-sm text-gray-600 dark:text-gray-400">Usuarios Únicos</div>
            <div className="text-2xl font-bold text-gray-900 dark:text-white">
              {new Set(links.map(l => l.userId._id)).size}
            </div>
          </div>
        </div>

        {/* Links Table */}
        <div className="bg-white dark:bg-gray-800 shadow rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Usuario
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Prioridad
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Work Item
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Proyecto
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Última Sync
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                {filteredLinks.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-8 text-center text-gray-500 dark:text-gray-400">
                      No hay vínculos que mostrar
                    </td>
                  </tr>
                ) : (
                  filteredLinks.map((link) => (
                    <tr key={link._id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900 dark:text-white">
                          {link.userId.name}
                        </div>
                        <div className="text-sm text-gray-500 dark:text-gray-400">
                          {link.userId.email}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-gray-900 dark:text-white max-w-xs truncate">
                          {link.priorityId.title}
                        </div>
                        <div className="text-sm text-gray-500 dark:text-gray-400">
                          {link.priorityId.status} • {new Date(link.priorityId.weekStart).toLocaleDateString('es-MX')}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900 dark:text-white">
                          #{link.workItemId}
                        </div>
                        <div className="text-sm text-gray-500 dark:text-gray-400">
                          {link.workItemType}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900 dark:text-white">
                          {link.project}
                        </div>
                        <div className="text-sm text-gray-500 dark:text-gray-400">
                          {link.organization}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {link.lastSyncDate ? (
                          <div className="text-sm text-gray-900 dark:text-white">
                            {new Date(link.lastSyncDate).toLocaleString('es-MX')}
                          </div>
                        ) : (
                          <div className="text-sm text-gray-500 dark:text-gray-400">
                            Nunca
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <button
                          onClick={() => handleDeleteLink(link._id)}
                          disabled={deletingId === link._id}
                          className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300 disabled:opacity-50"
                        >
                          {deletingId === link._id ? 'Eliminando...' : 'Eliminar'}
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
