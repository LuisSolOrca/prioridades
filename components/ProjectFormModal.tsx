'use client';

import { useState, useEffect } from 'react';
import { X } from 'lucide-react';

interface Objective {
  description: string;
  specific: boolean;
  measurable: boolean;
  achievable: boolean;
  relevant: boolean;
  timeBound: boolean;
}

interface Stakeholder {
  name: string;
  role: string;
  interest: 'Alto' | 'Medio' | 'Bajo';
  influence: 'Alto' | 'Medio' | 'Bajo';
}

interface Risk {
  description: string;
  probability: 'Alta' | 'Media' | 'Baja';
  impact: 'Alto' | 'Medio' | 'Bajo';
  mitigation: string;
}

interface SuccessCriterion {
  description: string;
}

interface Deliverable {
  title: string;
  description?: string;
  successCriteria?: string;
  isCompleted: boolean;
}

interface Milestone {
  _id: string;
  title: string;
  description?: string;
  dueDate: string;
  deliverables: Deliverable[];
  isCompleted: boolean;
}

export interface ProjectFormData {
  name: string;
  description?: string;
  isActive: boolean;
  purpose?: string;
  objectives?: Objective[];
  scope?: {
    included?: string;
    excluded?: string;
  };
  requirements?: string;
  assumptions?: string;
  constraints?: string;
  stakeholders?: Stakeholder[];
  risks?: Risk[];
  budget?: {
    estimated?: number;
    currency?: string;
    notes?: string;
  };
  successCriteria?: SuccessCriterion[];
  projectManager?: {
    userId?: string;
    name?: string;
    authority?: string;
  };
}

interface User {
  _id: string;
  name: string;
  email: string;
}

interface ProjectFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  formData: ProjectFormData;
  setFormData: (data: ProjectFormData) => void;
  handleSubmit: (e: React.FormEvent) => void;
  handleDelete?: () => void;
  isEditing: boolean;
  users: User[];
  projectId?: string;
  onViewSchedule?: () => void;
  readOnly?: boolean;
}

export default function ProjectFormModal({
  isOpen,
  onClose,
  formData,
  setFormData,
  handleSubmit,
  handleDelete,
  isEditing,
  users,
  projectId,
  onViewSchedule,
  readOnly = false
}: ProjectFormModalProps) {
  const [activeTab, setActiveTab] = useState<'basic' | 'details' | 'planning' | 'management'>('basic');
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [loadingMilestones, setLoadingMilestones] = useState(false);

  // Cargar hitos cuando se abre el modal con un proyecto existente
  useEffect(() => {
    if (isOpen && isEditing && projectId) {
      loadMilestones();
    } else if (!isOpen) {
      setMilestones([]);
    }
  }, [isOpen, isEditing, projectId]);

  const loadMilestones = async () => {
    if (!projectId) return;

    setLoadingMilestones(true);
    try {
      const res = await fetch('/api/milestones');
      if (res.ok) {
        const allMilestones = await res.json();
        // Filtrar solo los hitos de este proyecto
        const projectMilestones = allMilestones.filter((m: any) => m.projectId === projectId);
        setMilestones(projectMilestones);
      }
    } catch (error) {
      console.error('Error loading milestones:', error);
    } finally {
      setLoadingMilestones(false);
    }
  };

  if (!isOpen) return null;

  const addObjective = () => {
    const objectives = formData.objectives || [];
    setFormData({
      ...formData,
      objectives: [...objectives, {
        description: '',
        specific: false,
        measurable: false,
        achievable: false,
        relevant: false,
        timeBound: false
      }]
    });
  };

  const removeObjective = (index: number) => {
    const objectives = formData.objectives || [];
    setFormData({
      ...formData,
      objectives: objectives.filter((_, i) => i !== index)
    });
  };

  const updateObjective = (index: number, field: keyof Objective, value: any) => {
    const objectives = [...(formData.objectives || [])];
    objectives[index] = { ...objectives[index], [field]: value };
    setFormData({ ...formData, objectives });
  };

  const addStakeholder = () => {
    const stakeholders = formData.stakeholders || [];
    setFormData({
      ...formData,
      stakeholders: [...stakeholders, { name: '', role: '', interest: 'Medio', influence: 'Medio' }]
    });
  };

  const removeStakeholder = (index: number) => {
    const stakeholders = formData.stakeholders || [];
    setFormData({
      ...formData,
      stakeholders: stakeholders.filter((_, i) => i !== index)
    });
  };

  const updateStakeholder = (index: number, field: keyof Stakeholder, value: any) => {
    const stakeholders = [...(formData.stakeholders || [])];
    stakeholders[index] = { ...stakeholders[index], [field]: value };
    setFormData({ ...formData, stakeholders });
  };

  const addRisk = () => {
    const risks = formData.risks || [];
    setFormData({
      ...formData,
      risks: [...risks, { description: '', probability: 'Media', impact: 'Medio', mitigation: '' }]
    });
  };

  const removeRisk = (index: number) => {
    const risks = formData.risks || [];
    setFormData({
      ...formData,
      risks: risks.filter((_, i) => i !== index)
    });
  };

  const updateRisk = (index: number, field: keyof Risk, value: any) => {
    const risks = [...(formData.risks || [])];
    risks[index] = { ...risks[index], [field]: value };
    setFormData({ ...formData, risks });
  };

  const addSuccessCriterion = () => {
    const successCriteria = formData.successCriteria || [];
    setFormData({
      ...formData,
      successCriteria: [...successCriteria, { description: '' }]
    });
  };

  const removeSuccessCriterion = (index: number) => {
    const successCriteria = formData.successCriteria || [];
    setFormData({
      ...formData,
      successCriteria: successCriteria.filter((_, i) => i !== index)
    });
  };

  const updateSuccessCriterion = (index: number, value: string) => {
    const successCriteria = [...(formData.successCriteria || [])];
    successCriteria[index] = { description: value };
    setFormData({ ...formData, successCriteria });
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 dark:bg-opacity-70 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg w-full max-w-6xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4 flex items-center justify-between z-10">
          <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-100 flex items-center gap-2">
            <span className="text-3xl">📁</span>
            {isEditing ? 'Editar Proyecto' : 'Nuevo Proyecto'}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
          >
            <X size={24} />
          </button>
        </div>

        {/* Tabs */}
        <div className="sticky top-[73px] bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 z-10">
          <div className="flex space-x-1">
            <button
              onClick={() => setActiveTab('basic')}
              className={`px-4 py-2 font-medium transition ${
                activeTab === 'basic'
                  ? 'border-b-2 border-blue-600 text-blue-600 dark:text-blue-400'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200'
              }`}
            >
              Información Básica
            </button>
            <button
              onClick={() => setActiveTab('details')}
              className={`px-4 py-2 font-medium transition ${
                activeTab === 'details'
                  ? 'border-b-2 border-blue-600 text-blue-600 dark:text-blue-400'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200'
              }`}
            >
              Detalles del Proyecto
            </button>
            <button
              onClick={() => setActiveTab('planning')}
              className={`px-4 py-2 font-medium transition ${
                activeTab === 'planning'
                  ? 'border-b-2 border-blue-600 text-blue-600 dark:text-blue-400'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200'
              }`}
            >
              Planificación
            </button>
            <button
              onClick={() => setActiveTab('management')}
              className={`px-4 py-2 font-medium transition ${
                activeTab === 'management'
                  ? 'border-b-2 border-blue-600 text-blue-600 dark:text-blue-400'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200'
              }`}
            >
              Gestión
            </button>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Read-Only Banner */}
          {readOnly && (
            <div className="p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg pointer-events-auto">
              <p className="text-sm text-yellow-800 dark:text-yellow-200">
                👁️ <strong>Modo de solo lectura:</strong> No tienes permisos para editar este proyecto. Solo el administrador y el gerente del proyecto asignado pueden realizar cambios.
              </p>
            </div>
          )}

          {/* Form Fields Container */}
          <div className={readOnly ? 'pointer-events-none opacity-70' : ''}>

          {/* Basic Tab */}
          {activeTab === 'basic' && (
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Nombre del Proyecto *
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 disabled:opacity-60 disabled:cursor-not-allowed"
                  required
                  maxLength={100}
                  disabled={readOnly}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Descripción Breve
                </label>
                <textarea
                  value={formData.description || ''}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                  rows={3}
                  maxLength={500}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Propósito / Justificación del Proyecto
                </label>
                <textarea
                  value={formData.purpose || ''}
                  onChange={(e) => setFormData({ ...formData, purpose: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                  rows={4}
                  maxLength={2000}
                  placeholder="¿Por qué es necesario este proyecto? ¿Qué problema resuelve o qué oportunidad aprovecha?"
                />
              </div>

              <div className="flex items-center">
                <input
                  type="checkbox"
                  checked={formData.isActive}
                  onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                  className="w-4 h-4 text-blue-600 border-gray-300 dark:border-gray-600 rounded focus:ring-blue-500"
                />
                <label className="ml-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                  Proyecto Activo
                </label>
              </div>
            </div>
          )}

          {/* Details Tab */}
          {activeTab === 'details' && (
            <div className="space-y-6">
              {/* Objectives */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Objetivos SMART
                  </label>
                  <button
                    type="button"
                    onClick={addObjective}
                    className="px-3 py-1 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition text-sm"
                  >
                    + Agregar Objetivo
                  </button>
                </div>
                <div className="space-y-3">
                  {(formData.objectives || []).map((obj, index) => (
                    <div key={index} className="border border-gray-300 dark:border-gray-600 rounded-lg p-4 space-y-3">
                      <div className="flex items-start gap-2">
                        <textarea
                          value={obj.description}
                          onChange={(e) => updateObjective(index, 'description', e.target.value)}
                          className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                          rows={2}
                          maxLength={500}
                          placeholder="Descripción del objetivo"
                        />
                        <button
                          type="button"
                          onClick={() => removeObjective(index)}
                          className="text-red-600 hover:text-red-800 dark:hover:text-red-400"
                        >
                          ✕
                        </button>
                      </div>
                      <div className="grid grid-cols-5 gap-2">
                        {['specific', 'measurable', 'achievable', 'relevant', 'timeBound'].map((field) => (
                          <label key={field} className="flex items-center text-xs">
                            <input
                              type="checkbox"
                              checked={obj[field as keyof Objective] as boolean}
                              onChange={(e) => updateObjective(index, field as keyof Objective, e.target.checked)}
                              className="w-3 h-3 text-blue-600 border-gray-300 dark:border-gray-600 rounded focus:ring-blue-500 mr-1"
                            />
                            {field === 'specific' && 'Específico'}
                            {field === 'measurable' && 'Medible'}
                            {field === 'achievable' && 'Alcanzable'}
                            {field === 'relevant' && 'Relevante'}
                            {field === 'timeBound' && 'Tiempo definido'}
                          </label>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Scope */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Alcance Preliminar
                </label>
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">
                      ¿Qué incluye el proyecto?
                    </label>
                    <textarea
                      value={formData.scope?.included || ''}
                      onChange={(e) => setFormData({
                        ...formData,
                        scope: { ...formData.scope, included: e.target.value }
                      })}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                      rows={3}
                      maxLength={2000}
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">
                      ¿Qué NO incluye el proyecto?
                    </label>
                    <textarea
                      value={formData.scope?.excluded || ''}
                      onChange={(e) => setFormData({
                        ...formData,
                        scope: { ...formData.scope, excluded: e.target.value }
                      })}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                      rows={3}
                      maxLength={2000}
                    />
                  </div>
                </div>
              </div>

              {/* Deliverables from Milestones */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Entregables del Proyecto
                </label>
                {loadingMilestones ? (
                  <div className="text-center py-4 text-gray-500 dark:text-gray-400">
                    Cargando entregables...
                  </div>
                ) : milestones.length === 0 ? (
                  <div className="p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                    <p className="text-sm text-blue-800 dark:text-blue-200">
                      💡 <strong>Sin entregables:</strong> Este proyecto no tiene hitos asociados. Los entregables se definen en los hitos del proyecto.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {milestones.map((milestone) => (
                      <div key={milestone._id} className="border border-gray-200 dark:border-gray-600 rounded-lg overflow-hidden">
                        {/* Milestone Header */}
                        <div className="bg-gray-100 dark:bg-gray-700 px-4 py-2 border-b border-gray-200 dark:border-gray-600">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <span className="text-lg">💎</span>
                              <span className="font-medium text-gray-800 dark:text-gray-200">{milestone.title}</span>
                              {milestone.isCompleted && (
                                <span className="text-xs px-2 py-0.5 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 rounded">
                                  Completado
                                </span>
                              )}
                            </div>
                            <span className="text-xs text-gray-500 dark:text-gray-400">
                              {new Date(milestone.dueDate).toLocaleDateString('es-MX')}
                            </span>
                          </div>
                          {milestone.description && (
                            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{milestone.description}</p>
                          )}
                        </div>

                        {/* Deliverables List */}
                        {milestone.deliverables.length > 0 ? (
                          <div className="divide-y divide-gray-200 dark:divide-gray-600">
                            {milestone.deliverables.map((deliverable, idx) => (
                              <div key={idx} className="p-3 bg-white dark:bg-gray-800">
                                <div className="flex items-start gap-2">
                                  <input
                                    type="checkbox"
                                    checked={deliverable.isCompleted}
                                    disabled
                                    className="mt-1 rounded text-blue-600"
                                  />
                                  <div className="flex-1">
                                    <p className={`font-medium text-sm ${deliverable.isCompleted ? 'line-through text-gray-500 dark:text-gray-400' : 'text-gray-800 dark:text-gray-200'}`}>
                                      {deliverable.title}
                                    </p>
                                    {deliverable.description && (
                                      <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                                        <strong>Descripción:</strong> {deliverable.description}
                                      </p>
                                    )}
                                    {deliverable.successCriteria && (
                                      <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                                        <strong>Criterios de Éxito:</strong> {deliverable.successCriteria}
                                      </p>
                                    )}
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="p-3 text-sm text-gray-500 dark:text-gray-400 bg-white dark:bg-gray-800">
                            Este hito no tiene entregables definidos
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Requirements */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Requisitos de Alto Nivel
                </label>
                <textarea
                  value={formData.requirements || ''}
                  onChange={(e) => setFormData({ ...formData, requirements: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                  rows={4}
                  maxLength={2000}
                />
              </div>
            </div>
          )}

          {/* Planning Tab */}
          {activeTab === 'planning' && (
            <div className="space-y-6">
              {/* Assumptions */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Supuestos
                </label>
                <textarea
                  value={formData.assumptions || ''}
                  onChange={(e) => setFormData({ ...formData, assumptions: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                  rows={4}
                  maxLength={2000}
                  placeholder="Suposiciones que se están haciendo sobre el proyecto"
                />
              </div>

              {/* Constraints */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Restricciones
                </label>
                <textarea
                  value={formData.constraints || ''}
                  onChange={(e) => setFormData({ ...formData, constraints: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                  rows={4}
                  maxLength={2000}
                  placeholder="Limitaciones y restricciones del proyecto"
                />
              </div>

              {/* Schedule Summary Link */}
              {isEditing && projectId && onViewSchedule && (
                <div className="border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-semibold text-blue-900 dark:text-blue-200 mb-1">
                        Cronograma Resumido
                      </h3>
                      <p className="text-sm text-blue-700 dark:text-blue-300">
                        Los hitos y prioridades asociados a este proyecto conforman el cronograma
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={onViewSchedule}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-medium whitespace-nowrap"
                    >
                      Ver Cronograma
                    </button>
                  </div>
                </div>
              )}

              {/* Risks */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Riesgos Iniciales
                  </label>
                  <button
                    type="button"
                    onClick={addRisk}
                    className="px-3 py-1 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition text-sm"
                  >
                    + Agregar Riesgo
                  </button>
                </div>
                <div className="space-y-3">
                  {(formData.risks || []).map((risk, index) => (
                    <div key={index} className="border border-gray-300 dark:border-gray-600 rounded-lg p-3 space-y-2">
                      <div className="flex items-start gap-2">
                        <textarea
                          value={risk.description}
                          onChange={(e) => updateRisk(index, 'description', e.target.value)}
                          className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                          rows={2}
                          maxLength={500}
                          placeholder="Descripción del riesgo"
                        />
                        <button
                          type="button"
                          onClick={() => removeRisk(index)}
                          className="text-red-600 hover:text-red-800 dark:hover:text-red-400"
                        >
                          ✕
                        </button>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">
                            Probabilidad
                          </label>
                          <select
                            value={risk.probability}
                            onChange={(e) => updateRisk(index, 'probability', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                          >
                            <option value="Baja">Baja</option>
                            <option value="Media">Media</option>
                            <option value="Alta">Alta</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">
                            Impacto
                          </label>
                          <select
                            value={risk.impact}
                            onChange={(e) => updateRisk(index, 'impact', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                          >
                            <option value="Bajo">Bajo</option>
                            <option value="Medio">Medio</option>
                            <option value="Alto">Alto</option>
                          </select>
                        </div>
                      </div>
                      <textarea
                        value={risk.mitigation}
                        onChange={(e) => updateRisk(index, 'mitigation', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                        rows={2}
                        maxLength={500}
                        placeholder="Plan de mitigación"
                      />
                    </div>
                  ))}
                </div>
              </div>

              {/* Budget */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Presupuesto Estimado
                </label>
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">
                        Monto
                      </label>
                      <input
                        type="number"
                        value={formData.budget?.estimated || ''}
                        onChange={(e) => setFormData({
                          ...formData,
                          budget: { ...formData.budget, estimated: parseFloat(e.target.value) || undefined }
                        })}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                        placeholder="0.00"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">
                        Moneda
                      </label>
                      <input
                        type="text"
                        value={formData.budget?.currency || 'USD'}
                        onChange={(e) => setFormData({
                          ...formData,
                          budget: { ...formData.budget, currency: e.target.value }
                        })}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                        maxLength={10}
                      />
                    </div>
                  </div>
                  <textarea
                    value={formData.budget?.notes || ''}
                    onChange={(e) => setFormData({
                      ...formData,
                      budget: { ...formData.budget, notes: e.target.value }
                    })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                    rows={2}
                    maxLength={1000}
                    placeholder="Notas sobre el presupuesto o límites financieros"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Management Tab */}
          {activeTab === 'management' && (
            <div className="space-y-6">
              {/* Stakeholders */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Interesados Clave (Stakeholders)
                  </label>
                  <button
                    type="button"
                    onClick={addStakeholder}
                    className="px-3 py-1 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition text-sm"
                  >
                    + Agregar Stakeholder
                  </button>
                </div>
                <div className="space-y-3">
                  {(formData.stakeholders || []).map((stakeholder, index) => (
                    <div key={index} className="border border-gray-300 dark:border-gray-600 rounded-lg p-3 space-y-2">
                      <div className="grid grid-cols-2 gap-2">
                        <input
                          type="text"
                          value={stakeholder.name}
                          onChange={(e) => updateStakeholder(index, 'name', e.target.value)}
                          className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                          placeholder="Nombre"
                          maxLength={100}
                        />
                        <div className="flex gap-2">
                          <input
                            type="text"
                            value={stakeholder.role}
                            onChange={(e) => updateStakeholder(index, 'role', e.target.value)}
                            className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                            placeholder="Rol"
                            maxLength={100}
                          />
                          <button
                            type="button"
                            onClick={() => removeStakeholder(index)}
                            className="text-red-600 hover:text-red-800 dark:hover:text-red-400"
                          >
                            ✕
                          </button>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">
                            Interés
                          </label>
                          <select
                            value={stakeholder.interest}
                            onChange={(e) => updateStakeholder(index, 'interest', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                          >
                            <option value="Bajo">Bajo</option>
                            <option value="Medio">Medio</option>
                            <option value="Alto">Alto</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">
                            Influencia
                          </label>
                          <select
                            value={stakeholder.influence}
                            onChange={(e) => updateStakeholder(index, 'influence', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                          >
                            <option value="Bajo">Bajo</option>
                            <option value="Medio">Medio</option>
                            <option value="Alto">Alto</option>
                          </select>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Success Criteria */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Criterios de Éxito
                  </label>
                  <button
                    type="button"
                    onClick={addSuccessCriterion}
                    className="px-3 py-1 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition text-sm"
                  >
                    + Agregar Criterio
                  </button>
                </div>
                <div className="space-y-2">
                  {(formData.successCriteria || []).map((criterion, index) => (
                    <div key={index} className="flex items-center gap-2">
                      <input
                        type="text"
                        value={criterion.description}
                        onChange={(e) => updateSuccessCriterion(index, e.target.value)}
                        className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                        placeholder="Criterio de éxito"
                        maxLength={500}
                      />
                      <button
                        type="button"
                        onClick={() => removeSuccessCriterion(index)}
                        className="text-red-600 hover:text-red-800 dark:hover:text-red-400"
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Project Manager */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Project Manager
                </label>
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">
                      Seleccionar Usuario
                    </label>
                    <select
                      value={formData.projectManager?.userId || ''}
                      onChange={(e) => {
                        const selectedUser = users.find(u => u._id === e.target.value);
                        setFormData({
                          ...formData,
                          projectManager: {
                            ...formData.projectManager,
                            userId: e.target.value,
                            name: selectedUser?.name || formData.projectManager?.name || ''
                          }
                        });
                      }}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                    >
                      <option value="">Seleccionar...</option>
                      {users.map(user => (
                        <option key={user._id} value={user._id}>
                          {user.name} ({user.email})
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">
                      Nombre (opcional si no está en la lista)
                    </label>
                    <input
                      type="text"
                      value={formData.projectManager?.name || ''}
                      onChange={(e) => setFormData({
                        ...formData,
                        projectManager: { ...formData.projectManager, name: e.target.value }
                      })}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                      maxLength={100}
                      placeholder="Nombre del PM"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">
                      Autoridad y Responsabilidades
                    </label>
                    <textarea
                      value={formData.projectManager?.authority || ''}
                      onChange={(e) => setFormData({
                        ...formData,
                        projectManager: { ...formData.projectManager, authority: e.target.value }
                      })}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                      rows={3}
                      maxLength={500}
                      placeholder="Describe la autoridad y responsabilidades del PM en este proyecto"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}
          </div>

          {/* Buttons */}
          <div className="flex justify-between items-center pt-4 border-t border-gray-200 dark:border-gray-700 pointer-events-auto">
            {isEditing && handleDelete && !readOnly ? (
              <button
                type="button"
                onClick={handleDelete}
                className="px-4 py-2 text-red-700 dark:text-red-300 bg-red-100 dark:bg-red-900/20 rounded-lg hover:bg-red-200 dark:hover:bg-red-900/40 transition font-medium"
              >
                Eliminar Proyecto
              </button>
            ) : (
              <div></div>
            )}
            <div className="flex space-x-3">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-gray-700 dark:text-gray-300 bg-gray-200 dark:bg-gray-700 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition"
              >
                {readOnly ? 'Cerrar' : 'Cancelar'}
              </button>
              {!readOnly && (
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
                >
                  {isEditing ? 'Guardar Cambios' : 'Crear Proyecto'}
                </button>
              )}
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
