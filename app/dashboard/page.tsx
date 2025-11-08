'use client';

export const dynamic = 'force-dynamic';

import { useEffect, useState, useMemo } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Navbar from '@/components/Navbar';
import StatusBadge from '@/components/StatusBadge';
import CommentsSection from '@/components/CommentsSection';
import MotivationalBanner from '@/components/MotivationalBanner';
import { getWeekDates, getWeekLabel } from '@/lib/utils';
import { exportPriorities } from '@/lib/exportToExcel';
import ReactMarkdown from 'react-markdown';

interface User {
  _id: string;
  name: string;
  email: string;
  role: string;
  isActive: boolean;
  area?: string;
  isAreaLeader?: boolean;
}

interface Initiative {
  _id: string;
  name: string;
  color: string;
  order: number;
  isActive: boolean;
}

interface Client {
  _id: string;
  name: string;
  isActive: boolean;
}

interface Project {
  _id: string;
  name: string;
  description?: string;
  isActive: boolean;
}

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

interface Priority {
  _id: string;
  title: string;
  description?: string;
  weekStart: string;
  weekEnd: string;
  completionPercentage: number;
  status: 'EN_TIEMPO' | 'EN_RIESGO' | 'BLOQUEADO' | 'COMPLETADO' | 'REPROGRAMADO';
  type?: 'ESTRATEGICA' | 'OPERATIVA';
  userId: string;
  initiativeId?: string; // Mantener para compatibilidad
  initiativeIds?: string[]; // Nuevo campo para múltiples iniciativas
  clientId?: string;
  projectId?: string;
  checklist?: ChecklistItem[];
  evidenceLinks?: EvidenceLink[];
  wasEdited: boolean;
  isCarriedOver?: boolean;
}

interface StatCardProps {
  label: string;
  value: string | number;
  color: 'blue' | 'green' | 'purple';
}

function StatCard({ label, value, color }: StatCardProps) {
  const colors = {
    blue: 'bg-blue-500 dark:bg-blue-600',
    green: 'bg-green-500 dark:bg-green-600',
    purple: 'bg-purple-500 dark:bg-purple-600'
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">{label}</div>
          <div className="text-3xl font-bold text-gray-800 dark:text-gray-100">{value}</div>
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
  onViewDetails: (priority: Priority) => void;
  commentCounts: { [key: string]: number };
}

function UserPriorityCard({ user, priorities, initiatives, isExpanded, onToggle, onViewDetails, commentCounts }: UserPriorityCardProps) {
  const avgCompletion = priorities.length > 0
    ? priorities.reduce((sum, p) => sum + p.completionPercentage, 0) / priorities.length
    : 0;

  const completed = priorities.filter(p => p.status === 'COMPLETADO').length;
  const completionRate = priorities.length > 0 ? (completed / priorities.length * 100).toFixed(0) : 0;

  const blocked = priorities.filter(p => p.status === 'BLOQUEADO').length;
  const atRisk = priorities.filter(p => p.status === 'EN_RIESGO').length;
  const hasRisks = blocked > 0 || atRisk > 0;

  return (
    <div className={`bg-white dark:bg-gray-800 rounded-lg shadow-md border dark:border-gray-700 hover:shadow-lg transition-shadow ${hasRisks ? 'border-l-4 border-l-red-500 dark:border-l-red-500' : ''}`}>
      <div
        className="p-6 cursor-pointer"
        onClick={onToggle}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center flex-1">
            <div className="w-10 h-10 bg-blue-500 dark:bg-blue-600 text-white rounded-full flex items-center justify-center font-bold mr-3">
              {user.name.split(' ').map(n => n[0]).join('')}
            </div>
            <div className="flex-1">
              <div className="flex items-center">
                <div className="font-semibold text-gray-800 dark:text-gray-100">{user.name}</div>
                {hasRisks && (
                  <span className="ml-2 bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200 text-xs px-2 py-1 rounded-full font-semibold flex items-center">
                    ⚠️ {blocked > 0 && `${blocked} bloqueada${blocked > 1 ? 's' : ''}`}
                    {blocked > 0 && atRisk > 0 && ' • '}
                    {atRisk > 0 && `${atRisk} en riesgo`}
                  </span>
                )}
                <span className="ml-2 text-sm text-gray-400 dark:text-gray-500">
                  {isExpanded ? '▼' : '▶'}
                </span>
              </div>
              <div className="text-sm text-gray-500 dark:text-gray-400">{priorities.length} prioridades • {completed} completadas</div>
            </div>
          </div>
          <div className="flex items-center space-x-6">
            <div className="text-right">
              <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Tasa Completado</div>
              <div className="text-lg font-bold text-blue-600 dark:text-blue-400">{completionRate}%</div>
            </div>
            <div className="text-right">
              <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Promedio Avance</div>
              <div className="text-2xl font-bold text-gray-800 dark:text-gray-100">{avgCompletion.toFixed(0)}%</div>
            </div>
          </div>
        </div>
      </div>

      {isExpanded && (
        <div className="px-6 pb-6 pt-0 border-t dark:border-gray-700">
          <div className="mt-4 space-y-3">
            {priorities.length === 0 ? (
              <div className="text-center text-gray-400 dark:text-gray-500 py-8">
                <div className="text-4xl mb-2">📋</div>
                <div>Sin prioridades esta semana</div>
              </div>
            ) : (
              priorities.map(priority => {
                // Obtener iniciativas (compatibilidad con ambos campos)
                const priorityInitiativeIds = priority.initiativeIds || (priority.initiativeId ? [priority.initiativeId] : []);
                const priorityInitiatives = priorityInitiativeIds
                  .map(id => initiatives.find(i => i._id === id))
                  .filter((init): init is Initiative => init !== undefined);
                const primaryInitiative = priorityInitiatives[0];

                return (
                  <div key={priority._id} className="border-l-4 pl-3 py-2 bg-gray-50 dark:bg-gray-700 rounded" style={{ borderColor: primaryInitiative?.color || '#ccc' }}>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <div className="font-medium text-gray-800 dark:text-gray-100 text-sm">{priority.title}</div>
                          {priority.isCarriedOver && (
                            <span className="bg-orange-100 dark:bg-orange-900 text-orange-700 dark:text-orange-300 text-xs px-1.5 py-0.5 rounded flex items-center gap-0.5">
                              🔄
                            </span>
                          )}
                          {(priority as any).azureDevOps && (
                            <a
                              href={`https://dev.azure.com/${(priority as any).azureDevOps.organization}/${(priority as any).azureDevOps.project}/_workitems/edit/${(priority as any).azureDevOps.workItemId}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              onClick={(e) => e.stopPropagation()}
                              className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 transition"
                              title={`Sincronizado con Azure DevOps (WI #${(priority as any).azureDevOps.workItemId})`}
                            >
                              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M0 4.5v15l6.5 3.5v-3.5l-3-1.5v-13l3-1.5v-3.5l-6.5 3.5zm10.5-4.5v4.5l3 1.5v13l-3 1.5v4.5l6.5-3.5v-19l-6.5 3.5zm7 0v4.5l6.5 3.5v-8l-6.5 0z"/>
                              </svg>
                            </a>
                          )}
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onViewDetails(priority);
                            }}
                            className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 transition relative"
                            title="Ver descripción detallada"
                          >
                            🔍
                            {commentCounts[priority._id] > 0 && (
                              <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs font-bold rounded-full w-4 h-4 flex items-center justify-center" style={{ zIndex: 10 }}>
                                {commentCounts[priority._id]}
                              </span>
                            )}
                          </button>
                        </div>
                        <div className="text-xs text-gray-500 dark:text-gray-400 mt-1 flex flex-wrap gap-1">
                          {priorityInitiatives.map((initiative, idx) => initiative && (
                            <span key={initiative._id}>
                              <span style={{ color: initiative.color }}>●</span> {initiative.name}
                              {idx < priorityInitiatives.length - 1 ? ' • ' : ''}
                            </span>
                          ))}
                        </div>
                      </div>
                      <StatusBadge status={priority.status} />
                    </div>
                    <div className="mt-2">
                      <div className="flex items-center justify-between text-xs text-gray-600 dark:text-gray-400 mb-1">
                        <span>Avance</span>
                        <span className="font-semibold">{priority.completionPercentage}%</span>
                      </div>
                      <div className="w-full bg-gray-200 dark:bg-gray-600 rounded-full h-2">
                        <div
                          className="bg-blue-600 dark:bg-blue-500 h-2 rounded-full transition-all"
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
  const [clients, setClients] = useState<Client[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [priorities, setPriorities] = useState<Priority[]>([]);
  const [currentWeek, setCurrentWeek] = useState(getWeekDates());
  const [loading, setLoading] = useState(true);
  const [expandedUsers, setExpandedUsers] = useState<Set<string>>(new Set());
  const [selectedPriority, setSelectedPriority] = useState<Priority | null>(null);
  const [showAnalysisModal, setShowAnalysisModal] = useState(false);
  const [aiAnalysis, setAiAnalysis] = useState<string>('');
  const [analysisLoading, setAnalysisLoading] = useState(false);
  const [commentCounts, setCommentCounts] = useState<{ [key: string]: number }>({});
  const [priorityTypeFilter, setPriorityTypeFilter] = useState<'TODAS' | 'ESTRATEGICA' | 'OPERATIVA'>('TODAS');
  const [filterByMyArea, setFilterByMyArea] = useState(false);
  const [userStats, setUserStats] = useState<{
    points: number;
    currentStreak: number;
    longestStreak: number;
    badges: number;
    rank?: number;
  } | null>(null);
  const [currentUser, setCurrentUser] = useState<User | null>(null);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
    }
  }, [status, router]);

  useEffect(() => {
    if (status === 'authenticated') {
      loadData();
      loadUserStats();
    }
  }, [status, currentWeek]);

  const loadData = async () => {
    try {
      setLoading(true);

      const currentUserId = (session?.user as any)?.id;

      const [usersRes, initiativesRes, clientsRes, projectsRes, prioritiesRes, currentUserRes] = await Promise.all([
        fetch('/api/users?activeOnly=true'),
        fetch('/api/initiatives?activeOnly=true'),
        fetch('/api/clients?activeOnly=true'),
        fetch('/api/projects'),
        fetch(`/api/priorities?weekStart=${currentWeek.monday.toISOString()}&weekEnd=${currentWeek.friday.toISOString()}&forDashboard=true`),
        currentUserId ? fetch(`/api/users/${currentUserId}`) : Promise.resolve(null)
      ]);

      const [usersData, initiativesData, clientsData, projectsData, prioritiesData, currentUserData] = await Promise.all([
        usersRes.json(),
        initiativesRes.json(),
        clientsRes.json(),
        projectsRes.json(),
        prioritiesRes.json(),
        currentUserRes ? currentUserRes.json() : null
      ]);

      setUsers(usersData); // Mostrar todos los usuarios (USER y ADMIN)
      setInitiatives(initiativesData);
      setClients(Array.isArray(clientsData) ? clientsData : []);
      setProjects(Array.isArray(projectsData) ? projectsData : []);
      setPriorities(prioritiesData);
      setCurrentUser(currentUserData);

      // Cargar conteos de comentarios
      await loadCommentCounts(prioritiesData);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadCommentCounts = async (prioritiesToLoad: Priority[]) => {
    try {
      const priorityIds = prioritiesToLoad
        .filter(p => p._id)
        .map(p => p._id!)
        .join(',');

      if (!priorityIds) {
        setCommentCounts({});
        return;
      }

      const response = await fetch(`/api/comments/counts?priorityIds=${priorityIds}`);
      if (!response.ok) throw new Error('Error loading comment counts');

      const counts = await response.json();
      setCommentCounts(counts);
    } catch (error) {
      console.error('Error loading comment counts:', error);
      setCommentCounts({});
    }
  };

  const loadUserStats = async () => {
    try {
      if (!session?.user?.id) return;

      // Obtener badges
      const badgesRes = await fetch('/api/badges');
      const badges = await badgesRes.json();

      // Obtener datos del usuario (puntos y racha)
      const userRes = await fetch(`/api/users/${(session.user as any).id}`);
      const userData = await userRes.json();

      // Obtener leaderboard para saber el rank
      const leaderboardRes = await fetch('/api/leaderboard');
      const leaderboard = await leaderboardRes.json();
      const userRank = leaderboard.findIndex((entry: any) => entry.userId === (session.user as any).id) + 1;

      setUserStats({
        points: userData.gamification?.currentMonthPoints || 0,
        currentStreak: userData.gamification?.currentStreak || 0,
        longestStreak: userData.gamification?.longestStreak || 0,
        badges: Array.isArray(badges) ? badges.length : 0,
        rank: userRank > 0 ? userRank : undefined
      });
    } catch (error) {
      console.error('Error loading user stats:', error);
    }
  };

  // Filtrar usuarios por área (si el usuario tiene área asignada y el filtro está activo)
  const filteredUsers = useMemo(() => {
    if (!filterByMyArea || !currentUser?.area) {
      return users;
    }
    return users.filter(u => u.area === currentUser.area);
  }, [users, filterByMyArea, currentUser]);

  // Filtrar prioridades por tipo y por área
  const filteredPriorities = useMemo(() => {
    let filtered = priorities;

    // Filtrar por tipo
    if (priorityTypeFilter !== 'TODAS') {
      filtered = filtered.filter(p => (p.type || 'ESTRATEGICA') === priorityTypeFilter);
    }

    // Filtrar por área (solo usuarios del área filtrada)
    if (filterByMyArea && currentUser?.area) {
      const areaUserIds = filteredUsers.map(u => u._id);
      filtered = filtered.filter(p => areaUserIds.includes(p.userId));
    }

    return filtered;
  }, [priorities, priorityTypeFilter, filterByMyArea, currentUser, filteredUsers]);

  const stats = useMemo(() => {
    const total = filteredPriorities.length;
    const completed = filteredPriorities.filter(p => p.status === 'COMPLETADO').length;
    const avgCompletion = total > 0
      ? filteredPriorities.reduce((sum, p) => sum + p.completionPercentage, 0) / total
      : 0;

    return { total, completed, avgCompletion: avgCompletion.toFixed(1) };
  }, [filteredPriorities]);

  const navigateWeek = (direction: number) => {
    const newMonday = new Date(currentWeek.monday);
    newMonday.setDate(newMonday.getDate() + (direction * 7));
    setCurrentWeek(getWeekDates(newMonday));
  };

  const goToCurrentWeek = () => {
    setCurrentWeek(getWeekDates());
  };

  const handleExport = () => {
    const fileName = `Dashboard_${getWeekLabel(currentWeek.monday).replace(/\s/g, '_')}_${priorityTypeFilter}`;
    exportPriorities(filteredPriorities, users, initiatives, fileName);
  };

  const handleExportPowerPoint = async () => {
    try {
      const weekLabel = getWeekLabel(currentWeek.monday);

      const response = await fetch('/api/export/powerpoint', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          weekStart: currentWeek.monday.toISOString(),
          weekEnd: currentWeek.friday.toISOString(),
          weekLabel,
        }),
      });

      if (!response.ok) {
        throw new Error('Error al generar el reporte');
      }

      // Download file
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Reporte_Prioridades_${weekLabel.replace(/\s/g, '_')}.pptx`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Error exporting to PowerPoint:', error);
      alert('Error al exportar a PowerPoint. Por favor, intenta de nuevo.');
    }
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

  const handleViewDetails = (priority: Priority) => {
    setSelectedPriority(priority);
  };

  const handleCloseModal = () => {
    setSelectedPriority(null);
    loadCommentCounts(priorities);
  };

  const handleAIAnalysis = async () => {
    if (filteredPriorities.length === 0) {
      alert('No hay prioridades para analizar con el filtro actual');
      return;
    }

    setShowAnalysisModal(true);
    setAnalysisLoading(true);
    setAiAnalysis('');

    try {
      const res = await fetch('/api/ai/analyze-organization', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          weekStart: currentWeek.monday.toISOString(),
          weekEnd: currentWeek.friday.toISOString()
        })
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Error al generar el análisis');
      }

      const data = await res.json();
      setAiAnalysis(data.analysis);
    } catch (error: any) {
      console.error('Error analyzing organization:', error);
      setAiAnalysis(`❌ **Error**: ${error.message}`);
    } finally {
      setAnalysisLoading(false);
    }
  };

  const closeAnalysisModal = () => {
    setShowAnalysisModal(false);
    setAiAnalysis('');
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

  if (!session) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Navbar />
      <div className="pt-16 main-content px-4 py-6 max-w-7xl mx-auto">
        <div className="space-y-6 fade-in">
          <div className="flex items-center justify-between">
            <h1 className="text-3xl font-bold text-gray-800 dark:text-gray-100">
              📊 Dashboard de Prioridades
            </h1>
            <div className="flex items-center space-x-4">
              <button
                onClick={handleAIAnalysis}
                className="bg-purple-600 dark:bg-purple-700 text-white px-4 py-2 rounded-lg hover:bg-purple-700 dark:hover:bg-purple-600 transition font-semibold"
                title="Análisis Organizacional con IA"
              >
                🤖 Análisis IA
              </button>
              <button
                onClick={handleExportPowerPoint}
                className="bg-orange-600 dark:bg-orange-700 text-white px-4 py-2 rounded-lg hover:bg-orange-700 dark:hover:bg-orange-600 transition font-semibold"
                title="Exportar a PowerPoint"
              >
                📊 Exportar PPT
              </button>
              <button
                onClick={handleExport}
                className="bg-green-600 dark:bg-green-700 text-white px-4 py-2 rounded-lg hover:bg-green-700 dark:hover:bg-green-600 transition font-semibold"
                title="Exportar a Excel"
              >
                📥 Exportar Excel
              </button>
              <button
                onClick={() => navigateWeek(-1)}
                className="bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200 px-4 py-2 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition"
              >
                ←
              </button>
              <button
                onClick={goToCurrentWeek}
                className="bg-blue-600 dark:bg-blue-700 text-white px-4 py-2 rounded-lg hover:bg-blue-700 dark:hover:bg-blue-600 transition font-semibold"
                title="Ir a la semana actual"
              >
                📅 Semana Actual
              </button>
              <div className="text-center">
                <div className="text-sm text-gray-600 dark:text-gray-400">Semana del</div>
                <div className="font-semibold text-gray-800 dark:text-gray-200">{getWeekLabel(currentWeek.monday)}</div>
              </div>
              <button
                onClick={() => navigateWeek(1)}
                className="bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200 px-4 py-2 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition"
              >
                →
              </button>
            </div>
          </div>

          {/* Filtros */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-4 space-y-4">
            {/* Filtro por área (para usuarios con área asignada) */}
            {currentUser?.area && (
              <div className="flex items-center pb-4 border-b border-gray-200 dark:border-gray-700">
                <label className="flex items-center cursor-pointer group">
                  <input
                    type="checkbox"
                    checked={filterByMyArea}
                    onChange={(e) => setFilterByMyArea(e.target.checked)}
                    className="w-4 h-4 text-blue-600 border-gray-300 dark:border-gray-600 rounded focus:ring-blue-500 cursor-pointer"
                  />
                  <span className="ml-2 text-sm font-medium text-gray-700 dark:text-gray-300 group-hover:text-blue-700 dark:group-hover:text-blue-400 transition">
                    📍 Filtrar solo por mi área ({currentUser.area})
                  </span>
                </label>
              </div>
            )}

            {/* Filtro de Tipo de Prioridad */}
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                  Filtrar por tipo:
                </label>
                <select
                  value={priorityTypeFilter}
                  onChange={(e) => setPriorityTypeFilter(e.target.value as 'TODAS' | 'ESTRATEGICA' | 'OPERATIVA')}
                  className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm font-medium bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 cursor-not-allowed"
                  disabled
                >
                  <option value="TODAS">Todas</option>
                  <option value="ESTRATEGICA">Estratégicas</option>
                  <option value="OPERATIVA">Operativas</option>
                </select>
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">
                Mostrando {filteredPriorities.length} de {priorities.length} prioridades
                {filterByMyArea && currentUser?.area && (
                  <span className="ml-1 text-blue-600 dark:text-blue-400 font-medium">
                    • {filteredUsers.length} usuarios en {currentUser.area}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Motivational Banner */}
          {userStats && <MotivationalBanner userStats={userStats} />}

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
            {filteredUsers.map(user => {
              const userPriorities = filteredPriorities.filter(p => p.userId === user._id);

              return (
                <UserPriorityCard
                  key={user._id}
                  user={user}
                  priorities={userPriorities}
                  initiatives={initiatives}
                  isExpanded={expandedUsers.has(user._id)}
                  onToggle={() => toggleUser(user._id)}
                  onViewDetails={handleViewDetails}
                  commentCounts={commentCounts}
                />
              );
            })}
          </div>
        </div>
      </div>

      {/* Modal de Descripción Detallada */}
      {selectedPriority && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 dark:bg-opacity-70 flex items-center justify-center z-50 p-4"
          onClick={handleCloseModal}
        >
          <div
            className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6">
              {/* Header */}
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-100 mb-2">
                    {selectedPriority.title}
                  </h2>
                  <div className="flex items-center gap-3 flex-wrap">
                    <StatusBadge status={selectedPriority.status} />
                    {(() => {
                      const priorityInitiativeIds = selectedPriority.initiativeIds || (selectedPriority.initiativeId ? [selectedPriority.initiativeId] : []);
                      const priorityInitiatives = priorityInitiativeIds
                        .map(id => initiatives.find(i => i._id === id))
                        .filter((init): init is Initiative => init !== undefined);
                      return priorityInitiatives.map(initiative => (
                        <span key={initiative._id} className="text-sm text-gray-500 dark:text-gray-400">
                          <span style={{ color: initiative.color }}>●</span> {initiative.name}
                        </span>
                      ));
                    })()}
                  </div>
                </div>
                <button
                  onClick={handleCloseModal}
                  className="text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 text-2xl font-bold"
                >
                  ×
                </button>
              </div>

              {/* Descripción */}
              <div className="mb-6">
                <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Descripción</h3>
                <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                  {selectedPriority.description ? (
                    <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap">{selectedPriority.description}</p>
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
                    {users.find(u => u._id === selectedPriority.userId)?.name}
                  </p>
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Iniciativa(s)</h3>
                  <div className="flex flex-wrap gap-2">
                    {(() => {
                      const priorityInitiativeIds = selectedPriority.initiativeIds || (selectedPriority.initiativeId ? [selectedPriority.initiativeId] : []);
                      const priorityInitiatives = priorityInitiativeIds
                        .map(id => initiatives.find(i => i._id === id))
                        .filter((init): init is Initiative => init !== undefined);
                      return priorityInitiatives.map(initiative => (
                        <div key={initiative._id} className="flex items-center gap-1 bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded">
                          <div
                            className="w-2 h-2 rounded-full"
                            style={{ backgroundColor: initiative.color }}
                          ></div>
                          <span className="text-gray-800 dark:text-gray-200 text-sm">{initiative.name}</span>
                        </div>
                      ));
                    })()}
                  </div>
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Cliente</h3>
                  <p className="text-gray-800 dark:text-gray-200">
                    {selectedPriority.clientId
                      ? (clients.find(c => c._id === selectedPriority.clientId)?.name || 'No especificado')
                      : 'No especificado'}
                  </p>
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Semana</h3>
                  <p className="text-gray-800 dark:text-gray-200">
                    {new Date(selectedPriority.weekStart).toLocaleDateString('es-MX')} - {new Date(selectedPriority.weekEnd).toLocaleDateString('es-MX')}
                  </p>
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Avance</h3>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 bg-gray-200 dark:bg-gray-600 rounded-full h-3">
                      <div
                        className="bg-blue-600 dark:bg-blue-500 h-3 rounded-full transition-all"
                        style={{ width: `${selectedPriority.completionPercentage}%` }}
                      ></div>
                    </div>
                    <span className="font-semibold text-gray-800 dark:text-gray-200">{selectedPriority.completionPercentage}%</span>
                  </div>
                </div>
              </div>

              {/* Lista de Tareas */}
              {selectedPriority.checklist && selectedPriority.checklist.length > 0 && (
                <div className="mb-6">
                  <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3 flex items-center gap-2">
                    ✓ Lista de Tareas
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      ({selectedPriority.checklist.filter(item => item.completed).length}/{selectedPriority.checklist.length})
                    </span>
                  </h3>
                  <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                    <div className="space-y-2">
                      {selectedPriority.checklist.map((item, index) => (
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
              {selectedPriority.evidenceLinks && selectedPriority.evidenceLinks.length > 0 && (
                <div className="mb-6">
                  <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3 flex items-center gap-2">
                    🔗 Enlaces de Evidencia
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      ({selectedPriority.evidenceLinks.length})
                    </span>
                  </h3>
                  <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                    <div className="space-y-2">
                      {selectedPriority.evidenceLinks.map((link, index) => (
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
                <CommentsSection priorityId={selectedPriority._id} />
              </div>

              {/* Botón Cerrar */}
              <div className="flex justify-end">
                <button
                  onClick={handleCloseModal}
                  className="bg-blue-600 dark:bg-blue-700 text-white px-6 py-2 rounded-lg hover:bg-blue-700 dark:hover:bg-blue-600 transition font-semibold"
                >
                  Cerrar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Análisis Organizacional con IA */}
      {showAnalysisModal && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 dark:bg-opacity-70 flex items-center justify-center z-50 p-4"
          onClick={closeAnalysisModal}
        >
          <div
            className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6">
              {/* Header */}
              <div className="flex items-start justify-between mb-6">
                <div className="flex items-center space-x-3">
                  <div className="text-4xl">🤖</div>
                  <div>
                    <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-100">
                      Análisis Organizacional con IA
                    </h2>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                      Semana del {getWeekLabel(currentWeek.monday)}
                    </p>
                  </div>
                </div>
                <button
                  onClick={closeAnalysisModal}
                  className="text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 text-2xl font-bold"
                >
                  ×
                </button>
              </div>

              {/* Contenido del análisis */}
              <div className="bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 rounded-lg p-6 mb-6">
                {analysisLoading ? (
                  <div className="flex flex-col items-center justify-center py-12">
                    <div className="animate-spin text-6xl mb-4">🤖</div>
                    <div className="text-lg font-semibold text-gray-700 dark:text-gray-300 mb-2">
                      Analizando la situación organizacional...
                    </div>
                    <div className="text-sm text-gray-500 dark:text-gray-400">
                      Esto puede tomar unos segundos
                    </div>
                  </div>
                ) : aiAnalysis ? (
                  <div className="prose prose-sm max-w-none">
                    <ReactMarkdown
                      components={{
                        h1: ({node, ...props}) => <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100 mb-4 mt-6" {...props} />,
                        h2: ({node, ...props}) => <h2 className="text-xl font-bold text-gray-800 dark:text-gray-100 mb-3 mt-5" {...props} />,
                        h3: ({node, ...props}) => <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-300 mb-2 mt-4" {...props} />,
                        p: ({node, ...props}) => <p className="text-gray-700 dark:text-gray-300 mb-3 leading-relaxed" {...props} />,
                        ul: ({node, ...props}) => <ul className="list-disc list-inside mb-3 space-y-1 text-gray-700 dark:text-gray-300" {...props} />,
                        ol: ({node, ...props}) => <ol className="list-decimal list-inside mb-3 space-y-1 text-gray-700 dark:text-gray-300" {...props} />,
                        li: ({node, ...props}) => <li className="ml-4" {...props} />,
                        strong: ({node, ...props}) => <strong className="font-semibold text-gray-900 dark:text-gray-100" {...props} />,
                        em: ({node, ...props}) => <em className="italic text-gray-600 dark:text-gray-400" {...props} />,
                        code: ({node, ...props}) => <code className="bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded text-sm font-mono text-gray-800 dark:text-gray-200" {...props} />,
                      }}
                    >
                      {aiAnalysis}
                    </ReactMarkdown>
                  </div>
                ) : (
                  <div className="text-center text-gray-500 dark:text-gray-400 py-8">
                    Sin análisis disponible
                  </div>
                )}
              </div>

              {/* Botones de acción */}
              <div className="flex justify-end space-x-3">
                <button
                  onClick={closeAnalysisModal}
                  className="bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200 px-6 py-2 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition font-semibold"
                >
                  Cerrar
                </button>
                {!analysisLoading && aiAnalysis && (
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(aiAnalysis);
                      alert('Análisis copiado al portapapeles');
                    }}
                    className="bg-purple-600 dark:bg-purple-700 text-white px-6 py-2 rounded-lg hover:bg-purple-700 dark:hover:bg-purple-600 transition font-semibold"
                  >
                    📋 Copiar Análisis
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
