'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter, useParams } from 'next/navigation';
import Navbar from '@/components/Navbar';
import EmailTemplateEditor from '@/components/crm/EmailTemplateEditor';
import SaveTemplateModal from '@/components/crm/SaveTemplateModal';
import {
  Mail,
  Plus,
  Trash2,
  Save,
  ArrowLeft,
  GripVertical,
  Clock,
  ChevronDown,
  ChevronUp,
  Users,
  Play,
  Pause,
  Settings,
  CheckSquare,
  Linkedin,
  FileText,
  X,
  Eye,
  MousePointerClick,
  MessageSquare,
  Send,
  RefreshCw,
  AlertCircle,
  UserPlus,
} from 'lucide-react';

interface Step {
  order: number;
  type: 'email' | 'task' | 'linkedin';
  subject?: string;
  body?: string;
  templateId?: string;
  taskTitle?: string;
  taskDescription?: string;
  linkedinAction?: 'connect' | 'message' | 'view_profile';
  linkedinMessage?: string;
  delayDays: number;
  delayHours: number;
}

interface Sequence {
  _id?: string;
  name: string;
  description: string;
  isActive: boolean;
  steps: Step[];
  exitOnReply: boolean;
  exitOnMeeting: boolean;
  exitOnDealWon: boolean;
  exitOnDealLost: boolean;
  sendOnWeekends: boolean;
  sendingHours: { start: number; end: number };
  timezone: string;
  // Stats (from API)
  totalEnrolled?: number;
  activeEnrolled?: number;
  completedCount?: number;
  openRate?: number;
  replyRate?: number;
}

interface Template {
  _id: string;
  name: string;
  subject: string;
  body: string;
  category: string;
}

interface Enrollment {
  _id: string;
  contactId: { firstName: string; lastName: string; email: string };
  dealId?: { title: string };
  status: string;
  currentStep: number;
  enrolledAt: string;
  nextStepAt?: string;
}

const STEP_TYPE_CONFIG = {
  email: { icon: Mail, label: 'Email', color: 'indigo' },
  task: { icon: CheckSquare, label: 'Tarea', color: 'yellow' },
  linkedin: { icon: Linkedin, label: 'LinkedIn', color: 'blue' },
};

const LINKEDIN_ACTIONS = [
  { value: 'connect', label: 'Enviar conexión' },
  { value: 'message', label: 'Enviar mensaje' },
  { value: 'view_profile', label: 'Ver perfil' },
];

export default function SequenceBuilderPage() {
  const params = useParams();
  const id = params.id as string;
  const { data: session } = useSession();
  const router = useRouter();
  const isNew = id === 'new';

  const [sequence, setSequence] = useState<Sequence>({
    name: '',
    description: '',
    isActive: false,
    steps: [],
    exitOnReply: true,
    exitOnMeeting: true,
    exitOnDealWon: true,
    exitOnDealLost: false,
    sendOnWeekends: false,
    sendingHours: { start: 9, end: 18 },
    timezone: 'America/Mexico_City',
  });
  const [templates, setTemplates] = useState<Template[]>([]);
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<'builder' | 'settings' | 'enrollments'>('builder');
  const [expandedStep, setExpandedStep] = useState<number | null>(null);
  const [showEnrollModal, setShowEnrollModal] = useState(false);
  const [saveTemplateStep, setSaveTemplateStep] = useState<number | null>(null);

  const user = session?.user as any;
  const isAdmin = user?.role === 'ADMIN';

  useEffect(() => {
    fetchTemplates();
    if (!isNew) {
      fetchSequence();
      fetchEnrollments();
    }
  }, [id, isNew]);

  const fetchSequence = async () => {
    try {
      const res = await fetch(`/api/crm/sequences/${id}`);
      if (res.ok) {
        const data = await res.json();
        setSequence(data);
      } else {
        router.push('/crm/sequences');
      }
    } catch (error) {
      console.error('Error fetching sequence:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchTemplates = async () => {
    try {
      const res = await fetch('/api/crm/email-templates');
      if (res.ok) {
        const data = await res.json();
        setTemplates(data);
      }
    } catch (error) {
      console.error('Error fetching templates:', error);
    }
  };

  const fetchEnrollments = async () => {
    try {
      const res = await fetch(`/api/crm/sequences/${id}/enroll?limit=20`);
      if (res.ok) {
        const data = await res.json();
        setEnrollments(data.enrollments);
      }
    } catch (error) {
      console.error('Error fetching enrollments:', error);
    }
  };

  const handleSave = async () => {
    if (!sequence.name.trim()) {
      alert('El nombre es requerido');
      return;
    }

    setSaving(true);
    try {
      const url = isNew ? '/api/crm/sequences' : `/api/crm/sequences/${id}`;
      const method = isNew ? 'POST' : 'PUT';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(sequence),
      });

      if (res.ok) {
        const data = await res.json();
        if (isNew) {
          router.push(`/crm/sequences/${data._id}`);
        } else {
          fetchSequence();
        }
      } else {
        const error = await res.json();
        alert(error.error);
      }
    } catch (error) {
      console.error('Error saving sequence:', error);
      alert('Error al guardar');
    } finally {
      setSaving(false);
    }
  };

  const addStep = (type: 'email' | 'task' | 'linkedin') => {
    const newStep: Step = {
      order: sequence.steps.length + 1,
      type,
      delayDays: sequence.steps.length === 0 ? 0 : 2,
      delayHours: 0,
    };

    if (type === 'email') {
      newStep.subject = '';
      newStep.body = '';
    } else if (type === 'task') {
      newStep.taskTitle = '';
      newStep.taskDescription = '';
    } else if (type === 'linkedin') {
      newStep.linkedinAction = 'connect';
    }

    setSequence({
      ...sequence,
      steps: [...sequence.steps, newStep],
    });
    setExpandedStep(newStep.order);
  };

  const updateStep = (order: number, updates: Partial<Step>) => {
    setSequence({
      ...sequence,
      steps: sequence.steps.map(s =>
        s.order === order ? { ...s, ...updates } : s
      ),
    });
  };

  const removeStep = (order: number) => {
    const newSteps = sequence.steps
      .filter(s => s.order !== order)
      .map((s, i) => ({ ...s, order: i + 1 }));
    setSequence({ ...sequence, steps: newSteps });
  };

  const moveStep = (order: number, direction: 'up' | 'down') => {
    const index = sequence.steps.findIndex(s => s.order === order);
    if (
      (direction === 'up' && index === 0) ||
      (direction === 'down' && index === sequence.steps.length - 1)
    ) return;

    const newSteps = [...sequence.steps];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    [newSteps[index], newSteps[targetIndex]] = [newSteps[targetIndex], newSteps[index]];

    // Reorder
    newSteps.forEach((s, i) => s.order = i + 1);
    setSequence({ ...sequence, steps: newSteps });
  };

  const getTotalDuration = () => {
    return sequence.steps.reduce((sum, step) => sum + step.delayDays, 0);
  };

  const handleEnrollmentAction = async (enrollmentId: string, action: 'pause' | 'resume' | 'exit') => {
    try {
      const res = await fetch(`/api/crm/enrollments/${enrollmentId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, reason: 'Manual action' }),
      });

      if (res.ok) {
        fetchEnrollments();
        fetchSequence();
      } else {
        const error = await res.json();
        alert(error.error);
      }
    } catch (error) {
      console.error('Error updating enrollment:', error);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <Navbar />
        <div className="pt-16 main-content p-8 flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Navbar />
      <div className="pt-16 main-content px-4 py-6">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-4">
              <button
                onClick={() => router.push('/crm/sequences')}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg"
              >
                <ArrowLeft className="w-5 h-5 text-gray-600 dark:text-gray-400" />
              </button>
              <div>
                <input
                  type="text"
                  value={sequence.name}
                  onChange={(e) => setSequence({ ...sequence, name: e.target.value })}
                  placeholder="Nombre de la secuencia"
                  className="text-2xl font-bold bg-transparent border-0 focus:ring-0 p-0 text-gray-900 dark:text-white placeholder-gray-400"
                />
                <input
                  type="text"
                  value={sequence.description}
                  onChange={(e) => setSequence({ ...sequence, description: e.target.value })}
                  placeholder="Descripción (opcional)"
                  className="block text-sm bg-transparent border-0 focus:ring-0 p-0 text-gray-500 dark:text-gray-400 placeholder-gray-400 w-full"
                />
              </div>
            </div>
            <div className="flex items-center gap-3">
              {!isNew && (
                <button
                  onClick={() => setSequence({ ...sequence, isActive: !sequence.isActive })}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg ${
                    sequence.isActive
                      ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                      : 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400'
                  }`}
                >
                  {sequence.isActive ? <Play className="w-4 h-4" /> : <Pause className="w-4 h-4" />}
                  {sequence.isActive ? 'Activa' : 'Inactiva'}
                </button>
              )}
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50"
              >
                {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                {saving ? 'Guardando...' : 'Guardar'}
              </button>
            </div>
          </div>

          {/* Stats (if not new) */}
          {!isNew && sequence.totalEnrolled !== undefined && (
            <div className="grid grid-cols-5 gap-4 mb-6">
              <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700 text-center">
                <Users className="w-5 h-5 text-indigo-600 mx-auto mb-1" />
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{sequence.activeEnrolled}</p>
                <p className="text-xs text-gray-500">Activos</p>
              </div>
              <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700 text-center">
                <Send className="w-5 h-5 text-blue-600 mx-auto mb-1" />
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{sequence.totalEnrolled}</p>
                <p className="text-xs text-gray-500">Total</p>
              </div>
              <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700 text-center">
                <Eye className="w-5 h-5 text-green-600 mx-auto mb-1" />
                <p className="text-2xl font-bold text-green-600">{sequence.openRate || 0}%</p>
                <p className="text-xs text-gray-500">Aperturas</p>
              </div>
              <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700 text-center">
                <MousePointerClick className="w-5 h-5 text-purple-600 mx-auto mb-1" />
                <p className="text-2xl font-bold text-purple-600">{sequence.replyRate || 0}%</p>
                <p className="text-xs text-gray-500">Respuestas</p>
              </div>
              <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700 text-center">
                <Clock className="w-5 h-5 text-gray-600 mx-auto mb-1" />
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{getTotalDuration()}</p>
                <p className="text-xs text-gray-500">Días totales</p>
              </div>
            </div>
          )}

          {/* Tabs */}
          <div className="flex gap-1 mb-6 border-b border-gray-200 dark:border-gray-700">
            <button
              onClick={() => setActiveTab('builder')}
              className={`px-4 py-2 font-medium text-sm border-b-2 -mb-px transition-colors ${
                activeTab === 'builder'
                  ? 'border-indigo-600 text-indigo-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              <Mail className="w-4 h-4 inline mr-2" />
              Constructor
            </button>
            <button
              onClick={() => setActiveTab('settings')}
              className={`px-4 py-2 font-medium text-sm border-b-2 -mb-px transition-colors ${
                activeTab === 'settings'
                  ? 'border-indigo-600 text-indigo-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              <Settings className="w-4 h-4 inline mr-2" />
              Configuración
            </button>
            {!isNew && (
              <button
                onClick={() => setActiveTab('enrollments')}
                className={`px-4 py-2 font-medium text-sm border-b-2 -mb-px transition-colors ${
                  activeTab === 'enrollments'
                    ? 'border-indigo-600 text-indigo-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                <Users className="w-4 h-4 inline mr-2" />
                Enrollados ({sequence.activeEnrolled || 0})
              </button>
            )}
          </div>

          {/* Builder Tab */}
          {activeTab === 'builder' && (
            <div className="space-y-4">
              {/* Timeline */}
              <div className="relative">
                {sequence.steps.length > 0 && (
                  <div className="absolute left-8 top-0 bottom-0 w-0.5 bg-gray-200 dark:bg-gray-700" />
                )}

                {sequence.steps.map((step, index) => {
                  const config = STEP_TYPE_CONFIG[step.type];
                  const Icon = config.icon;
                  const isExpanded = expandedStep === step.order;

                  return (
                    <div key={step.order} className="relative mb-4">
                      {/* Timeline node */}
                      <div className="flex items-start gap-4">
                        <div className={`relative z-10 w-16 h-16 rounded-full flex items-center justify-center border-4 border-white dark:border-gray-900 shadow-lg bg-${config.color}-100 dark:bg-${config.color}-900/30`}>
                          <Icon className={`w-6 h-6 text-${config.color}-600 dark:text-${config.color}-400`} />
                        </div>

                        {/* Step Card */}
                        <div className="flex-1 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
                          {/* Step Header */}
                          <div
                            className="p-4 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-750"
                            onClick={() => setExpandedStep(isExpanded ? null : step.order)}
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                <span className="text-sm font-medium text-gray-500">Paso {step.order}</span>
                                <span className={`px-2 py-0.5 text-xs rounded-full bg-${config.color}-100 dark:bg-${config.color}-900/30 text-${config.color}-700 dark:text-${config.color}-400`}>
                                  {config.label}
                                </span>
                                <span className="flex items-center gap-1 text-sm text-gray-500">
                                  <Clock className="w-3 h-3" />
                                  {step.order === 1 && step.delayDays === 0 ? 'Inmediato' : `+${step.delayDays} días${step.delayHours > 0 ? ` ${step.delayHours}h` : ''}`}
                                </span>
                              </div>
                              <div className="flex items-center gap-2">
                                {index > 0 && (
                                  <button
                                    onClick={(e) => { e.stopPropagation(); moveStep(step.order, 'up'); }}
                                    className="p-1 text-gray-400 hover:text-gray-600"
                                  >
                                    <ChevronUp className="w-4 h-4" />
                                  </button>
                                )}
                                {index < sequence.steps.length - 1 && (
                                  <button
                                    onClick={(e) => { e.stopPropagation(); moveStep(step.order, 'down'); }}
                                    className="p-1 text-gray-400 hover:text-gray-600"
                                  >
                                    <ChevronDown className="w-4 h-4" />
                                  </button>
                                )}
                                <button
                                  onClick={(e) => { e.stopPropagation(); removeStep(step.order); }}
                                  className="p-1 text-red-400 hover:text-red-600"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                                {isExpanded ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
                              </div>
                            </div>
                            {/* Preview */}
                            {!isExpanded && (
                              <p className="text-sm text-gray-600 dark:text-gray-400 mt-2 truncate">
                                {step.type === 'email' && (step.subject || 'Sin asunto')}
                                {step.type === 'task' && (step.taskTitle || 'Sin título')}
                                {step.type === 'linkedin' && LINKEDIN_ACTIONS.find(a => a.value === step.linkedinAction)?.label}
                              </p>
                            )}
                          </div>

                          {/* Step Content (expanded) */}
                          {isExpanded && (
                            <div className="p-4 border-t border-gray-200 dark:border-gray-700 space-y-4">
                              {/* Delay */}
                              <div className="flex gap-4">
                                <div className="flex-1">
                                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                    Esperar (días)
                                  </label>
                                  <input
                                    type="number"
                                    value={step.delayDays}
                                    onChange={(e) => updateStep(step.order, { delayDays: parseInt(e.target.value) || 0 })}
                                    min="0"
                                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700"
                                  />
                                </div>
                                <div className="flex-1">
                                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                    Horas adicionales
                                  </label>
                                  <input
                                    type="number"
                                    value={step.delayHours}
                                    onChange={(e) => updateStep(step.order, { delayHours: parseInt(e.target.value) || 0 })}
                                    min="0"
                                    max="23"
                                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700"
                                  />
                                </div>
                              </div>

                              {/* Email fields - Visual Editor */}
                              {step.type === 'email' && (
                                <EmailTemplateEditor
                                  subject={step.subject || ''}
                                  body={step.body || ''}
                                  onSubjectChange={(value) => updateStep(step.order, { subject: value })}
                                  onBodyChange={(value) => updateStep(step.order, { body: value })}
                                  onSelectTemplate={(template) => {
                                    updateStep(step.order, {
                                      subject: template.subject,
                                      body: template.body,
                                    });
                                  }}
                                  onSaveAsTemplate={() => setSaveTemplateStep(step.order)}
                                  showTemplateLibrary
                                />
                              )}

                              {/* Task fields */}
                              {step.type === 'task' && (
                                <>
                                  <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                      Título de la tarea
                                    </label>
                                    <input
                                      type="text"
                                      value={step.taskTitle || ''}
                                      onChange={(e) => updateStep(step.order, { taskTitle: e.target.value })}
                                      placeholder="Título de la tarea"
                                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700"
                                    />
                                  </div>
                                  <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                      Descripción
                                    </label>
                                    <textarea
                                      value={step.taskDescription || ''}
                                      onChange={(e) => updateStep(step.order, { taskDescription: e.target.value })}
                                      placeholder="Descripción de la tarea"
                                      rows={3}
                                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700"
                                    />
                                  </div>
                                </>
                              )}

                              {/* LinkedIn fields */}
                              {step.type === 'linkedin' && (
                                <>
                                  <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                      Acción de LinkedIn
                                    </label>
                                    <select
                                      value={step.linkedinAction || 'connect'}
                                      onChange={(e) => updateStep(step.order, { linkedinAction: e.target.value as any })}
                                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700"
                                    >
                                      {LINKEDIN_ACTIONS.map(a => (
                                        <option key={a.value} value={a.value}>{a.label}</option>
                                      ))}
                                    </select>
                                  </div>
                                  {step.linkedinAction === 'message' && (
                                    <div>
                                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                        Mensaje
                                      </label>
                                      <textarea
                                        value={step.linkedinMessage || ''}
                                        onChange={(e) => updateStep(step.order, { linkedinMessage: e.target.value })}
                                        placeholder="Mensaje para LinkedIn"
                                        rows={3}
                                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700"
                                      />
                                    </div>
                                  )}
                                </>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}

                {/* Add Step Button */}
                <div className="flex items-center gap-4 mt-6">
                  <div className="w-16 h-16 rounded-full border-2 border-dashed border-gray-300 dark:border-gray-600 flex items-center justify-center">
                    <Plus className="w-6 h-6 text-gray-400" />
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => addStep('email')}
                      className="px-4 py-2 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400 rounded-lg hover:bg-indigo-200 dark:hover:bg-indigo-900/50 flex items-center gap-2"
                    >
                      <Mail className="w-4 h-4" />
                      Email
                    </button>
                    <button
                      onClick={() => addStep('task')}
                      className="px-4 py-2 bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400 rounded-lg hover:bg-yellow-200 dark:hover:bg-yellow-900/50 flex items-center gap-2"
                    >
                      <CheckSquare className="w-4 h-4" />
                      Tarea
                    </button>
                    <button
                      onClick={() => addStep('linkedin')}
                      className="px-4 py-2 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 rounded-lg hover:bg-blue-200 dark:hover:bg-blue-900/50 flex items-center gap-2"
                    >
                      <Linkedin className="w-4 h-4" />
                      LinkedIn
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Settings Tab */}
          {activeTab === 'settings' && (
            <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 space-y-6">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Condiciones de Salida</h3>
                <div className="space-y-3">
                  <label className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      checked={sequence.exitOnReply}
                      onChange={(e) => setSequence({ ...sequence, exitOnReply: e.target.checked })}
                      className="rounded"
                    />
                    <span className="text-gray-700 dark:text-gray-300">Salir si el contacto responde</span>
                  </label>
                  <label className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      checked={sequence.exitOnMeeting}
                      onChange={(e) => setSequence({ ...sequence, exitOnMeeting: e.target.checked })}
                      className="rounded"
                    />
                    <span className="text-gray-700 dark:text-gray-300">Salir si se agenda una reunión</span>
                  </label>
                  <label className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      checked={sequence.exitOnDealWon}
                      onChange={(e) => setSequence({ ...sequence, exitOnDealWon: e.target.checked })}
                      className="rounded"
                    />
                    <span className="text-gray-700 dark:text-gray-300">Salir si el deal se gana</span>
                  </label>
                  <label className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      checked={sequence.exitOnDealLost}
                      onChange={(e) => setSequence({ ...sequence, exitOnDealLost: e.target.checked })}
                      className="rounded"
                    />
                    <span className="text-gray-700 dark:text-gray-300">Salir si el deal se pierde</span>
                  </label>
                </div>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Horarios de Envío</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Hora inicio
                    </label>
                    <select
                      value={sequence.sendingHours.start}
                      onChange={(e) => setSequence({
                        ...sequence,
                        sendingHours: { ...sequence.sendingHours, start: parseInt(e.target.value) }
                      })}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700"
                    >
                      {Array.from({ length: 24 }, (_, i) => (
                        <option key={i} value={i}>{i.toString().padStart(2, '0')}:00</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Hora fin
                    </label>
                    <select
                      value={sequence.sendingHours.end}
                      onChange={(e) => setSequence({
                        ...sequence,
                        sendingHours: { ...sequence.sendingHours, end: parseInt(e.target.value) }
                      })}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700"
                    >
                      {Array.from({ length: 24 }, (_, i) => (
                        <option key={i} value={i}>{i.toString().padStart(2, '0')}:00</option>
                      ))}
                    </select>
                  </div>
                </div>
                <label className="flex items-center gap-3 mt-4">
                  <input
                    type="checkbox"
                    checked={sequence.sendOnWeekends}
                    onChange={(e) => setSequence({ ...sequence, sendOnWeekends: e.target.checked })}
                    className="rounded"
                  />
                  <span className="text-gray-700 dark:text-gray-300">Enviar en fines de semana</span>
                </label>
              </div>
            </div>
          )}

          {/* Enrollments Tab */}
          {activeTab === 'enrollments' && !isNew && (
            <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
              <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
                <h3 className="font-semibold text-gray-900 dark:text-white">Contactos Enrollados</h3>
                <button
                  onClick={() => setShowEnrollModal(true)}
                  className="flex items-center gap-2 px-3 py-1.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 text-sm"
                >
                  <UserPlus className="w-4 h-4" />
                  Enrollar Contactos
                </button>
              </div>
              <div className="divide-y divide-gray-200 dark:divide-gray-700">
                {enrollments.length === 0 ? (
                  <div className="p-8 text-center text-gray-500">
                    No hay contactos enrollados en esta secuencia
                  </div>
                ) : (
                  enrollments.map((enrollment) => (
                    <div key={enrollment._id} className="p-4 flex items-center justify-between">
                      <div>
                        <p className="font-medium text-gray-900 dark:text-white">
                          {enrollment.contactId.firstName} {enrollment.contactId.lastName}
                        </p>
                        <p className="text-sm text-gray-500">{enrollment.contactId.email}</p>
                        <div className="flex items-center gap-3 mt-1 text-xs text-gray-400">
                          <span>Paso {enrollment.currentStep} de {sequence.steps.length}</span>
                          {enrollment.nextStepAt && (
                            <span>Próximo: {new Date(enrollment.nextStepAt).toLocaleDateString()}</span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`px-2 py-1 text-xs rounded-full ${
                          enrollment.status === 'active' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' :
                          enrollment.status === 'paused' ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400' :
                          enrollment.status === 'completed' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' :
                          'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-400'
                        }`}>
                          {enrollment.status === 'active' ? 'Activo' :
                           enrollment.status === 'paused' ? 'Pausado' :
                           enrollment.status === 'completed' ? 'Completado' : 'Salido'}
                        </span>
                        {enrollment.status === 'active' && (
                          <button
                            onClick={() => handleEnrollmentAction(enrollment._id, 'pause')}
                            className="p-1 text-yellow-600 hover:bg-yellow-50 rounded"
                            title="Pausar"
                          >
                            <Pause className="w-4 h-4" />
                          </button>
                        )}
                        {enrollment.status === 'paused' && (
                          <button
                            onClick={() => handleEnrollmentAction(enrollment._id, 'resume')}
                            className="p-1 text-green-600 hover:bg-green-50 rounded"
                            title="Reanudar"
                          >
                            <Play className="w-4 h-4" />
                          </button>
                        )}
                        {['active', 'paused'].includes(enrollment.status) && (
                          <button
                            onClick={() => handleEnrollmentAction(enrollment._id, 'exit')}
                            className="p-1 text-red-600 hover:bg-red-50 rounded"
                            title="Remover"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Save Template Modal */}
      {saveTemplateStep !== null && (
        <SaveTemplateModal
          subject={sequence.steps.find(s => s.order === saveTemplateStep)?.subject || ''}
          body={sequence.steps.find(s => s.order === saveTemplateStep)?.body || ''}
          onClose={() => setSaveTemplateStep(null)}
          onSaved={(templateId) => {
            updateStep(saveTemplateStep, { templateId });
            fetchTemplates();
            setSaveTemplateStep(null);
          }}
        />
      )}
    </div>
  );
}
