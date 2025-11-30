'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import WebFormRenderer from '@/components/public/WebFormRenderer';
import { FileText, AlertCircle } from 'lucide-react';

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

export default function PublicFormPage() {
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
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error || !form) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-xl shadow-lg p-8 max-w-md text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertCircle size={32} className="text-red-500" />
          </div>
          <h1 className="text-xl font-semibold text-gray-900 mb-2">
            Formulario no disponible
          </h1>
          <p className="text-gray-500">
            {error || 'El formulario que buscas no existe o ha sido desactivado.'}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div
      className="min-h-screen flex items-center justify-center p-4"
      style={{
        backgroundColor: form.style?.backgroundColor
          ? `${form.style.backgroundColor}20`
          : '#F3F4F6',
      }}
    >
      <div
        className="w-full max-w-xl rounded-xl shadow-lg overflow-hidden"
        style={{
          backgroundColor: form.style?.backgroundColor || '#FFFFFF',
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
        />
      </div>
    </div>
  );
}
