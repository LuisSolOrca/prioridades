'use client';

import { useSession, signOut } from 'next-auth/react';
import { useRouter, usePathname } from 'next/navigation';
import { useState } from 'react';
import NotificationCenter from './NotificationCenter';

interface NavButtonProps {
  label: string;
  active: boolean;
  onClick: () => void;
  mobile?: boolean;
}

function NavButton({ label, active, onClick, mobile = false }: NavButtonProps) {
  return (
    <button
      onClick={onClick}
      className={`${mobile ? 'w-full text-left px-4 py-3' : 'px-3 py-2'} rounded-lg font-medium transition ${
        active ? 'bg-blue-100 text-blue-700' : 'text-gray-600 hover:bg-gray-100'
      }`}
    >
      {label}
    </button>
  );
}

export default function Navbar() {
  const { data: session } = useSession();
  const router = useRouter();
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  if (!session) return null;

  const user = session.user as any;

  const handleNavigation = (path: string) => {
    router.push(path);
    setMobileMenuOpen(false);
  };

  return (
    <nav className="bg-white shadow-md">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* Logo y botón móvil */}
          <div className="flex items-center justify-between w-full md:w-auto">
            <div className="flex items-center cursor-pointer" onClick={() => handleNavigation('/dashboard')}>
              <span className="font-bold text-xl text-gray-800">🎯 Prioridades</span>
            </div>

            {/* Botón menú hamburguesa */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 rounded-lg hover:bg-gray-100 transition"
            >
              <svg
                className="w-6 h-6 text-gray-600"
                fill="none"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                {mobileMenuOpen ? (
                  <path d="M6 18L18 6M6 6l12 12" />
                ) : (
                  <path d="M4 6h16M4 12h16M4 18h16" />
                )}
              </svg>
            </button>
          </div>

          {/* Menú desktop */}
          <div className="hidden md:flex items-center space-x-8">
            <div className="flex space-x-4">
              <NavButton
                label="Dashboard"
                active={pathname === '/dashboard'}
                onClick={() => router.push('/dashboard')}
              />
              <NavButton
                label="Mis Prioridades"
                active={pathname === '/priorities'}
                onClick={() => router.push('/priorities')}
              />
              <NavButton
                label="Analítica"
                active={pathname === '/analytics'}
                onClick={() => router.push('/analytics')}
              />
              <NavButton
                label="Histórico"
                active={pathname === '/history'}
                onClick={() => router.push('/history')}
              />
              <NavButton
                label="Reportes"
                active={pathname === '/reports'}
                onClick={() => router.push('/reports')}
              />
              <NavButton
                label="Leaderboard"
                active={pathname === '/leaderboard'}
                onClick={() => router.push('/leaderboard')}
              />
              <NavButton
                label="Automatizaciones"
                active={pathname?.startsWith('/workflows') || false}
                onClick={() => router.push('/workflows')}
              />
              {user.role === 'ADMIN' && (
                <>
                  <NavButton
                    label="Usuarios"
                    active={pathname === '/admin/users'}
                    onClick={() => router.push('/admin/users')}
                  />
                  <NavButton
                    label="Iniciativas"
                    active={pathname === '/admin/initiatives'}
                    onClick={() => router.push('/admin/initiatives')}
                  />
                  <NavButton
                    label="Config IA"
                    active={pathname === '/admin/ai-config'}
                    onClick={() => router.push('/admin/ai-config')}
                  />
                </>
              )}
            </div>

            <div className="flex items-center space-x-4">
              <NotificationCenter />
              <div className="text-right hidden lg:block">
                <div className="text-sm font-semibold text-gray-800">{user.name}</div>
                <div className="text-xs text-gray-500">{user.role === 'ADMIN' ? 'Administrador' : 'Usuario'}</div>
              </div>
              <button
                onClick={() => router.push('/profile')}
                className="bg-gray-200 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-300 transition"
                title="Mi Perfil"
              >
                👤 Perfil
              </button>
              <button
                onClick={() => signOut({ callbackUrl: '/login' })}
                className="bg-red-500 text-white px-4 py-2 rounded-lg hover:bg-red-600 transition"
              >
                Salir
              </button>
            </div>
          </div>
        </div>

        {/* Menú móvil */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-gray-200">
            <div className="py-2 space-y-1">
              {/* Información del usuario en móvil */}
              <div className="px-4 py-3 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm font-semibold text-gray-800">{user.name}</div>
                    <div className="text-xs text-gray-500">{user.role === 'ADMIN' ? 'Administrador' : 'Usuario'}</div>
                  </div>
                  <NotificationCenter />
                </div>
              </div>

              <NavButton
                label="Dashboard"
                active={pathname === '/dashboard'}
                onClick={() => handleNavigation('/dashboard')}
                mobile
              />
              <NavButton
                label="Mis Prioridades"
                active={pathname === '/priorities'}
                onClick={() => handleNavigation('/priorities')}
                mobile
              />
              <NavButton
                label="Analítica"
                active={pathname === '/analytics'}
                onClick={() => handleNavigation('/analytics')}
                mobile
              />
              <NavButton
                label="Histórico"
                active={pathname === '/history'}
                onClick={() => handleNavigation('/history')}
                mobile
              />
              <NavButton
                label="Reportes"
                active={pathname === '/reports'}
                onClick={() => handleNavigation('/reports')}
                mobile
              />
              <NavButton
                label="Leaderboard"
                active={pathname === '/leaderboard'}
                onClick={() => handleNavigation('/leaderboard')}
                mobile
              />
              <NavButton
                label="Automatizaciones"
                active={pathname?.startsWith('/workflows') || false}
                onClick={() => handleNavigation('/workflows')}
                mobile
              />
              {user.role === 'ADMIN' && (
                <>
                  <NavButton
                    label="Usuarios"
                    active={pathname === '/admin/users'}
                    onClick={() => handleNavigation('/admin/users')}
                    mobile
                  />
                  <NavButton
                    label="Iniciativas"
                    active={pathname === '/admin/initiatives'}
                    onClick={() => handleNavigation('/admin/initiatives')}
                    mobile
                  />
                  <NavButton
                    label="Config IA"
                    active={pathname === '/admin/ai-config'}
                    onClick={() => handleNavigation('/admin/ai-config')}
                    mobile
                  />
                </>
              )}

              {/* Botones de perfil y salir en móvil */}
              <div className="px-4 py-3 border-t border-gray-200 space-y-2">
                <button
                  onClick={() => handleNavigation('/profile')}
                  className="w-full bg-gray-200 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-300 transition"
                >
                  👤 Mi Perfil
                </button>
                <button
                  onClick={() => signOut({ callbackUrl: '/login' })}
                  className="w-full bg-red-500 text-white px-4 py-2 rounded-lg hover:bg-red-600 transition"
                >
                  Salir
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </nav>
  );
}
