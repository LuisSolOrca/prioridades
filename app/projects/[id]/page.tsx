'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import Navbar from '@/components/Navbar';
import {
  FolderKanban,
  ArrowLeft,
  Users,
  Target,
  AlertTriangle,
  DollarSign,
  CheckCircle,
  Calendar,
  Loader2,
  MessageSquare,
  Flag,
  FileText,
  User,
  Slack,
  ExternalLink,
  Hash,
  Milestone,
  Edit,
} from 'lucide-react';

interface Project {
  _id: string;
  name: string;
  description?: string;
  isActive: boolean;
  purpose?: string;
  slackChannelId?: string;
  slackChannelName?: string;
  objectives?: Array<{
    description: string;
    specific: boolean;
    measurable: boolean;
    achievable: boolean;
    relevant: boolean;
    timeBound: boolean;
  }>;
  scope?: {
    included?: string;
    excluded?: string;
  };
  requirements?: string;
  assumptions?: string;
  constraints?: string;
  stakeholders?: Array<{
    name: string;
    role: string;
    interest: string;
    influence: string;
  }>;
  risks?: Array<{
    description: string;
    probability: string;
    impact: string;
    mitigation: string;
  }>;
  budget?: {
    estimated?: number;
    currency?: string;
    notes?: string;
  };
  successCriteria?: Array<{
    description: string;
  }>;
  projectManager?: {
    userId?: string;
    name?: string;
    authority?: string;
  };
  createdAt: string;
  updatedAt: string;
}

interface Priority {
  _id: string;
  title: string;
  status: string;
  completionPercentage: number;
}

interface Channel {
  _id: string;
  name: string;
  type: string;
  unreadCount?: number;
}

export default function ProjectDetailPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const params = useParams();
  const projectId = params.id as string;

  const [project, setProject] = useState<Project | null>(null);
  const [priorities, setPriorities] = useState<Priority[]>([]);
  const [channels, setChannels] = useState<Channel[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
    }
    if (status === 'authenticated') {
      loadData();
    }
  }, [status, router, projectId]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [projectRes, prioritiesRes, channelsRes] = await Promise.all([
        fetch(`/api/projects/${projectId}`),
        fetch(`/api/projects/${projectId}/priorities`),
        fetch(`/api/projects/${projectId}/channels`),
      ]);

      if (!projectRes.ok) {
        router.push('/projects');
        return;
      }

      const projectData = await projectRes.json();
      setProject(projectData);

      if (prioritiesRes.ok) {
        const prioritiesData = await prioritiesRes.json();
        setPriorities(prioritiesData.slice(0, 10));
      }

      if (channelsRes.ok) {
        const channelsData = await channelsRes.json();
        setChannels(channelsData);
      }
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (value: number, currency: string = 'USD') => {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency,
      minimumFractionDigits: 0,
    }).format(value);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'COMPLETADO': return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400';
      case 'EN_TIEMPO': return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400';
      case 'EN_RIESGO': return 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400';
      case 'BLOQUEADO': return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400';
      default: return 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300';
    }
  };

  const getRiskColor = (level: string) => {
    switch (level) {
      case 'Alta':
      case 'Alto': return 'text-red-600 dark:text-red-400';
      case 'Media':
      case 'Medio': return 'text-yellow-600 dark:text-yellow-400';
      default: return 'text-green-600 dark:text-green-400';
    }
  };

  if (status === 'loading' || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <Loader2 className="animate-spin" size={40} />
      </div>
    );
  }

  if (!session || !project) return null;

  const smartCount = project.objectives?.reduce((count, obj) => {
    return count + (obj.specific ? 1 : 0) + (obj.measurable ? 1 : 0) +
           (obj.achievable ? 1 : 0) + (obj.relevant ? 1 : 0) + (obj.timeBound ? 1 : 0);
  }, 0) || 0;
  const totalSmart = (project.objectives?.length || 0) * 5;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Navbar />
      <div className="pt-16 main-content px-4 py-6 max-w-7xl mx-auto">
        {/* Back button */}
        <Link
          href="/projects"
          className="inline-flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 mb-4"
        >
          <ArrowLeft size={20} />
          Volver a Proyectos
        </Link>

        {/* Header */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6 mb-6">
          <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
            <div className="flex items-start gap-4">
              <div className="w-14 h-14 bg-indigo-100 dark:bg-indigo-900 text-indigo-600 dark:text-indigo-400 rounded-xl flex items-center justify-center">
                <FolderKanban size={28} />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100">{project.name}</h1>
                  <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                    project.isActive
                      ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                      : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400'
                  }`}>
                    {project.isActive ? 'Activo' : 'Inactivo'}
                  </span>
                </div>
                {project.description && (
                  <p className="text-gray-500 dark:text-gray-400 mt-1">{project.description}</p>
                )}
                {project.projectManager?.name && (
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-2 flex items-center gap-1">
                    <User size={14} />
                    PM: {project.projectManager.name}
                  </p>
                )}
              </div>
            </div>

            <div className="flex gap-2">
              {project.slackChannelName && (
                <a
                  href={`https://slack.com/app_redirect?channel=${project.slackChannelId}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 px-3 py-2 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400 rounded-lg hover:bg-purple-200 dark:hover:bg-purple-900/50"
                >
                  <Slack size={18} />
                  #{project.slackChannelName}
                </a>
              )}
              <Link
                href={`/projects`}
                className="flex items-center gap-2 px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600"
              >
                <Edit size={18} />
                Editar
              </Link>
            </div>
          </div>

          {project.purpose && (
            <div className="mt-4 pt-4 border-t dark:border-gray-700">
              <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Propósito</h3>
              <p className="text-gray-700 dark:text-gray-300">{project.purpose}</p>
            </div>
          )}
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400 text-sm mb-1">
              <Target size={16} />
              Objetivos
            </div>
            <div className="text-xl font-bold text-gray-800 dark:text-gray-100">{project.objectives?.length || 0}</div>
            {totalSmart > 0 && (
              <div className="text-xs text-gray-500">SMART: {Math.round((smartCount / totalSmart) * 100)}%</div>
            )}
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400 text-sm mb-1">
              <AlertTriangle size={16} />
              Riesgos
            </div>
            <div className="text-xl font-bold text-gray-800 dark:text-gray-100">{project.risks?.length || 0}</div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400 text-sm mb-1">
              <Users size={16} />
              Stakeholders
            </div>
            <div className="text-xl font-bold text-gray-800 dark:text-gray-100">{project.stakeholders?.length || 0}</div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400 text-sm mb-1">
              <DollarSign size={16} />
              Presupuesto
            </div>
            <div className="text-xl font-bold text-gray-800 dark:text-gray-100">
              {project.budget?.estimated
                ? formatCurrency(project.budget.estimated, project.budget.currency)
                : 'N/A'}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Objectives */}
            {project.objectives && project.objectives.length > 0 && (
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
                <div className="p-4 border-b dark:border-gray-700">
                  <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-100 flex items-center gap-2">
                    <Target size={20} className="text-blue-500" />
                    Objetivos ({project.objectives.length})
                  </h2>
                </div>
                <div className="divide-y dark:divide-gray-700">
                  {project.objectives.map((obj, idx) => (
                    <div key={idx} className="p-4">
                      <p className="text-gray-700 dark:text-gray-300">{obj.description}</p>
                      <div className="flex gap-2 mt-2">
                        {['S', 'M', 'A', 'R', 'T'].map((letter, i) => {
                          const key = ['specific', 'measurable', 'achievable', 'relevant', 'timeBound'][i] as keyof typeof obj;
                          const isChecked = obj[key];
                          return (
                            <span
                              key={letter}
                              className={`w-6 h-6 rounded text-xs font-bold flex items-center justify-center ${
                                isChecked
                                  ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                                  : 'bg-gray-100 text-gray-400 dark:bg-gray-700 dark:text-gray-500'
                              }`}
                            >
                              {letter}
                            </span>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Risks */}
            {project.risks && project.risks.length > 0 && (
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
                <div className="p-4 border-b dark:border-gray-700">
                  <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-100 flex items-center gap-2">
                    <AlertTriangle size={20} className="text-orange-500" />
                    Riesgos ({project.risks.length})
                  </h2>
                </div>
                <div className="divide-y dark:divide-gray-700">
                  {project.risks.map((risk, idx) => (
                    <div key={idx} className="p-4">
                      <p className="font-medium text-gray-800 dark:text-gray-100">{risk.description}</p>
                      <div className="flex gap-4 mt-2 text-sm">
                        <span className={getRiskColor(risk.probability)}>
                          Prob: {risk.probability}
                        </span>
                        <span className={getRiskColor(risk.impact)}>
                          Impacto: {risk.impact}
                        </span>
                      </div>
                      {risk.mitigation && (
                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
                          <strong>Mitigación:</strong> {risk.mitigation}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Priorities */}
            {priorities.length > 0 && (
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
                <div className="p-4 border-b dark:border-gray-700">
                  <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-100 flex items-center gap-2">
                    <Flag size={20} className="text-indigo-500" />
                    Prioridades Recientes ({priorities.length})
                  </h2>
                </div>
                <div className="divide-y dark:divide-gray-700">
                  {priorities.map((priority) => (
                    <div key={priority._id} className="p-4 flex items-center justify-between">
                      <div>
                        <h4 className="font-medium text-gray-800 dark:text-gray-100">{priority.title}</h4>
                        <span className={`text-xs px-2 py-0.5 rounded ${getStatusColor(priority.status)}`}>
                          {priority.status.replace('_', ' ')}
                        </span>
                      </div>
                      <div className="text-right">
                        <div className="text-lg font-bold text-indigo-600 dark:text-indigo-400">
                          {priority.completionPercentage}%
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Channels */}
            {channels.length > 0 && (
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
                <div className="p-4 border-b dark:border-gray-700">
                  <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-100 flex items-center gap-2">
                    <Hash size={20} className="text-purple-500" />
                    Canales ({channels.length})
                  </h2>
                </div>
                <div className="divide-y dark:divide-gray-700">
                  {channels.map((channel) => (
                    <Link
                      key={channel._id}
                      href={`/channels/${channel._id}`}
                      className="p-3 flex items-center gap-2 hover:bg-gray-50 dark:hover:bg-gray-700/50"
                    >
                      <Hash size={16} className="text-gray-400" />
                      <span className="text-gray-700 dark:text-gray-300">{channel.name}</span>
                      {channel.unreadCount && channel.unreadCount > 0 && (
                        <span className="ml-auto bg-indigo-600 text-white text-xs px-1.5 py-0.5 rounded-full">
                          {channel.unreadCount}
                        </span>
                      )}
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {/* Stakeholders */}
            {project.stakeholders && project.stakeholders.length > 0 && (
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
                <div className="p-4 border-b dark:border-gray-700">
                  <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-100 flex items-center gap-2">
                    <Users size={20} className="text-green-500" />
                    Stakeholders
                  </h2>
                </div>
                <div className="divide-y dark:divide-gray-700">
                  {project.stakeholders.map((sh, idx) => (
                    <div key={idx} className="p-3">
                      <div className="font-medium text-gray-800 dark:text-gray-100">{sh.name}</div>
                      <div className="text-sm text-gray-500 dark:text-gray-400">{sh.role}</div>
                      <div className="flex gap-2 mt-1 text-xs">
                        <span className={`${getRiskColor(sh.interest)}`}>Int: {sh.interest}</span>
                        <span className={`${getRiskColor(sh.influence)}`}>Inf: {sh.influence}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Success Criteria */}
            {project.successCriteria && project.successCriteria.length > 0 && (
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
                <div className="p-4 border-b dark:border-gray-700">
                  <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-100 flex items-center gap-2">
                    <CheckCircle size={20} className="text-emerald-500" />
                    Criterios de Éxito
                  </h2>
                </div>
                <ul className="divide-y dark:divide-gray-700">
                  {project.successCriteria.map((criteria, idx) => (
                    <li key={idx} className="p-3 text-sm text-gray-700 dark:text-gray-300 flex items-start gap-2">
                      <CheckCircle size={16} className="text-emerald-500 mt-0.5 flex-shrink-0" />
                      {criteria.description}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Additional Info */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4">
              <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-100 mb-4">Información</h2>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-500 dark:text-gray-400">Creado</span>
                  <span className="text-gray-800 dark:text-gray-200">
                    {new Date(project.createdAt).toLocaleDateString('es-MX')}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500 dark:text-gray-400">Actualizado</span>
                  <span className="text-gray-800 dark:text-gray-200">
                    {new Date(project.updatedAt).toLocaleDateString('es-MX')}
                  </span>
                </div>
              </div>

              {/* Scope */}
              {(project.scope?.included || project.scope?.excluded) && (
                <div className="mt-4 pt-4 border-t dark:border-gray-700">
                  <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Alcance</h3>
                  {project.scope.included && (
                    <div className="mb-2">
                      <span className="text-xs text-green-600 dark:text-green-400 font-medium">Incluido:</span>
                      <p className="text-sm text-gray-600 dark:text-gray-400">{project.scope.included}</p>
                    </div>
                  )}
                  {project.scope.excluded && (
                    <div>
                      <span className="text-xs text-red-600 dark:text-red-400 font-medium">Excluido:</span>
                      <p className="text-sm text-gray-600 dark:text-gray-400">{project.scope.excluded}</p>
                    </div>
                  )}
                </div>
              )}

              {/* Constraints */}
              {project.constraints && (
                <div className="mt-4 pt-4 border-t dark:border-gray-700">
                  <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Restricciones</h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">{project.constraints}</p>
                </div>
              )}

              {/* Assumptions */}
              {project.assumptions && (
                <div className="mt-4 pt-4 border-t dark:border-gray-700">
                  <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Supuestos</h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">{project.assumptions}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
