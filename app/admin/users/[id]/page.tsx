'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import Navbar from '@/components/Navbar';
import {
  User,
  ArrowLeft,
  Mail,
  Shield,
  Calendar,
  Flag,
  CheckCircle,
  Clock,
  Loader2,
  Edit,
  Award,
  BarChart3,
} from 'lucide-react';

interface UserData {
  _id: string;
  name: string;
  email: string;
  role: string;
  isActive: boolean;
  profilePicture?: string;
  department?: string;
  position?: string;
  phone?: string;
  createdAt: string;
  updatedAt: string;
  lastLogin?: string;
}

interface UserStats {
  totalPriorities: number;
  completed: number;
  inProgress: number;
  blocked: number;
  avgCompletion: number;
}

export default function UserDetailPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const params = useParams();
  const userId = params.id as string;

  const [user, setUser] = useState<UserData | null>(null);
  const [stats, setStats] = useState<UserStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
    }
    if (status === 'authenticated') {
      // Check admin role
      if (session?.user?.role !== 'ADMIN') {
        router.push('/dashboard');
        return;
      }
      loadData();
    }
  }, [status, router, userId, session]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [userRes, statsRes] = await Promise.all([
        fetch(`/api/users/${userId}`),
        fetch(`/api/users/${userId}/stats`).catch(() => null),
      ]);

      if (!userRes.ok) {
        router.push('/admin/users');
        return;
      }

      const userData = await userRes.json();
      setUser(userData);

      if (statsRes && statsRes.ok) {
        const statsData = await statsRes.json();
        setStats(statsData);
      }
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getRoleConfig = (role: string) => {
    switch (role) {
      case 'ADMIN':
        return {
          color: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
          label: 'Administrador'
        };
      case 'MANAGER':
        return {
          color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
          label: 'Manager'
        };
      default:
        return {
          color: 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300',
          label: 'Usuario'
        };
    }
  };

  if (status === 'loading' || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <Loader2 className="animate-spin" size={40} />
      </div>
    );
  }

  if (!session || !user) return null;

  const roleConfig = getRoleConfig(user.role);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Navbar />
      <div className="pt-16 main-content px-4 py-6 max-w-4xl mx-auto">
        <Link
          href="/admin/users"
          className="inline-flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 mb-4"
        >
          <ArrowLeft size={20} />
          Volver a Usuarios
        </Link>

        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6 mb-6">
          <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
            <div className="flex items-start gap-4">
              {user.profilePicture ? (
                <img
                  src={user.profilePicture}
                  alt={user.name}
                  className="w-16 h-16 rounded-full object-cover"
                />
              ) : (
                <div className="w-16 h-16 bg-indigo-100 dark:bg-indigo-900 text-indigo-600 dark:text-indigo-400 rounded-full flex items-center justify-center text-2xl font-bold">
                  {user.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                </div>
              )}
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100">{user.name}</h1>
                  <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                    user.isActive
                      ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                      : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                  }`}>
                    {user.isActive ? 'Activo' : 'Inactivo'}
                  </span>
                </div>
                <div className="flex flex-wrap items-center gap-3 mt-1 text-sm">
                  <span className={`px-2 py-0.5 rounded font-medium ${roleConfig.color}`}>
                    <Shield size={12} className="inline mr-1" />
                    {roleConfig.label}
                  </span>
                  <a href={`mailto:${user.email}`} className="text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1">
                    <Mail size={14} />
                    {user.email}
                  </a>
                </div>
                {(user.position || user.department) && (
                  <p className="text-gray-500 dark:text-gray-400 mt-2">
                    {user.position}{user.position && user.department && ' • '}{user.department}
                  </p>
                )}
              </div>
            </div>
            <Link
              href="/admin/users"
              className="flex items-center gap-2 px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600"
            >
              <Edit size={18} />
              Editar
            </Link>
          </div>
        </div>

        {/* Stats */}
        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
            <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-200 dark:border-gray-700">
              <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400 text-sm mb-1">
                <Flag size={16} />
                Total
              </div>
              <div className="text-2xl font-bold text-gray-800 dark:text-gray-100">{stats.totalPriorities}</div>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-200 dark:border-gray-700">
              <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400 text-sm mb-1">
                <CheckCircle size={16} className="text-green-500" />
                Completadas
              </div>
              <div className="text-2xl font-bold text-green-600 dark:text-green-400">{stats.completed}</div>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-200 dark:border-gray-700">
              <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400 text-sm mb-1">
                <Clock size={16} className="text-blue-500" />
                En Progreso
              </div>
              <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">{stats.inProgress}</div>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-200 dark:border-gray-700">
              <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400 text-sm mb-1">
                <Flag size={16} className="text-red-500" />
                Bloqueadas
              </div>
              <div className="text-2xl font-bold text-red-600 dark:text-red-400">{stats.blocked}</div>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-200 dark:border-gray-700">
              <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400 text-sm mb-1">
                <BarChart3 size={16} className="text-indigo-500" />
                Promedio
              </div>
              <div className="text-2xl font-bold text-indigo-600 dark:text-indigo-400">{stats.avgCompletion}%</div>
            </div>
          </div>
        )}

        {/* Additional Info */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4">
            <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-100 mb-4">Información de Cuenta</h2>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500 dark:text-gray-400">Email</span>
                <span className="text-gray-800 dark:text-gray-200">{user.email}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500 dark:text-gray-400">Rol</span>
                <span className="text-gray-800 dark:text-gray-200">{roleConfig.label}</span>
              </div>
              {user.phone && (
                <div className="flex justify-between">
                  <span className="text-gray-500 dark:text-gray-400">Teléfono</span>
                  <span className="text-gray-800 dark:text-gray-200">{user.phone}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-gray-500 dark:text-gray-400">Estado</span>
                <span className={user.isActive ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}>
                  {user.isActive ? 'Activo' : 'Inactivo'}
                </span>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4">
            <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-100 mb-4">Actividad</h2>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500 dark:text-gray-400">Registrado</span>
                <span className="text-gray-800 dark:text-gray-200">
                  {new Date(user.createdAt).toLocaleDateString('es-MX')}
                </span>
              </div>
              {user.lastLogin && (
                <div className="flex justify-between">
                  <span className="text-gray-500 dark:text-gray-400">Último login</span>
                  <span className="text-gray-800 dark:text-gray-200">
                    {new Date(user.lastLogin).toLocaleDateString('es-MX', {
                      day: 'numeric',
                      month: 'short',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-gray-500 dark:text-gray-400">Actualizado</span>
                <span className="text-gray-800 dark:text-gray-200">
                  {new Date(user.updatedAt).toLocaleDateString('es-MX')}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
