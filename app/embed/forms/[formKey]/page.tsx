'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import WebFormRenderer from '@/components/public/WebFormRenderer';

interface FormData {
  formKey: string;
  name: string;
  description?: string;
  fields: any[];
  style?: any;
  logoUrl?: string;
  submitButtonText: string;
  showPoweredBy?: boolean;
}

export default function EmbedFormPage() {
  const params = useParams();
  const formKey = params.formKey as string;

  const [form, setForm] = useState<FormData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchForm();
  }, [formKey]);

  const fetchForm = async () => {
    try {
      const res = await fetch(`/api/public/forms/${formKey}`);
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Formulario no encontrado');
      }
      const data = await res.json();
      setForm(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error || !form) {
    return (
      <div className="p-8 text-center">
        <p className="text-gray-500 text-sm">
          {error || 'Formulario no disponible'}
        </p>
      </div>
    );
  }

  return (
    <div
      style={{
        backgroundColor: form.style?.backgroundColor || '#FFFFFF',
        minHeight: '100%',
      }}
    >
      <WebFormRenderer
        formKey={form.formKey}
        name={form.name}
        description={form.description}
        fields={form.fields}
        style={form.style}
        logoUrl={form.logoUrl}
        submitButtonText={form.submitButtonText}
        showPoweredBy={form.showPoweredBy}
        isEmbed
      />
    </div>
  );
}
