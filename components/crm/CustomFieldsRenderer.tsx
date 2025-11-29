'use client';

import { useState, useEffect, useMemo } from 'react';

type CustomFieldType = 'text' | 'number' | 'date' | 'boolean' | 'select' | 'multiselect' | 'url' | 'email' | 'phone' | 'currency' | 'formula';

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
  fieldType: CustomFieldType;
  options?: SelectOption[];
  defaultValue?: any;
  placeholder?: string;
  required: boolean;
  minLength?: number;
  maxLength?: number;
  minValue?: number;
  maxValue?: number;
  currencyCode?: string;
  showInList: boolean;
  showInCard: boolean;
  // Formula fields
  formula?: string;
  referencedFields?: string[];
  decimalPlaces?: number;
  formulaPrefix?: string;
  formulaSuffix?: string;
}

interface CustomFieldsRendererProps {
  entityType: 'client' | 'contact' | 'deal' | 'product';
  values: Record<string, any>;
  onChange: (values: Record<string, any>) => void;
  mode: 'form' | 'display' | 'list';
  className?: string;
}

export default function CustomFieldsRenderer({
  entityType,
  values,
  onChange,
  mode,
  className = '',
}: CustomFieldsRendererProps) {
  const [fields, setFields] = useState<CustomField[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchFields();
  }, [entityType]);

  const fetchFields = async () => {
    try {
      const res = await fetch(`/api/crm/custom-fields?entityType=${entityType}`);
      if (res.ok) {
        const data = await res.json();
        setFields(data);
      }
    } catch (error) {
      console.error('Error fetching custom fields:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (fieldName: string, value: any) => {
    onChange({
      ...values,
      [fieldName]: value,
    });
  };

  // Calcular valores de fórmulas
  const calculateFormulaValue = (field: CustomField, allValues: Record<string, any>, allFields: CustomField[]): number | null => {
    if (!field.formula) return null;

    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const { Parser } = require('hot-formula-parser');
      const parser = new Parser();

      // Asignar valores de otros campos a la fórmula
      // La fórmula puede referenciar otros campos por su nombre
      allFields.forEach((f) => {
        if (f.name !== field.name) {
          let val = allValues[f.name];

          // Convertir según el tipo de campo
          if (f.fieldType === 'number' || f.fieldType === 'currency') {
            val = parseFloat(val) || 0;
          } else if (f.fieldType === 'boolean') {
            val = val ? 1 : 0;
          } else if (f.fieldType === 'date') {
            val = val ? new Date(val) : null;
          } else if (typeof val === 'string') {
            val = parseFloat(val) || 0;
          }

          parser.setVariable(f.name, val ?? 0);
        }
      });

      // También agregar campos estándar de la entidad si están disponibles
      // Por ejemplo, para deals: value, probability
      if (allValues.value !== undefined) {
        parser.setVariable('value', parseFloat(allValues.value) || 0);
      }
      if (allValues.probability !== undefined) {
        parser.setVariable('probability', parseFloat(allValues.probability) || 0);
      }
      if (allValues.quantity !== undefined) {
        parser.setVariable('quantity', parseFloat(allValues.quantity) || 0);
      }
      if (allValues.price !== undefined) {
        parser.setVariable('price', parseFloat(allValues.price) || 0);
      }
      if (allValues.discount !== undefined) {
        parser.setVariable('discount', parseFloat(allValues.discount) || 0);
      }

      const result = parser.parse(field.formula);

      if (result.error) {
        console.error('Formula error:', result.error);
        return null;
      }

      return typeof result.result === 'number' ? result.result : null;
    } catch (error) {
      console.error('Error calculating formula:', error);
      return null;
    }
  };

  // Memoizar valores de fórmulas calculados
  const calculatedFormulas = useMemo(() => {
    const results: Record<string, number | null> = {};
    fields.forEach((field) => {
      if (field.fieldType === 'formula') {
        results[field.name] = calculateFormulaValue(field, values, fields);
      }
    });
    return results;
  }, [fields, values]);

  const formatValue = (field: CustomField, value: any): string => {
    if (value === null || value === undefined || value === '') return '-';

    switch (field.fieldType) {
      case 'boolean':
        return value ? 'Sí' : 'No';
      case 'date':
        return new Date(value).toLocaleDateString('es-MX');
      case 'currency':
        return new Intl.NumberFormat('es-MX', {
          style: 'currency',
          currency: field.currencyCode || 'MXN',
        }).format(value);
      case 'select':
        const option = field.options?.find(o => o.value === value);
        return option?.label || value;
      case 'multiselect':
        if (Array.isArray(value)) {
          return value.map(v => {
            const opt = field.options?.find(o => o.value === v);
            return opt?.label || v;
          }).join(', ');
        }
        return value;
      case 'url':
        return value;
      case 'formula':
        // El valor de fórmula se calcula dinámicamente
        const calculatedValue = calculatedFormulas[field.name];
        if (calculatedValue === null || calculatedValue === undefined) return '-';
        const decimals = field.decimalPlaces ?? 2;
        const formattedNumber = calculatedValue.toLocaleString('es-MX', {
          minimumFractionDigits: decimals,
          maximumFractionDigits: decimals,
        });
        return `${field.formulaPrefix || ''}${formattedNumber}${field.formulaSuffix || ''}`;
      default:
        return String(value);
    }
  };

  if (loading) {
    return null;
  }

  // Filtrar campos según el modo
  const visibleFields = fields.filter(f => {
    if (mode === 'list') return f.showInList;
    if (mode === 'display') return f.showInCard;
    return true; // form muestra todos
  });

  if (visibleFields.length === 0) {
    return null;
  }

  // Modo display/list
  if (mode === 'display' || mode === 'list') {
    return (
      <div className={className}>
        {visibleFields.map((field) => (
          <div key={field._id} className={mode === 'list' ? '' : 'mb-3'}>
            {mode === 'display' && (
              <label className="block text-sm font-medium text-gray-500 dark:text-gray-400">
                {field.label}
              </label>
            )}
            <p className={`text-gray-900 dark:text-white ${mode === 'list' ? 'text-sm' : ''}`}>
              {formatValue(field, values[field.name])}
            </p>
          </div>
        ))}
      </div>
    );
  }

  // Modo form
  return (
    <div className={`space-y-4 ${className}`}>
      {visibleFields.length > 0 && (
        <h4 className="font-medium text-gray-700 dark:text-gray-300 text-sm uppercase tracking-wider">
          Campos Personalizados
        </h4>
      )}
      {visibleFields.map((field) => (
        <div key={field._id}>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            {field.label}
            {field.required && field.fieldType !== 'formula' && <span className="text-red-500 ml-1">*</span>}
            {field.fieldType === 'formula' && (
              <span className="ml-2 text-xs font-normal text-purple-600 dark:text-purple-400">(Calculado)</span>
            )}
          </label>
          {field.description && (
            <p className="text-xs text-gray-500 mb-1">{field.description}</p>
          )}
          {field.fieldType === 'formula' ? (
            <FormulaDisplay
              field={field}
              calculatedValue={calculatedFormulas[field.name]}
            />
          ) : (
            <FieldInput
              field={field}
              value={values[field.name]}
              onChange={(value) => handleChange(field.name, value)}
            />
          )}
        </div>
      ))}
    </div>
  );
}

// Componente para renderizar cada tipo de campo
function FieldInput({
  field,
  value,
  onChange,
}: {
  field: CustomField;
  value: any;
  onChange: (value: any) => void;
}) {
  const baseInputClass = "w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500";

  switch (field.fieldType) {
    case 'text':
    case 'url':
    case 'email':
    case 'phone':
      return (
        <input
          type={field.fieldType === 'url' ? 'url' : field.fieldType === 'email' ? 'email' : field.fieldType === 'phone' ? 'tel' : 'text'}
          value={value || ''}
          onChange={(e) => onChange(e.target.value)}
          placeholder={field.placeholder}
          required={field.required}
          minLength={field.minLength}
          maxLength={field.maxLength}
          className={baseInputClass}
        />
      );

    case 'number':
    case 'currency':
      return (
        <div className="relative">
          {field.fieldType === 'currency' && (
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">$</span>
          )}
          <input
            type="number"
            value={value || ''}
            onChange={(e) => onChange(e.target.value ? parseFloat(e.target.value) : null)}
            placeholder={field.placeholder}
            required={field.required}
            min={field.minValue}
            max={field.maxValue}
            step={field.fieldType === 'currency' ? '0.01' : '1'}
            className={`${baseInputClass} ${field.fieldType === 'currency' ? 'pl-7' : ''}`}
          />
          {field.fieldType === 'currency' && field.currencyCode && (
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">
              {field.currencyCode}
            </span>
          )}
        </div>
      );

    case 'date':
      return (
        <input
          type="date"
          value={value ? new Date(value).toISOString().split('T')[0] : ''}
          onChange={(e) => onChange(e.target.value ? new Date(e.target.value).toISOString() : null)}
          required={field.required}
          className={baseInputClass}
        />
      );

    case 'boolean':
      return (
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={value || false}
            onChange={(e) => onChange(e.target.checked)}
            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
          />
          <span className="text-gray-700 dark:text-gray-300">
            {field.placeholder || 'Sí'}
          </span>
        </label>
      );

    case 'select':
      return (
        <select
          value={value || ''}
          onChange={(e) => onChange(e.target.value || null)}
          required={field.required}
          className={baseInputClass}
        >
          <option value="">{field.placeholder || 'Seleccionar...'}</option>
          {field.options?.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      );

    case 'multiselect':
      const selectedValues = Array.isArray(value) ? value : [];
      return (
        <div className="space-y-2">
          {field.options?.map((option) => (
            <label key={option.value} className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={selectedValues.includes(option.value)}
                onChange={(e) => {
                  if (e.target.checked) {
                    onChange([...selectedValues, option.value]);
                  } else {
                    onChange(selectedValues.filter(v => v !== option.value));
                  }
                }}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="text-gray-700 dark:text-gray-300">{option.label}</span>
            </label>
          ))}
        </div>
      );

    default:
      return (
        <input
          type="text"
          value={value || ''}
          onChange={(e) => onChange(e.target.value)}
          className={baseInputClass}
        />
      );
  }
}

// Componente para mostrar campos de fórmula (solo lectura)
function FormulaDisplay({
  field,
  calculatedValue,
}: {
  field: CustomField;
  calculatedValue: number | null;
}) {
  const decimals = field.decimalPlaces ?? 2;

  if (calculatedValue === null || calculatedValue === undefined) {
    return (
      <div className="w-full px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-800 text-gray-400 dark:text-gray-500 italic">
        Ingresa valores en los campos requeridos
      </div>
    );
  }

  const formattedValue = calculatedValue.toLocaleString('es-MX', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });

  return (
    <div className="w-full px-3 py-2 border border-purple-200 dark:border-purple-700 rounded-lg bg-purple-50 dark:bg-purple-900/30 text-purple-900 dark:text-purple-100 font-medium">
      <span className="flex items-center gap-2">
        <svg className="w-4 h-4 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
        </svg>
        {field.formulaPrefix || ''}{formattedValue}{field.formulaSuffix || ''}
      </span>
    </div>
  );
}

// Hook para usar campos personalizados
export function useCustomFields(entityType: 'client' | 'contact' | 'deal' | 'product') {
  const [fields, setFields] = useState<CustomField[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchFields = async () => {
      try {
        const res = await fetch(`/api/crm/custom-fields?entityType=${entityType}`);
        if (res.ok) {
          const data = await res.json();
          setFields(data);
        }
      } catch (error) {
        console.error('Error fetching custom fields:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchFields();
  }, [entityType]);

  return { fields, loading };
}
