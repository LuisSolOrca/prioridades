'use client';

export const dynamic = 'force-dynamic';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Navbar from '@/components/Navbar';

interface Initiative {
  _id?: string;
  name: string;
  description?: string;
  color: string;
  order: number;
  isActive: boolean;
}

export default function InitiativesPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [initiatives, setInitiatives] = useState<Initiative[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'active' | 'inactive'>('active');

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
      return;
    }

    if (status === 'authenticated') {
      loadInitiatives();
    }
  }, [status, router]);

  const loadInitiatives = async () => {
    try {
      const res = await fetch('/api/initiatives');
      const data = await res.json();
      setInitiatives(data.sort((a: Initiative, b: Initiative) => a.order - b.order));
    } catch (error) {
      console.error('Error loading initiatives:', error);
    } finally {
      setLoading(false);
    }
  };

  if (status === 'loading' || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <div className="text-4xl mb-4">⏳</div>
          <div className="text-gray-600 dark:text-gray-400">Cargando...</div>
        </div>
      </div>
    );
  }

  if (!session) return null;

  const user = session.user as any;
  const isAdmin = user.role === 'ADMIN';

  const filteredInitiatives = initiatives.filter(initiative => {
    if (filter === 'active') return initiative.isActive;
    if (filter === 'inactive') return !initiative.isActive;
    return true;
  });

  const activeCount = initiatives.filter(i => i.isActive).length;
  const inactiveCount = initiatives.filter(i => !i.isActive).length;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Navbar />
      <div className="pt-16 main-content px-4 py-6 max-w-7xl mx-auto">
        <div className="space-y-6">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-800 dark:text-gray-100">
                Iniciativas Estrategicas
              </h1>
              <p className="text-gray-600 dark:text-gray-400 mt-1">
                {activeCount} activas / {initiatives.length} total
              </p>
            </div>
            <div className="flex items-center gap-3">
              {/* Filter buttons */}
              <div className="flex bg-gray-100 dark:bg-gray-800 rounded-lg p-1">
                <button
                  onClick={() => setFilter('active')}
                  className={`px-4 py-2 text-sm font-medium rounded-md transition ${
                    filter === 'active'
                      ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 shadow'
                      : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100'
                  }`}
                >
                  Activas ({activeCount})
                </button>
                <button
                  onClick={() => setFilter('all')}
                  className={`px-4 py-2 text-sm font-medium rounded-md transition ${
                    filter === 'all'
                      ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 shadow'
                      : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100'
                  }`}
                >
                  Todas ({initiatives.length})
                </button>
                {inactiveCount > 0 && (
                  <button
                    onClick={() => setFilter('inactive')}
                    className={`px-4 py-2 text-sm font-medium rounded-md transition ${
                      filter === 'inactive'
                        ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 shadow'
                        : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100'
                    }`}
                  >
                    Inactivas ({inactiveCount})
                  </button>
                )}
              </div>
              {isAdmin && (
                <button
                  onClick={() => router.push('/admin/initiatives')}
                  className="bg-blue-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-blue-700 transition shadow-md flex items-center gap-2"
                >
                  <span>Gestionar</span>
                </button>
              )}
            </div>
          </div>

          <div className="bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
            <div className="flex items-start">
              <span className="text-2xl mr-3">ℹ️</span>
              <div className="text-sm text-blue-800 dark:text-blue-200">
                <strong>¿Que son las iniciativas estrategicas?</strong>
                <p className="mt-1">
                  Son los ejes de accion principales de la empresa. Todas las prioridades deben estar
                  alineadas a al menos una iniciativa para asegurar que el trabajo esta enfocado en lo estrategico.
                  Todas las iniciativas son independientes e igualmente importantes.
                </p>
              </div>
            </div>
          </div>

          {filteredInitiatives.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-4xl mb-4">📋</div>
              <p className="text-gray-500 dark:text-gray-400">
                No hay iniciativas {filter === 'active' ? 'activas' : filter === 'inactive' ? 'inactivas' : ''} para mostrar
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {filteredInitiatives.map((initiative) => (
                <div
                  key={initiative._id}
                  className={`bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 border-l-4 ${
                    !initiative.isActive ? 'opacity-60' : ''
                  }`}
                  style={{ borderColor: initiative.color }}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-2">
                        <div
                          className="w-4 h-4 rounded-full flex-shrink-0"
                          style={{ backgroundColor: initiative.color }}
                        />
                        <h3 className="text-lg font-bold text-gray-800 dark:text-gray-100">
                          {initiative.name}
                        </h3>
                      </div>
                      {initiative.description && (
                        <p className="text-sm text-gray-600 dark:text-gray-400 mt-2 ml-7">
                          {initiative.description}
                        </p>
                      )}
                    </div>
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-semibold flex-shrink-0 ${
                        initiative.isActive
                          ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200'
                          : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300'
                      }`}
                    >
                      {initiative.isActive ? 'Activa' : 'Inactiva'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
