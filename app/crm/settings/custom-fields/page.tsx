'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Navbar from '@/components/Navbar';
import {
  Settings,
  Plus,
  Trash2,
  Edit,
  Save,
  X,
  GripVertical,
  ChevronDown,
  ChevronUp,
  Type,
  Hash,
  Calendar,
  ToggleLeft,
  List,
  Link,
  Mail,
  Phone,
  DollarSign,
  Building2,
  UserCircle,
  Briefcase,
  Package,
  RefreshCw,
  Eye,
  EyeOff,
  AlertCircle,
  Calculator,
  HelpCircle,
} from 'lucide-react';
import CrmHelpCard from '@/components/crm/CrmHelpCard';

type FieldType = 'text' | 'number' | 'date' | 'boolean' | 'select' | 'multiselect' | 'url' | 'email' | 'phone' | 'currency' | 'formula';
type EntityType = 'client' | 'contact' | 'deal' | 'product';

interface SelectOption {
  value: string;
  label: string;
  color?: string;
}

interface CustomField {
  _id: string;
  name: string;
  label: string;
  description?: string;
  fieldType: FieldType;
  entityType: EntityType;
  options?: SelectOption[];
  defaultValue?: any;
  placeholder?: string;
  required: boolean;
  minLength?: number;
  maxLength?: number;
  minValue?: number;
  maxValue?: number;
  currencyCode?: string;
  // Formula fields
  formula?: string;
  referencedFields?: string[];
  decimalPlaces?: number;
  formulaPrefix?: string;
  formulaSuffix?: string;
  // UI
  order: number;
  showInList: boolean;
  showInCard: boolean;
  section?: string;
  isActive: boolean;
  createdBy: { name: string };
}

const FIELD_TYPE_CONFIG: Record<FieldType, { icon: any; label: string; color: string }> = {
  text: { icon: Type, label: 'Texto', color: 'blue' },
  number: { icon: Hash, label: 'Número', color: 'green' },
  date: { icon: Calendar, label: 'Fecha', color: 'purple' },
  boolean: { icon: ToggleLeft, label: 'Sí/No', color: 'yellow' },
  select: { icon: List, label: 'Lista', color: 'indigo' },
  multiselect: { icon: List, label: 'Múltiple', color: 'pink' },
  url: { icon: Link, label: 'URL', color: 'cyan' },
  email: { icon: Mail, label: 'Email', color: 'red' },
  phone: { icon: Phone, label: 'Teléfono', color: 'teal' },
  currency: { icon: DollarSign, label: 'Moneda', color: 'emerald' },
  formula: { icon: Calculator, label: 'Fórmula', color: 'violet' },
};

const ENTITY_CONFIG: Record<EntityType, { icon: any; label: string; color: string }> = {
  client: { icon: Building2, label: 'Clientes', color: 'blue' },
  contact: { icon: UserCircle, label: 'Contactos', color: 'green' },
  deal: { icon: Briefcase, label: 'Deals', color: 'purple' },
  product: { icon: Package, label: 'Productos', color: 'orange' },
};

const CURRENCY_OPTIONS = [
  { value: 'MXN', label: 'Peso Mexicano (MXN)' },
  { value: 'USD', label: 'Dólar (USD)' },
  { value: 'EUR', label: 'Euro (EUR)' },
];

export default function CustomFieldsPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const [fields, setFields] = useState<CustomField[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedEntity, setSelectedEntity] = useState<EntityType>('client');
  const [showModal, setShowModal] = useState(false);
  const [editingField, setEditingField] = useState<CustomField | null>(null);
  const [saving, setSaving] = useState(false);

  const user = session?.user as any;
  const isAdmin = user?.role === 'ADMIN';

  useEffect(() => {
    fetchFields();
  }, []);

  const fetchFields = async () => {
    try {
      const res = await fetch('/api/crm/custom-fields?includeInactive=true');
      if (res.ok) {
        const data = await res.json();
        setFields(data);
      }
    } catch (error) {
      console.error('Error fetching fields:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveField = async (fieldData: Partial<CustomField>) => {
    setSaving(true);
    try {
      const url = editingField
        ? `/api/crm/custom-fields/${editingField._id}`
        : '/api/crm/custom-fields';
      const method = editingField ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(fieldData),
      });

      if (res.ok) {
        fetchFields();
        setShowModal(false);
        setEditingField(null);
      } else {
        const error = await res.json();
        alert(error.error);
      }
    } catch (error) {
      console.error('Error saving field:', error);
      alert('Error al guardar');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteField = async (id: string) => {
    if (!confirm('¿Desactivar este campo? Los datos existentes se conservarán.')) return;

    try {
      const res = await fetch(`/api/crm/custom-fields/${id}`, { method: 'DELETE' });
      if (res.ok) {
        fetchFields();
      }
    } catch (error) {
      console.error('Error deleting field:', error);
    }
  };

  const handleToggleActive = async (field: CustomField) => {
    try {
      const res = await fetch(`/api/crm/custom-fields/${field._id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !field.isActive }),
      });

      if (res.ok) {
        fetchFields();
      }
    } catch (error) {
      console.error('Error toggling field:', error);
    }
  };

  const filteredFields = fields.filter(f => f.entityType === selectedEntity);
  const activeFields = filteredFields.filter(f => f.isActive);
  const inactiveFields = filteredFields.filter(f => !f.isActive);

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <Navbar />
        <div className="pt-16 main-content p-8 flex items-center justify-center">
          <div className="text-center">
            <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Acceso Denegado</h2>
            <p className="text-gray-600 dark:text-gray-400 mt-2">Solo administradores pueden gestionar campos personalizados</p>
          </div>
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
          <div className="flex justify-between items-center mb-6">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                <Settings className="w-7 h-7 text-gray-600" />
                Campos Personalizados
              </h1>
              <p className="text-gray-600 dark:text-gray-400 mt-1">
                Define campos adicionales para tus entidades del CRM
              </p>
            </div>
            <button
              onClick={() => {
                setEditingField(null);
                setShowModal(true);
              }}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              <Plus className="w-4 h-4" />
              Nuevo Campo
            </button>
          </div>

          {/* Help Card */}
          <CrmHelpCard
            id="crm-custom-fields-guide"
            title="Personaliza tu CRM con campos adicionales"
            variant="guide"
            className="mb-6"
            defaultCollapsed={true}
            steps={[
              { title: 'Selecciona la entidad', description: 'Elige dónde agregar el campo: Clientes, Contactos, Deals o Productos' },
              { title: 'Define el tipo de campo', description: 'Texto, número, fecha, lista desplegable, moneda, fórmula, etc.' },
              { title: 'Configura opciones', description: 'Campo requerido, valores por defecto, visibilidad en listados' },
            ]}
          />

          {/* Entity Tabs */}
          <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
            {(Object.entries(ENTITY_CONFIG) as [EntityType, typeof ENTITY_CONFIG[EntityType]][]).map(([entity, config]) => {
              const Icon = config.icon;
              const count = fields.filter(f => f.entityType === entity && f.isActive).length;
              return (
                <button
                  key={entity}
                  onClick={() => setSelectedEntity(entity)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg whitespace-nowrap transition-colors ${
                    selectedEntity === entity
                      ? `bg-${config.color}-100 dark:bg-${config.color}-900/30 text-${config.color}-700 dark:text-${config.color}-400 border-2 border-${config.color}-500`
                      : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-750'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {config.label}
                  <span className={`px-2 py-0.5 text-xs rounded-full ${
                    selectedEntity === entity
                      ? `bg-${config.color}-200 dark:bg-${config.color}-800`
                      : 'bg-gray-200 dark:bg-gray-700'
                  }`}>
                    {count}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Fields List */}
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Active Fields */}
              <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
                <div className="p-4 border-b border-gray-200 dark:border-gray-700">
                  <h3 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                    <Eye className="w-4 h-4 text-green-500" />
                    Campos Activos ({activeFields.length})
                  </h3>
                </div>
                <div className="divide-y divide-gray-200 dark:divide-gray-700">
                  {activeFields.length === 0 ? (
                    <div className="p-8 text-center text-gray-500">
                      No hay campos activos para {ENTITY_CONFIG[selectedEntity].label}
                    </div>
                  ) : (
                    activeFields.map((field) => (
                      <FieldRow
                        key={field._id}
                        field={field}
                        onEdit={() => {
                          setEditingField(field);
                          setShowModal(true);
                        }}
                        onToggle={() => handleToggleActive(field)}
                        onDelete={() => handleDeleteField(field._id)}
                      />
                    ))
                  )}
                </div>
              </div>

              {/* Inactive Fields */}
              {inactiveFields.length > 0 && (
                <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 opacity-75">
                  <div className="p-4 border-b border-gray-200 dark:border-gray-700">
                    <h3 className="font-semibold text-gray-500 flex items-center gap-2">
                      <EyeOff className="w-4 h-4" />
                      Campos Inactivos ({inactiveFields.length})
                    </h3>
                  </div>
                  <div className="divide-y divide-gray-200 dark:divide-gray-700">
                    {inactiveFields.map((field) => (
                      <FieldRow
                        key={field._id}
                        field={field}
                        onEdit={() => {
                          setEditingField(field);
                          setShowModal(true);
                        }}
                        onToggle={() => handleToggleActive(field)}
                        onDelete={() => {}}
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Modal */}
      {showModal && (
        <FieldModal
          field={editingField}
          entityType={selectedEntity}
          saving={saving}
          onSave={handleSaveField}
          onClose={() => {
            setShowModal(false);
            setEditingField(null);
          }}
        />
      )}
    </div>
  );
}

// Field Row Component
function FieldRow({
  field,
  onEdit,
  onToggle,
  onDelete,
}: {
  field: CustomField;
  onEdit: () => void;
  onToggle: () => void;
  onDelete: () => void;
}) {
  const typeConfig = FIELD_TYPE_CONFIG[field.fieldType];
  const Icon = typeConfig.icon;

  return (
    <div className="p-4 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-750">
      <div className="flex items-center gap-4">
        <div className={`p-2 rounded-lg bg-${typeConfig.color}-100 dark:bg-${typeConfig.color}-900/30`}>
          <Icon className={`w-4 h-4 text-${typeConfig.color}-600 dark:text-${typeConfig.color}-400`} />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <span className="font-medium text-gray-900 dark:text-white">{field.label}</span>
            <code className="px-1.5 py-0.5 text-xs bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 rounded">
              {field.name}
            </code>
            {field.required && (
              <span className="px-1.5 py-0.5 text-xs bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded">
                Requerido
              </span>
            )}
          </div>
          <div className="flex items-center gap-3 mt-1 text-sm text-gray-500">
            <span>{typeConfig.label}</span>
            {field.fieldType === 'formula' && field.formula && (
              <code className="text-xs bg-violet-100 dark:bg-violet-900/30 text-violet-700 dark:text-violet-300 px-1.5 py-0.5 rounded">
                {field.formula.length > 30 ? field.formula.substring(0, 30) + '...' : field.formula}
              </code>
            )}
            {field.showInList && <span className="text-blue-500">• En listado</span>}
            {field.showInCard && <span className="text-green-500">• En tarjeta</span>}
          </div>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <button
          onClick={onToggle}
          className={`p-2 rounded-lg ${
            field.isActive
              ? 'text-yellow-600 hover:bg-yellow-50 dark:hover:bg-yellow-900/20'
              : 'text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20'
          }`}
          title={field.isActive ? 'Desactivar' : 'Activar'}
        >
          {field.isActive ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
        </button>
        <button
          onClick={onEdit}
          className="p-2 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg"
          title="Editar"
        >
          <Edit className="w-4 h-4" />
        </button>
        {field.isActive && (
          <button
            onClick={onDelete}
            className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg"
            title="Desactivar"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  );
}

// Field Modal Component
function FieldModal({
  field,
  entityType,
  saving,
  onSave,
  onClose,
}: {
  field: CustomField | null;
  entityType: EntityType;
  saving: boolean;
  onSave: (data: Partial<CustomField>) => void;
  onClose: () => void;
}) {
  const [form, setForm] = useState({
    name: field?.name || '',
    label: field?.label || '',
    description: field?.description || '',
    fieldType: field?.fieldType || 'text' as FieldType,
    entityType: field?.entityType || entityType,
    options: field?.options || [] as SelectOption[],
    defaultValue: field?.defaultValue || '',
    placeholder: field?.placeholder || '',
    required: field?.required || false,
    minLength: field?.minLength || undefined,
    maxLength: field?.maxLength || undefined,
    minValue: field?.minValue || undefined,
    maxValue: field?.maxValue || undefined,
    currencyCode: field?.currencyCode || 'MXN',
    // Formula fields
    formula: field?.formula || '',
    decimalPlaces: field?.decimalPlaces ?? 2,
    formulaPrefix: field?.formulaPrefix || '',
    formulaSuffix: field?.formulaSuffix || '',
    // UI
    showInList: field?.showInList || false,
    showInCard: field?.showInCard ?? true,
    section: field?.section || '',
  });

  const [newOption, setNewOption] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Generar name desde label si es nuevo campo
    const data = {
      ...form,
      name: field ? form.name : form.label.toLowerCase()
        .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]+/g, '_')
        .replace(/^_|_$/g, ''),
    };

    // Limpiar campos no aplicables según tipo
    if (!['select', 'multiselect'].includes(data.fieldType)) {
      data.options = undefined as any;
    }
    if (data.fieldType !== 'currency') {
      data.currencyCode = undefined as any;
    }
    if (!['text', 'url', 'email', 'phone'].includes(data.fieldType)) {
      data.minLength = undefined;
      data.maxLength = undefined;
    }
    if (!['number', 'currency'].includes(data.fieldType)) {
      data.minValue = undefined;
      data.maxValue = undefined;
    }
    // Limpiar campos de fórmula si no es tipo fórmula
    if (data.fieldType !== 'formula') {
      data.formula = undefined as any;
      data.decimalPlaces = undefined as any;
      data.formulaPrefix = undefined as any;
      data.formulaSuffix = undefined as any;
    }
    // Los campos de fórmula no pueden ser requeridos (se calculan automáticamente)
    if (data.fieldType === 'formula') {
      data.required = false;
    }

    onSave(data);
  };

  const addOption = () => {
    if (!newOption.trim()) return;
    const value = newOption.toLowerCase().replace(/[^a-z0-9]+/g, '_');
    setForm({
      ...form,
      options: [...form.options, { value, label: newOption.trim() }],
    });
    setNewOption('');
  };

  const removeOption = (value: string) => {
    setForm({
      ...form,
      options: form.options.filter(o => o.value !== value),
    });
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-gray-800 rounded-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white dark:bg-gray-800 p-6 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">
            {field ? 'Editar Campo' : 'Nuevo Campo'}
          </h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            <X className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Básico */}
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Etiqueta *
              </label>
              <input
                type="text"
                value={form.label}
                onChange={(e) => setForm({ ...form, label: e.target.value })}
                required
                placeholder="Ej: Número de empleados"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Tipo de campo *
              </label>
              <select
                value={form.fieldType}
                onChange={(e) => setForm({ ...form, fieldType: e.target.value as FieldType })}
                disabled={!!field}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white disabled:opacity-50"
              >
                {Object.entries(FIELD_TYPE_CONFIG).map(([value, config]) => (
                  <option key={value} value={value}>{config.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Entidad *
              </label>
              <select
                value={form.entityType}
                onChange={(e) => setForm({ ...form, entityType: e.target.value as EntityType })}
                disabled={!!field}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white disabled:opacity-50"
              >
                {Object.entries(ENTITY_CONFIG).map(([value, config]) => (
                  <option key={value} value={value}>{config.label}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Descripción
            </label>
            <input
              type="text"
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder="Descripción opcional del campo"
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            />
          </div>

          {/* Opciones para Select/Multiselect */}
          {['select', 'multiselect'].includes(form.fieldType) && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Opciones *
              </label>
              <div className="space-y-2">
                {form.options.map((option) => (
                  <div key={option.value} className="flex items-center gap-2">
                    <input
                      type="text"
                      value={option.label}
                      readOnly
                      className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700"
                    />
                    <button
                      type="button"
                      onClick={() => removeOption(option.value)}
                      className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ))}
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={newOption}
                    onChange={(e) => setNewOption(e.target.value)}
                    placeholder="Nueva opción"
                    onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addOption())}
                    className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700"
                  />
                  <button
                    type="button"
                    onClick={addOption}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                  >
                    Agregar
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Moneda */}
          {form.fieldType === 'currency' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Moneda
              </label>
              <select
                value={form.currencyCode}
                onChange={(e) => setForm({ ...form, currencyCode: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700"
              >
                {CURRENCY_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>
          )}

          {/* Fórmula */}
          {form.fieldType === 'formula' && (
            <div className="space-y-4 p-4 bg-violet-50 dark:bg-violet-900/20 rounded-lg border border-violet-200 dark:border-violet-800">
              <div className="flex items-center gap-2 text-violet-700 dark:text-violet-300">
                <Calculator className="w-5 h-5" />
                <h4 className="font-medium">Configuración de Fórmula</h4>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Fórmula *
                </label>
                <textarea
                  value={form.formula}
                  onChange={(e) => setForm({ ...form, formula: e.target.value })}
                  placeholder="Ej: value * 0.05 o price * quantity * (1 - discount / 100)"
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white font-mono text-sm"
                />
                <div className="mt-2 p-3 bg-white dark:bg-gray-800 rounded border border-violet-200 dark:border-violet-700">
                  <div className="flex items-start gap-2">
                    <HelpCircle className="w-4 h-4 text-violet-500 mt-0.5 flex-shrink-0" />
                    <div className="text-xs text-gray-600 dark:text-gray-400 space-y-1">
                      <p><strong>Variables disponibles:</strong></p>
                      <p>• <code className="bg-gray-100 dark:bg-gray-700 px-1 rounded">value</code> - Valor del deal</p>
                      <p>• <code className="bg-gray-100 dark:bg-gray-700 px-1 rounded">probability</code> - Probabilidad del deal</p>
                      <p>• <code className="bg-gray-100 dark:bg-gray-700 px-1 rounded">quantity</code> - Cantidad del producto</p>
                      <p>• <code className="bg-gray-100 dark:bg-gray-700 px-1 rounded">price</code> - Precio del producto</p>
                      <p>• <code className="bg-gray-100 dark:bg-gray-700 px-1 rounded">discount</code> - Descuento</p>
                      <p>• También puedes usar otros campos personalizados por su nombre</p>
                      <p className="mt-2"><strong>Funciones:</strong> SUM, AVERAGE, MAX, MIN, IF, ROUND, ABS, SQRT, POWER</p>
                      <p><strong>Ejemplos:</strong></p>
                      <p>• <code className="bg-gray-100 dark:bg-gray-700 px-1 rounded">value * 0.05</code> → Comisión del 5%</p>
                      <p>• <code className="bg-gray-100 dark:bg-gray-700 px-1 rounded">price * quantity</code> → Subtotal</p>
                      <p>• <code className="bg-gray-100 dark:bg-gray-700 px-1 rounded">IF(value &gt; 10000, value * 0.1, value * 0.05)</code> → Comisión escalonada</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Decimales
                  </label>
                  <input
                    type="number"
                    value={form.decimalPlaces}
                    onChange={(e) => setForm({ ...form, decimalPlaces: parseInt(e.target.value) || 0 })}
                    min="0"
                    max="6"
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Prefijo
                  </label>
                  <input
                    type="text"
                    value={form.formulaPrefix}
                    onChange={(e) => setForm({ ...form, formulaPrefix: e.target.value })}
                    placeholder="$"
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Sufijo
                  </label>
                  <input
                    type="text"
                    value={form.formulaSuffix}
                    onChange={(e) => setForm({ ...form, formulaSuffix: e.target.value })}
                    placeholder="%"
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Validación */}
          <div className="space-y-3">
            {form.fieldType !== 'formula' && (
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={form.required}
                  onChange={(e) => setForm({ ...form, required: e.target.checked })}
                  className="rounded"
                />
                <span className="text-sm text-gray-700 dark:text-gray-300">Campo requerido</span>
              </label>
            )}
            {form.fieldType === 'formula' && (
              <p className="text-sm text-gray-500 dark:text-gray-400 italic">
                Los campos de fórmula se calculan automáticamente
              </p>
            )}

            {['text', 'url', 'email', 'phone'].includes(form.fieldType) && (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-gray-600 dark:text-gray-400 mb-1">
                    Longitud mínima
                  </label>
                  <input
                    type="number"
                    value={form.minLength || ''}
                    onChange={(e) => setForm({ ...form, minLength: e.target.value ? parseInt(e.target.value) : undefined })}
                    min="0"
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-600 dark:text-gray-400 mb-1">
                    Longitud máxima
                  </label>
                  <input
                    type="number"
                    value={form.maxLength || ''}
                    onChange={(e) => setForm({ ...form, maxLength: e.target.value ? parseInt(e.target.value) : undefined })}
                    min="0"
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700"
                  />
                </div>
              </div>
            )}

            {['number', 'currency'].includes(form.fieldType) && (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-gray-600 dark:text-gray-400 mb-1">
                    Valor mínimo
                  </label>
                  <input
                    type="number"
                    value={form.minValue || ''}
                    onChange={(e) => setForm({ ...form, minValue: e.target.value ? parseFloat(e.target.value) : undefined })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-600 dark:text-gray-400 mb-1">
                    Valor máximo
                  </label>
                  <input
                    type="number"
                    value={form.maxValue || ''}
                    onChange={(e) => setForm({ ...form, maxValue: e.target.value ? parseFloat(e.target.value) : undefined })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Visibilidad */}
          <div className="space-y-3">
            <h4 className="font-medium text-gray-900 dark:text-white">Visibilidad</h4>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={form.showInList}
                onChange={(e) => setForm({ ...form, showInList: e.target.checked })}
                className="rounded"
              />
              <span className="text-sm text-gray-700 dark:text-gray-300">Mostrar en listado</span>
            </label>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={form.showInCard}
                onChange={(e) => setForm({ ...form, showInCard: e.target.checked })}
                className="rounded"
              />
              <span className="text-sm text-gray-700 dark:text-gray-300">Mostrar en tarjeta/detalle</span>
            </label>
          </div>

          {/* Placeholder */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Placeholder
            </label>
            <input
              type="text"
              value={form.placeholder}
              onChange={(e) => setForm({ ...form, placeholder: e.target.value })}
              placeholder="Texto de ayuda en el campo"
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700"
            />
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={
                saving ||
                (['select', 'multiselect'].includes(form.fieldType) && form.options.length === 0) ||
                (form.fieldType === 'formula' && !form.formula.trim())
              }
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
            >
              {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              {saving ? 'Guardando...' : 'Guardar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
