'use client';

import { useState } from 'react';
import { signOut } from 'next-auth/react';
import { RefreshCw } from 'lucide-react';

/**
 * Componente para refrescar la sesión del usuario
 *
 * Permite a los usuarios actualizar sus permisos sin tener que
 * cerrar y abrir sesión manualmente.
 */
export default function SessionRefreshButton() {
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = async () => {
    setIsRefreshing(true);

    try {
      const response = await fetch('/api/auth/refresh-session', {
        method: 'POST',
      });

      const data = await response.json();

      if (response.ok && data.requiresRelogin) {
        // Mostrar mensaje al usuario
        if (confirm('Tu sesión necesita actualizarse. ¿Deseas cerrar sesión ahora para aplicar los cambios?')) {
          await signOut({ callbackUrl: '/login' });
        }
      } else if (response.ok) {
        alert('Sesión actualizada correctamente');
        window.location.reload();
      } else {
        throw new Error(data.error || 'Error al actualizar sesión');
      }
    } catch (error) {
      console.error('Error:', error);
      alert('Error al actualizar la sesión. Por favor, intenta cerrar sesión manualmente.');
    } finally {
      setIsRefreshing(false);
    }
  };

  return (
    <button
      onClick={handleRefresh}
      disabled={isRefreshing}
      className="flex items-center space-x-2 px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition disabled:opacity-50"
      title="Actualizar permisos"
    >
      <RefreshCw size={16} className={isRefreshing ? 'animate-spin' : ''} />
      <span>{isRefreshing ? 'Actualizando...' : 'Actualizar permisos'}</span>
    </button>
  );
}
