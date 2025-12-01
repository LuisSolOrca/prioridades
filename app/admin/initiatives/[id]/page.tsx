'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import Navbar from '@/components/Navbar';
import PermissionGuard from '@/components/PermissionGuard';
import {
  Target,
  ArrowLeft,
  Flag,
  Users,
  BarChart3,
  Loader2,
  Edit,
  CheckSquare,
  Calendar,
} from 'lucide-react';

interface Initiative {
  _id: string;
  name: string;
  description?: string;
  color: string;
  order: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

interface PriorityStat {
  status: string;
  count: number;
}

export default function InitiativeDetailPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const params = useParams();
  const initiativeId = params.id as string;

  const [initiative, setInitiative] = useState<Initiative | null>(null);
  const [stats, setStats] = useState<{ total: number; byStatus: PriorityStat[] }>({ total: 0, byStatus: [] });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
    }
    if (status === 'authenticated') {
      loadData();
    }
  }, [status, router, initiativeId]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [initRes, statsRes] = await Promise.all([
        fetch(`/api/initiatives/${initiativeId}`),
        fetch(`/api/initiatives/${initiativeId}/stats`).catch(() => null),
      ]);

      if (!initRes.ok) {
        router.push('/admin/initiatives');
        return;
      }

      const initData = await initRes.json();
      setInitiative(initData);

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

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'COMPLETADO': return 'Completadas';
      case 'EN_TIEMPO': return 'En Tiempo';
      case 'EN_RIESGO': return 'En Riesgo';
      case 'BLOQUEADO': return 'Bloqueadas';
      case 'REPROGRAMADO': return 'Reprogramadas';
      default: return status;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'COMPLETADO': return 'bg-green-500';
      case 'EN_TIEMPO': return 'bg-blue-500';
      case 'EN_RIESGO': return 'bg-yellow-500';
      case 'BLOQUEADO': return 'bg-red-500';
      case 'REPROGRAMADO': return 'bg-purple-500';
      default: return 'bg-gray-500';
    }
  };

  if (status === 'loading' || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <Loader2 className="animate-spin" size={40} />
      </div>
    );
  }

  if (!session || !initiative) return null;

  return (
    <PermissionGuard permission="viewDashboard" requireAdmin showNavbar={false}>
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Navbar />
      <div className="pt-16 main-content px-4 py-6 max-w-4xl mx-auto">
        <Link
          href="/admin/initiatives"
          className="inline-flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 mb-4"
        >
          <ArrowLeft size={20} />
          Volver a Iniciativas
        </Link>

        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6 mb-6">
          <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
            <div className="flex items-start gap-4">
              <div
                className="w-14 h-14 rounded-xl flex items-center justify-center text-white"
                style={{ backgroundColor: initiative.color }}
              >
                <Target size={28} />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100">{initiative.name}</h1>
                  <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                    initiative.isActive
                      ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                      : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400'
                  }`}>
                    {initiative.isActive ? 'Activa' : 'Inactiva'}
                  </span>
                </div>
                {initiative.description && (
                  <p className="text-gray-500 dark:text-gray-400 mt-1">{initiative.description}</p>
                )}
                <div className="flex items-center gap-4 mt-2 text-sm text-gray-500 dark:text-gray-400">
                  <span className="flex items-center gap-1">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: initiative.color }} />
                    Color: {initiative.color}
                  </span>
                  <span>Orden: #{initiative.order}</span>
                </div>
              </div>
            </div>
            <Link
              href="/admin/initiatives"
              className="flex items-center gap-2 px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600"
            >
              <Edit size={18} />
              Editar
            </Link>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400 text-sm mb-1">
              <Flag size={16} />
              Total Prioridades
            </div>
            <div className="text-2xl font-bold text-gray-800 dark:text-gray-100">{stats.total}</div>
          </div>
          {stats.byStatus.slice(0, 3).map((stat) => (
            <div key={stat.status} className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-200 dark:border-gray-700">
              <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400 text-sm mb-1">
                <div className={`w-2 h-2 rounded-full ${getStatusColor(stat.status)}`} />
                {getStatusLabel(stat.status)}
              </div>
              <div className="text-2xl font-bold text-gray-800 dark:text-gray-100">{stat.count}</div>
            </div>
          ))}
        </div>

        {/* Status Distribution */}
        {stats.byStatus.length > 0 && (
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6 mb-6">
            <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-100 flex items-center gap-2 mb-4">
              <BarChart3 size={20} className="text-indigo-500" />
              Distribución por Estado
            </h2>

            {/* Bar Chart */}
            <div className="space-y-3">
              {stats.byStatus.map((stat) => {
                const percentage = stats.total > 0 ? (stat.count / stats.total) * 100 : 0;
                return (
                  <div key={stat.status}>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-gray-600 dark:text-gray-400">{getStatusLabel(stat.status)}</span>
                      <span className="font-medium text-gray-800 dark:text-gray-200">
                        {stat.count} ({percentage.toFixed(1)}%)
                      </span>
                    </div>
                    <div className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-full">
                      <div
                        className={`h-full rounded-full ${getStatusColor(stat.status)}`}
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Info */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4">
          <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-100 mb-4">Información</h2>
          <div className="space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-500 dark:text-gray-400">Creada</span>
              <span className="text-gray-800 dark:text-gray-200">
                {new Date(initiative.createdAt).toLocaleDateString('es-MX')}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500 dark:text-gray-400">Actualizada</span>
              <span className="text-gray-800 dark:text-gray-200">
                {new Date(initiative.updatedAt).toLocaleDateString('es-MX')}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
    </PermissionGuard>
  );
}
