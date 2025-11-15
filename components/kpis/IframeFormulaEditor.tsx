'use client';

import { useEffect, useRef, useState } from 'react';
import { extractVariablesFromFormula } from '@/lib/kpi-utils/formula-parser';

interface IframeFormulaEditorProps {
  value: string;
  onChange: (value: string) => void;
}

export default function IframeFormulaEditor({ value, onChange }: IframeFormulaEditorProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [detectedVariables, setDetectedVariables] = useState<string[]>([]);
  const [isDownloading, setIsDownloading] = useState(false);

  // Extraer variables automáticamente
  useEffect(() => {
    const variables = extractVariablesFromFormula(value);
    setDetectedVariables(variables);
  }, [value]);

  // Escuchar mensajes del iframe
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      // Verificar origen por seguridad
      if (event.origin !== window.location.origin) return;

      if (event.data.type === 'FORMULA_SAVE') {
        onChange(event.data.value);
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [onChange]);

  const downloadPDF = async () => {
    try {
      setIsDownloading(true);
      const { generateSystemDataDocsPDF } = await import('@/lib/kpi-utils/generate-docs-pdf');
      generateSystemDataDocsPDF();
    } catch (error) {
      console.error('Error downloading PDF:', error);
      alert('Error al descargar el PDF');
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <div className="flex justify-between items-center mb-2">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            Fórmula de cálculo
          </label>
          <button
            type="button"
            onClick={downloadPDF}
            disabled={isDownloading}
            className="text-sm text-purple-600 hover:text-purple-700 dark:text-purple-400 dark:hover:text-purple-300 flex items-center gap-1 disabled:opacity-50"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            {isDownloading ? 'Descargando...' : 'Descargar Documentación PDF'}
          </button>
        </div>

        <div className="border border-gray-300 dark:border-gray-600 rounded-lg overflow-hidden bg-gray-900">
          <iframe
            ref={iframeRef}
            src={`/monaco-editor.html?value=${encodeURIComponent(value)}`}
            className="w-full h-[300px] border-0"
            title="Editor de Fórmulas"
          />
        </div>

        <div className="mt-2">
          <p className="text-xs text-gray-600 dark:text-gray-400">
            💡 Autocompletado instantáneo: escribe una letra y aparecen las sugerencias automáticamente
          </p>
          <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-1">
            ✨ Funciones de Excel + funciones del sistema con datos reales (usuarios, proyectos, iniciativas)
          </p>
        </div>
      </div>

      {detectedVariables.length > 0 && (
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
          <h5 className="text-sm font-medium text-blue-900 dark:text-blue-300 mb-2">
            📋 Variables detectadas en la fórmula:
          </h5>
          <div className="flex flex-wrap gap-2">
            {detectedVariables.map((varName) => (
              <span
                key={varName}
                className="px-3 py-1 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 rounded-md text-sm font-mono"
              >
                {varName}
              </span>
            ))}
          </div>
          <p className="text-xs text-blue-700 dark:text-blue-400 mt-3">
            💡 Estas variables se solicitarán al registrar valores para este KPI
          </p>
        </div>
      )}
    </div>
  );
}
