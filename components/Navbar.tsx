'use client';

import { useSession, signOut } from 'next-auth/react';
import { useRouter, usePathname } from 'next/navigation';

interface NavButtonProps {
  label: string;
  active: boolean;
  onClick: () => void;
}

function NavButton({ label, active, onClick }: NavButtonProps) {
  return (
    <button
      onClick={onClick}
      className={`px-3 py-2 rounded-lg font-medium transition ${
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

  if (!session) return null;

  const user = session.user as any;

  return (
    <nav className="bg-white shadow-md">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center space-x-8">
            <div className="flex items-center cursor-pointer" onClick={() => router.push('/dashboard')}>
              <span className="font-bold text-xl text-gray-800">🎯 Prioridades</span>
            </div>
            <div className="hidden md:flex space-x-4">
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
                </>
              )}
            </div>
          </div>
          <div className="flex items-center space-x-4">
            <div className="text-right">
              <div className="text-sm font-semibold text-gray-800">{user.name}</div>
              <div className="text-xs text-gray-500">{user.role === 'ADMIN' ? 'Administrador' : 'Usuario'}</div>
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
  );
}
