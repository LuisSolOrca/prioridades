'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { DragDropContext, Droppable, DropResult } from '@hello-pangea/dnd';
import Navbar from '@/components/Navbar';
import KanbanCard from '@/components/KanbanCard';
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

  const handleDragEnd = async (result: DropResult) => {
    // Save scroll position
    const scrollY = window.scrollY;
    const scrollX = window.scrollX;

    const { destination, source, draggableId } = result;

    // No destination or dropped in the same place
    if (!destination || (destination.droppableId === source.droppableId && destination.index === source.index)) {
      return;
    }

    // Parse droppableId format: "weekId-status"
    const [sourceWeek, sourceStatus] = source.droppableId.split('-');
    const [destWeek, destStatus] = destination.droppableId.split('-');

    try {
      const updateData: any = {};
      const changes: string[] = [];

      // Status labels mapping
      const statusLabels: Record<string, string> = {
        'EN_TIEMPO': 'En Tiempo',
        'EN_RIESGO': 'En Riesgo',
        'BLOQUEADO': 'Bloqueado',
        'COMPLETADO': 'Completado'
      };

      // Check if status changed
      if (sourceStatus !== destStatus) {
        updateData.status = destStatus;
        changes.push(`Estado cambiado de "${statusLabels[sourceStatus]}" a "${statusLabels[destStatus]}"`);
      }

      // Check if week changed
      if (sourceWeek !== destWeek) {
        const targetWeek = destWeek === 'current' ? currentWeek : nextWeek;
        updateData.weekStart = targetWeek.monday.toISOString();
        updateData.weekEnd = targetWeek.friday.toISOString();

        const weekLabels: Record<string, string> = {
          'current': `Semana Actual (${getWeekLabel(currentWeek.monday)})`,
          'next': `Siguiente Semana (${getWeekLabel(nextWeek.monday)})`
        };
        changes.push(`Reprogramado de "${weekLabels[sourceWeek]}" a "${weekLabels[destWeek]}"`);
      }

      // Only update if something changed
      if (Object.keys(updateData).length > 0) {
        const res = await fetch(`/api/priorities/${draggableId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(updateData),
        });

        if (!res.ok) {
          throw new Error('Error al actualizar la prioridad');
        }

        // Create system comment
        if (changes.length > 0) {
          const commentText = `🤖 ${changes.join(' • ')}`;
          await fetch('/api/comments', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              priorityId: draggableId,
              text: commentText,
              isSystemComment: true
            }),
          });
        }

        await loadData();

        // Restore scroll position
        requestAnimationFrame(() => {
          window.scrollTo(scrollX, scrollY);
        });
      }
    } catch (error) {
      console.error('Error updating priority:', error);
      alert('Error al actualizar la prioridad');
      await loadData(); // Reload to reset UI
    }
  };

  const handleDragStart = () => {
    if (window) {
      document.body.style.overflow = 'hidden';
    }
  };

  const handleDragUpdate = () => {
    if (window && document.body.style.overflow !== 'hidden') {
      document.body.style.overflow = 'hidden';
    }
  };

  const resetScroll = () => {
    if (window) {
      document.body.style.overflow = '';
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

  const columns = [
    { id: 'EN_TIEMPO', title: 'En Tiempo', color: 'bg-green-100', headerColor: 'bg-green-600' },
    { id: 'EN_RIESGO', title: 'En Riesgo', color: 'bg-yellow-100', headerColor: 'bg-yellow-600' },
    { id: 'BLOQUEADO', title: 'Bloqueado', color: 'bg-red-100', headerColor: 'bg-red-600' },
    { id: 'COMPLETADO', title: 'Completado', color: 'bg-blue-100', headerColor: 'bg-blue-600' },
  ];

  const renderWeekBoard = (weekId: string, weekLabel: string, priorities: Priority[]) => {
    return (
      <div key={weekId}>
        <h2 className="text-xl font-bold text-gray-800 mb-4">
          📅 {weekLabel}
          <span className="ml-3 text-sm font-normal text-gray-600">
            {priorities.length} {priorities.length === 1 ? 'prioridad' : 'prioridades'}
          </span>
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {columns.map(column => {
            const columnPriorities = priorities.filter(p => p.status === column.id);

            return (
              <div key={column.id} className="flex flex-col">
                <div className={`${column.headerColor} text-white rounded-t-lg px-4 py-3 flex items-center justify-between`}>
                  <h3 className="font-bold text-sm">{column.title}</h3>
                  <span className="bg-white bg-opacity-30 rounded-full px-2 py-1 text-xs font-semibold">
                    {columnPriorities.length}
                  </span>
                </div>

                <Droppable droppableId={`${weekId}-${column.id}`}>
                  {(provided, snapshot) => (
                    <div
                      ref={provided.innerRef}
                      {...provided.droppableProps}
                      className={`
                        ${column.color} rounded-b-lg p-3 min-h-[500px] flex-1
                        ${snapshot.isDraggingOver ? 'ring-2 ring-blue-400 bg-opacity-80' : ''}
                        transition-all duration-200
                      `}
                    >
                      {columnPriorities.map((priority, index) => (
                        <KanbanCard
                          key={priority._id}
                          priority={priority}
                          index={index}
                          onViewDetails={setSelectedPriorityForComments}
                        />
                      ))}
                      {provided.placeholder}

                      {columnPriorities.length === 0 && (
                        <div className="text-center text-gray-400 text-sm mt-8">
                          No hay prioridades
                        </div>
                      )}
                    </div>
                  )}
                </Droppable>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="container mx-auto px-4 py-6">
        <DragDropContext
          onDragStart={handleDragStart}
          onDragUpdate={handleDragUpdate}
          onDragEnd={(result) => {
            handleDragEnd(result);
            resetScroll();
          }}
        >
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

            {/* Current Week Board */}
            {renderWeekBoard('current', `Semana Actual (${getWeekLabel(currentWeek.monday)})`, currentWeekPriorities)}

            {/* Next Week Board */}
            {renderWeekBoard('next', `Siguiente Semana (${getWeekLabel(nextWeek.monday)})`, nextWeekPriorities)}
          </div>
        </DragDropContext>
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
