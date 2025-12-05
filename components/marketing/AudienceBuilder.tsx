'use client';

import { useState, useCallback } from 'react';
import {
  Plus,
  Trash2,
  GripVertical,
  Users,
  MapPin,
  Briefcase,
  Building2,
  Target,
  Tag,
  ChevronDown,
  X,
  Save,
  Copy,
} from 'lucide-react';

// Types
export type ConditionOperator = 'AND' | 'OR';
export type ConditionType =
  | 'location'
  | 'age'
  | 'gender'
  | 'interest'
  | 'behavior'
  | 'industry'
  | 'job_title'
  | 'company_size'
  | 'skill'
  | 'custom_audience'
  | 'lookalike'
  | 'crm_client'
  | 'crm_contact'
  | 'crm_deal_stage';

export type ConditionComparator =
  | 'equals'
  | 'not_equals'
  | 'contains'
  | 'not_contains'
  | 'greater_than'
  | 'less_than'
  | 'between'
  | 'in_list'
  | 'not_in_list';

export interface ICondition {
  id: string;
  type: ConditionType;
  comparator: ConditionComparator;
  value: string | number | string[] | { min: number; max: number };
  label?: string;
}

export interface IConditionGroup {
  id: string;
  operator: ConditionOperator;
  conditions: ICondition[];
}

export interface IAudienceRules {
  operator: ConditionOperator;
  groups: IConditionGroup[];
}

// Condition type configurations
const CONDITION_TYPES: {
  id: ConditionType;
  label: string;
  icon: typeof Users;
  category: string;
  comparators: ConditionComparator[];
  valueType: 'text' | 'number' | 'range' | 'select' | 'multi-select';
  options?: { value: string; label: string }[];
  placeholder?: string;
}[] = [
  {
    id: 'location',
    label: 'Ubicación',
    icon: MapPin,
    category: 'Demografía',
    comparators: ['in_list', 'not_in_list'],
    valueType: 'multi-select',
    placeholder: 'Ej: México, CDMX, Monterrey',
  },
  {
    id: 'age',
    label: 'Edad',
    icon: Users,
    category: 'Demografía',
    comparators: ['between'],
    valueType: 'range',
  },
  {
    id: 'gender',
    label: 'Género',
    icon: Users,
    category: 'Demografía',
    comparators: ['in_list'],
    valueType: 'select',
    options: [
      { value: 'all', label: 'Todos' },
      { value: 'male', label: 'Hombres' },
      { value: 'female', label: 'Mujeres' },
    ],
  },
  {
    id: 'interest',
    label: 'Intereses',
    icon: Target,
    category: 'Intereses',
    comparators: ['in_list', 'not_in_list'],
    valueType: 'multi-select',
    placeholder: 'Ej: Tecnología, Marketing, Fitness',
  },
  {
    id: 'behavior',
    label: 'Comportamientos',
    icon: Target,
    category: 'Intereses',
    comparators: ['in_list', 'not_in_list'],
    valueType: 'multi-select',
    placeholder: 'Ej: Compradores frecuentes, Viajeros',
  },
  {
    id: 'industry',
    label: 'Industria',
    icon: Building2,
    category: 'B2B (LinkedIn)',
    comparators: ['in_list', 'not_in_list'],
    valueType: 'multi-select',
    placeholder: 'Ej: Tecnología, Finanzas, Salud',
  },
  {
    id: 'job_title',
    label: 'Cargo/Puesto',
    icon: Briefcase,
    category: 'B2B (LinkedIn)',
    comparators: ['in_list', 'not_in_list', 'contains'],
    valueType: 'multi-select',
    placeholder: 'Ej: CEO, Director de Marketing, CTO',
  },
  {
    id: 'company_size',
    label: 'Tamaño de Empresa',
    icon: Building2,
    category: 'B2B (LinkedIn)',
    comparators: ['in_list'],
    valueType: 'select',
    options: [
      { value: '1-10', label: '1-10 empleados' },
      { value: '11-50', label: '11-50 empleados' },
      { value: '51-200', label: '51-200 empleados' },
      { value: '201-500', label: '201-500 empleados' },
      { value: '501-1000', label: '501-1,000 empleados' },
      { value: '1001-5000', label: '1,001-5,000 empleados' },
      { value: '5001+', label: 'Más de 5,000 empleados' },
    ],
  },
  {
    id: 'skill',
    label: 'Habilidades',
    icon: Tag,
    category: 'B2B (LinkedIn)',
    comparators: ['in_list', 'not_in_list'],
    valueType: 'multi-select',
    placeholder: 'Ej: JavaScript, Ventas B2B, Liderazgo',
  },
  {
    id: 'crm_client',
    label: 'Clientes CRM',
    icon: Users,
    category: 'CRM',
    comparators: ['in_list', 'not_in_list'],
    valueType: 'select',
    options: [
      { value: 'all_clients', label: 'Todos los clientes' },
      { value: 'active_clients', label: 'Clientes activos' },
      { value: 'inactive_clients', label: 'Clientes inactivos' },
    ],
  },
  {
    id: 'crm_contact',
    label: 'Contactos CRM',
    icon: Users,
    category: 'CRM',
    comparators: ['in_list', 'not_in_list'],
    valueType: 'select',
    options: [
      { value: 'all_contacts', label: 'Todos los contactos' },
      { value: 'leads', label: 'Leads' },
      { value: 'qualified', label: 'Calificados' },
    ],
  },
  {
    id: 'crm_deal_stage',
    label: 'Etapa del Deal',
    icon: Target,
    category: 'CRM',
    comparators: ['in_list', 'not_in_list'],
    valueType: 'select',
    options: [
      { value: 'prospecting', label: 'Prospección' },
      { value: 'qualification', label: 'Calificación' },
      { value: 'proposal', label: 'Propuesta' },
      { value: 'negotiation', label: 'Negociación' },
      { value: 'closed_won', label: 'Ganado' },
      { value: 'closed_lost', label: 'Perdido' },
    ],
  },
];

const COMPARATOR_LABELS: Record<ConditionComparator, string> = {
  equals: 'es igual a',
  not_equals: 'no es igual a',
  contains: 'contiene',
  not_contains: 'no contiene',
  greater_than: 'mayor que',
  less_than: 'menor que',
  between: 'entre',
  in_list: 'incluye',
  not_in_list: 'excluye',
};

interface AudienceBuilderProps {
  value: IAudienceRules;
  onChange: (rules: IAudienceRules) => void;
  estimatedReach?: { min: number; max: number };
  showSaveButton?: boolean;
  onSave?: (name: string, description: string) => void;
  compact?: boolean;
}

// Generate unique ID
const generateId = () => Math.random().toString(36).substr(2, 9);

export default function AudienceBuilder({
  value,
  onChange,
  estimatedReach,
  showSaveButton = false,
  onSave,
  compact = false,
}: AudienceBuilderProps) {
  const [showConditionPicker, setShowConditionPicker] = useState<string | null>(null);
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [saveName, setSaveName] = useState('');
  const [saveDescription, setSaveDescription] = useState('');

  // Add a new group
  const addGroup = useCallback(() => {
    const newGroup: IConditionGroup = {
      id: generateId(),
      operator: 'AND',
      conditions: [],
    };
    onChange({
      ...value,
      groups: [...value.groups, newGroup],
    });
  }, [value, onChange]);

  // Remove a group
  const removeGroup = useCallback((groupId: string) => {
    onChange({
      ...value,
      groups: value.groups.filter((g) => g.id !== groupId),
    });
  }, [value, onChange]);

  // Toggle group operator
  const toggleGroupOperator = useCallback((groupId: string) => {
    onChange({
      ...value,
      groups: value.groups.map((g) =>
        g.id === groupId
          ? { ...g, operator: g.operator === 'AND' ? 'OR' : 'AND' }
          : g
      ),
    });
  }, [value, onChange]);

  // Toggle main operator
  const toggleMainOperator = useCallback(() => {
    onChange({
      ...value,
      operator: value.operator === 'AND' ? 'OR' : 'AND',
    });
  }, [value, onChange]);

  // Add condition to group
  const addCondition = useCallback((groupId: string, type: ConditionType) => {
    const conditionConfig = CONDITION_TYPES.find((c) => c.id === type);
    const defaultValue = type === 'age'
      ? { min: 18, max: 65 }
      : type === 'gender'
      ? ['all']
      : [];

    const newCondition: ICondition = {
      id: generateId(),
      type,
      comparator: conditionConfig?.comparators[0] || 'in_list',
      value: defaultValue,
      label: conditionConfig?.label,
    };

    onChange({
      ...value,
      groups: value.groups.map((g) =>
        g.id === groupId
          ? { ...g, conditions: [...g.conditions, newCondition] }
          : g
      ),
    });
    setShowConditionPicker(null);
  }, [value, onChange]);

  // Update condition
  const updateCondition = useCallback((groupId: string, conditionId: string, updates: Partial<ICondition>) => {
    onChange({
      ...value,
      groups: value.groups.map((g) =>
        g.id === groupId
          ? {
              ...g,
              conditions: g.conditions.map((c) =>
                c.id === conditionId ? { ...c, ...updates } : c
              ),
            }
          : g
      ),
    });
  }, [value, onChange]);

  // Remove condition
  const removeCondition = useCallback((groupId: string, conditionId: string) => {
    onChange({
      ...value,
      groups: value.groups.map((g) =>
        g.id === groupId
          ? { ...g, conditions: g.conditions.filter((c) => c.id !== conditionId) }
          : g
      ),
    });
  }, [value, onChange]);

  // Handle save
  const handleSave = () => {
    if (onSave && saveName) {
      onSave(saveName, saveDescription);
      setShowSaveModal(false);
      setSaveName('');
      setSaveDescription('');
    }
  };

  // Group categories for condition picker
  const groupedConditions = CONDITION_TYPES.reduce((acc, condition) => {
    if (!acc[condition.category]) {
      acc[condition.category] = [];
    }
    acc[condition.category].push(condition);
    return acc;
  }, {} as Record<string, typeof CONDITION_TYPES>);

  return (
    <div className={`${compact ? '' : 'bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700'}`}>
      {!compact && (
        <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
          <div>
            <h3 className="font-semibold text-gray-900 dark:text-white">Constructor de Audiencia</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Define las reglas de segmentación para tu audiencia
            </p>
          </div>
          {estimatedReach && (
            <div className="text-right">
              <p className="text-sm text-gray-500 dark:text-gray-400">Alcance estimado</p>
              <p className="text-lg font-semibold text-blue-600">
                {estimatedReach.min.toLocaleString()} - {estimatedReach.max.toLocaleString()}
              </p>
            </div>
          )}
        </div>
      )}

      <div className={compact ? '' : 'p-4'}>
        {/* Groups */}
        <div className="space-y-4">
          {value.groups.map((group, groupIndex) => (
            <div key={group.id}>
              {/* Group separator with operator */}
              {groupIndex > 0 && (
                <div className="flex items-center justify-center my-4">
                  <div className="flex-1 h-px bg-gray-200 dark:bg-gray-700"></div>
                  <button
                    onClick={toggleMainOperator}
                    className="mx-4 px-3 py-1 text-sm font-medium rounded-full bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                  >
                    {value.operator}
                  </button>
                  <div className="flex-1 h-px bg-gray-200 dark:bg-gray-700"></div>
                </div>
              )}

              {/* Group Card */}
              <div className="border border-gray-200 dark:border-gray-700 rounded-lg">
                {/* Group Header */}
                <div className="bg-gray-50 dark:bg-gray-700/50 px-4 py-2 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <GripVertical className="w-4 h-4 text-gray-400 cursor-move" />
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      Grupo {groupIndex + 1}
                    </span>
                    {group.conditions.length > 1 && (
                      <button
                        onClick={() => toggleGroupOperator(group.id)}
                        className="ml-2 px-2 py-0.5 text-xs font-medium rounded bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 hover:bg-blue-200 dark:hover:bg-blue-900/50"
                      >
                        {group.operator}
                      </button>
                    )}
                  </div>
                  {value.groups.length > 1 && (
                    <button
                      onClick={() => removeGroup(group.id)}
                      className="p-1 text-gray-400 hover:text-red-500 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>

                {/* Conditions */}
                <div className="p-4 space-y-3">
                  {group.conditions.map((condition, conditionIndex) => (
                    <ConditionRow
                      key={condition.id}
                      condition={condition}
                      showOperator={conditionIndex > 0}
                      groupOperator={group.operator}
                      onUpdate={(updates) => updateCondition(group.id, condition.id, updates)}
                      onRemove={() => removeCondition(group.id, condition.id)}
                    />
                  ))}

                  {/* Add Condition Button */}
                  <div className="relative">
                    <button
                      onClick={() => setShowConditionPicker(showConditionPicker === group.id ? null : group.id)}
                      className="flex items-center gap-2 px-3 py-2 text-sm text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                    >
                      <Plus className="w-4 h-4" />
                      Agregar condición
                    </button>

                    {/* Condition Picker Dropdown */}
                    {showConditionPicker === group.id && (
                      <div className="absolute bottom-full left-0 mb-2 w-72 bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 z-50 max-h-64 overflow-y-auto">
                        {Object.entries(groupedConditions).map(([category, conditions]) => (
                          <div key={category}>
                            <div className="px-3 py-2 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase bg-gray-50 dark:bg-gray-700/50">
                              {category}
                            </div>
                            {conditions.map((conditionType) => {
                              const Icon = conditionType.icon;
                              return (
                                <button
                                  key={conditionType.id}
                                  onClick={() => addCondition(group.id, conditionType.id)}
                                  className="w-full flex items-center gap-3 px-3 py-2 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                                >
                                  <Icon className="w-4 h-4 text-gray-400" />
                                  {conditionType.label}
                                </button>
                              );
                            })}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Add Group Button */}
        <button
          onClick={addGroup}
          className="mt-4 w-full flex items-center justify-center gap-2 px-4 py-3 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg text-gray-600 dark:text-gray-400 hover:border-blue-500 hover:text-blue-500 transition-colors"
        >
          <Plus className="w-5 h-5" />
          Agregar grupo de condiciones
        </button>

        {/* Actions */}
        {showSaveButton && (
          <div className="mt-4 flex justify-end gap-2">
            <button
              onClick={() => setShowSaveModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              <Save className="w-4 h-4" />
              Guardar Audiencia
            </button>
          </div>
        )}
      </div>

      {/* Save Modal */}
      {showSaveModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 w-full max-w-md shadow-xl">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Guardar Audiencia
            </h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Nombre *
                </label>
                <input
                  type="text"
                  value={saveName}
                  onChange={(e) => setSaveName(e.target.value)}
                  placeholder="Ej: Profesionales de tecnología en México"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Descripción
                </label>
                <textarea
                  value={saveDescription}
                  onChange={(e) => setSaveDescription(e.target.value)}
                  placeholder="Describe esta audiencia..."
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>
            </div>
            <div className="mt-6 flex justify-end gap-3">
              <button
                onClick={() => setShowSaveModal(false)}
                className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
              >
                Cancelar
              </button>
              <button
                onClick={handleSave}
                disabled={!saveName}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                Guardar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Click outside to close condition picker */}
      {showConditionPicker && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setShowConditionPicker(null)}
        />
      )}
    </div>
  );
}

// Condition Row Component
interface ConditionRowProps {
  condition: ICondition;
  showOperator: boolean;
  groupOperator: ConditionOperator;
  onUpdate: (updates: Partial<ICondition>) => void;
  onRemove: () => void;
}

function ConditionRow({ condition, showOperator, groupOperator, onUpdate, onRemove }: ConditionRowProps) {
  const conditionConfig = CONDITION_TYPES.find((c) => c.id === condition.type);
  const [inputValue, setInputValue] = useState('');

  if (!conditionConfig) return null;

  const Icon = conditionConfig.icon;

  const handleAddToList = () => {
    if (inputValue && Array.isArray(condition.value)) {
      onUpdate({ value: [...condition.value, inputValue] });
      setInputValue('');
    }
  };

  const handleRemoveFromList = (item: string) => {
    if (Array.isArray(condition.value)) {
      onUpdate({ value: condition.value.filter((v) => v !== item) });
    }
  };

  return (
    <div className="flex items-start gap-3 p-3 bg-gray-50 dark:bg-gray-700/30 rounded-lg">
      {showOperator && (
        <span className="px-2 py-1 text-xs font-medium text-gray-500 dark:text-gray-400 bg-gray-200 dark:bg-gray-600 rounded">
          {groupOperator}
        </span>
      )}

      <div className="flex-shrink-0 p-2 bg-white dark:bg-gray-700 rounded-lg">
        <Icon className="w-4 h-4 text-gray-500" />
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-2">
          <span className="font-medium text-sm text-gray-900 dark:text-white">
            {conditionConfig.label}
          </span>
          <select
            value={condition.comparator}
            onChange={(e) => onUpdate({ comparator: e.target.value as ConditionComparator })}
            className="text-sm px-2 py-1 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300"
          >
            {conditionConfig.comparators.map((comp) => (
              <option key={comp} value={comp}>
                {COMPARATOR_LABELS[comp]}
              </option>
            ))}
          </select>
        </div>

        {/* Value Input based on type */}
        {conditionConfig.valueType === 'range' && (
          <div className="flex items-center gap-2">
            <input
              type="number"
              value={typeof condition.value === 'object' && 'min' in condition.value ? condition.value.min : 18}
              onChange={(e) =>
                onUpdate({
                  value: {
                    min: parseInt(e.target.value) || 18,
                    max: typeof condition.value === 'object' && 'max' in condition.value ? condition.value.max : 65,
                  },
                })
              }
              className="w-20 px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              min={13}
              max={65}
            />
            <span className="text-gray-500">-</span>
            <input
              type="number"
              value={typeof condition.value === 'object' && 'max' in condition.value ? condition.value.max : 65}
              onChange={(e) =>
                onUpdate({
                  value: {
                    min: typeof condition.value === 'object' && 'min' in condition.value ? condition.value.min : 18,
                    max: parseInt(e.target.value) || 65,
                  },
                })
              }
              className="w-20 px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              min={13}
              max={65}
            />
            <span className="text-sm text-gray-500">años</span>
          </div>
        )}

        {conditionConfig.valueType === 'select' && conditionConfig.options && (
          <select
            value={Array.isArray(condition.value) ? condition.value[0] : condition.value as string}
            onChange={(e) => onUpdate({ value: [e.target.value] })}
            className="w-full px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          >
            {conditionConfig.options.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        )}

        {conditionConfig.valueType === 'multi-select' && (
          <div>
            <div className="flex flex-wrap gap-1 mb-2">
              {Array.isArray(condition.value) &&
                condition.value.map((item) => (
                  <span
                    key={item}
                    className="inline-flex items-center gap-1 px-2 py-1 text-xs bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 rounded-full"
                  >
                    {item}
                    <button onClick={() => handleRemoveFromList(item)}>
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddToList())}
                placeholder={conditionConfig.placeholder}
                className="flex-1 px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
              <button
                onClick={handleAddToList}
                className="px-2 py-1 text-sm bg-gray-100 dark:bg-gray-600 rounded hover:bg-gray-200 dark:hover:bg-gray-500"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      <button
        onClick={onRemove}
        className="flex-shrink-0 p-1 text-gray-400 hover:text-red-500 transition-colors"
      >
        <Trash2 className="w-4 h-4" />
      </button>
    </div>
  );
}
