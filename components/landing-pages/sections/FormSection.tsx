'use client';

import { useState } from 'react';
import { ILandingGlobalStyles } from '@/models/LandingPage';
import { IWebForm } from '@/models/WebForm';

interface FormContent {
  title?: string;
  subtitle?: string;
  formId?: string;
}

interface FormSectionProps {
  content: FormContent;
  styles?: Record<string, any>;
  globalStyles: ILandingGlobalStyles;
  form?: IWebForm;
  onSubmit?: (data: any) => void;
}

export default function FormSection({ content, styles, globalStyles, form, onSubmit }: FormSectionProps) {
  const { title, subtitle } = content;
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form) return;

    try {
      setSubmitting(true);
      setError(null);

      const response = await fetch(`/api/public/forms/${form.formKey}/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Error al enviar');
      }

      const data = await response.json();
      setSubmitted(true);
      onSubmit?.(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleChange = (fieldId: string, value: any) => {
    setFormData((prev) => ({ ...prev, [fieldId]: value }));
  };

  const containerStyle: React.CSSProperties = {
    backgroundColor: styles?.backgroundColor || '#F3F4F6',
    padding: styles?.padding || '60px 24px',
  };

  if (!form) {
    return (
      <section style={containerStyle}>
        <div className="max-w-[var(--container-width)] mx-auto text-center">
          <p className="text-gray-500">Selecciona un formulario WebToLead</p>
        </div>
      </section>
    );
  }

  if (submitted) {
    return (
      <section style={containerStyle}>
        <div className="max-w-md mx-auto text-center">
          <div
            className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4"
            style={{ backgroundColor: `${globalStyles.secondaryColor}20` }}
          >
            <svg
              className="w-8 h-8"
              style={{ color: globalStyles.secondaryColor }}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h3
            style={{
              fontFamily: 'var(--heading-font)',
              color: globalStyles.textColor,
              fontSize: '1.5rem',
              fontWeight: 600,
              marginBottom: '0.5rem',
            }}
          >
            {form.successMessage || 'Gracias por tu mensaje'}
          </h3>
        </div>
      </section>
    );
  }

  const formStyle = form.style || {};

  return (
    <section style={containerStyle} id="form">
      <div className="max-w-[var(--container-width)] mx-auto">
        {(title || subtitle) && (
          <div className="text-center mb-8">
            {title && (
              <h2
                style={{
                  fontFamily: 'var(--heading-font)',
                  color: styles?.color || globalStyles.textColor,
                  fontSize: '2rem',
                  fontWeight: 700,
                  marginBottom: '0.5rem',
                }}
              >
                {title}
              </h2>
            )}
            {subtitle && (
              <p
                style={{
                  fontFamily: 'var(--font-family)',
                  color: styles?.color || globalStyles.textColor,
                  opacity: 0.8,
                  fontSize: '1.1rem',
                }}
              >
                {subtitle}
              </p>
            )}
          </div>
        )}

        <div
          className="max-w-lg mx-auto bg-white rounded-lg shadow-md"
          style={{
            borderRadius: `${formStyle.borderRadius || globalStyles.borderRadius}px`,
            padding: `${formStyle.padding || 32}px`,
          }}
        >
          {form.logoUrl && (
            <div className="text-center mb-6">
              <img src={form.logoUrl} alt="Logo" className="h-12 mx-auto" />
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {(form.fields || [])
              .sort((a, b) => a.order - b.order)
              .map((field) => (
                <div
                  key={field.id}
                  className={field.width === 'half' ? 'w-1/2 inline-block pr-2' : 'w-full'}
                >
                  <label
                    className="block text-sm font-medium mb-1"
                    style={{ color: formStyle.textColor || globalStyles.textColor }}
                  >
                    {field.label}
                    {field.required && <span className="text-red-500 ml-1">*</span>}
                  </label>

                  {field.type === 'textarea' ? (
                    <textarea
                      value={formData[field.id] || ''}
                      onChange={(e) => handleChange(field.id, e.target.value)}
                      placeholder={field.placeholder}
                      required={field.required}
                      rows={4}
                      className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:outline-none"
                      style={{
                        borderRadius: `${formStyle.borderRadius || 8}px`,
                        fontFamily: formStyle.fontFamily || 'inherit',
                        borderColor: '#E5E7EB',
                      }}
                    />
                  ) : field.type === 'select' ? (
                    <select
                      value={formData[field.id] || ''}
                      onChange={(e) => handleChange(field.id, e.target.value)}
                      required={field.required}
                      className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:outline-none"
                      style={{
                        borderRadius: `${formStyle.borderRadius || 8}px`,
                        fontFamily: formStyle.fontFamily || 'inherit',
                        borderColor: '#E5E7EB',
                      }}
                    >
                      <option value="">{field.placeholder || 'Seleccionar...'}</option>
                      {field.options?.map((opt) => (
                        <option key={opt} value={opt}>{opt}</option>
                      ))}
                    </select>
                  ) : field.type === 'checkbox' ? (
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={formData[field.id] || false}
                        onChange={(e) => handleChange(field.id, e.target.checked)}
                        required={field.required}
                        className="w-4 h-4 rounded"
                        style={{ accentColor: globalStyles.primaryColor }}
                      />
                      <span style={{ color: formStyle.textColor || globalStyles.textColor }}>
                        {field.placeholder}
                      </span>
                    </label>
                  ) : (
                    <input
                      type={field.type === 'email' ? 'email' : field.type === 'phone' ? 'tel' : field.type === 'number' ? 'number' : 'text'}
                      value={formData[field.id] || ''}
                      onChange={(e) => handleChange(field.id, e.target.value)}
                      placeholder={field.placeholder}
                      required={field.required}
                      className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:outline-none"
                      style={{
                        borderRadius: `${formStyle.borderRadius || 8}px`,
                        fontFamily: formStyle.fontFamily || 'inherit',
                        borderColor: '#E5E7EB',
                      }}
                    />
                  )}
                </div>
              ))}

            {error && (
              <div className="p-3 bg-red-50 text-red-600 rounded-lg text-sm">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="w-full py-3 font-semibold text-white rounded-lg transition-all hover:scale-[1.02] disabled:opacity-50"
              style={{
                backgroundColor: formStyle.primaryColor || globalStyles.primaryColor,
                borderRadius: `${formStyle.borderRadius || globalStyles.borderRadius}px`,
              }}
            >
              {submitting ? 'Enviando...' : form.submitButtonText || 'Enviar'}
            </button>
          </form>

          {form.showPoweredBy && (
            <p className="text-center text-xs text-gray-400 mt-4">
              Powered by CRM
            </p>
          )}
        </div>
      </div>
    </section>
  );
}
