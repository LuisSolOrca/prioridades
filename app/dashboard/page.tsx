'use client';

export const dynamic = 'force-dynamic';

import { useEffect, useState, useMemo } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Navbar from '@/components/Navbar';
import StatusBadge from '@/components/StatusBadge';
import { getWeekDates, getWeekLabel } from '@/lib/utils';
import { exportPriorities } from '@/lib/exportToExcel';

interface User {
  _id: string;
  name: string;
  email: string;
  role: string;
  isActive: boolean;
}

interface Initiative {
  _id: string;
  name: string;
  color: string;
  order: number;
  isActive: boolean;
}

interface Priority {
  _id: string;
  title: string;
  description?: string;
  weekStart: string;
  weekEnd: string;
  completionPercentage: number;
  status: 'EN_TIEMPO' | 'EN_RIESGO' | 'BLOQUEADO' | 'COMPLETADO';
  userId: string;
  initiativeId: string;
  wasEdited: boolean;
}

interface StatCardProps {
  label: string;
  value: string | number;
  color: 'blue' | 'green' | 'purple';
}

function StatCard({ label, value, color }: StatCardProps) {
  const colors = {
    blue: 'bg-blue-500',
    green: 'bg-green-500',
    purple: 'bg-purple-500'
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-sm text-gray-600 mb-1">{label}</div>
          <div className="text-3xl font-bold text-gray-800">{value}</div>
        </div>
        <div className={`${colors[color]} text-white w-14 h-14 rounded-full flex items-center justify-center`}>
          📊
        </div>
      </div>
    </div>
  );
}

interface UserPriorityCardProps {
  user: User;
  priorities: Priority[];
  initiatives: Initiative[];
  isExpanded: boolean;
  onToggle: () => void;
}

function UserPriorityCard({ user, priorities, initiatives, isExpanded, onToggle }: UserPriorityCardProps) {
  const avgCompletion = priorities.length > 0
    ? priorities.reduce((sum, p) => sum + p.completionPercentage, 0) / priorities.length
    : 0;

  const completed = priorities.filter(p => p.status === 'COMPLETADO').length;
  const completionRate = priorities.length > 0 ? (completed / priorities.length * 100).toFixed(0) : 0;

  return (
    <div className="bg-white rounded-lg shadow-md border hover:shadow-lg transition-shadow">
      <div
        className="p-6 cursor-pointer"
        onClick={onToggle}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center flex-1">
            <div className="w-10 h-10 bg-blue-500 text-white rounded-full flex items-center justify-center font-bold mr-3">
              {user.name.split(' ').map(n => n[0]).join('')}
            </div>
            <div className="flex-1">
              <div className="flex items-center">
                <div className="font-semibold text-gray-800">{user.name}</div>
                <span className="ml-2 text-sm text-gray-400">
                  {isExpanded ? '▼' : '▶'}
                </span>
              </div>
              <div className="text-sm text-gray-500">{priorities.length} prioridades • {completed} completadas</div>
            </div>
          </div>
          <div className="flex items-center space-x-6">
            <div className="text-right">
              <div className="text-xs text-gray-500 mb-1">Tasa Completado</div>
              <div className="text-lg font-bold text-blue-600">{completionRate}%</div>
            </div>
            <div className="text-right">
              <div className="text-xs text-gray-500 mb-1">Promedio Avance</div>
              <div className="text-2xl font-bold text-gray-800">{avgCompletion.toFixed(0)}%</div>
            </div>
          </div>
        </div>
      </div>

      {isExpanded && (
        <div className="px-6 pb-6 pt-0 border-t">
          <div className="mt-4 space-y-3">
            {priorities.length === 0 ? (
              <div className="text-center text-gray-400 py-8">
                <div className="text-4xl mb-2">📋</div>
                <div>Sin prioridades esta semana</div>
              </div>
            ) : (
              priorities.map(priority => {
                const initiative = initiatives.find(i => i._id === priority.initiativeId);
                return (
                  <div key={priority._id} className="border-l-4 pl-3 py-2 bg-gray-50 rounded" style={{ borderColor: initiative?.color }}>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="font-medium text-gray-800 text-sm">{priority.title}</div>
                        <div className="text-xs text-gray-500 mt-1">{initiative?.name}</div>
                      </div>
                      <StatusBadge status={priority.status} />
                    </div>
                    <div className="mt-2">
                      <div className="flex items-center justify-between text-xs text-gray-600 mb-1">
                        <span>Avance</span>
                        <span className="font-semibold">{priority.completionPercentage}%</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-blue-600 h-2 rounded-full transition-all"
                          style={{ width: `${priority.completionPercentage}%` }}
                        ></div>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default function DashboardPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [users, setUsers] = useState<User[]>([]);
  const [initiatives, setInitiatives] = useState<Initiative[]>([]);
  const [priorities, setPriorities] = useState<Priority[]>([]);
  const [currentWeek, setCurrentWeek] = useState(getWeekDates());
  const [loading, setLoading] = useState(true);
  const [expandedUsers, setExpandedUsers] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
    }
  }, [status, router]);

  useEffect(() => {
    if (status === 'authenticated') {
      loadData();
    }
  }, [status, currentWeek]);

  const loadData = async () => {
    try {
      setLoading(true);

      const [usersRes, initiativesRes, prioritiesRes] = await Promise.all([
        fetch('/api/users?activeOnly=true'),
        fetch('/api/initiatives?activeOnly=true'),
        fetch(`/api/priorities?weekStart=${currentWeek.monday.toISOString()}&weekEnd=${currentWeek.friday.toISOString()}`)
      ]);

      const [usersData, initiativesData, prioritiesData] = await Promise.all([
        usersRes.json(),
        initiativesRes.json(),
        prioritiesRes.json()
      ]);

      setUsers(usersData); // Mostrar todos los usuarios (USER y ADMIN)
      setInitiatives(initiativesData);
      setPriorities(prioritiesData);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const stats = useMemo(() => {
    const total = priorities.length;
    const completed = priorities.filter(p => p.status === 'COMPLETADO').length;
    const avgCompletion = total > 0
      ? priorities.reduce((sum, p) => sum + p.completionPercentage, 0) / total
      : 0;

    return { total, completed, avgCompletion: avgCompletion.toFixed(1) };
  }, [priorities]);

  const navigateWeek = (direction: number) => {
    const newMonday = new Date(currentWeek.monday);
    newMonday.setDate(newMonday.getDate() + (direction * 7));
    setCurrentWeek(getWeekDates(newMonday));
  };

  const handleExport = () => {
    const fileName = `Dashboard_${getWeekLabel(currentWeek.monday).replace(/\s/g, '_')}`;
    exportPriorities(priorities, users, initiatives, fileName);
  };

  const toggleUser = (userId: string) => {
    setExpandedUsers(prev => {
      const newSet = new Set(prev);
      if (newSet.has(userId)) {
        newSet.delete(userId);
      } else {
        newSet.add(userId);
      }
      return newSet;
    });
  };

  if (status === 'loading' || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="text-4xl mb-4">⏳</div>
          <div className="text-gray-600">Cargando...</div>
        </div>
      </div>
    );
  }

  if (!session) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="container mx-auto px-4 py-6">
        <div className="space-y-6 fade-in">
          <div className="flex items-center justify-between">
            <h1 className="text-3xl font-bold text-gray-800">
              📊 Dashboard de Prioridades
            </h1>
            <div className="flex items-center space-x-4">
              <button
                onClick={handleExport}
                className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition font-semibold"
                title="Exportar a Excel"
              >
                📥 Exportar a Excel
              </button>
              <button
                onClick={() => navigateWeek(-1)}
                className="bg-gray-200 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-300 transition"
              >
                ←
              </button>
              <div className="text-center">
                <div className="text-sm text-gray-600">Semana del</div>
                <div className="font-semibold text-gray-800">{getWeekLabel(currentWeek.monday)}</div>
              </div>
              <button
                onClick={() => navigateWeek(1)}
                className="bg-gray-200 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-300 transition"
              >
                →
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <StatCard
              label="Total Prioridades"
              value={stats.total}
              color="blue"
            />
            <StatCard
              label="Completadas"
              value={stats.completed}
              color="green"
            />
            <StatCard
              label="% Promedio Avance"
              value={`${stats.avgCompletion}%`}
              color="purple"
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {users.map(user => (
              <UserPriorityCard
                key={user._id}
                user={user}
                priorities={priorities.filter(p => p.userId === user._id)}
                initiatives={initiatives}
                isExpanded={expandedUsers.has(user._id)}
                onToggle={() => toggleUser(user._id)}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
