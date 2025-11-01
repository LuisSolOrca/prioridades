'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Navbar from '@/components/Navbar';
import KanbanBoard from '@/components/KanbanBoard';
import CommentsSection from '@/components/CommentsSection';
import { getWeekDates, getWeekLabel } from '@/lib/utils';

interface Initiative {
  _id: string;
  name: string;
  color: string;
  isActive: boolean;
}

interface Priority {
  _id?: string;
  title: string;
  description?: string;
  weekStart: string;
  weekEnd: string;
  completionPercentage: number;
  status: 'EN_TIEMPO' | 'EN_RIESGO' | 'BLOQUEADO' | 'COMPLETADO';
  userId: string;
  initiativeId?: string;
  initiativeIds?: string[];
  initiatives?: Initiative[];
}

export default function PrioritiesKanbanPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [initiatives, setInitiatives] = useState<Initiative[]>([]);
  const [currentWeekPriorities, setCurrentWeekPriorities] = useState<Priority[]>([]);
  const [nextWeekPriorities, setNextWeekPriorities] = useState<Priority[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPriorityForComments, setSelectedPriorityForComments] = useState<Priority | null>(null);

  const currentWeek = getWeekDates();
  const nextWeek = getWeekDates(new Date(currentWeek.monday.getTime() + 7 * 24 * 60 * 60 * 1000));

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
    }
    if (status === 'authenticated' && session) {
      loadData();
    }
  }, [status, session, router]);

  const loadData = async () => {
    try {
      setLoading(true);

      const [initiativesRes, currentWeekPrioritiesRes, nextWeekPrioritiesRes] = await Promise.all([
        fetch('/api/initiatives?activeOnly=true'),
        fetch(`/api/priorities?userId=${(session!.user as any).id}&weekStart=${currentWeek.monday.toISOString()}&weekEnd=${currentWeek.friday.toISOString()}`),
        fetch(`/api/priorities?userId=${(session!.user as any).id}&weekStart=${nextWeek.monday.toISOString()}&weekEnd=${nextWeek.friday.toISOString()}`)
      ]);

      const initiativesData = await initiativesRes.json();
      const currentWeekData = await currentWeekPrioritiesRes.json();
      const nextWeekData = await nextWeekPrioritiesRes.json();

      setInitiatives(initiativesData);

      // Add initiatives to priorities
      const enrichPriorities = (priorities: Priority[]) => {
        return priorities.map(p => ({
          ...p,
          initiatives: (p.initiativeIds || (p.initiativeId ? [p.initiativeId] : []))
            .map(id => initiativesData.find((i: Initiative) => i._id === id))
            .filter((init): init is Initiative => init !== undefined)
        }));
      };

      setCurrentWeekPriorities(enrichPriorities(currentWeekData));
      setNextWeekPriorities(enrichPriorities(nextWeekData));
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleKanbanStatusChange = async (priorityId: string, newStatus: string) => {
    try {
      const res = await fetch(`/api/priorities/${priorityId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });

      if (!res.ok) {
        throw new Error('Error al actualizar el estado');
      }

      await loadData();
    } catch (error) {
      console.error('Error updating priority status:', error);
      alert('Error al actualizar el estado de la prioridad');
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

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="container mx-auto px-4 py-6">
        <div className="space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <h1 className="text-3xl font-bold text-gray-800">
              📊 Vista Kanban - Prioridades
            </h1>
            <button
              onClick={() => router.push('/priorities')}
              className="bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-700 transition"
            >
              📋 Ver Lista
            </button>
          </div>

          {/* Current Week Kanban */}
          <div>
            <h2 className="text-xl font-bold text-gray-800 mb-4">
              📅 Semana Actual ({getWeekLabel(currentWeek.monday)})
              <span className="ml-3 text-sm font-normal text-gray-600">
                {currentWeekPriorities.length} {currentWeekPriorities.length === 1 ? 'prioridad' : 'prioridades'}
              </span>
            </h2>
            <KanbanBoard
              priorities={currentWeekPriorities}
              onStatusChange={handleKanbanStatusChange}
              onViewDetails={setSelectedPriorityForComments}
            />
          </div>

          {/* Next Week Kanban */}
          <div>
            <h2 className="text-xl font-bold text-gray-800 mb-4">
              📅 Siguiente Semana ({getWeekLabel(nextWeek.monday)})
              <span className="ml-3 text-sm font-normal text-gray-600">
                {nextWeekPriorities.length} {nextWeekPriorities.length === 1 ? 'prioridad' : 'prioridades'}
              </span>
            </h2>
            <KanbanBoard
              priorities={nextWeekPriorities}
              onStatusChange={handleKanbanStatusChange}
              onViewDetails={setSelectedPriorityForComments}
            />
          </div>
        </div>
      </div>

      {/* Modal de Comentarios */}
      {selectedPriorityForComments && selectedPriorityForComments._id && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
          onClick={() => setSelectedPriorityForComments(null)}
        >
          <div
            className="bg-white rounded-lg shadow-xl max-w-3xl w-full max-h-[80vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6">
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <h2 className="text-2xl font-bold text-gray-800">
                    {selectedPriorityForComments.title}
                  </h2>
                  {selectedPriorityForComments.description && (
                    <p className="text-gray-600 mt-2">
                      {selectedPriorityForComments.description}
                    </p>
                  )}
                </div>
              </div>

              <CommentsSection priorityId={selectedPriorityForComments._id} />

              <div className="flex justify-end mt-6 pt-4 border-t">
                <button
                  onClick={() => setSelectedPriorityForComments(null)}
                  className="bg-gray-600 text-white px-6 py-2 rounded-lg hover:bg-gray-700 transition font-semibold"
                >
                  Cerrar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
