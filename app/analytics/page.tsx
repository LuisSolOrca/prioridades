'use client';

export const dynamic = 'force-dynamic';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Navbar from '@/components/Navbar';

interface User {
  _id: string;
  name: string;
  role: string;
}

interface Initiative {
  _id: string;
  name: string;
  color: string;
}

interface Priority {
  _id: string;
  status: string;
  completionPercentage: number;
  userId: string;
  initiativeId: string;
}

export default function AnalyticsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [users, setUsers] = useState<User[]>([]);
  const [initiatives, setInitiatives] = useState<Initiative[]>([]);
  const [priorities, setPriorities] = useState<Priority[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
    }
    if (status === 'authenticated') {
      loadData();
    }
  }, [status, router]);

  const loadData = async () => {
    try {
      const [usersRes, initiativesRes, prioritiesRes] = await Promise.all([
        fetch('/api/users'),
        fetch('/api/initiatives'),
        fetch('/api/priorities')
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

  if (!session) return null;

  const userStats = users.map(user => {
    const userPriorities = priorities.filter(p => p.userId === user._id);
    const completed = userPriorities.filter(p => p.status === 'COMPLETADO').length;
    const avgCompletion = userPriorities.length > 0
      ? userPriorities.reduce((sum, p) => sum + p.completionPercentage, 0) / userPriorities.length
      : 0;

    return {
      user,
      total: userPriorities.length,
      completed,
      completionRate: userPriorities.length > 0 ? (completed / userPriorities.length * 100).toFixed(1) : 0,
      avgCompletion: avgCompletion.toFixed(1)
    };
  });

  const initiativeStats = initiatives.map(initiative => {
    const initiativePriorities = priorities.filter(p => p.initiativeId === initiative._id);
    return {
      initiative,
      count: initiativePriorities.length,
      percentage: priorities.length > 0 ? (initiativePriorities.length / priorities.length * 100).toFixed(1) : 0
    };
  }).sort((a, b) => b.count - a.count);

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="container mx-auto px-4 py-6">
        <div className="space-y-6">
          <h1 className="text-3xl font-bold text-gray-800">
            📊 Analítica y Métricas
          </h1>

          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-bold text-gray-800 mb-4">Rendimiento por Usuario</h2>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-3 px-4">Usuario</th>
                    <th className="text-center py-3 px-4">Total Prioridades</th>
                    <th className="text-center py-3 px-4">Completadas</th>
                    <th className="text-center py-3 px-4">Tasa Completado</th>
                    <th className="text-center py-3 px-4">% Promedio Avance</th>
                  </tr>
                </thead>
                <tbody>
                  {userStats.map(stat => (
                    <tr key={stat.user._id} className="border-b hover:bg-gray-50">
                      <td className="py-3 px-4">
                        <div className="flex items-center">
                          <div className="w-8 h-8 bg-blue-500 text-white rounded-full flex items-center justify-center text-sm font-bold mr-2">
                            {stat.user.name.split(' ').map(n => n[0]).join('')}
                          </div>
                          {stat.user.name}
                        </div>
                      </td>
                      <td className="text-center py-3 px-4 font-semibold">{stat.total}</td>
                      <td className="text-center py-3 px-4">
                        <span className="bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm font-semibold">
                          {stat.completed}
                        </span>
                      </td>
                      <td className="text-center py-3 px-4">
                        <span className="font-bold text-blue-600">{stat.completionRate}%</span>
                      </td>
                      <td className="text-center py-3 px-4">
                        <div className="flex items-center justify-center">
                          <div className="w-24 bg-gray-200 rounded-full h-3 mr-2">
                            <div
                              className="bg-blue-600 h-3 rounded-full"
                              style={{ width: `${stat.avgCompletion}%` }}
                            ></div>
                          </div>
                          <span className="font-semibold">{stat.avgCompletion}%</span>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-bold text-gray-800 mb-4">Distribución por Iniciativa Estratégica</h2>
            <div className="space-y-4">
              {initiativeStats.map(stat => (
                <div key={stat.initiative._id}>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center">
                      <div
                        className="w-4 h-4 rounded-full mr-3"
                        style={{ backgroundColor: stat.initiative.color }}
                      ></div>
                      <span className="font-medium text-gray-800">{stat.initiative.name}</span>
                    </div>
                    <div className="flex items-center space-x-3">
                      <span className="text-sm text-gray-600">{stat.count} prioridades</span>
                      <span className="font-bold text-gray-800">{stat.percentage}%</span>
                    </div>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-3">
                    <div
                      className="h-3 rounded-full"
                      style={{
                        width: `${stat.percentage}%`,
                        backgroundColor: stat.initiative.color
                      }}
                    ></div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
