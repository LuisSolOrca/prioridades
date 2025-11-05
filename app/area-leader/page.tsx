'use client';

import { useEffect, useState, useMemo } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Navbar from '@/components/Navbar';
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
  closestCorners,
  useDraggable,
  useDroppable
} from '@dnd-kit/core';
import { Users as UsersIcon, AlertCircle } from 'lucide-react';

interface User {
  _id: string;
  name: string;
  email: string;
  area?: string;
  isAreaLeader?: boolean;
  isActive?: boolean;
}

interface Priority {
  _id: string;
  title: string;
  description?: string;
  userId: string;
  status: string;
  completionPercentage: number;
  weekStart: string;
  weekEnd: string;
  initiativeIds?: Array<{ _id: string; name: string; color: string }>;
}

interface UserColumn {
  user: User;
  priorities: Priority[];
}

function DraggablePriorityCard({ priority }: { priority: Priority }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: priority._id,
  });

  const style = transform
    ? {
        transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
      }
    : undefined;

  const statusColors: Record<string, string> = {
    EN_TIEMPO: 'bg-green-100 text-green-800 border-green-300',
    EN_RIESGO: 'bg-yellow-100 text-yellow-800 border-yellow-300',
    BLOQUEADO: 'bg-red-100 text-red-800 border-red-300',
    COMPLETADO: 'bg-blue-100 text-blue-800 border-blue-300',
  };

  const statusLabels: Record<string, string> = {
    EN_TIEMPO: 'En Tiempo',
    EN_RIESGO: 'En Riesgo',
    BLOQUEADO: 'Bloqueado',
    COMPLETADO: 'Completado',
  };

  // Determinar si la prioridad es de la semana actual o siguiente
  const today = new Date();
  const currentMonday = new Date(today);
  currentMonday.setDate(today.getDate() - today.getDay() + (today.getDay() === 0 ? -6 : 1));
  currentMonday.setHours(0, 0, 0, 0);

  const priorityWeekStart = new Date(priority.weekStart);
  const isCurrentWeek = priorityWeekStart.getTime() === currentMonday.getTime();

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      className={`bg-white dark:bg-gray-700 p-4 rounded-lg shadow-sm border-2 hover:shadow-md transition cursor-grab active:cursor-grabbing ${
        isDragging ? 'opacity-50' : ''
      } ${isCurrentWeek ? 'border-l-4 border-l-blue-500' : 'border-l-4 border-l-purple-500'}`}
    >
      <div className="flex items-center justify-between mb-2">
        <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${
          isCurrentWeek ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-200' : 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-200'
        }`}>
          {isCurrentWeek ? '📅 Esta Semana' : '📆 Próxima Semana'}
        </span>
      </div>

      <h4 className="font-semibold text-gray-800 dark:text-gray-100 mb-2 line-clamp-2">{priority.title}</h4>
      {priority.description && (
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-3 line-clamp-2">{priority.description}</p>
      )}

      <div className="flex items-center justify-between">
        <span className={`text-xs px-2 py-1 rounded-full font-semibold ${statusColors[priority.status]}`}>
          {statusLabels[priority.status]}
        </span>
        <span className="text-sm font-bold text-gray-700 dark:text-gray-300">{priority.completionPercentage}%</span>
      </div>

      {priority.initiativeIds && priority.initiativeIds.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1">
          {priority.initiativeIds.map((init) => (
            <span
              key={init._id}
              className="text-xs px-2 py-0.5 rounded"
              style={{ backgroundColor: init.color + '20', color: init.color }}
            >
              {init.name}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

function PriorityCard({ priority }: { priority: Priority }) {
  const statusColors: Record<string, string> = {
    EN_TIEMPO: 'bg-green-100 text-green-800 border-green-300',
    EN_RIESGO: 'bg-yellow-100 text-yellow-800 border-yellow-300',
    BLOQUEADO: 'bg-red-100 text-red-800 border-red-300',
    COMPLETADO: 'bg-blue-100 text-blue-800 border-blue-300',
  };

  const statusLabels: Record<string, string> = {
    EN_TIEMPO: 'En Tiempo',
    EN_RIESGO: 'En Riesgo',
    BLOQUEADO: 'Bloqueado',
    COMPLETADO: 'Completado',
  };

  // Determinar si la prioridad es de la semana actual o siguiente
  const today = new Date();
  const currentMonday = new Date(today);
  currentMonday.setDate(today.getDate() - today.getDay() + (today.getDay() === 0 ? -6 : 1));
  currentMonday.setHours(0, 0, 0, 0);

  const priorityWeekStart = new Date(priority.weekStart);
  const isCurrentWeek = priorityWeekStart.getTime() === currentMonday.getTime();

  return (
    <div className={`bg-white dark:bg-gray-700 p-4 rounded-lg shadow-sm border-2 ${isCurrentWeek ? 'border-l-4 border-l-blue-500' : 'border-l-4 border-l-purple-500'}`}>
      <div className="flex items-center justify-between mb-2">
        <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${
          isCurrentWeek ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-200' : 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-200'
        }`}>
          {isCurrentWeek ? '📅 Esta Semana' : '📆 Próxima Semana'}
        </span>
      </div>

      <h4 className="font-semibold text-gray-800 dark:text-gray-100 mb-2 line-clamp-2">{priority.title}</h4>
      {priority.description && (
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-3 line-clamp-2">{priority.description}</p>
      )}

      <div className="flex items-center justify-between">
        <span className={`text-xs px-2 py-1 rounded-full font-semibold ${statusColors[priority.status]}`}>
          {statusLabels[priority.status]}
        </span>
        <span className="text-sm font-bold text-gray-700 dark:text-gray-300">{priority.completionPercentage}%</span>
      </div>

      {priority.initiativeIds && priority.initiativeIds.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1">
          {priority.initiativeIds.map((init) => (
            <span
              key={init._id}
              className="text-xs px-2 py-0.5 rounded"
              style={{ backgroundColor: init.color + '20', color: init.color }}
            >
              {init.name}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

function DroppableColumn({ userColumn }: { userColumn: UserColumn }) {
  const { setNodeRef, isOver } = useDroppable({
    id: `column-${userColumn.user._id}`,
    data: {
      userId: userColumn.user._id,
    },
  });

  return (
    <div
      ref={setNodeRef}
      className={`bg-gray-50 dark:bg-gray-800 rounded-lg p-4 transition-colors ${
        isOver ? 'bg-blue-50 dark:bg-blue-900/30 border-2 border-blue-400 dark:border-blue-600 border-dashed' : 'border-2 border-transparent'
      }`}
    >
      <div className="sticky top-0 bg-gray-50 dark:bg-gray-800 pb-3 mb-3 border-b-2 border-gray-200 dark:border-gray-700 z-10">
        <div className="flex items-center gap-2 mb-1">
          <div className="w-8 h-8 bg-blue-500 text-white rounded-full flex items-center justify-center font-bold text-sm">
            {userColumn.user.name.charAt(0).toUpperCase()}
          </div>
          <h3 className="font-bold text-gray-800 dark:text-gray-100">{userColumn.user.name}</h3>
        </div>
        <p className="text-xs text-gray-500 dark:text-gray-400">{userColumn.priorities.length} prioridades</p>
      </div>

      <div className="space-y-3 min-h-[200px]">
        {userColumn.priorities.length === 0 ? (
          <div className="text-center text-gray-400 dark:text-gray-500 py-8">
            <div className="text-3xl mb-2">📋</div>
            <div className="text-sm">Sin prioridades</div>
            <div className="text-xs mt-1">Arrastra prioridades aquí</div>
          </div>
        ) : (
          userColumn.priorities.map((priority) => (
            <DraggablePriorityCard key={priority._id} priority={priority} />
          ))
        )}
      </div>
    </div>
  );
}

export default function AreaLeaderPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState<User[]>([]);
  const [priorities, setPriorities] = useState<Priority[]>([]);
  const [currentArea, setCurrentArea] = useState<string>('');
  const [activePriority, setActivePriority] = useState<Priority | null>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
    }
    if (status === 'authenticated') {
      const user = session.user as any;
      loadData(user.id);
    }
  }, [status, router, session]);

  const loadData = async (userId: string) => {
    try {
      setLoading(true);

      // Obtener información del usuario actual
      const userRes = await fetch('/api/users');
      const allUsers = await userRes.json();
      const currentUser = allUsers.find((u: User) => u._id === userId);

      if (!currentUser || !currentUser.isAreaLeader) {
        setMessage({ type: 'error', text: 'Solo los líderes de área pueden acceder a esta página' });
        setTimeout(() => router.push('/dashboard'), 2000);
        return;
      }

      if (!currentUser.area) {
        setMessage({ type: 'error', text: 'No tienes un área asignada' });
        setTimeout(() => router.push('/dashboard'), 2000);
        return;
      }

      setCurrentArea(currentUser.area);

      // Filtrar usuarios del área
      const areaUsers = allUsers.filter(
        (u: User) => u.area === currentUser.area && u.isActive !== false
      );
      setUsers(areaUsers);

      // Obtener prioridades de la semana actual y la siguiente
      const today = new Date();
      const currentMonday = new Date(today);
      currentMonday.setDate(today.getDate() - today.getDay() + (today.getDay() === 0 ? -6 : 1));
      currentMonday.setHours(0, 0, 0, 0);

      const currentFriday = new Date(currentMonday);
      currentFriday.setDate(currentMonday.getDate() + 4);
      currentFriday.setHours(23, 59, 59, 999);

      const nextMonday = new Date(currentMonday);
      nextMonday.setDate(currentMonday.getDate() + 7);

      const nextFriday = new Date(nextMonday);
      nextFriday.setDate(nextMonday.getDate() + 4);
      nextFriday.setHours(23, 59, 59, 999);

      // Obtener prioridades de ambas semanas (forDashboard=true para ver todas las prioridades)
      const [currentWeekRes, nextWeekRes] = await Promise.all([
        fetch(`/api/priorities?weekStart=${currentMonday.toISOString()}&weekEnd=${currentFriday.toISOString()}&forDashboard=true`),
        fetch(`/api/priorities?weekStart=${nextMonday.toISOString()}&weekEnd=${nextFriday.toISOString()}&forDashboard=true`)
      ]);

      const currentWeekPriorities = await currentWeekRes.json();
      const nextWeekPriorities = await nextWeekRes.json();
      const allPriorities = [...currentWeekPriorities, ...nextWeekPriorities];

      // Filtrar prioridades del área
      const areaPriorities = allPriorities.filter((p: Priority) =>
        areaUsers.some((u: User) => u._id === p.userId)
      );
      setPriorities(areaPriorities);
    } catch (error) {
      console.error('Error loading data:', error);
      setMessage({ type: 'error', text: 'Error al cargar los datos' });
    } finally {
      setLoading(false);
    }
  };

  const userColumns = useMemo(() => {
    return users.map((user) => ({
      user,
      priorities: priorities.filter((p) => p.userId === user._id),
    }));
  }, [users, priorities]);

  const handleDragStart = (event: DragStartEvent) => {
    const priorityId = event.active.id as string;
    const priority = priorities.find((p) => p._id === priorityId);
    setActivePriority(priority || null);
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    setActivePriority(null);

    if (!over) return;

    const priorityId = active.id as string;

    // Obtener el userId de la columna destino
    let newUserId: string | null = null;

    if (over.data?.current?.userId) {
      newUserId = over.data.current.userId;
    }

    if (!newUserId) return;

    const priority = priorities.find((p) => p._id === priorityId);
    if (!priority || priority.userId === newUserId) return;

    try {
      const res = await fetch(`/api/priorities/${priorityId}/reassign`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ newUserId }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Error al reasignar');
      }

      // Actualizar localmente
      setPriorities((prev) =>
        prev.map((p) => (p._id === priorityId ? { ...p, userId: newUserId! } : p))
      );

      setMessage({ type: 'success', text: 'Prioridad reasignada exitosamente' });
      setTimeout(() => setMessage(null), 3000);
    } catch (error: any) {
      console.error('Error reassigning priority:', error);
      setMessage({ type: 'error', text: error.message || 'Error al reasignar la prioridad' });
      setTimeout(() => setMessage(null), 5000);
    }
  };

  if (status === 'loading' || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <div className="text-4xl mb-4">⏳</div>
          <div className="text-gray-600 dark:text-gray-400">Cargando...</div>
        </div>
      </div>
    );
  }

  if (!session) return null;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Navbar />
      <div className="pt-16 main-content">
        <div className="px-6 py-6">
          {/* Header */}
          <div className="mb-6">
            <div className="flex items-center gap-3 mb-2">
              <UsersIcon size={32} className="text-blue-600" />
              <h1 className="text-3xl font-bold text-gray-800 dark:text-gray-100">Gestión de Área</h1>
            </div>
            <p className="text-gray-600 dark:text-gray-400 mb-2">
              Arrastra y suelta prioridades para reasignarlas a los miembros de tu área:{' '}
              <span className="font-bold text-blue-600 dark:text-blue-400">{currentArea}</span>
            </p>
            <div className="flex items-center gap-4 text-sm">
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-blue-500 rounded"></div>
                <span className="text-gray-600 dark:text-gray-400">📅 Esta Semana</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-purple-500 rounded"></div>
                <span className="text-gray-600 dark:text-gray-400">📆 Próxima Semana</span>
              </div>
            </div>
          </div>

          {/* Message */}
          {message && (
            <div
              className={`mb-4 p-4 rounded-lg flex items-center gap-2 ${
                message.type === 'success'
                  ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200 border border-green-300 dark:border-green-800'
                  : 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-200 border border-red-300 dark:border-red-800'
              }`}
            >
              {message.type === 'error' && <AlertCircle size={20} />}
              <span>{message.text}</span>
            </div>
          )}

          {/* Drag and Drop Board */}
          <DndContext
            sensors={sensors}
            collisionDetection={closestCorners}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
          >
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4">
              {userColumns.map((userColumn) => (
                <DroppableColumn key={userColumn.user._id} userColumn={userColumn} />
              ))}

              {userColumns.length === 0 && (
                <div className="col-span-full text-center w-full py-12">
                  <div className="text-6xl mb-4">👥</div>
                  <div className="text-xl text-gray-600 dark:text-gray-400">No hay usuarios en tu área</div>
                </div>
              )}
            </div>

            <DragOverlay>
              {activePriority ? <PriorityCard priority={activePriority} /> : null}
            </DragOverlay>
          </DndContext>
        </div>
      </div>
    </div>
  );
}
