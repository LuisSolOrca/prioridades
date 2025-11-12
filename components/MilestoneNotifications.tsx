'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';

interface Milestone {
  _id: string;
  title: string;
  description?: string;
  dueDate: string;
  daysLeft: number;
  deliverables: Array<{
    title: string;
    isCompleted: boolean;
  }>;
}

export default function MilestoneNotifications() {
  const { data: session, status } = useSession();
  const [upcomingMilestones, setUpcomingMilestones] = useState<Milestone[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (status === 'authenticated') {
      loadUpcomingMilestones();
      // Recargar cada 5 minutos
      const interval = setInterval(loadUpcomingMilestones, 5 * 60 * 1000);
      return () => clearInterval(interval);
    }
  }, [status]);

  const loadUpcomingMilestones = async () => {
    try {
      const res = await fetch('/api/milestones/upcoming');
      if (res.ok) {
        const data = await res.json();
        setUpcomingMilestones(data);
      }
    } catch (error) {
      console.error('Error loading upcoming milestones:', error);
    }
  };

  const dismissMilestone = (id: string) => {
    setDismissed(prev => new Set([...prev, id]));
  };

  const visibleMilestones = upcomingMilestones.filter(m => !dismissed.has(m._id));

  if (visibleMilestones.length === 0) {
    return null;
  }

  return (
    <>
      {/* Botón flotante de notificaciones */}
      <button
        onClick={() => setShowNotifications(!showNotifications)}
        className="fixed bottom-6 right-6 bg-orange-600 dark:bg-orange-700 text-white rounded-full w-14 h-14 flex items-center justify-center shadow-lg hover:bg-orange-700 dark:hover:bg-orange-600 transition z-40 animate-pulse"
        title="Hitos próximos"
      >
        <span className="text-2xl">💎</span>
        {visibleMilestones.length > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold rounded-full w-6 h-6 flex items-center justify-center">
            {visibleMilestones.length}
          </span>
        )}
      </button>

      {/* Panel de notificaciones */}
      {showNotifications && (
        <div className="fixed bottom-24 right-6 w-96 max-h-[500px] bg-white dark:bg-gray-800 rounded-lg shadow-2xl border border-gray-200 dark:border-gray-700 z-40 overflow-hidden flex flex-col">
          <div className="p-4 border-b border-gray-200 dark:border-gray-700 bg-orange-50 dark:bg-orange-900/20">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-gray-800 dark:text-gray-100 flex items-center gap-2">
                <span className="text-xl">💎</span>
                Hitos Próximos
              </h3>
              <button
                onClick={() => setShowNotifications(false)}
                className="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
              >
                ✕
              </button>
            </div>
            <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
              {visibleMilestones.length} {visibleMilestones.length === 1 ? 'hito' : 'hitos'} en los próximos 7 días
            </p>
          </div>

          <div className="overflow-y-auto flex-1 p-4 space-y-3">
            {visibleMilestones.map((milestone) => {
              const pendingDeliverables = milestone.deliverables.filter(d => !d.isCompleted).length;
              const urgencyColor = milestone.daysLeft <= 2 ? 'red' : milestone.daysLeft <= 4 ? 'orange' : 'yellow';

              return (
                <div
                  key={milestone._id}
                  className={`p-3 rounded-lg border-l-4 ${
                    urgencyColor === 'red'
                      ? 'border-red-500 bg-red-50 dark:bg-red-900/20'
                      : urgencyColor === 'orange'
                      ? 'border-orange-500 bg-orange-50 dark:bg-orange-900/20'
                      : 'border-yellow-500 bg-yellow-50 dark:bg-yellow-900/20'
                  }`}
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1">
                      <h4 className="font-semibold text-sm text-gray-800 dark:text-gray-100">
                        {milestone.title}
                      </h4>
                      {milestone.description && (
                        <p className="text-xs text-gray-600 dark:text-gray-400 mt-1 line-clamp-2">
                          {milestone.description}
                        </p>
                      )}
                    </div>
                    <button
                      onClick={() => dismissMilestone(milestone._id)}
                      className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 ml-2"
                      title="Descartar"
                    >
                      ✕
                    </button>
                  </div>

                  <div className="flex items-center justify-between text-xs">
                    <span className={`font-bold ${
                      urgencyColor === 'red'
                        ? 'text-red-700 dark:text-red-300'
                        : urgencyColor === 'orange'
                        ? 'text-orange-700 dark:text-orange-300'
                        : 'text-yellow-700 dark:text-yellow-300'
                    }`}>
                      {milestone.daysLeft === 0 && '¡Hoy!'}
                      {milestone.daysLeft === 1 && '¡Mañana!'}
                      {milestone.daysLeft > 1 && `En ${milestone.daysLeft} días`}
                    </span>
                    {pendingDeliverables > 0 && (
                      <span className="text-gray-600 dark:text-gray-400">
                        {pendingDeliverables} {pendingDeliverables === 1 ? 'entregable pendiente' : 'entregables pendientes'}
                      </span>
                    )}
                  </div>

                  <div className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                    📅 {new Date(milestone.dueDate).toLocaleDateString('es-MX', {
                      weekday: 'short',
                      day: 'numeric',
                      month: 'short'
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </>
  );
}
