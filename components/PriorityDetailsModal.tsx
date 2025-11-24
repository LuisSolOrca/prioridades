'use client';

import { useEffect, useState } from 'react';
import StatusBadge from './StatusBadge';
import CommentsSection from './CommentsSection';

interface ChecklistItem {
  _id?: string;
  text: string;
  completed: boolean;
  completedHours?: number;
  createdAt?: string;
}

interface EvidenceLink {
  _id?: string;
  title: string;
  url: string;
  createdAt?: string;
}

interface Initiative {
  _id: string;
  name: string;
  color: string;
}

interface Priority {
  _id: string;
  title: string;
  description?: string;
  weekStart: string;
  weekEnd: string;
  completionPercentage: number;
  status: 'EN_TIEMPO' | 'EN_RIESGO' | 'BLOQUEADO' | 'COMPLETADO' | 'REPROGRAMADO';
  userId: string;
  initiativeId?: string;
  initiativeIds?: string[];
  clientId?: string;
  projectId?: string;
  checklist?: ChecklistItem[];
  evidenceLinks?: EvidenceLink[];
}

interface User {
  _id: string;
  name: string;
}

interface Client {
  _id: string;
  name: string;
}

interface Project {
  _id: string;
  name: string;
}

interface PriorityDetailsModalProps {
  isOpen: boolean;
  priorityId: string | null;
  onClose: () => void;
}

export default function PriorityDetailsModal({
  isOpen,
  priorityId,
  onClose
}: PriorityDetailsModalProps) {
  const [priority, setPriority] = useState<Priority | null>(null);
  const [loading, setLoading] = useState(false);
  const [initiatives, setInitiatives] = useState<Initiative[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);

  useEffect(() => {
    if (isOpen && priorityId) {
      loadPriorityDetails();
      loadInitiatives();
      loadUsers();
      loadClients();
      loadProjects();
    }
  }, [isOpen, priorityId]);

  const loadPriorityDetails = async () => {
    if (!priorityId) return;

    try {
      setLoading(true);
      const response = await fetch(`/api/priorities/${priorityId}`);
      if (response.ok) {
        const data = await response.json();
        setPriority(data);
      }
    } catch (error) {
      console.error('Error loading priority details:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadInitiatives = async () => {
    try {
      const response = await fetch('/api/initiatives?activeOnly=true');
      if (response.ok) {
        const data = await response.json();
        setInitiatives(data);
      }
    } catch (error) {
      console.error('Error loading initiatives:', error);
    }
  };

  const loadUsers = async () => {
    try {
      const response = await fetch('/api/users');
      if (response.ok) {
        const data = await response.json();
        setUsers(data.users || data || []);
      }
    } catch (error) {
      console.error('Error loading users:', error);
    }
  };

  const loadClients = async () => {
    try {
      const response = await fetch('/api/clients');
      if (response.ok) {
        const data = await response.json();
        setClients(data.clients || data || []);
      }
    } catch (error) {
      console.error('Error loading clients:', error);
    }
  };

  const loadProjects = async () => {
    try {
      const response = await fetch('/api/projects');
      if (response.ok) {
        const data = await response.json();
        setProjects(data.projects || data || []);
      }
    } catch (error) {
      console.error('Error loading projects:', error);
    }
  };

  const handleClose = () => {
    setPriority(null);
    onClose();
  };

  if (!isOpen || !priority) {
    return null;
  }

  const priorityInitiativeIds = priority.initiativeIds || (priority.initiativeId ? [priority.initiativeId] : []);
  const priorityInitiatives = priorityInitiativeIds
    .map(id => initiatives.find(i => i._id === id))
    .filter((init): init is Initiative => init !== undefined);

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 dark:bg-opacity-70 flex items-center justify-center z-50 p-4"
      onClick={handleClose}
    >
      <div
        className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {loading ? (
          <div className="p-12 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-500 dark:text-gray-400">Cargando detalles...</p>
          </div>
        ) : (
          <div className="p-6">
            {/* Header */}
            <div className="flex items-start justify-between mb-4">
              <div className="flex-1">
                <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-100 mb-2">
                  {priority.title}
                </h2>
                <div className="flex items-center gap-3 flex-wrap">
                  <StatusBadge status={priority.status} />
                  {priorityInitiatives.map(initiative => (
                    <span key={initiative._id} className="text-sm text-gray-500 dark:text-gray-400">
                      <span style={{ color: initiative.color }}>●</span> {initiative.name}
                    </span>
                  ))}
                </div>
              </div>
              <button
                onClick={handleClose}
                className="text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 text-2xl font-bold"
              >
                ×
              </button>
            </div>

            {/* Descripción */}
            <div className="mb-6">
              <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Descripción</h3>
              <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                {priority.description ? (
                  <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap">{priority.description}</p>
                ) : (
                  <p className="text-gray-400 dark:text-gray-500 italic">Sin descripción</p>
                )}
              </div>
            </div>

            {/* Información Adicional */}
            <div className="grid grid-cols-2 gap-4 mb-6">
              <div>
                <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Usuario</h3>
                <p className="text-gray-800 dark:text-gray-200">
                  {(() => {
                    const userId = typeof priority.userId === 'string'
                      ? priority.userId
                      : priority.userId?._id || priority.userId;
                    return users.find(u => u._id === userId)?.name || 'Cargando...';
                  })()}
                </p>
              </div>
              <div>
                <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Iniciativa(s)</h3>
                <div className="flex flex-wrap gap-2">
                  {priorityInitiatives.map(initiative => (
                    <div key={initiative._id} className="flex items-center gap-1 bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded">
                      <div
                        className="w-2 h-2 rounded-full"
                        style={{ backgroundColor: initiative.color }}
                      ></div>
                      <span className="text-gray-800 dark:text-gray-200 text-sm">{initiative.name}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Cliente</h3>
                <p className="text-gray-800 dark:text-gray-200">
                  {priority.clientId
                    ? (clients.find(c => c._id === priority.clientId)?.name || 'No especificado')
                    : 'No especificado'}
                </p>
              </div>
              <div>
                <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Proyecto</h3>
                <p className="text-gray-800 dark:text-gray-200">
                  {priority.projectId
                    ? (projects.find(p => p._id === priority.projectId)?.name || 'No especificado')
                    : 'Sin proyecto'}
                </p>
              </div>
              <div>
                <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Semana</h3>
                <p className="text-gray-800 dark:text-gray-200">
                  {new Date(priority.weekStart).toLocaleDateString('es-MX')} - {new Date(priority.weekEnd).toLocaleDateString('es-MX')}
                </p>
              </div>
              <div>
                <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Avance</h3>
                <div className="flex items-center gap-2">
                  <div className="flex-1 bg-gray-200 dark:bg-gray-600 rounded-full h-3">
                    <div
                      className="bg-blue-600 dark:bg-blue-500 h-3 rounded-full transition-all"
                      style={{ width: `${priority.completionPercentage}%` }}
                    ></div>
                  </div>
                  <span className="font-semibold text-gray-800 dark:text-gray-200">{priority.completionPercentage}%</span>
                </div>
              </div>
            </div>

            {/* Lista de Tareas */}
            {priority.checklist && priority.checklist.length > 0 && (
              <div className="mb-6">
                <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3 flex items-center gap-2">
                  ✓ Lista de Tareas
                  <span className="text-xs text-gray-500 dark:text-gray-400">
                    ({priority.checklist.filter(item => item.completed).length}/{priority.checklist.length})
                  </span>
                </h3>
                <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                  <div className="space-y-2">
                    {priority.checklist.map((item, index) => (
                      <div
                        key={item._id || index}
                        className={`flex items-start gap-3 p-2 rounded ${
                          item.completed ? 'bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800' : 'bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600'
                        }`}
                      >
                        <div className={`mt-0.5 flex-shrink-0 w-5 h-5 rounded border-2 flex items-center justify-center ${
                          item.completed ? 'bg-green-500 dark:bg-green-600 border-green-500 dark:border-green-600' : 'border-gray-300 dark:border-gray-600'
                        }`}>
                          {item.completed && (
                            <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                            </svg>
                          )}
                        </div>
                        <div className="flex-1">
                          <span className={`text-sm ${
                            item.completed ? 'line-through text-gray-500 dark:text-gray-400' : 'text-gray-800 dark:text-gray-200'
                          }`}>
                            {item.text}
                          </span>
                          {item.completed && item.completedHours && (
                            <div className="mt-1 text-xs text-gray-600 dark:text-gray-400">
                              ⏱️ {item.completedHours} hrs trabajadas
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Enlaces de Evidencia */}
            {priority.evidenceLinks && priority.evidenceLinks.length > 0 && (
              <div className="mb-6">
                <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3 flex items-center gap-2">
                  🔗 Enlaces de Evidencia
                  <span className="text-xs text-gray-500 dark:text-gray-400">
                    ({priority.evidenceLinks.length})
                  </span>
                </h3>
                <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                  <div className="space-y-2">
                    {priority.evidenceLinks.map((link, index) => (
                      <a
                        key={link._id || index}
                        href={link.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-3 p-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/20 hover:border-blue-300 dark:hover:border-blue-700 transition group"
                      >
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-sm text-gray-800 dark:text-gray-200 group-hover:text-blue-700 dark:group-hover:text-blue-400 truncate">
                            {link.title}
                          </div>
                          <div className="text-xs text-gray-500 dark:text-gray-400 truncate">
                            {link.url}
                          </div>
                        </div>
                        <svg className="w-5 h-5 text-gray-400 dark:text-gray-500 group-hover:text-blue-600 dark:group-hover:text-blue-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                        </svg>
                      </a>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Comments Section */}
            <div className="mb-6">
              <CommentsSection priorityId={priority._id} />
            </div>

            {/* Botón Cerrar */}
            <div className="flex justify-end">
              <button
                onClick={handleClose}
                className="bg-blue-600 dark:bg-blue-700 text-white px-6 py-2 rounded-lg hover:bg-blue-700 dark:hover:bg-blue-600 transition font-semibold"
              >
                Cerrar
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
