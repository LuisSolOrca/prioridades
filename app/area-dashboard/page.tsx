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
import { exportPrioritiesByArea } from '@/lib/exportToExcel';
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
  initiativeId?: string;
  initiativeIds?: string[];
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

interface AreaData {
  area: string;
  leader: User | null;
  users: User[];
  priorities: Priority[];
}

interface AreaPriorityCardProps {
  areaData: AreaData;
  initiatives: Initiative[];
  isExpanded: boolean;
  onToggle: () => void;
  onViewDetails: (priority: Priority) => void;
  commentCounts: { [key: string]: number };
  allUsers: User[];
}

function AreaPriorityCard({
  areaData,
  initiatives,
  isExpanded,
  onToggle,
  onViewDetails,
  commentCounts,
  allUsers
}: AreaPriorityCardProps) {
  const avgCompletion = areaData.priorities.length > 0
    ? areaData.priorities.reduce((sum, p) => sum + p.completionPercentage, 0) / areaData.priorities.length
    : 0;

  const completed = areaData.priorities.filter(p => p.status === 'COMPLETADO').length;
  const completionRate = areaData.priorities.length > 0 ? (completed / areaData.priorities.length * 100).toFixed(0) : 0;

  const blocked = areaData.priorities.filter(p => p.status === 'BLOQUEADO').length;
  const atRisk = areaData.priorities.filter(p => p.status === 'EN_RIESGO').length;
  const hasRisks = blocked > 0 || atRisk > 0;

  return (
    <div className={`bg-white dark:bg-gray-800 rounded-lg shadow-md border dark:border-gray-700 hover:shadow-lg transition-shadow ${hasRisks ? 'border-l-4 border-l-red-500 dark:border-l-red-500' : ''}`}>
      <div
        className="p-6 cursor-pointer"
        onClick={onToggle}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center flex-1">
            <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-blue-500 dark:from-purple-600 dark:to-blue-600 text-white rounded-lg flex items-center justify-center font-bold mr-3 shadow-md">
              {areaData.area ? areaData.area.substring(0, 2).toUpperCase() : 'SA'}
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <div className="font-bold text-gray-800 dark:text-gray-100 text-lg">
                  {areaData.area || 'Sin Área Asignada'}
                </div>
                {areaData.leader && (
                  <span className="bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 text-xs px-2 py-1 rounded-full font-semibold flex items-center gap-1">
                    👑 Líder: {areaData.leader.name}
                  </span>
                )}
                {hasRisks && (
                  <span className="bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200 text-xs px-2 py-1 rounded-full font-semibold flex items-center">
                    ⚠️ {blocked > 0 && `${blocked} bloqueada${blocked > 1 ? 's' : ''}`}
                    {blocked > 0 && atRisk > 0 && ' • '}
                    {atRisk > 0 && `${atRisk} en riesgo`}
                  </span>
                )}
                <span className="ml-2 text-sm text-gray-400 dark:text-gray-500">
                  {isExpanded ? '▼' : '▶'}
                </span>
              </div>
              <div className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                {areaData.users.length} {areaData.users.length === 1 ? 'persona' : 'personas'} • {areaData.priorities.length} prioridades • {completed} completadas
              </div>
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
            {areaData.priorities.length === 0 ? (
              <div className="text-center text-gray-400 dark:text-gray-500 py-8">
                <div className="text-4xl mb-2">📋</div>
                <div>Sin prioridades esta semana</div>
              </div>
            ) : (
              areaData.priorities.map(priority => {
                const priorityUser = allUsers.find(u => u._id === priority.userId);
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
                        <div className="text-xs text-gray-600 dark:text-gray-400 mt-1 flex items-center gap-2">
                          <span className="font-semibold">
                            👤 {priorityUser?.name || 'Usuario desconocido'}
                          </span>
                          {priorityInitiatives.length > 0 && (
                            <span className="text-gray-400 dark:text-gray-500">•</span>
                          )}
                          <div className="flex flex-wrap gap-1">
                            {priorityInitiatives.map((initiative, idx) => initiative && (
                              <span key={initiative._id}>
                                <span style={{ color: initiative.color }}>●</span> {initiative.name}
                                {idx < priorityInitiatives.length - 1 ? ' • ' : ''}
                              </span>
                            ))}
                          </div>
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

export default function AreaDashboardPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [users, setUsers] = useState<User[]>([]);
  const [initiatives, setInitiatives] = useState<Initiative[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [priorities, setPriorities] = useState<Priority[]>([]);
  const [currentWeek, setCurrentWeek] = useState(getWeekDates());
  const [loading, setLoading] = useState(true);
  const [expandedAreas, setExpandedAreas] = useState<Set<string>>(new Set());
  const [selectedPriority, setSelectedPriority] = useState<Priority | null>(null);
  const [showAnalysisModal, setShowAnalysisModal] = useState(false);
  const [aiAnalysis, setAiAnalysis] = useState<string>('');
  const [analysisLoading, setAnalysisLoading] = useState(false);
  const [commentCounts, setCommentCounts] = useState<{ [key: string]: number }>({});
  const [priorityTypeFilter, setPriorityTypeFilter] = useState<'TODAS' | 'ESTRATEGICA' | 'OPERATIVA'>('TODAS');

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

      const [usersRes, initiativesRes, clientsRes, projectsRes, prioritiesRes] = await Promise.all([
        fetch('/api/users?activeOnly=true'),
        fetch('/api/initiatives?activeOnly=true'),
        fetch('/api/clients?activeOnly=true'),
        fetch('/api/projects'),
        fetch(`/api/priorities?weekStart=${currentWeek.monday.toISOString()}&weekEnd=${currentWeek.friday.toISOString()}&forDashboard=true`)
      ]);

      const [usersData, initiativesData, clientsData, projectsData, prioritiesData] = await Promise.all([
        usersRes.json(),
        initiativesRes.json(),
        clientsRes.json(),
        projectsRes.json(),
        prioritiesRes.json()
      ]);

      setUsers(usersData);
      setInitiatives(initiativesData);
      setClients(Array.isArray(clientsData) ? clientsData : []);
      setProjects(Array.isArray(projectsData) ? projectsData : []);
      setPriorities(prioritiesData);

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

  // Filtrar prioridades por tipo
  const filteredPriorities = useMemo(() => {
    if (priorityTypeFilter === 'TODAS') {
      return priorities;
    }
    return priorities.filter(p => (p.type || 'ESTRATEGICA') === priorityTypeFilter);
  }, [priorities, priorityTypeFilter]);

  const areaGroups = useMemo(() => {
    // Agrupar usuarios por área
    const areaMap = new Map<string, AreaData>();

    users.forEach(user => {
      const areaKey = user.area || '';

      if (!areaMap.has(areaKey)) {
        areaMap.set(areaKey, {
          area: user.area || '',
          leader: null,
          users: [],
          priorities: []
        });
      }

      const areaData = areaMap.get(areaKey)!;
      areaData.users.push(user);

      if (user.isAreaLeader) {
        areaData.leader = user;
      }

      // Agregar las prioridades filtradas del usuario
      const userPriorities = filteredPriorities.filter(p => p.userId === user._id);
      areaData.priorities.push(...userPriorities);
    });

    // Convertir a array y ordenar (áreas con nombre primero, luego "Sin Área")
    return Array.from(areaMap.values()).sort((a, b) => {
      if (!a.area && b.area) return 1;
      if (a.area && !b.area) return -1;
      return a.area.localeCompare(b.area);
    });
  }, [users, filteredPriorities]);

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
    const fileName = `Dashboard_Areas_${getWeekLabel(currentWeek.monday).replace(/\s/g, '_')}_${priorityTypeFilter}`;
    exportPrioritiesByArea(filteredPriorities, users, initiatives, fileName);
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
          groupByArea: true, // Indicar que debe agrupar por área
        }),
      });

      if (!response.ok) {
        throw new Error('Error al generar el reporte');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Reporte_Prioridades_Areas_${weekLabel.replace(/\s/g, '_')}.pptx`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);

      // Track feature usage
      await fetch('/api/gamification/track-feature', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ feature: 'powerpointExports' })
      });
    } catch (error) {
      console.error('Error exporting PowerPoint:', error);
      alert('Error al exportar a PowerPoint');
    }
  };

  const handleAnalyze = async () => {
    try {
      setAnalysisLoading(true);
      setShowAnalysisModal(true);
      setAiAnalysis('');

      const response = await fetch('/api/ai/analyze-by-area', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          weekStart: currentWeek.monday.toISOString(),
          weekEnd: currentWeek.friday.toISOString(),
        })
      });

      if (!response.ok) {
        throw new Error('Error al analizar');
      }

      const data = await response.json();
      setAiAnalysis(data.analysis);

      // Track feature usage
      await fetch('/api/gamification/track-feature', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ feature: 'aiOrgAnalysis' })
      });
    } catch (error) {
      console.error('Error analyzing:', error);
      setAiAnalysis('Error al generar el análisis. Por favor intenta nuevamente.');
    } finally {
      setAnalysisLoading(false);
    }
  };

  const toggleArea = (area: string) => {
    const newExpanded = new Set(expandedAreas);
    if (newExpanded.has(area)) {
      newExpanded.delete(area);
    } else {
      newExpanded.add(area);
    }
    setExpandedAreas(newExpanded);
  };

  if (status === 'loading' || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <div className="text-4xl mb-4">⏳</div>
          <div className="text-gray-600 dark:text-gray-400">Cargando dashboard por área...</div>
        </div>
      </div>
    );
  }

  if (!session) return null;

  const isCurrentWeek =
    currentWeek.monday.toDateString() === getWeekDates().monday.toDateString();

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Navbar />
      <div className="pt-16 main-content px-4 py-6 max-w-7xl mx-auto">
        <div className="space-y-6 fade-in">
          <MotivationalBanner />

          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-800 dark:text-gray-100">📊 Dashboard por Área</h1>
              <p className="text-gray-600 dark:text-gray-400 mt-1">Vista organizada por áreas y equipos</p>
            </div>
            <div className="flex items-center space-x-3">
              <button
                onClick={handleAnalyze}
                className="bg-gradient-to-r from-purple-600 to-blue-600 dark:from-purple-700 dark:to-blue-700 text-white px-4 py-2 rounded-lg font-semibold hover:from-purple-700 hover:to-blue-700 dark:hover:from-purple-600 dark:hover:to-blue-600 transition shadow-md flex items-center gap-2"
                title="Analizar con IA"
              >
                🤖 Analizar
              </button>
              <button
                onClick={handleExportPowerPoint}
                className="bg-orange-600 dark:bg-orange-700 text-white px-4 py-2 rounded-lg font-semibold hover:bg-orange-700 dark:hover:bg-orange-600 transition shadow-md flex items-center gap-2"
                title="Exportar a PowerPoint"
              >
                📊 PowerPoint
              </button>
              <button
                onClick={handleExport}
                className="bg-green-600 dark:bg-green-700 text-white px-4 py-2 rounded-lg font-semibold hover:bg-green-700 dark:hover:bg-green-600 transition shadow-md"
                title="Exportar a Excel"
              >
                📥 Exportar
              </button>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-4">
            <div className="flex items-center justify-between">
              <button
                onClick={() => navigateWeek(-1)}
                className="text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 px-4 py-2 rounded-lg transition font-semibold"
              >
                ← Anterior
              </button>

              <div className="text-center">
                <div className="text-lg font-bold text-gray-800 dark:text-gray-100">
                  {getWeekLabel(currentWeek.monday)}
                </div>
                <div className="text-sm text-gray-500 dark:text-gray-400">
                  {currentWeek.monday.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}
                  {' - '}
                  {currentWeek.friday.toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' })}
                </div>
              </div>

              <div className="flex items-center space-x-2">
                {!isCurrentWeek && (
                  <button
                    onClick={goToCurrentWeek}
                    className="bg-blue-600 dark:bg-blue-700 text-white px-4 py-2 rounded-lg font-semibold hover:bg-blue-700 dark:hover:bg-blue-600 transition"
                  >
                    Semana Actual
                  </button>
                )}
                <button
                  onClick={() => navigateWeek(1)}
                  className="text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 px-4 py-2 rounded-lg transition font-semibold"
                >
                  Siguiente →
                </button>
              </div>
            </div>
          </div>

          {/* Filtro de Tipo de Prioridad */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                  Filtrar por tipo:
                </label>
                <select
                  value={priorityTypeFilter}
                  onChange={(e) => setPriorityTypeFilter(e.target.value as 'TODAS' | 'ESTRATEGICA' | 'OPERATIVA')}
                  className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm font-medium bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-gray-100 cursor-not-allowed"
                  disabled
                >
                  <option value="TODAS">Todas</option>
                  <option value="ESTRATEGICA">Estratégicas</option>
                  <option value="OPERATIVA">Operativas</option>
                </select>
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">
                Mostrando {filteredPriorities.length} de {priorities.length} prioridades
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <StatCard label="Total Prioridades" value={stats.total} color="blue" />
            <StatCard label="Completadas" value={stats.completed} color="green" />
            <StatCard label="Promedio Avance" value={`${stats.avgCompletion}%`} color="purple" />
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold text-gray-800">
                Áreas ({areaGroups.length})
              </h2>
              <button
                onClick={() => {
                  if (expandedAreas.size === areaGroups.length) {
                    setExpandedAreas(new Set());
                  } else {
                    setExpandedAreas(new Set(areaGroups.map(a => a.area)));
                  }
                }}
                className="text-sm text-blue-600 hover:text-blue-800 font-semibold"
              >
                {expandedAreas.size === areaGroups.length ? 'Colapsar todos' : 'Expandir todos'}
              </button>
            </div>

            {areaGroups.map(areaData => (
              <AreaPriorityCard
                key={areaData.area || 'sin-area'}
                areaData={areaData}
                initiatives={initiatives}
                isExpanded={expandedAreas.has(areaData.area)}
                onToggle={() => toggleArea(areaData.area)}
                onViewDetails={setSelectedPriority}
                commentCounts={commentCounts}
                allUsers={users}
              />
            ))}
          </div>
        </div>
      </div>

      {selectedPriority && (
        <div className="fixed inset-0 bg-black bg-opacity-50 dark:bg-opacity-70 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white dark:bg-gray-800 border-b dark:border-gray-700 px-6 py-4 flex items-center justify-between z-10">
              <h2 className="text-xl font-bold text-gray-800 dark:text-gray-100">
                {selectedPriority.title}
              </h2>
              <button
                onClick={() => setSelectedPriority(null)}
                className="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 text-2xl"
              >
                ×
              </button>
            </div>

            <div className="p-6">
              <div className="mb-6">
                <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Descripción</h3>
                {selectedPriority.description ? (
                  <div className="prose prose-sm max-w-none text-gray-600 dark:text-gray-300">
                    <ReactMarkdown>{selectedPriority.description}</ReactMarkdown>
                  </div>
                ) : (
                  <p className="text-gray-400 dark:text-gray-500 italic">Sin descripción</p>
                )}
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
                  <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Proyecto</h3>
                  <p className="text-gray-800 dark:text-gray-200">
                    {selectedPriority.projectId
                      ? (projects.find(p => p._id === selectedPriority.projectId)?.name || 'No especificado')
                      : 'Sin proyecto'}
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
                              <svg className="w-3 h-3 text-white" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" stroke="currentColor">
                                <path d="M5 13l4 4L19 7"></path>
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
                            <div className="text-xs text-gray-500 dark:text-gray-400 truncate mt-0.5">
                              {link.url}
                            </div>
                          </div>
                          <svg className="w-5 h-5 text-gray-400 dark:text-gray-500 group-hover:text-blue-600 dark:group-hover:text-blue-400 flex-shrink-0" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" stroke="currentColor">
                            <path d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"></path>
                          </svg>
                        </a>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              <div className="border-t dark:border-gray-700 pt-4">
                <CommentsSection priorityId={selectedPriority._id} />
              </div>
            </div>
          </div>
        </div>
      )}

      {showAnalysisModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 dark:bg-opacity-70 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white dark:bg-gray-800 border-b dark:border-gray-700 px-6 py-4 flex items-center justify-between">
              <h2 className="text-xl font-bold text-gray-800 dark:text-gray-100 flex items-center gap-2">
                🤖 Análisis con IA
              </h2>
              <button
                onClick={() => setShowAnalysisModal(false)}
                className="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 text-2xl"
              >
                ×
              </button>
            </div>

            <div className="p-6">
              {analysisLoading ? (
                <div className="text-center py-8">
                  <div className="text-4xl mb-4">⏳</div>
                  <div className="text-gray-600 dark:text-gray-400">Analizando prioridades...</div>
                </div>
              ) : (
                <div className="prose prose-sm max-w-none dark:prose-invert">
                  <ReactMarkdown>{aiAnalysis}</ReactMarkdown>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
