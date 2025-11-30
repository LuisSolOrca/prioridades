'use client';

import { useState } from 'react';
import { CheckCircle, Loader2, AlertCircle } from 'lucide-react';

interface FormField {
  id: string;
  name: string;
  label: string;
  type: string;
  required: boolean;
  placeholder?: string;
  options?: string[];
  order: number;
  width: 'full' | 'half';
  validation?: {
    minLength?: number;
    maxLength?: number;
    pattern?: string;
  };
}

interface FormStyle {
  primaryColor?: string;
  backgroundColor?: string;
  textColor?: string;
  borderRadius?: number;
  fontFamily?: string;
  fontSize?: number;
  padding?: number;
  buttonStyle?: 'filled' | 'outline';
}

interface WebFormRendererProps {
  formKey: string;
  name: string;
  description?: string;
  fields: FormField[];
  style?: FormStyle;
  logoUrl?: string;
  submitButtonText: string;
  showPoweredBy?: boolean;
  isEmbed?: boolean;
}

export default function WebFormRenderer({
  formKey,
  name,
  description,
  fields,
  style,
  logoUrl,
  submitButtonText,
  showPoweredBy,
  isEmbed,
}: WebFormRendererProps) {
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});

  const handleChange = (fieldName: string, value: any) => {
    setFormData((prev) => ({ ...prev, [fieldName]: value }));
    // Clear validation error when user types
    if (validationErrors[fieldName]) {
      setValidationErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[fieldName];
        return newErrors;
      });
    }
  };

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};

    for (const field of fields) {
      const value = formData[field.name];

      // Required validation
      if (field.required && (!value || (typeof value === 'string' && !value.trim()))) {
        errors[field.name] = `${field.label} es requerido`;
        continue;
      }

      if (value) {
        // Email validation
        if (field.type === 'email') {
          const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
          if (!emailRegex.test(value)) {
            errors[field.name] = 'Email inválido';
          }
        }

        // URL validation
        if (field.type === 'url') {
          try {
            new URL(value);
          } catch {
            errors[field.name] = 'URL inválida';
          }
        }

        // Custom validations
        if (field.validation) {
          const strValue = String(value);
          if (field.validation.minLength && strValue.length < field.validation.minLength) {
            errors[field.name] = `Mínimo ${field.validation.minLength} caracteres`;
          }
          if (field.validation.maxLength && strValue.length > field.validation.maxLength) {
            errors[field.name] = `Máximo ${field.validation.maxLength} caracteres`;
          }
          if (field.validation.pattern) {
            const regex = new RegExp(field.validation.pattern);
            if (!regex.test(strValue)) {
              errors[field.name] = 'Formato inválido';
            }
          }
        }
      }
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!validateForm()) {
      return;
    }

    setSubmitting(true);

    try {
      // Collect UTM parameters from URL
      const urlParams = new URLSearchParams(window.location.search);
      const metadata = {
        utmSource: urlParams.get('utm_source'),
        utmMedium: urlParams.get('utm_medium'),
        utmCampaign: urlParams.get('utm_campaign'),
        utmTerm: urlParams.get('utm_term'),
        utmContent: urlParams.get('utm_content'),
        referrer: document.referrer,
        pageUrl: window.location.href,
      };

      const res = await fetch(`/api/public/forms/${formKey}/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ data: formData, metadata }),
      });

      const result = await res.json();

      if (!res.ok) {
        throw new Error(result.error || 'Error al enviar formulario');
      }

      setSubmitted(true);

      // Redirect if URL provided
      if (result.redirectUrl) {
        setTimeout(() => {
          window.location.href = result.redirectUrl;
        }, 2000);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const sortedFields = [...fields].sort((a, b) => a.order - b.order);

  if (submitted) {
    return (
      <div
        className="flex flex-col items-center justify-center text-center p-8"
        style={{
          backgroundColor: style?.backgroundColor || '#FFFFFF',
          fontFamily: style?.fontFamily || 'Inter, system-ui, sans-serif',
          minHeight: isEmbed ? 300 : 400,
        }}
      >
        <div
          className="w-16 h-16 rounded-full flex items-center justify-center mb-4"
          style={{ backgroundColor: `${style?.primaryColor || '#3B82F6'}20` }}
        >
          <CheckCircle
            size={40}
            style={{ color: style?.primaryColor || '#3B82F6' }}
          />
        </div>
        <h2
          className="text-xl font-semibold mb-2"
          style={{ color: style?.textColor || '#1F2937' }}
        >
          ¡Enviado!
        </h2>
        <p
          className="text-sm opacity-70"
          style={{ color: style?.textColor || '#1F2937' }}
        >
          Gracias por tu información. Nos pondremos en contacto pronto.
        </p>
      </div>
    );
  }

  return (
    <div
      style={{
        backgroundColor: style?.backgroundColor || '#FFFFFF',
        fontFamily: style?.fontFamily || 'Inter, system-ui, sans-serif',
      }}
    >
      <form
        onSubmit={handleSubmit}
        style={{ padding: style?.padding || 24 }}
      >
        {logoUrl && (
          <img
            src={logoUrl}
            alt="Logo"
            className="h-10 mb-4 object-contain"
          />
        )}

        <h2
          className="text-xl font-semibold mb-2"
          style={{ color: style?.textColor || '#1F2937' }}
        >
          {name}
        </h2>

        {description && (
          <p
            className="text-sm mb-6 opacity-70"
            style={{ color: style?.textColor || '#1F2937' }}
          >
            {description}
          </p>
        )}

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-red-700 text-sm">
            <AlertCircle size={18} />
            {error}
          </div>
        )}

        <div className="flex flex-wrap gap-4">
          {sortedFields.map((field) => (
            <div
              key={field.id}
              style={{
                width: field.width === 'half' ? 'calc(50% - 8px)' : '100%',
              }}
              className="min-w-0"
            >
              {field.type !== 'checkbox' && (
                <label
                  className="block text-sm font-medium mb-1"
                  style={{ color: style?.textColor || '#1F2937' }}
                >
                  {field.label}
                  {field.required && (
                    <span className="text-red-500 ml-1">*</span>
                  )}
                </label>
              )}

              {field.type === 'textarea' ? (
                <textarea
                  name={field.name}
                  placeholder={field.placeholder}
                  required={field.required}
                  value={formData[field.name] || ''}
                  onChange={(e) => handleChange(field.name, e.target.value)}
                  className={`w-full px-3 py-2 border transition outline-none ${
                    validationErrors[field.name]
                      ? 'border-red-500 focus:ring-red-500'
                      : 'border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent'
                  }`}
                  style={{
                    borderRadius: style?.borderRadius || 8,
                    fontSize: style?.fontSize || 14,
                    backgroundColor: '#FFFFFF',
                    color: '#1F2937',
                  }}
                  rows={4}
                />
              ) : field.type === 'select' ? (
                <select
                  name={field.name}
                  required={field.required}
                  value={formData[field.name] || ''}
                  onChange={(e) => handleChange(field.name, e.target.value)}
                  className={`w-full px-3 py-2 border transition outline-none ${
                    validationErrors[field.name]
                      ? 'border-red-500 focus:ring-red-500'
                      : 'border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent'
                  }`}
                  style={{
                    borderRadius: style?.borderRadius || 8,
                    fontSize: style?.fontSize || 14,
                    backgroundColor: '#FFFFFF',
                    color: '#1F2937',
                  }}
                >
                  <option value="">Seleccionar...</option>
                  {field.options?.map((opt, i) => (
                    <option key={i} value={opt}>
                      {opt}
                    </option>
                  ))}
                </select>
              ) : field.type === 'checkbox' ? (
                <label
                  className="flex items-start gap-2 cursor-pointer"
                  style={{ color: style?.textColor || '#1F2937' }}
                >
                  <input
                    type="checkbox"
                    name={field.name}
                    required={field.required}
                    checked={formData[field.name] || false}
                    onChange={(e) => handleChange(field.name, e.target.checked)}
                    className="mt-1 rounded"
                    style={{ accentColor: style?.primaryColor || '#3B82F6' }}
                  />
                  <span style={{ fontSize: style?.fontSize || 14 }}>
                    {field.label}
                    {field.required && (
                      <span className="text-red-500 ml-1">*</span>
                    )}
                  </span>
                </label>
              ) : (
                <input
                  type={field.type}
                  name={field.name}
                  placeholder={field.placeholder}
                  required={field.required}
                  value={formData[field.name] || ''}
                  onChange={(e) => handleChange(field.name, e.target.value)}
                  className={`w-full px-3 py-2 border transition outline-none ${
                    validationErrors[field.name]
                      ? 'border-red-500 focus:ring-red-500'
                      : 'border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent'
                  }`}
                  style={{
                    borderRadius: style?.borderRadius || 8,
                    fontSize: style?.fontSize || 14,
                    backgroundColor: '#FFFFFF',
                    color: '#1F2937',
                  }}
                />
              )}

              {validationErrors[field.name] && (
                <p className="text-red-500 text-xs mt-1">
                  {validationErrors[field.name]}
                </p>
              )}
            </div>
          ))}
        </div>

        <button
          type="submit"
          disabled={submitting}
          className="w-full mt-6 py-3 font-medium transition flex items-center justify-center gap-2 disabled:opacity-70"
          style={{
            backgroundColor:
              style?.buttonStyle === 'outline'
                ? 'transparent'
                : style?.primaryColor || '#3B82F6',
            color:
              style?.buttonStyle === 'outline'
                ? style?.primaryColor || '#3B82F6'
                : '#FFFFFF',
            border:
              style?.buttonStyle === 'outline'
                ? `2px solid ${style?.primaryColor || '#3B82F6'}`
                : 'none',
            borderRadius: style?.borderRadius || 8,
          }}
        >
          {submitting && <Loader2 size={18} className="animate-spin" />}
          {submitting ? 'Enviando...' : submitButtonText || 'Enviar'}
        </button>

        {showPoweredBy && (
          <div className="flex items-center justify-center gap-2 mt-6 pt-4 border-t border-gray-100">
            <span className="text-xs text-gray-400">Powered by</span>
            <a
              href="https://orcacrm.com"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 text-xs font-medium text-gray-500 hover:text-blue-600 transition-colors"
            >
              <img
                src="/orca-logo.png"
                alt="Orca GRC"
                className="h-5 w-5 object-contain"
              />
              <span>Orca GRC</span>
            </a>
          </div>
        )}
      </form>
    </div>
  );
}
