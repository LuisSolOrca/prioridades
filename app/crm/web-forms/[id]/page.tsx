'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter, useParams, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import Navbar from '@/components/Navbar';
import {
  ArrowLeft,
  Save,
  Eye,
  EyeOff,
  Plus,
  Trash2,
  GripVertical,
  Settings,
  Palette,
  Code,
  BarChart3,
  Type,
  Mail,
  Phone,
  List,
  AlignLeft,
  CheckSquare,
  Hash,
  Calendar,
  Link as LinkIcon,
  ChevronDown,
  ChevronUp,
  Copy,
  Check,
  ExternalLink,
  Users,
  Zap,
  Bell,
  Globe,
} from 'lucide-react';

interface FormField {
  id: string;
  name: string;
  label: string;
  type: 'text' | 'email' | 'phone' | 'select' | 'textarea' | 'checkbox' | 'number' | 'date' | 'url';
  required: boolean;
  placeholder?: string;
  options?: string[];
  mapTo?: string;
  order: number;
  width: 'full' | 'half';
  validation?: {
    minLength?: number;
    maxLength?: number;
    pattern?: string;
  };
}

interface FormStyle {
  primaryColor: string;
  backgroundColor: string;
  textColor: string;
  borderRadius: number;
  fontFamily: string;
  fontSize: number;
  padding: number;
  buttonStyle: 'filled' | 'outline';
}

interface WebForm {
  _id: string;
  name: string;
  description?: string;
  fields: FormField[];
  style: FormStyle;
  logoUrl?: string;
  submitButtonText: string;
  successMessage: string;
  redirectUrl?: string;
  showPoweredBy: boolean;
  createContact: boolean;
  createDeal: boolean;
  defaultPipelineId?: string;
  defaultStageId?: string;
  defaultDealValue?: number;
  assignToUserId?: string;
  assignmentType: 'specific' | 'round_robin';
  addTags: string[];
  triggerWorkflow: boolean;
  notifyOnSubmission: boolean;
  notifyEmails: string[];
  allowedDomains: string[];
  captchaEnabled: boolean;
  isActive: boolean;
  isPublished: boolean;
  formKey: string;
  submissions: number;
}

const FIELD_TYPES = [
  { type: 'text', label: 'Texto', icon: Type },
  { type: 'email', label: 'Email', icon: Mail },
  { type: 'phone', label: 'Teléfono', icon: Phone },
  { type: 'select', label: 'Selección', icon: List },
  { type: 'textarea', label: 'Área de texto', icon: AlignLeft },
  { type: 'checkbox', label: 'Checkbox', icon: CheckSquare },
  { type: 'number', label: 'Número', icon: Hash },
  { type: 'date', label: 'Fecha', icon: Calendar },
  { type: 'url', label: 'URL', icon: LinkIcon },
];

const MAP_TO_OPTIONS = [
  { value: '', label: 'No mapear' },
  { value: 'contact.firstName', label: 'Contacto - Nombre' },
  { value: 'contact.lastName', label: 'Contacto - Apellido' },
  { value: 'contact.email', label: 'Contacto - Email' },
  { value: 'contact.phone', label: 'Contacto - Teléfono' },
  { value: 'contact.position', label: 'Contacto - Cargo' },
  { value: 'contact.company', label: 'Contacto - Empresa' },
  { value: 'contact.notes', label: 'Contacto - Notas' },
];

export default function WebFormBuilderPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const formId = params.id as string;

  const [form, setForm] = useState<WebForm | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState(searchParams.get('tab') || 'fields');
  const [selectedField, setSelectedField] = useState<string | null>(null);
  const [draggedField, setDraggedField] = useState<string | null>(null);
  const [copiedEmbed, setCopiedEmbed] = useState<string | null>(null);
  const [embedCodes, setEmbedCodes] = useState<any>(null);
  const [users, setUsers] = useState<any[]>([]);
  const [pipelines, setPipelines] = useState<any[]>([]);
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
    }
  }, [status, router]);

  useEffect(() => {
    fetchForm();
    fetchUsers();
    fetchPipelines();
  }, [formId]);

  const fetchForm = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/crm/web-forms/${formId}`);
      if (res.ok) {
        const data = await res.json();
        setForm(data);
      } else {
        router.push('/crm/web-forms');
      }
    } catch (error) {
      console.error('Error fetching form:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchUsers = async () => {
    try {
      const res = await fetch('/api/users');
      if (res.ok) {
        const data = await res.json();
        setUsers(data);
      }
    } catch (error) {
      console.error('Error fetching users:', error);
    }
  };

  const fetchPipelines = async () => {
    try {
      const res = await fetch('/api/crm/pipelines');
      if (res.ok) {
        const data = await res.json();
        setPipelines(data);
      }
    } catch (error) {
      console.error('Error fetching pipelines:', error);
    }
  };

  const fetchEmbedCodes = async () => {
    try {
      const res = await fetch(`/api/crm/web-forms/${formId}/embed`);
      if (res.ok) {
        const data = await res.json();
        setEmbedCodes(data);
      }
    } catch (error) {
      console.error('Error fetching embed codes:', error);
    }
  };

  useEffect(() => {
    if (activeTab === 'embed') {
      fetchEmbedCodes();
    }
  }, [activeTab]);

  const saveForm = async () => {
    if (!form) return;

    try {
      setSaving(true);
      const res = await fetch(`/api/crm/web-forms/${formId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });

      if (res.ok) {
        setHasChanges(false);
      }
    } catch (error) {
      console.error('Error saving form:', error);
    } finally {
      setSaving(false);
    }
  };

  const updateForm = (updates: Partial<WebForm>) => {
    if (!form) return;
    setForm({ ...form, ...updates });
    setHasChanges(true);
  };

  const addField = (type: string) => {
    if (!form) return;

    const newField: FormField = {
      id: `field_${Date.now()}`,
      name: `field_${form.fields.length + 1}`,
      label: FIELD_TYPES.find(t => t.type === type)?.label || 'Campo',
      type: type as FormField['type'],
      required: false,
      order: form.fields.length,
      width: 'full',
      options: type === 'select' ? ['Opción 1', 'Opción 2'] : undefined,
    };

    updateForm({ fields: [...form.fields, newField] });
    setSelectedField(newField.id);
  };

  const updateField = (fieldId: string, updates: Partial<FormField>) => {
    if (!form) return;

    const updatedFields = form.fields.map(f =>
      f.id === fieldId ? { ...f, ...updates } : f
    );
    updateForm({ fields: updatedFields });
  };

  const removeField = (fieldId: string) => {
    if (!form) return;

    updateForm({
      fields: form.fields
        .filter(f => f.id !== fieldId)
        .map((f, i) => ({ ...f, order: i })),
    });
    setSelectedField(null);
  };

  const moveField = (fieldId: string, direction: 'up' | 'down') => {
    if (!form) return;

    const fields = [...form.fields];
    const index = fields.findIndex(f => f.id === fieldId);
    if (
      (direction === 'up' && index === 0) ||
      (direction === 'down' && index === fields.length - 1)
    ) {
      return;
    }

    const newIndex = direction === 'up' ? index - 1 : index + 1;
    [fields[index], fields[newIndex]] = [fields[newIndex], fields[index]];
    fields.forEach((f, i) => (f.order = i));
    updateForm({ fields });
  };

  const copyToClipboard = async (text: string, type: string) => {
    await navigator.clipboard.writeText(text);
    setCopiedEmbed(type);
    setTimeout(() => setCopiedEmbed(null), 2000);
  };

  const togglePublish = async () => {
    if (!form) return;
    updateForm({ isPublished: !form.isPublished });
    // Save immediately
    try {
      await fetch(`/api/crm/web-forms/${formId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isPublished: !form.isPublished }),
      });
    } catch (error) {
      console.error('Error toggling publish:', error);
    }
  };

  if (loading || !form) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const selectedFieldData = form.fields.find(f => f.id === selectedField);

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900">
      <Navbar />
      {/* Builder Header */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 sticky top-16 z-20">
        <div className="px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-14">
            <div className="flex items-center gap-4">
              <Link
                href="/crm/web-forms"
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
              >
                <ArrowLeft size={20} className="text-gray-500" />
              </Link>
              <input
                type="text"
                value={form.name}
                onChange={(e) => updateForm({ name: e.target.value })}
                className="text-lg font-semibold bg-transparent border-none focus:outline-none focus:ring-0 text-gray-900 dark:text-white"
              />
              {hasChanges && (
                <span className="text-xs text-amber-600 bg-amber-100 px-2 py-0.5 rounded">
                  Sin guardar
                </span>
              )}
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={togglePublish}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm ${
                  form.isPublished
                    ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                    : 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300'
                }`}
              >
                {form.isPublished ? <Eye size={16} /> : <EyeOff size={16} />}
                {form.isPublished ? 'Publicado' : 'Borrador'}
              </button>

              {form.isPublished && (
                <a
                  href={`/forms/${form.formKey}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
                >
                  <ExternalLink size={20} className="text-gray-500" />
                </a>
              )}

              <button
                onClick={saveForm}
                disabled={saving || !hasChanges}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                <Save size={18} />
                {saving ? 'Guardando...' : 'Guardar'}
              </button>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="px-4 sm:px-6 lg:px-8 border-t border-gray-200 dark:border-gray-700">
          <div className="flex gap-1 -mb-px">
            {[
              { id: 'fields', label: 'Campos', icon: Type },
              { id: 'style', label: 'Estilos', icon: Palette },
              { id: 'settings', label: 'Configuración', icon: Settings },
              { id: 'embed', label: 'Código Embed', icon: Code },
              { id: 'submissions', label: 'Submissions', icon: BarChart3 },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition ${
                  activeTab === tab.id
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400'
                }`}
              >
                <tab.icon size={18} />
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 flex overflow-hidden pt-16 main-content">
        {activeTab === 'fields' && (
          <>
            {/* Left Panel - Field Types */}
            <div className="w-64 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 p-4 overflow-y-auto">
              <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-3">
                Agregar Campo
              </h3>
              <div className="space-y-2">
                {FIELD_TYPES.map((fieldType) => (
                  <button
                    key={fieldType.type}
                    onClick={() => addField(fieldType.type)}
                    className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-left"
                  >
                    <fieldType.icon size={18} className="text-gray-400" />
                    <span className="text-sm text-gray-700 dark:text-gray-300">
                      {fieldType.label}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* Center - Preview */}
            <div className="flex-1 p-8 overflow-y-auto">
              <div
                className="max-w-xl mx-auto rounded-xl shadow-lg overflow-hidden"
                style={{
                  backgroundColor: form.style?.backgroundColor || '#FFFFFF',
                  fontFamily: form.style?.fontFamily || 'Inter, system-ui, sans-serif',
                }}
              >
                <div style={{ padding: form.style?.padding || 24 }}>
                  {form.logoUrl && (
                    <img
                      src={form.logoUrl}
                      alt="Logo"
                      className="h-12 mb-4"
                    />
                  )}
                  <h2
                    className="text-xl font-semibold mb-2"
                    style={{ color: form.style?.textColor || '#1F2937' }}
                  >
                    {form.name}
                  </h2>
                  {form.description && (
                    <p
                      className="mb-6 text-sm opacity-70"
                      style={{ color: form.style?.textColor || '#1F2937' }}
                    >
                      {form.description}
                    </p>
                  )}

                  <div className="space-y-4">
                    {form.fields
                      .sort((a, b) => a.order - b.order)
                      .map((field) => (
                        <div
                          key={field.id}
                          onClick={() => setSelectedField(field.id)}
                          className={`p-3 rounded-lg cursor-pointer transition ${
                            selectedField === field.id
                              ? 'ring-2 ring-blue-500 bg-blue-50 dark:bg-blue-900/20'
                              : 'hover:bg-gray-50 dark:hover:bg-gray-800'
                          }`}
                          style={{ width: field.width === 'half' ? '48%' : '100%' }}
                        >
                          <label
                            className="block text-sm font-medium mb-1"
                            style={{ color: form.style?.textColor || '#1F2937' }}
                          >
                            {field.label}
                            {field.required && (
                              <span className="text-red-500 ml-1">*</span>
                            )}
                          </label>
                          {field.type === 'textarea' ? (
                            <textarea
                              placeholder={field.placeholder}
                              className="w-full px-3 py-2 border rounded-lg bg-white dark:bg-gray-900"
                              style={{
                                borderRadius: form.style?.borderRadius || 8,
                                fontSize: form.style?.fontSize || 14,
                              }}
                              rows={3}
                              disabled
                            />
                          ) : field.type === 'select' ? (
                            <select
                              className="w-full px-3 py-2 border rounded-lg bg-white dark:bg-gray-900"
                              style={{
                                borderRadius: form.style?.borderRadius || 8,
                                fontSize: form.style?.fontSize || 14,
                              }}
                              disabled
                            >
                              <option>Seleccionar...</option>
                              {field.options?.map((opt, i) => (
                                <option key={i}>{opt}</option>
                              ))}
                            </select>
                          ) : field.type === 'checkbox' ? (
                            <label className="flex items-center gap-2">
                              <input type="checkbox" disabled />
                              <span style={{ fontSize: form.style?.fontSize || 14 }}>
                                {field.placeholder || 'Aceptar'}
                              </span>
                            </label>
                          ) : (
                            <input
                              type={field.type}
                              placeholder={field.placeholder}
                              className="w-full px-3 py-2 border rounded-lg bg-white dark:bg-gray-900"
                              style={{
                                borderRadius: form.style?.borderRadius || 8,
                                fontSize: form.style?.fontSize || 14,
                              }}
                              disabled
                            />
                          )}
                        </div>
                      ))}
                  </div>

                  <button
                    className="w-full mt-6 py-3 font-medium rounded-lg transition"
                    style={{
                      backgroundColor:
                        form.style?.buttonStyle === 'outline'
                          ? 'transparent'
                          : form.style?.primaryColor || '#3B82F6',
                      color:
                        form.style?.buttonStyle === 'outline'
                          ? form.style?.primaryColor || '#3B82F6'
                          : '#FFFFFF',
                      border:
                        form.style?.buttonStyle === 'outline'
                          ? `2px solid ${form.style?.primaryColor || '#3B82F6'}`
                          : 'none',
                      borderRadius: form.style?.borderRadius || 8,
                    }}
                  >
                    {form.submitButtonText || 'Enviar'}
                  </button>

                  {form.showPoweredBy && (
                    <p className="text-center text-xs text-gray-400 mt-4">
                      Powered by OrcaCRM
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Right Panel - Field Settings */}
            <div className="w-80 bg-white dark:bg-gray-800 border-l border-gray-200 dark:border-gray-700 p-4 overflow-y-auto">
              {selectedFieldData ? (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="font-medium text-gray-900 dark:text-white">
                      Configurar Campo
                    </h3>
                    <button
                      onClick={() => removeField(selectedFieldData.id)}
                      className="p-1 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Etiqueta
                    </label>
                    <input
                      type="text"
                      value={selectedFieldData.label}
                      onChange={(e) =>
                        updateField(selectedFieldData.id, { label: e.target.value })
                      }
                      className="w-full px-3 py-2 border rounded-lg dark:bg-gray-900 dark:border-gray-700"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Nombre (ID)
                    </label>
                    <input
                      type="text"
                      value={selectedFieldData.name}
                      onChange={(e) =>
                        updateField(selectedFieldData.id, {
                          name: e.target.value.replace(/\s/g, '_'),
                        })
                      }
                      className="w-full px-3 py-2 border rounded-lg dark:bg-gray-900 dark:border-gray-700"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Placeholder
                    </label>
                    <input
                      type="text"
                      value={selectedFieldData.placeholder || ''}
                      onChange={(e) =>
                        updateField(selectedFieldData.id, { placeholder: e.target.value })
                      }
                      className="w-full px-3 py-2 border rounded-lg dark:bg-gray-900 dark:border-gray-700"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Mapear a
                    </label>
                    <select
                      value={selectedFieldData.mapTo || ''}
                      onChange={(e) =>
                        updateField(selectedFieldData.id, { mapTo: e.target.value })
                      }
                      className="w-full px-3 py-2 border rounded-lg dark:bg-gray-900 dark:border-gray-700"
                    >
                      {MAP_TO_OPTIONS.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  {selectedFieldData.type === 'select' && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Opciones (una por línea)
                      </label>
                      <textarea
                        value={selectedFieldData.options?.join('\n') || ''}
                        onChange={(e) =>
                          updateField(selectedFieldData.id, {
                            options: e.target.value.split('\n').filter(Boolean),
                          })
                        }
                        className="w-full px-3 py-2 border rounded-lg dark:bg-gray-900 dark:border-gray-700"
                        rows={4}
                      />
                    </div>
                  )}

                  <div className="flex items-center gap-4">
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={selectedFieldData.required}
                        onChange={(e) =>
                          updateField(selectedFieldData.id, { required: e.target.checked })
                        }
                        className="rounded"
                      />
                      <span className="text-sm text-gray-700 dark:text-gray-300">
                        Requerido
                      </span>
                    </label>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Ancho
                    </label>
                    <div className="flex gap-2">
                      {(['full', 'half'] as const).map((w) => (
                        <button
                          key={w}
                          onClick={() => updateField(selectedFieldData.id, { width: w })}
                          className={`flex-1 py-2 rounded-lg text-sm ${
                            selectedFieldData.width === w
                              ? 'bg-blue-600 text-white'
                              : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
                          }`}
                        >
                          {w === 'full' ? 'Completo' : 'Mitad'}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="flex gap-2 pt-4 border-t">
                    <button
                      onClick={() => moveField(selectedFieldData.id, 'up')}
                      disabled={selectedFieldData.order === 0}
                      className="flex-1 flex items-center justify-center gap-1 py-2 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 disabled:opacity-50"
                    >
                      <ChevronUp size={16} />
                      Subir
                    </button>
                    <button
                      onClick={() => moveField(selectedFieldData.id, 'down')}
                      disabled={selectedFieldData.order === form.fields.length - 1}
                      className="flex-1 flex items-center justify-center gap-1 py-2 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 disabled:opacity-50"
                    >
                      <ChevronDown size={16} />
                      Bajar
                    </button>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8">
                  <Type className="mx-auto text-gray-400 mb-2" size={32} />
                  <p className="text-gray-500 dark:text-gray-400">
                    Selecciona un campo para configurarlo
                  </p>
                </div>
              )}
            </div>
          </>
        )}

        {activeTab === 'style' && (
          <div className="flex-1 flex">
            {/* Style Options */}
            <div className="w-80 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 p-6 overflow-y-auto space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Color Principal
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={form.style?.primaryColor || '#3B82F6'}
                    onChange={(e) =>
                      updateForm({
                        style: { ...form.style, primaryColor: e.target.value },
                      })
                    }
                    className="w-10 h-10 rounded cursor-pointer"
                  />
                  <input
                    type="text"
                    value={form.style?.primaryColor || '#3B82F6'}
                    onChange={(e) =>
                      updateForm({
                        style: { ...form.style, primaryColor: e.target.value },
                      })
                    }
                    className="flex-1 px-3 py-2 border rounded-lg dark:bg-gray-900"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Color de Fondo
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={form.style?.backgroundColor || '#FFFFFF'}
                    onChange={(e) =>
                      updateForm({
                        style: { ...form.style, backgroundColor: e.target.value },
                      })
                    }
                    className="w-10 h-10 rounded cursor-pointer"
                  />
                  <input
                    type="text"
                    value={form.style?.backgroundColor || '#FFFFFF'}
                    onChange={(e) =>
                      updateForm({
                        style: { ...form.style, backgroundColor: e.target.value },
                      })
                    }
                    className="flex-1 px-3 py-2 border rounded-lg dark:bg-gray-900"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Color de Texto
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={form.style?.textColor || '#1F2937'}
                    onChange={(e) =>
                      updateForm({
                        style: { ...form.style, textColor: e.target.value },
                      })
                    }
                    className="w-10 h-10 rounded cursor-pointer"
                  />
                  <input
                    type="text"
                    value={form.style?.textColor || '#1F2937'}
                    onChange={(e) =>
                      updateForm({
                        style: { ...form.style, textColor: e.target.value },
                      })
                    }
                    className="flex-1 px-3 py-2 border rounded-lg dark:bg-gray-900"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Radio de Bordes: {form.style?.borderRadius || 8}px
                </label>
                <input
                  type="range"
                  min="0"
                  max="24"
                  value={form.style?.borderRadius || 8}
                  onChange={(e) =>
                    updateForm({
                      style: { ...form.style, borderRadius: parseInt(e.target.value) },
                    })
                  }
                  className="w-full"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Padding: {form.style?.padding || 24}px
                </label>
                <input
                  type="range"
                  min="12"
                  max="48"
                  value={form.style?.padding || 24}
                  onChange={(e) =>
                    updateForm({
                      style: { ...form.style, padding: parseInt(e.target.value) },
                    })
                  }
                  className="w-full"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Estilo del Botón
                </label>
                <div className="flex gap-2">
                  {(['filled', 'outline'] as const).map((style) => (
                    <button
                      key={style}
                      onClick={() =>
                        updateForm({
                          style: { ...form.style, buttonStyle: style },
                        })
                      }
                      className={`flex-1 py-2 rounded-lg text-sm ${
                        (form.style?.buttonStyle || 'filled') === style
                          ? 'bg-blue-600 text-white'
                          : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
                      }`}
                    >
                      {style === 'filled' ? 'Relleno' : 'Contorno'}
                    </button>
                  ))}
                </div>
              </div>

              <hr className="border-gray-200 dark:border-gray-700" />

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Texto del Botón
                </label>
                <input
                  type="text"
                  value={form.submitButtonText}
                  onChange={(e) => updateForm({ submitButtonText: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg dark:bg-gray-900"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Mensaje de Éxito
                </label>
                <textarea
                  value={form.successMessage}
                  onChange={(e) => updateForm({ successMessage: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg dark:bg-gray-900"
                  rows={3}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  URL de Redirección (opcional)
                </label>
                <input
                  type="url"
                  value={form.redirectUrl || ''}
                  onChange={(e) => updateForm({ redirectUrl: e.target.value })}
                  placeholder="https://..."
                  className="w-full px-3 py-2 border rounded-lg dark:bg-gray-900"
                />
              </div>

              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={form.showPoweredBy}
                  onChange={(e) => updateForm({ showPoweredBy: e.target.checked })}
                  className="rounded"
                />
                <span className="text-sm text-gray-700 dark:text-gray-300">
                  Mostrar "Powered by"
                </span>
              </label>
            </div>

            {/* Preview */}
            <div className="flex-1 p-8 overflow-y-auto bg-gray-100 dark:bg-gray-900">
              <div
                className="max-w-xl mx-auto rounded-xl shadow-lg overflow-hidden"
                style={{
                  backgroundColor: form.style?.backgroundColor || '#FFFFFF',
                  fontFamily: form.style?.fontFamily || 'Inter, system-ui, sans-serif',
                }}
              >
                <div style={{ padding: form.style?.padding || 24 }}>
                  <h2
                    className="text-xl font-semibold mb-6"
                    style={{ color: form.style?.textColor || '#1F2937' }}
                  >
                    {form.name}
                  </h2>

                  <div className="space-y-4">
                    {form.fields.slice(0, 3).map((field) => (
                      <div key={field.id}>
                        <label
                          className="block text-sm font-medium mb-1"
                          style={{ color: form.style?.textColor || '#1F2937' }}
                        >
                          {field.label}
                        </label>
                        <input
                          type="text"
                          placeholder={field.placeholder}
                          className="w-full px-3 py-2 border rounded-lg"
                          style={{ borderRadius: form.style?.borderRadius || 8 }}
                          disabled
                        />
                      </div>
                    ))}
                  </div>

                  <button
                    className="w-full mt-6 py-3 font-medium rounded-lg"
                    style={{
                      backgroundColor:
                        form.style?.buttonStyle === 'outline'
                          ? 'transparent'
                          : form.style?.primaryColor || '#3B82F6',
                      color:
                        form.style?.buttonStyle === 'outline'
                          ? form.style?.primaryColor || '#3B82F6'
                          : '#FFFFFF',
                      border:
                        form.style?.buttonStyle === 'outline'
                          ? `2px solid ${form.style?.primaryColor || '#3B82F6'}`
                          : 'none',
                      borderRadius: form.style?.borderRadius || 8,
                    }}
                  >
                    {form.submitButtonText}
                  </button>

                  {form.showPoweredBy && (
                    <p className="text-center text-xs text-gray-400 mt-4">
                      Powered by OrcaCRM
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'settings' && (
          <div className="flex-1 p-8 overflow-y-auto">
            <div className="max-w-2xl mx-auto space-y-8">
              {/* Acciones Post-Submit */}
              <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                  <Zap size={20} />
                  Acciones Post-Submit
                </h3>

                <div className="space-y-4">
                  <label className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      checked={form.createContact}
                      onChange={(e) => updateForm({ createContact: e.target.checked })}
                      className="rounded"
                    />
                    <div>
                      <span className="text-gray-900 dark:text-white font-medium">
                        Crear contacto
                      </span>
                      <p className="text-sm text-gray-500">
                        Crea o actualiza un contacto con los datos del formulario
                      </p>
                    </div>
                  </label>

                  <label className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      checked={form.createDeal}
                      onChange={(e) => updateForm({ createDeal: e.target.checked })}
                      className="rounded"
                    />
                    <div>
                      <span className="text-gray-900 dark:text-white font-medium">
                        Crear deal
                      </span>
                      <p className="text-sm text-gray-500">
                        Crea un nuevo deal asociado al contacto
                      </p>
                    </div>
                  </label>

                  {form.createDeal && (
                    <div className="ml-8 space-y-3">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                          Pipeline
                        </label>
                        <select
                          value={form.defaultPipelineId || ''}
                          onChange={(e) =>
                            updateForm({ defaultPipelineId: e.target.value })
                          }
                          className="w-full px-3 py-2 border rounded-lg dark:bg-gray-900"
                        >
                          <option value="">Seleccionar pipeline...</option>
                          {pipelines.map((p: any) => (
                            <option key={p._id} value={p._id}>
                              {p.name}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                          Valor por defecto
                        </label>
                        <input
                          type="number"
                          value={form.defaultDealValue || ''}
                          onChange={(e) =>
                            updateForm({ defaultDealValue: parseFloat(e.target.value) })
                          }
                          placeholder="0"
                          className="w-full px-3 py-2 border rounded-lg dark:bg-gray-900"
                        />
                      </div>
                    </div>
                  )}

                  <label className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      checked={form.triggerWorkflow}
                      onChange={(e) => updateForm({ triggerWorkflow: e.target.checked })}
                      className="rounded"
                    />
                    <div>
                      <span className="text-gray-900 dark:text-white font-medium">
                        Disparar workflows
                      </span>
                      <p className="text-sm text-gray-500">
                        Ejecuta workflows configurados para "contacto creado"
                      </p>
                    </div>
                  </label>
                </div>
              </div>

              {/* Asignación */}
              <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                  <Users size={20} />
                  Asignación
                </h3>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Tipo de asignación
                    </label>
                    <select
                      value={form.assignmentType}
                      onChange={(e) =>
                        updateForm({
                          assignmentType: e.target.value as 'specific' | 'round_robin',
                        })
                      }
                      className="w-full px-3 py-2 border rounded-lg dark:bg-gray-900"
                    >
                      <option value="specific">Usuario específico</option>
                      <option value="round_robin">Round Robin (distribuir)</option>
                    </select>
                  </div>

                  {form.assignmentType === 'specific' && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Asignar a
                      </label>
                      <select
                        value={form.assignToUserId || ''}
                        onChange={(e) => updateForm({ assignToUserId: e.target.value })}
                        className="w-full px-3 py-2 border rounded-lg dark:bg-gray-900"
                      >
                        <option value="">Sin asignar</option>
                        {users.map((u: any) => (
                          <option key={u._id} value={u._id}>
                            {u.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Tags a agregar (separados por coma)
                    </label>
                    <input
                      type="text"
                      value={form.addTags?.join(', ') || ''}
                      onChange={(e) =>
                        updateForm({
                          addTags: e.target.value
                            .split(',')
                            .map((t) => t.trim())
                            .filter(Boolean),
                        })
                      }
                      placeholder="lead, webform, marketing"
                      className="w-full px-3 py-2 border rounded-lg dark:bg-gray-900"
                    />
                  </div>
                </div>
              </div>

              {/* Notificaciones */}
              <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                  <Bell size={20} />
                  Notificaciones
                </h3>

                <div className="space-y-4">
                  <label className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      checked={form.notifyOnSubmission}
                      onChange={(e) =>
                        updateForm({ notifyOnSubmission: e.target.checked })
                      }
                      className="rounded"
                    />
                    <div>
                      <span className="text-gray-900 dark:text-white font-medium">
                        Notificar al recibir
                      </span>
                      <p className="text-sm text-gray-500">
                        Envía notificación al usuario asignado
                      </p>
                    </div>
                  </label>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Emails adicionales (uno por línea)
                    </label>
                    <textarea
                      value={form.notifyEmails?.join('\n') || ''}
                      onChange={(e) =>
                        updateForm({
                          notifyEmails: e.target.value.split('\n').filter(Boolean),
                        })
                      }
                      placeholder="ventas@empresa.com"
                      className="w-full px-3 py-2 border rounded-lg dark:bg-gray-900"
                      rows={3}
                    />
                  </div>
                </div>
              </div>

              {/* Seguridad */}
              <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                  <Globe size={20} />
                  Seguridad
                </h3>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Dominios permitidos (uno por línea, vacío = todos)
                    </label>
                    <textarea
                      value={form.allowedDomains?.join('\n') || ''}
                      onChange={(e) =>
                        updateForm({
                          allowedDomains: e.target.value.split('\n').filter(Boolean),
                        })
                      }
                      placeholder="miempresa.com&#10;*.miempresa.com"
                      className="w-full px-3 py-2 border rounded-lg dark:bg-gray-900"
                      rows={3}
                    />
                  </div>

                  <label className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      checked={form.captchaEnabled}
                      onChange={(e) => updateForm({ captchaEnabled: e.target.checked })}
                      className="rounded"
                    />
                    <div>
                      <span className="text-gray-900 dark:text-white font-medium">
                        Habilitar CAPTCHA
                      </span>
                      <p className="text-sm text-gray-500">
                        Protege contra spam (requiere configuración)
                      </p>
                    </div>
                  </label>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'embed' && (
          <div className="flex-1 p-8 overflow-y-auto">
            <div className="max-w-3xl mx-auto space-y-6">
              {!form.isPublished && (
                <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl p-4 flex items-center gap-3">
                  <EyeOff className="text-amber-600" size={24} />
                  <div>
                    <p className="font-medium text-amber-800 dark:text-amber-200">
                      Formulario no publicado
                    </p>
                    <p className="text-sm text-amber-600 dark:text-amber-400">
                      Publica el formulario para obtener el código de embed funcional
                    </p>
                  </div>
                  <button
                    onClick={togglePublish}
                    className="ml-auto px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700"
                  >
                    Publicar
                  </button>
                </div>
              )}

              {/* URL Directa */}
              <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
                <h3 className="font-semibold text-gray-900 dark:text-white mb-2">
                  URL Directa
                </h3>
                <p className="text-sm text-gray-500 mb-4">
                  Comparte esta URL para que los usuarios accedan directamente al formulario
                </p>
                <div className="flex gap-2">
                  <input
                    type="text"
                    readOnly
                    value={embedCodes?.urls?.direct || `${window.location.origin}/forms/${form.formKey}`}
                    className="flex-1 px-3 py-2 bg-gray-50 dark:bg-gray-900 border rounded-lg text-sm"
                  />
                  <button
                    onClick={() =>
                      copyToClipboard(
                        embedCodes?.urls?.direct || `${window.location.origin}/forms/${form.formKey}`,
                        'url'
                      )
                    }
                    className="px-4 py-2 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600"
                  >
                    {copiedEmbed === 'url' ? <Check size={18} /> : <Copy size={18} />}
                  </button>
                </div>
              </div>

              {/* Iframe */}
              <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
                <h3 className="font-semibold text-gray-900 dark:text-white mb-2">
                  Iframe (Recomendado)
                </h3>
                <p className="text-sm text-gray-500 mb-4">
                  Pega este código en tu sitio web donde quieras mostrar el formulario
                </p>
                <div className="relative">
                  <pre className="p-4 bg-gray-900 text-gray-100 rounded-lg text-sm overflow-x-auto">
                    {embedCodes?.embedCodes?.iframe ||
                      `<iframe src="${window.location.origin}/embed/forms/${form.formKey}" width="100%" height="500" frameborder="0"></iframe>`}
                  </pre>
                  <button
                    onClick={() =>
                      copyToClipboard(embedCodes?.embedCodes?.iframe || '', 'iframe')
                    }
                    className="absolute top-2 right-2 p-2 bg-gray-700 rounded hover:bg-gray-600"
                  >
                    {copiedEmbed === 'iframe' ? (
                      <Check size={16} className="text-green-400" />
                    ) : (
                      <Copy size={16} className="text-gray-300" />
                    )}
                  </button>
                </div>
              </div>

              {/* JavaScript Widget */}
              <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
                <h3 className="font-semibold text-gray-900 dark:text-white mb-2">
                  JavaScript Widget
                </h3>
                <p className="text-sm text-gray-500 mb-4">
                  Carga el formulario como un widget que se adapta al contenedor
                </p>
                <div className="relative">
                  <pre className="p-4 bg-gray-900 text-gray-100 rounded-lg text-sm overflow-x-auto">
                    {embedCodes?.embedCodes?.javascript || '<!-- Cargando... -->'}
                  </pre>
                  <button
                    onClick={() =>
                      copyToClipboard(embedCodes?.embedCodes?.javascript || '', 'js')
                    }
                    className="absolute top-2 right-2 p-2 bg-gray-700 rounded hover:bg-gray-600"
                  >
                    {copiedEmbed === 'js' ? (
                      <Check size={16} className="text-green-400" />
                    ) : (
                      <Copy size={16} className="text-gray-300" />
                    )}
                  </button>
                </div>
              </div>

              {/* Popup */}
              <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
                <h3 className="font-semibold text-gray-900 dark:text-white mb-2">
                  Botón Popup
                </h3>
                <p className="text-sm text-gray-500 mb-4">
                  Agrega un botón flotante que abre el formulario en un modal
                </p>
                <div className="relative">
                  <pre className="p-4 bg-gray-900 text-gray-100 rounded-lg text-sm overflow-x-auto max-h-48">
                    {embedCodes?.embedCodes?.popup || '<!-- Cargando... -->'}
                  </pre>
                  <button
                    onClick={() =>
                      copyToClipboard(embedCodes?.embedCodes?.popup || '', 'popup')
                    }
                    className="absolute top-2 right-2 p-2 bg-gray-700 rounded hover:bg-gray-600"
                  >
                    {copiedEmbed === 'popup' ? (
                      <Check size={16} className="text-green-400" />
                    ) : (
                      <Copy size={16} className="text-gray-300" />
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'submissions' && (
          <div className="flex-1 p-8 overflow-y-auto">
            <SubmissionsPanel formId={formId} />
          </div>
        )}
      </div>
    </div>
  );
}

// Submissions Panel Component
function SubmissionsPanel({ formId }: { formId: string }) {
  const [submissions, setSubmissions] = useState<any[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState<any>(null);

  useEffect(() => {
    fetchSubmissions();
    fetchStats();
  }, [formId, page]);

  const fetchSubmissions = async () => {
    try {
      const res = await fetch(
        `/api/crm/web-forms/${formId}/submissions?page=${page}&limit=20`
      );
      if (res.ok) {
        const data = await res.json();
        setSubmissions(data.submissions);
        setPagination(data.pagination);
      }
    } catch (error) {
      console.error('Error fetching submissions:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const res = await fetch(`/api/crm/web-forms/${formId}/stats`);
      if (res.ok) {
        const data = await res.json();
        setStats(data);
      }
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border">
            <p className="text-2xl font-bold text-gray-900 dark:text-white">
              {stats.stats.totalSubmissions}
            </p>
            <p className="text-sm text-gray-500">Total Submissions</p>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border">
            <p className="text-2xl font-bold text-gray-900 dark:text-white">
              {stats.stats.periodSubmissions}
            </p>
            <p className="text-sm text-gray-500">Últimos 30 días</p>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border">
            <p className="text-2xl font-bold text-gray-900 dark:text-white">
              {stats.stats.contactsCreated}
            </p>
            <p className="text-sm text-gray-500">Contactos Creados</p>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border">
            <p className="text-2xl font-bold text-green-600">
              {stats.stats.conversionRate}%
            </p>
            <p className="text-sm text-gray-500">Tasa de Conversión</p>
          </div>
        </div>
      )}

      {/* Submissions Table */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50 dark:bg-gray-900">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Fecha
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Datos
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Estado
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Contacto
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Fuente
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
            {submissions.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-gray-500">
                  No hay submissions aún
                </td>
              </tr>
            ) : (
              submissions.map((sub) => (
                <tr key={sub._id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                  <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">
                    {new Date(sub.submittedAt).toLocaleString('es-ES')}
                  </td>
                  <td className="px-4 py-3">
                    <div className="text-sm">
                      {Object.entries(sub.data || {})
                        .slice(0, 2)
                        .map(([key, value]) => (
                          <div key={key} className="text-gray-600 dark:text-gray-400">
                            <span className="font-medium">{key}:</span>{' '}
                            {String(value).substring(0, 30)}
                          </div>
                        ))}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${
                        sub.status === 'processed'
                          ? 'bg-green-100 text-green-700'
                          : sub.status === 'failed'
                          ? 'bg-red-100 text-red-700'
                          : 'bg-yellow-100 text-yellow-700'
                      }`}
                    >
                      {sub.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm">
                    {sub.contactId ? (
                      <Link
                        href={`/crm/contacts/${sub.contactId._id}`}
                        className="text-blue-600 hover:underline"
                      >
                        {sub.contactId.firstName} {sub.contactId.lastName}
                      </Link>
                    ) : (
                      <span className="text-gray-400">-</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-500">
                    {sub.utmSource || sub.referrer?.substring(0, 30) || '-'}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>

        {/* Pagination */}
        {pagination && pagination.pages > 1 && (
          <div className="px-4 py-3 border-t flex items-center justify-between">
            <p className="text-sm text-gray-500">
              Mostrando {(page - 1) * 20 + 1} - {Math.min(page * 20, pagination.total)} de{' '}
              {pagination.total}
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setPage(page - 1)}
                disabled={page === 1}
                className="px-3 py-1 rounded border disabled:opacity-50"
              >
                Anterior
              </button>
              <button
                onClick={() => setPage(page + 1)}
                disabled={page === pagination.pages}
                className="px-3 py-1 rounded border disabled:opacity-50"
              >
                Siguiente
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
