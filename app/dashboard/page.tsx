'use client';

import { useSession, signOut } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function DashboardPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
    }
  }, [status, router]);

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Cargando...</p>
        </div>
      </div>
    );
  }

  if (!session) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navbar */}
      <nav className="bg-white shadow-md">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center">
              <h1 className="text-xl font-bold text-gray-800">
                Sistema de Prioridades
              </h1>
            </div>
            <div className="flex items-center space-x-4">
              <div className="text-right">
                <p className="text-sm font-semibold text-gray-800">
                  {session.user?.name}
                </p>
                <p className="text-xs text-gray-500">
                  {(session.user as any)?.role === 'ADMIN' ? 'Administrador' : 'Usuario'}
                </p>
              </div>
              <button
                onClick={() => signOut({ callbackUrl: '/login' })}
                className="bg-red-500 text-white px-4 py-2 rounded-lg hover:bg-red-600 transition"
              >
                Salir
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Contenido */}
      <div className="container mx-auto px-4 py-8">
        <div className="bg-white rounded-lg shadow-md p-8">
          <h2 className="text-2xl font-bold text-gray-800 mb-4">
            ¡Bienvenido al Sistema de Prioridades! 🎯
          </h2>
          
          <div className="space-y-4">
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <h3 className="font-semibold text-green-900 mb-2">
                ✅ Deployment Exitoso
              </h3>
              <p className="text-green-700 text-sm">
                La aplicación se ha desplegado correctamente y la autenticación funciona.
              </p>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h3 className="font-semibold text-blue-900 mb-2">
                📋 Próximos Pasos
              </h3>
              <ol className="list-decimal list-inside text-blue-700 text-sm space-y-2">
                <li>Inicializar la base de datos (ejecutar script init-db.ts)</li>
                <li>Crear usuarios del equipo</li>
                <li>Configurar iniciativas estratégicas</li>
                <li>Comenzar a cargar prioridades semanales</li>
              </ol>
            </div>

            <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
              <h3 className="font-semibold text-purple-900 mb-2">
                🚀 Información del Usuario
              </h3>
              <div className="text-purple-700 text-sm space-y-1">
                <p><strong>Nombre:</strong> {session.user?.name}</p>
                <p><strong>Email:</strong> {session.user?.email}</p>
                <p><strong>Rol:</strong> {(session.user as any)?.role}</p>
              </div>
            </div>

            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <h3 className="font-semibold text-yellow-900 mb-2">
                ⚠️ Importante
              </h3>
              <p className="text-yellow-700 text-sm">
                Esta es una versión básica. Las funcionalidades completas (gestión de prioridades, 
                analytics, histórico) se agregarán en las próximas actualizaciones.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
