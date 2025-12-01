'use client';

import { useSession, signOut } from 'next-auth/react';
import { useRouter, usePathname } from 'next/navigation';
import { useState } from 'react';
import { usePermissions } from '@/hooks/usePermissions';
import NotificationCenter from './NotificationCenter';
import ThemeToggle from './ThemeToggle';
import SessionRefreshButton from './SessionRefreshButton';
import { UserStatusSelector } from '@/components/user-status';
import {
  LayoutDashboard,
  ListTodo,
  BarChart3,
  LineChart,
  Trophy,
  Zap,
  History,
  Users,
  Target,
  Settings,
  LogOut,
  Menu,
  X,
  User,
  ChevronDown,
  Building2,
  UserCog,
  Cloud,
  Link,
  Briefcase,
  ClipboardList,
  FolderKanban,
  TrendingUp,
  Mail,
  Slack,
  Hash,
  Handshake,
  UserCircle,
  DollarSign,
  Clock,
  Package,
  Send,
  Copy,
  FileText,
  FileInput,
  Search,
} from 'lucide-react';

interface NavButtonProps {
  label: string;
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
}

function NavButton({ label, active, onClick, icon }: NavButtonProps) {
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg font-medium transition ${
        active
          ? 'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300'
          : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
      }`}
    >
      <span className="flex-shrink-0">{icon}</span>
      <span className="truncate">{label}</span>
    </button>
  );
}

export default function Navbar() {
  const { data: session } = useSession();
  const router = useRouter();
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const { hasPermission } = usePermissions();

  if (!session) return null;

  const user = session.user as any;

  const handleNavigation = (path: string) => {
    router.push(path);
    setMobileMenuOpen(false);
  };

  const handleSignOut = async () => {
    await signOut({ redirect: false });
    router.push('/login');
  };

  return (
    <>
      {/* Top Toolbar */}
      <div className={`fixed top-0 left-0 right-0 h-16 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 z-50 transition-all duration-300 ${sidebarCollapsed ? 'lg:pl-16' : 'lg:pl-64'}`}>
        <div className="h-full flex items-center justify-between px-4">
          {/* Mobile Menu Button */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="lg:hidden p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg text-gray-800 dark:text-gray-200"
          >
            {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>

          {/* Sidebar Toggle Button - Desktop */}
          <button
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            className="hidden lg:block p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg text-gray-800 dark:text-gray-200"
            title={sidebarCollapsed ? 'Expandir sidebar' : 'Colapsar sidebar'}
          >
            <Menu size={24} />
          </button>

          {/* Logo on mobile */}
          <div className="lg:hidden flex items-center space-x-2">
            <span className="text-2xl">🎯</span>
            <span className="font-bold text-lg text-gray-800 dark:text-gray-200">Prioridades</span>
          </div>

          {/* Right side - Theme, Notifications and Profile */}
          <div className="ml-auto flex items-center space-x-4">
            {/* Theme Toggle */}
            <ThemeToggle />

            {/* Notification Center */}
            <div className="relative">
              <NotificationCenter />
            </div>

            {/* Profile Dropdown */}
            <div className="relative">
              <button
                onClick={() => setProfileMenuOpen(!profileMenuOpen)}
                className="flex items-center space-x-2 px-3 py-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition"
              >
                <div className="w-8 h-8 bg-blue-500 text-white rounded-full flex items-center justify-center font-semibold">
                  {user.name?.charAt(0).toUpperCase()}
                </div>
                <span className="hidden md:block text-sm font-medium text-gray-700 dark:text-gray-300">{user.name}</span>
                <ChevronDown size={16} className="text-gray-500 dark:text-gray-400" />
              </button>

              {/* Dropdown Menu */}
              {profileMenuOpen && (
                <div className="absolute right-0 mt-2 w-56 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 py-2">
                  <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-700">
                    <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{user.name}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">{user.email}</p>
                    {user.role === 'ADMIN' && (
                      <span className="inline-block mt-1 text-xs bg-purple-100 dark:bg-purple-900 text-purple-700 dark:text-purple-300 px-2 py-0.5 rounded">
                        Administrador
                      </span>
                    )}
                  </div>
                  {/* User Status Selector */}
                  <div className="px-4 py-2 border-b border-gray-100 dark:border-gray-700">
                    <UserStatusSelector compact />
                  </div>
                  <button
                    onClick={() => {
                      handleNavigation('/profile');
                      setProfileMenuOpen(false);
                    }}
                    className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center space-x-2"
                  >
                    <User size={16} />
                    <span>Mi Perfil</span>
                  </button>
                  <div className="px-4 py-2">
                    <SessionRefreshButton />
                  </div>
                  <button
                    onClick={handleSignOut}
                    className="w-full text-left px-4 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center space-x-2"
                  >
                    <LogOut size={16} />
                    <span>Cerrar Sesión</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Sidebar Navigation */}
      <nav className={`
        fixed top-16 left-0 bottom-0 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 z-40
        transform transition-all duration-300 ease-in-out
        ${mobileMenuOpen ? 'translate-x-0 w-64' : '-translate-x-full lg:translate-x-0'}
        ${sidebarCollapsed ? 'lg:w-16' : 'lg:w-64'}
      `}>
        <div className="flex flex-col h-full">
          {/* Logo - Desktop only */}
          <div
            className={`hidden lg:block border-b dark:border-gray-700 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 transition ${sidebarCollapsed ? 'p-4' : 'p-6'}`}
            onClick={() => handleNavigation('/dashboard')}
            title="Dashboard"
          >
            {sidebarCollapsed ? (
              <div className="flex justify-center">
                <span className="text-2xl">🎯</span>
              </div>
            ) : (
              <div className="flex items-center space-x-2">
                <span className="text-2xl">🎯</span>
                <span className="font-bold text-xl text-gray-800 dark:text-gray-200">Prioridades</span>
              </div>
            )}
          </div>

          {/* Navigation Links */}
          <div className="flex-1 overflow-y-auto p-2 space-y-1">
            {sidebarCollapsed ? (
              // Collapsed view - only icons
              <>
                {/* Búsqueda Global - siempre visible arriba de todo */}
                <button
                  onClick={() => handleNavigation('/busquedaglobal')}
                  className={`w-full flex justify-center p-3 rounded-lg transition mb-2 ${
                    pathname === '/busquedaglobal'
                      ? 'bg-purple-100 dark:bg-purple-900 text-purple-700 dark:text-purple-300'
                      : 'text-purple-600 dark:text-purple-400 hover:bg-purple-50 dark:hover:bg-purple-900/30 bg-purple-50/50 dark:bg-purple-900/20'
                  }`}
                  title="Búsqueda Global"
                >
                  <Search size={22} />
                </button>
                <div className="border-b border-gray-200 dark:border-gray-700 mb-2" />

                {hasPermission('viewDashboard') && (
                  <button
                    onClick={() => handleNavigation('/dashboard')}
                    className={`w-full flex justify-center p-3 rounded-lg transition ${
                      pathname === '/dashboard'
                        ? 'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300'
                        : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                    }`}
                    title="Dashboard"
                  >
                    <LayoutDashboard size={22} />
                  </button>
                )}
                {hasPermission('viewAreaDashboard') && (
                  <button
                    onClick={() => handleNavigation('/area-dashboard')}
                    className={`w-full flex justify-center p-3 rounded-lg transition ${
                      pathname === '/area-dashboard'
                        ? 'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300'
                        : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                    }`}
                    title="Dashboard por Área"
                  >
                    <Building2 size={22} />
                  </button>
                )}
                {hasPermission('viewMyPriorities') && (
                  <button
                    onClick={() => handleNavigation('/priorities')}
                    className={`w-full flex justify-center p-3 rounded-lg transition ${
                      pathname === '/priorities'
                        ? 'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300'
                        : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                    }`}
                    title="Mis Prioridades"
                  >
                    <ListTodo size={22} />
                  </button>
                )}
                {hasPermission('viewReports') && (
                  <button
                    onClick={() => handleNavigation('/reports')}
                    className={`w-full flex justify-center p-3 rounded-lg transition ${
                      pathname === '/reports'
                        ? 'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300'
                        : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                    }`}
                    title="Reportes"
                  >
                    <BarChart3 size={22} />
                  </button>
                )}
                {hasPermission('viewAnalytics') && (
                  <button
                    onClick={() => handleNavigation('/analytics')}
                    className={`w-full flex justify-center p-3 rounded-lg transition ${
                      pathname === '/analytics'
                        ? 'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300'
                        : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                    }`}
                    title="Analítica"
                  >
                    <LineChart size={22} />
                  </button>
                )}
                {hasPermission('viewLeaderboard') && (
                  <button
                    onClick={() => handleNavigation('/leaderboard')}
                    className={`w-full flex justify-center p-3 rounded-lg transition ${
                      pathname === '/leaderboard'
                        ? 'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300'
                        : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                    }`}
                  title="Leaderboard"
                >
                  <Trophy size={22} />
                </button>
                )}
                <button
                  onClick={() => handleNavigation('/channels')}
                  className={`w-full flex justify-center p-3 rounded-lg transition ${
                    pathname?.startsWith('/channels')
                      ? 'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300'
                      : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                  }`}
                  title="Canales"
                >
                  <Hash size={22} />
                </button>
                {hasPermission('viewAutomations') && (
                  <button
                    onClick={() => handleNavigation('/workflows')}
                    className={`w-full flex justify-center p-3 rounded-lg transition ${
                      pathname?.startsWith('/workflows')
                        ? 'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300'
                        : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                    }`}
                    title="Automatizaciones"
                  >
                    <Zap size={22} />
                  </button>
                )}
                {hasPermission('viewHistory') && (
                  <button
                    onClick={() => handleNavigation('/history')}
                    className={`w-full flex justify-center p-3 rounded-lg transition ${
                      pathname === '/history'
                        ? 'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300'
                        : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                    }`}
                    title="Historial"
                  >
                    <History size={22} />
                  </button>
                )}
                {hasPermission('canManageProjects') && (
                  <button
                    onClick={() => handleNavigation('/projects')}
                    className={`w-full flex justify-center p-3 rounded-lg transition ${
                      pathname === '/projects'
                        ? 'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300'
                        : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                    }`}
                    title="Proyectos"
                  >
                    <FolderKanban size={22} />
                  </button>
                )}
                {hasPermission('canManageKPIs') && (
                  <button
                    onClick={() => handleNavigation('/admin/kpis')}
                    className={`w-full flex justify-center p-3 rounded-lg transition ${
                      pathname?.startsWith('/admin/kpis')
                        ? 'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300'
                        : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                    }`}
                    title="Gestión de KPIs"
                  >
                    <TrendingUp size={22} />
                  </button>
                )}
                <button
                  onClick={() => handleNavigation('/kpi-tracking')}
                  className={`w-full flex justify-center p-3 rounded-lg transition ${
                    pathname === '/kpi-tracking'
                      ? 'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300'
                      : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                  }`}
                  title="Seguimiento de KPIs"
                >
                  <TrendingUp size={22} />
                </button>
                <button
                  onClick={() => handleNavigation('/initiatives')}
                  className={`w-full flex justify-center p-3 rounded-lg transition ${
                    pathname === '/initiatives'
                      ? 'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300'
                      : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                  }`}
                  title="Iniciativas Estratégicas"
                >
                  <Target size={22} />
                </button>

                {/* CRM - Collapsed view with distinctive style */}
                {hasPermission('viewCRM') && (
                  <>
                    <div className="pt-3 pb-2 border-t border-emerald-200 dark:border-emerald-800 mx-2" />
                    <button
                      onClick={() => handleNavigation('/crm')}
                      className={`w-full flex justify-center p-3 rounded-lg transition ${
                        pathname?.startsWith('/crm')
                          ? 'bg-emerald-100 dark:bg-emerald-900 text-emerald-700 dark:text-emerald-300'
                          : 'text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-900/30'
                      }`}
                      title="CRM - Ventas"
                    >
                      <Handshake size={22} />
                    </button>
                  </>
                )}

                {user.area === 'Tecnología' && (
                  <>
                    <div className="pt-3 pb-2 border-t border-gray-200 dark:border-gray-700 mx-2" />
                    <button
                      onClick={() => handleNavigation('/azure-devops-config')}
                      className={`w-full flex justify-center p-3 rounded-lg transition ${
                        pathname?.startsWith('/azure-devops')
                          ? 'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300'
                          : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                      }`}
                      title="Azure DevOps"
                    >
                      <Cloud size={22} />
                    </button>
                  </>
                )}

                {user.isAreaLeader && (
                  <>
                    <div className="pt-3 pb-2 border-t border-gray-200 mx-2" />
                    <button
                      onClick={() => handleNavigation('/area-leader')}
                      className={`w-full flex justify-center p-3 rounded-lg transition ${
                        pathname === '/area-leader'
                          ? 'bg-purple-100 dark:bg-purple-900 text-purple-700 dark:text-purple-300'
                          : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                      }`}
                      title="Gestión de Área"
                    >
                      <UserCog size={22} />
                    </button>
                  </>
                )}

                {user.role === 'ADMIN' && (
                  <>
                    <div className="pt-3 pb-2 border-t border-gray-200 mx-2" />
                    <button
                      onClick={() => handleNavigation('/admin/users')}
                      className={`w-full flex justify-center p-3 rounded-lg transition ${
                        pathname === '/admin/users'
                          ? 'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300'
                          : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                      }`}
                      title="Usuarios"
                    >
                      <Users size={22} />
                    </button>
                    <button
                      onClick={() => handleNavigation('/admin/user-groups')}
                      className={`w-full flex justify-center p-3 rounded-lg transition ${
                        pathname === '/admin/user-groups'
                          ? 'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300'
                          : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                      }`}
                      title="Grupos"
                    >
                      <span className="text-xl">👥</span>
                    </button>
                    <button
                      onClick={() => handleNavigation('/admin/permissions')}
                      className={`w-full flex justify-center p-3 rounded-lg transition ${
                        pathname === '/admin/permissions'
                          ? 'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300'
                          : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                      }`}
                      title="Permisos"
                    >
                      <span className="text-xl">🔐</span>
                    </button>
                    <button
                      onClick={() => handleNavigation('/admin/initiatives')}
                      className={`w-full flex justify-center p-3 rounded-lg transition ${
                        pathname === '/admin/initiatives'
                          ? 'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300'
                          : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                      }`}
                      title="Iniciativas"
                    >
                      <Target size={22} />
                    </button>
                    <button
                      onClick={() => handleNavigation('/admin/ai-config')}
                      className={`w-full flex justify-center p-3 rounded-lg transition ${
                        pathname === '/admin/ai-config'
                          ? 'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300'
                          : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                      }`}
                      title="Configuración IA"
                    >
                      <Settings size={22} />
                    </button>
                    {user.area === 'Tecnología' && (
                      <button
                        onClick={() => handleNavigation('/admin/azure-links')}
                        className={`w-full flex justify-center p-3 rounded-lg transition ${
                          pathname === '/admin/azure-links'
                            ? 'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300'
                            : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                        }`}
                        title="Vínculos Azure DevOps"
                      >
                        <Link size={22} />
                      </button>
                    )}
                    <button
                      onClick={() => handleNavigation('/clients')}
                      className={`w-full flex justify-center p-3 rounded-lg transition ${
                        pathname === '/clients'
                          ? 'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300'
                          : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                      }`}
                      title="Clientes"
                    >
                      <Briefcase size={22} />
                    </button>
                    <button
                      onClick={() => handleNavigation('/admin/bulk-assignment')}
                      className={`w-full flex justify-center p-3 rounded-lg transition ${
                        pathname === '/admin/bulk-assignment'
                          ? 'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300'
                          : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                      }`}
                      title="Asignación Masiva"
                    >
                      <ClipboardList size={22} />
                    </button>
                    <button
                      onClick={() => handleNavigation('/admin/report-settings')}
                      className={`w-full flex justify-center p-3 rounded-lg transition ${
                        pathname === '/admin/report-settings'
                          ? 'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300'
                          : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                      }`}
                      title="Reportes Automáticos"
                    >
                      <Mail size={22} />
                    </button>
                    <button
                      onClick={() => handleNavigation('/admin/integrations')}
                      className={`w-full flex justify-center p-3 rounded-lg transition ${
                        pathname === '/admin/integrations'
                          ? 'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300'
                          : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                      }`}
                      title="Integraciones"
                    >
                      <Slack size={22} />
                    </button>
                    <button
                      onClick={() => handleNavigation('/admin/leaderboard-settings')}
                      className={`w-full flex justify-center p-3 rounded-lg transition ${
                        pathname === '/admin/leaderboard-settings'
                          ? 'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300'
                          : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                      }`}
                      title="Leaderboard"
                    >
                      <Trophy size={22} />
                    </button>
                  </>
                )}
              </>
            ) : (
              // Expanded view - icons and labels
              <>
                {/* Búsqueda Global - siempre visible arriba de todo */}
                <div className="mb-2">
                  <button
                    onClick={() => handleNavigation('/busquedaglobal')}
                    className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg font-medium transition ${
                      pathname === '/busquedaglobal'
                        ? 'bg-purple-100 dark:bg-purple-900 text-purple-700 dark:text-purple-300'
                        : 'text-purple-600 dark:text-purple-400 hover:bg-purple-50 dark:hover:bg-purple-900/30 bg-purple-50/50 dark:bg-purple-900/20'
                    }`}
                  >
                    <Search size={20} />
                    <span>Búsqueda Global</span>
                  </button>
                </div>
                <div className="border-b border-gray-200 dark:border-gray-700 mb-2" />

                {hasPermission('viewDashboard') && (
                  <NavButton
                    icon={<LayoutDashboard size={20} />}
                    label="Dashboard"
                    active={pathname === '/dashboard'}
                    onClick={() => handleNavigation('/dashboard')}
                  />
                )}
                {hasPermission('viewAreaDashboard') && (
                  <NavButton
                    icon={<Building2 size={20} />}
                    label="Dashboard por Área"
                    active={pathname === '/area-dashboard'}
                    onClick={() => handleNavigation('/area-dashboard')}
                  />
                )}
                {hasPermission('viewMyPriorities') && (
                  <NavButton
                    icon={<ListTodo size={20} />}
                    label="Mis Prioridades"
                    active={pathname === '/priorities'}
                    onClick={() => handleNavigation('/priorities')}
                  />
                )}
                {hasPermission('viewReports') && (
                  <NavButton
                    icon={<BarChart3 size={20} />}
                    label="Reportes"
                    active={pathname === '/reports'}
                    onClick={() => handleNavigation('/reports')}
                  />
                )}
                {hasPermission('viewAnalytics') && (
                  <NavButton
                    icon={<LineChart size={20} />}
                    label="Analítica"
                    active={pathname === '/analytics'}
                    onClick={() => handleNavigation('/analytics')}
                  />
                )}
                {hasPermission('viewLeaderboard') && (
                  <NavButton
                    icon={<Trophy size={20} />}
                    label="Leaderboard"
                    active={pathname === '/leaderboard'}
                    onClick={() => handleNavigation('/leaderboard')}
                  />
                )}
                <NavButton
                  icon={<Hash size={20} />}
                  label="Canales"
                  active={pathname?.startsWith('/channels') || false}
                  onClick={() => handleNavigation('/channels')}
                />
                <NavButton
                  icon={<TrendingUp size={20} />}
                  label="Seguimiento de KPIs"
                  active={pathname === '/kpi-tracking'}
                  onClick={() => handleNavigation('/kpi-tracking')}
                />
                <NavButton
                  icon={<Target size={20} />}
                  label="Iniciativas"
                  active={pathname === '/initiatives'}
                  onClick={() => handleNavigation('/initiatives')}
                />

                {/* Gestión Section */}
                {(hasPermission('viewAutomations') || hasPermission('viewHistory') || hasPermission('canManageProjects') || hasPermission('canManageKPIs')) && (
                  <>
                    <div className="pt-4 pb-2">
                      <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider px-4">
                        Gestión
                      </p>
                    </div>
                    {hasPermission('viewAutomations') && (
                      <NavButton
                        icon={<Zap size={20} />}
                        label="Automatizaciones"
                        active={pathname?.startsWith('/workflows') || false}
                        onClick={() => handleNavigation('/workflows')}
                      />
                    )}
                    {hasPermission('viewHistory') && (
                      <NavButton
                        icon={<History size={20} />}
                        label="Historial"
                        active={pathname === '/history'}
                        onClick={() => handleNavigation('/history')}
                      />
                    )}
                    {hasPermission('canManageProjects') && (
                      <NavButton
                        icon={<FolderKanban size={20} />}
                        label="Proyectos"
                        active={pathname === '/projects'}
                        onClick={() => handleNavigation('/projects')}
                      />
                    )}
                    {hasPermission('canManageKPIs') && (
                      <NavButton
                        icon={<TrendingUp size={20} />}
                        label="Gestión de KPIs"
                        active={pathname?.startsWith('/admin/kpis') || false}
                        onClick={() => handleNavigation('/admin/kpis')}
                      />
                    )}
                  </>
                )}

                {/* CRM Section - Distintivo con fondo */}
                {hasPermission('viewCRM') && (
                  <div className="mt-4 mx-1 rounded-lg bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 overflow-hidden">
                    <div className="py-2 px-3 bg-emerald-100 dark:bg-emerald-900/40 border-b border-emerald-200 dark:border-emerald-800">
                      <p className="text-xs font-semibold text-emerald-700 dark:text-emerald-300 uppercase tracking-wider flex items-center gap-2">
                        <Handshake size={14} />
                        CRM - Ventas
                      </p>
                    </div>
                    <div className="p-1 space-y-0.5">
                      <NavButton
                        icon={<Handshake size={20} />}
                        label="Dashboard CRM"
                        active={pathname === '/crm'}
                        onClick={() => handleNavigation('/crm')}
                      />
                      {hasPermission('canManageDeals') && (
                        <NavButton
                          icon={<DollarSign size={20} />}
                          label="Pipeline de Ventas"
                          active={pathname === '/crm/deals'}
                          onClick={() => handleNavigation('/crm/deals')}
                        />
                      )}
                      {hasPermission('canManageContacts') && (
                        <NavButton
                          icon={<UserCircle size={20} />}
                          label="Contactos"
                          active={pathname === '/crm/contacts'}
                          onClick={() => handleNavigation('/crm/contacts')}
                        />
                      )}
                      <NavButton
                        icon={<Building2 size={20} />}
                        label="Clientes"
                        active={pathname?.startsWith('/crm/clients') || false}
                        onClick={() => handleNavigation('/crm/clients')}
                      />
                      <NavButton
                        icon={<Clock size={20} />}
                        label="Actividades"
                        active={pathname === '/crm/activities'}
                        onClick={() => handleNavigation('/crm/activities')}
                      />
                      <NavButton
                        icon={<Package size={20} />}
                        label="Productos"
                        active={pathname === '/crm/products'}
                        onClick={() => handleNavigation('/crm/products')}
                      />
                      <NavButton
                        icon={<Target size={20} />}
                        label="Metas de Venta"
                        active={pathname?.startsWith('/crm/quotas') || false}
                        onClick={() => handleNavigation('/crm/quotas')}
                      />
                      <NavButton
                        icon={<Zap size={20} />}
                        label="Workflows CRM"
                        active={pathname?.startsWith('/crm/workflows') || false}
                        onClick={() => handleNavigation('/crm/workflows')}
                      />
                      <NavButton
                        icon={<Mail size={20} />}
                        label="Email Tracking"
                        active={pathname?.startsWith('/crm/email-tracking') || false}
                        onClick={() => handleNavigation('/crm/email-tracking')}
                      />
                      <NavButton
                        icon={<Target size={20} />}
                        label="Lead Scoring"
                        active={pathname?.startsWith('/crm/lead-scoring') || false}
                        onClick={() => handleNavigation('/crm/lead-scoring')}
                      />
                      <NavButton
                        icon={<Send size={20} />}
                        label="Secuencias"
                        active={pathname?.startsWith('/crm/sequences') || false}
                        onClick={() => handleNavigation('/crm/sequences')}
                      />
                      <NavButton
                        icon={<FileText size={20} />}
                        label="Plantillas de Correo"
                        active={pathname?.startsWith('/crm/email-templates') || false}
                        onClick={() => handleNavigation('/crm/email-templates')}
                      />
                      <NavButton
                        icon={<BarChart3 size={20} />}
                        label="Reportes CRM"
                        active={pathname === '/crm/reports'}
                        onClick={() => handleNavigation('/crm/reports')}
                      />
                      <NavButton
                        icon={<Copy size={20} />}
                        label="Duplicados"
                        active={pathname === '/crm/duplicates'}
                        onClick={() => handleNavigation('/crm/duplicates')}
                      />
                      <NavButton
                        icon={<Settings size={20} />}
                        label="Campos Personalizados"
                        active={pathname?.startsWith('/crm/settings/custom-fields') || false}
                        onClick={() => handleNavigation('/crm/settings/custom-fields')}
                      />
                      <NavButton
                        icon={<FileInput size={20} />}
                        label="Formularios Web"
                        active={pathname?.startsWith('/crm/web-forms') || false}
                        onClick={() => handleNavigation('/crm/web-forms')}
                      />
                    </div>
                  </div>
                )}

                {user.area === 'Tecnología' && (
                  <>
                    <div className="pt-4 pb-2">
                      <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider px-4">
                        Integraciones
                      </p>
                    </div>
                    <NavButton
                      icon={<Cloud size={20} />}
                      label="Azure DevOps"
                      active={pathname?.startsWith('/azure-devops') || false}
                      onClick={() => handleNavigation('/azure-devops-config')}
                    />
                  </>
                )}

                {user.isAreaLeader && (
                  <>
                    <div className="pt-4 pb-2">
                      <p className="text-xs font-semibold text-purple-500 dark:text-purple-400 uppercase tracking-wider px-4">
                        Líder de Área
                      </p>
                    </div>
                    <NavButton
                      icon={<UserCog size={20} />}
                      label="Gestión de Área"
                      active={pathname === '/area-leader'}
                      onClick={() => handleNavigation('/area-leader')}
                    />
                  </>
                )}

                {user.role === 'ADMIN' && (
                  <>
                    <div className="pt-4 pb-2">
                      <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider px-4">
                        Admin
                      </p>
                    </div>
                    <NavButton
                      icon={<Users size={20} />}
                      label="Usuarios"
                      active={pathname === '/admin/users'}
                      onClick={() => handleNavigation('/admin/users')}
                    />
                    <NavButton
                      icon="👥"
                      label="Grupos"
                      active={pathname === '/admin/user-groups'}
                      onClick={() => handleNavigation('/admin/user-groups')}
                    />
                    <NavButton
                      icon="🔐"
                      label="Permisos"
                      active={pathname === '/admin/permissions'}
                      onClick={() => handleNavigation('/admin/permissions')}
                    />
                    <NavButton
                      icon={<Target size={20} />}
                      label="Iniciativas"
                      active={pathname === '/admin/initiatives'}
                      onClick={() => handleNavigation('/admin/initiatives')}
                    />
                    <NavButton
                      icon={<Settings size={20} />}
                      label="Configuración IA"
                      active={pathname === '/admin/ai-config'}
                      onClick={() => handleNavigation('/admin/ai-config')}
                    />
                    {user.area === 'Tecnología' && (
                      <NavButton
                        icon={<Link size={20} />}
                        label="Vínculos Azure DevOps"
                        active={pathname === '/admin/azure-links'}
                        onClick={() => handleNavigation('/admin/azure-links')}
                      />
                    )}
                    <NavButton
                      icon={<Briefcase size={20} />}
                      label="Clientes"
                      active={pathname === '/clients'}
                      onClick={() => handleNavigation('/clients')}
                    />
                    <NavButton
                      icon={<ClipboardList size={20} />}
                      label="Asignación Masiva"
                      active={pathname === '/admin/bulk-assignment'}
                      onClick={() => handleNavigation('/admin/bulk-assignment')}
                    />
                    <NavButton
                      icon={<Mail size={20} />}
                      label="Reportes Automáticos"
                      active={pathname === '/admin/report-settings'}
                      onClick={() => handleNavigation('/admin/report-settings')}
                    />
                    <NavButton
                      icon={<Slack size={20} />}
                      label="Integraciones"
                      active={pathname === '/admin/integrations'}
                      onClick={() => handleNavigation('/admin/integrations')}
                    />
                    <NavButton
                      icon={<Trophy size={20} />}
                      label="Leaderboard"
                      active={pathname === '/admin/leaderboard-settings'}
                      onClick={() => handleNavigation('/admin/leaderboard-settings')}
                    />
                  </>
                )}
              </>
            )}
          </div>
        </div>
      </nav>

      {/* Overlay for mobile */}
      {mobileMenuOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black dark:bg-black bg-opacity-50 dark:bg-opacity-70 z-30 top-16"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Click outside to close profile menu */}
      {profileMenuOpen && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setProfileMenuOpen(false)}
        />
      )}

      {/* Spacers for content - This creates the layout space */}
      <div className="h-16" /> {/* Top toolbar spacer */}

      {/* Main content wrapper with dynamic margin */}
      <style jsx global>{`
        @media (min-width: 1024px) {
          .main-content {
            margin-left: ${sidebarCollapsed ? '4rem' : '16rem'};
            transition: margin-left 300ms ease-in-out;
          }
        }
      `}</style>
    </>
  );
}
