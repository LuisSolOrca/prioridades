'use client';

import { ShieldX, ArrowLeft, Home, Search } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

interface AccessDeniedProps {
  title?: string;
  message?: string;
  showBackButton?: boolean;
  showHomeButton?: boolean;
  showSearchButton?: boolean;
  requiredRole?: string;
}

export default function AccessDenied({
  title = 'Acceso Denegado',
  message = 'No tienes permiso para ver esta página.',
  showBackButton = true,
  showHomeButton = true,
  showSearchButton = true,
  requiredRole,
}: AccessDeniedProps) {
  const router = useRouter();

  return (
    <div className="min-h-[60vh] flex items-center justify-center px-4">
      <div className="text-center max-w-md">
        {/* Icono animado */}
        <div className="relative mb-8">
          <div className="w-24 h-24 mx-auto bg-gradient-to-br from-red-100 to-orange-100 dark:from-red-900/30 dark:to-orange-900/30 rounded-full flex items-center justify-center animate-pulse">
            <ShieldX className="w-12 h-12 text-red-500 dark:text-red-400" />
          </div>
          <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-16 h-1 bg-gradient-to-r from-transparent via-red-300 dark:via-red-700 to-transparent rounded-full" />
        </div>

        {/* Código de error */}
        <div className="mb-4">
          <span className="text-6xl font-bold bg-gradient-to-r from-red-500 to-orange-500 bg-clip-text text-transparent">
            403
          </span>
        </div>

        {/* Título */}
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-3">
          {title}
        </h1>

        {/* Mensaje */}
        <p className="text-gray-600 dark:text-gray-400 mb-2">
          {message}
        </p>

        {/* Rol requerido si se especifica */}
        {requiredRole && (
          <p className="text-sm text-gray-500 dark:text-gray-500 mb-6">
            Rol requerido: <span className="font-medium text-red-600 dark:text-red-400">{requiredRole}</span>
          </p>
        )}

        {!requiredRole && <div className="mb-6" />}

        {/* Botones de acción */}
        <div className="flex flex-wrap items-center justify-center gap-3">
          {showBackButton && (
            <button
              onClick={() => router.back()}
              className="flex items-center gap-2 px-4 py-2.5 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              Volver
            </button>
          )}

          {showHomeButton && (
            <Link
              href="/dashboard"
              className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Home className="w-4 h-4" />
              Ir al Dashboard
            </Link>
          )}

          {showSearchButton && (
            <Link
              href="/busquedaglobal"
              className="flex items-center gap-2 px-4 py-2.5 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
            >
              <Search className="w-4 h-4" />
              Buscar
            </Link>
          )}
        </div>

        {/* Sugerencia */}
        <p className="mt-8 text-xs text-gray-400 dark:text-gray-600">
          Si crees que deberías tener acceso, contacta a tu administrador.
        </p>
      </div>
    </div>
  );
}
