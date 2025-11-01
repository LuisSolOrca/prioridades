'use client';

export const dynamic = 'force-dynamic';

import { useEffect, useState, useMemo } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Navbar from '@/components/Navbar';
import StatusBadge from '@/components/StatusBadge';
import CommentsSection from '@/components/CommentsSection';
import { getWeekDates, getWeekLabel } from '@/lib/utils';
import { exportPriorities } from '@/lib/exportToExcel';
import ReactMarkdown from 'react-markdown';

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
  initiativeId?: string; // Mantener para compatibilidad
  initiativeIds?: string[]; // Nuevo campo para múltiples iniciativas
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
    <div className={`bg-white rounded-lg shadow-md border hover:shadow-lg transition-shadow ${hasRisks ? 'border-l-4 border-l-red-500' : ''}`}>
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
                {hasRisks && (
                  <span className="ml-2 bg-red-100 text-red-800 text-xs px-2 py-1 rounded-full font-semibold flex items-center">
                    ⚠️ {blocked > 0 && `${blocked} bloqueada${blocked > 1 ? 's' : ''}`}
                    {blocked > 0 && atRisk > 0 && ' • '}
                    {atRisk > 0 && `${atRisk} en riesgo`}
                  </span>
                )}
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
                // Obtener iniciativas (compatibilidad con ambos campos)
                const priorityInitiativeIds = priority.initiativeIds || (priority.initiativeId ? [priority.initiativeId] : []);
                const priorityInitiatives = priorityInitiativeIds
                  .map(id => initiatives.find(i => i._id === id))
                  .filter((init): init is Initiative => init !== undefined);
                const primaryInitiative = priorityInitiatives[0];

                return (
                  <div key={priority._id} className="border-l-4 pl-3 py-2 bg-gray-50 rounded" style={{ borderColor: primaryInitiative?.color || '#ccc' }}>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <div className="font-medium text-gray-800 text-sm">{priority.title}</div>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onViewDetails(priority);
                            }}
                            className="text-blue-600 hover:text-blue-800 transition relative"
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
                        <div className="text-xs text-gray-500 mt-1 flex flex-wrap gap-1">
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
  const [selectedPriority, setSelectedPriority] = useState<Priority | null>(null);
  const [showAnalysisModal, setShowAnalysisModal] = useState(false);
  const [aiAnalysis, setAiAnalysis] = useState<string>('');
  const [analysisLoading, setAnalysisLoading] = useState(false);
  const [commentCounts, setCommentCounts] = useState<{ [key: string]: number }>({});

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
        fetch(`/api/priorities?weekStart=${currentWeek.monday.toISOString()}&weekEnd=${currentWeek.friday.toISOString()}&forDashboard=true`)
      ]);

      const [usersData, initiativesData, prioritiesData] = await Promise.all([
        usersRes.json(),
        initiativesRes.json(),
        prioritiesRes.json()
      ]);

      setUsers(usersData); // Mostrar todos los usuarios (USER y ADMIN)
      setInitiatives(initiativesData);
      setPriorities(prioritiesData);

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

  const goToCurrentWeek = () => {
    setCurrentWeek(getWeekDates());
  };

  const handleExport = () => {
    const fileName = `Dashboard_${getWeekLabel(currentWeek.monday).replace(/\s/g, '_')}`;
    exportPriorities(priorities, users, initiatives, fileName);
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
    if (priorities.length === 0) {
      alert('No hay prioridades para analizar en esta semana');
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
                onClick={handleAIAnalysis}
                className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition font-semibold"
                title="Análisis Organizacional con IA"
              >
                🤖 Análisis IA
              </button>
              <button
                onClick={handleExportPowerPoint}
                className="bg-orange-600 text-white px-4 py-2 rounded-lg hover:bg-orange-700 transition font-semibold"
                title="Exportar a PowerPoint"
              >
                📊 Exportar PPT
              </button>
              <button
                onClick={handleExport}
                className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition font-semibold"
                title="Exportar a Excel"
              >
                📥 Exportar Excel
              </button>
              <button
                onClick={() => navigateWeek(-1)}
                className="bg-gray-200 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-300 transition"
              >
                ←
              </button>
              <button
                onClick={goToCurrentWeek}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition font-semibold"
                title="Ir a la semana actual"
              >
                📅 Semana Actual
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
                onViewDetails={handleViewDetails}
                commentCounts={commentCounts}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Modal de Descripción Detallada */}
      {selectedPriority && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
          onClick={handleCloseModal}
        >
          <div
            className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6">
              {/* Header */}
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <h2 className="text-2xl font-bold text-gray-800 mb-2">
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
                        <span key={initiative._id} className="text-sm text-gray-500">
                          <span style={{ color: initiative.color }}>●</span> {initiative.name}
                        </span>
                      ));
                    })()}
                  </div>
                </div>
                <button
                  onClick={handleCloseModal}
                  className="text-gray-400 hover:text-gray-600 text-2xl font-bold"
                >
                  ×
                </button>
              </div>

              {/* Descripción */}
              <div className="mb-6">
                <h3 className="text-sm font-semibold text-gray-700 mb-2">Descripción</h3>
                <div className="bg-gray-50 rounded-lg p-4">
                  {selectedPriority.description ? (
                    <p className="text-gray-700 whitespace-pre-wrap">{selectedPriority.description}</p>
                  ) : (
                    <p className="text-gray-400 italic">Sin descripción</p>
                  )}
                </div>
              </div>

              {/* Información Adicional */}
              <div className="grid grid-cols-2 gap-4 mb-6">
                <div>
                  <h3 className="text-sm font-semibold text-gray-700 mb-2">Usuario</h3>
                  <p className="text-gray-800">
                    {users.find(u => u._id === selectedPriority.userId)?.name}
                  </p>
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-gray-700 mb-2">Iniciativa(s)</h3>
                  <div className="flex flex-wrap gap-2">
                    {(() => {
                      const priorityInitiativeIds = selectedPriority.initiativeIds || (selectedPriority.initiativeId ? [selectedPriority.initiativeId] : []);
                      const priorityInitiatives = priorityInitiativeIds
                        .map(id => initiatives.find(i => i._id === id))
                        .filter((init): init is Initiative => init !== undefined);
                      return priorityInitiatives.map(initiative => (
                        <div key={initiative._id} className="flex items-center gap-1 bg-gray-100 px-2 py-1 rounded">
                          <div
                            className="w-2 h-2 rounded-full"
                            style={{ backgroundColor: initiative.color }}
                          ></div>
                          <span className="text-gray-800 text-sm">{initiative.name}</span>
                        </div>
                      ));
                    })()}
                  </div>
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-gray-700 mb-2">Semana</h3>
                  <p className="text-gray-800">
                    {new Date(selectedPriority.weekStart).toLocaleDateString('es-MX')} - {new Date(selectedPriority.weekEnd).toLocaleDateString('es-MX')}
                  </p>
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-gray-700 mb-2">Avance</h3>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 bg-gray-200 rounded-full h-3">
                      <div
                        className="bg-blue-600 h-3 rounded-full transition-all"
                        style={{ width: `${selectedPriority.completionPercentage}%` }}
                      ></div>
                    </div>
                    <span className="font-semibold text-gray-800">{selectedPriority.completionPercentage}%</span>
                  </div>
                </div>
              </div>

              {/* Comments Section */}
              <div className="mb-6">
                <CommentsSection priorityId={selectedPriority._id} />
              </div>

              {/* Botón Cerrar */}
              <div className="flex justify-end">
                <button
                  onClick={handleCloseModal}
                  className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition font-semibold"
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
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
          onClick={closeAnalysisModal}
        >
          <div
            className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6">
              {/* Header */}
              <div className="flex items-start justify-between mb-6">
                <div className="flex items-center space-x-3">
                  <div className="text-4xl">🤖</div>
                  <div>
                    <h2 className="text-2xl font-bold text-gray-800">
                      Análisis Organizacional con IA
                    </h2>
                    <p className="text-sm text-gray-500 mt-1">
                      Semana del {getWeekLabel(currentWeek.monday)}
                    </p>
                  </div>
                </div>
                <button
                  onClick={closeAnalysisModal}
                  className="text-gray-400 hover:text-gray-600 text-2xl font-bold"
                >
                  ×
                </button>
              </div>

              {/* Contenido del análisis */}
              <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-lg p-6 mb-6">
                {analysisLoading ? (
                  <div className="flex flex-col items-center justify-center py-12">
                    <div className="animate-spin text-6xl mb-4">🤖</div>
                    <div className="text-lg font-semibold text-gray-700 mb-2">
                      Analizando la situación organizacional...
                    </div>
                    <div className="text-sm text-gray-500">
                      Esto puede tomar unos segundos
                    </div>
                  </div>
                ) : aiAnalysis ? (
                  <div className="prose prose-sm max-w-none">
                    <ReactMarkdown
                      components={{
                        h1: ({node, ...props}) => <h1 className="text-2xl font-bold text-gray-800 mb-4 mt-6" {...props} />,
                        h2: ({node, ...props}) => <h2 className="text-xl font-bold text-gray-800 mb-3 mt-5" {...props} />,
                        h3: ({node, ...props}) => <h3 className="text-lg font-semibold text-gray-700 mb-2 mt-4" {...props} />,
                        p: ({node, ...props}) => <p className="text-gray-700 mb-3 leading-relaxed" {...props} />,
                        ul: ({node, ...props}) => <ul className="list-disc list-inside mb-3 space-y-1 text-gray-700" {...props} />,
                        ol: ({node, ...props}) => <ol className="list-decimal list-inside mb-3 space-y-1 text-gray-700" {...props} />,
                        li: ({node, ...props}) => <li className="ml-4" {...props} />,
                        strong: ({node, ...props}) => <strong className="font-semibold text-gray-900" {...props} />,
                        em: ({node, ...props}) => <em className="italic text-gray-600" {...props} />,
                        code: ({node, ...props}) => <code className="bg-gray-100 px-2 py-1 rounded text-sm font-mono text-gray-800" {...props} />,
                      }}
                    >
                      {aiAnalysis}
                    </ReactMarkdown>
                  </div>
                ) : (
                  <div className="text-center text-gray-500 py-8">
                    Sin análisis disponible
                  </div>
                )}
              </div>

              {/* Botones de acción */}
              <div className="flex justify-end space-x-3">
                <button
                  onClick={closeAnalysisModal}
                  className="bg-gray-200 text-gray-700 px-6 py-2 rounded-lg hover:bg-gray-300 transition font-semibold"
                >
                  Cerrar
                </button>
                {!analysisLoading && aiAnalysis && (
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(aiAnalysis);
                      alert('Análisis copiado al portapapeles');
                    }}
                    className="bg-purple-600 text-white px-6 py-2 rounded-lg hover:bg-purple-700 transition font-semibold"
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
