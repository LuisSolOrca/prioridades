'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { extractVariablesFromFormula } from '@/lib/kpi-utils/formula-parser';

interface IframeFormulaEditorProps {
  value: string;
  onChange: (value: string) => void;
}

export default function IframeFormulaEditor({ value, onChange }: IframeFormulaEditorProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [detectedVariables, setDetectedVariables] = useState<string[]>([]);
  const [isDownloading, setIsDownloading] = useState(false);
  const [showValidation, setShowValidation] = useState(false);
  const [validation, setValidation] = useState<any>(null);

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

  const validateFormula = useCallback(() => {
    if (!value.trim()) return null;

    try {
      // Importación dinámica para evitar errores en el servidor
      if (typeof window === 'undefined') return null;

      const { Parser } = require('hot-formula-parser');
      const parser = new Parser();

      // Asignar valores de prueba a las variables detectadas
      detectedVariables.forEach((varName) => {
        parser.setVariable(varName, 0.5);
      });

      // Reemplazar funciones del sistema con valores de prueba
      let processedFormula = value;

      const findClosingParen = (str: string, startIndex: number): number => {
        let depth = 1;
        for (let i = startIndex; i < str.length; i++) {
          if (str[i] === '(') depth++;
          else if (str[i] === ')') {
            depth--;
            if (depth === 0) return i;
          }
        }
        return -1;
      };

      const systemFunctionNames = [
        'COUNT_PRIORITIES', 'SUM_PRIORITIES', 'AVG_PRIORITIES',
        'COUNT_MILESTONES', 'COUNT_PROJECTS', 'COUNT_USERS',
        'COMPLETION_RATE', 'PERCENTAGE'
      ];

      let maxIterations = 20;
      let iteration = 0;
      let foundSystemFunction = true;

      while (foundSystemFunction && iteration < maxIterations) {
        foundSystemFunction = false;
        iteration++;

        for (const funcName of systemFunctionNames) {
          const funcIndex = processedFormula.indexOf(funcName + '(');
          if (funcIndex !== -1) {
            foundSystemFunction = true;
            const openParenIndex = funcIndex + funcName.length;
            const closeParenIndex = findClosingParen(processedFormula, openParenIndex + 1);

            if (closeParenIndex !== -1) {
              const fullMatch = processedFormula.substring(funcIndex, closeParenIndex + 1);

              let testValue = 50;
              switch (funcName) {
                case 'COUNT_PRIORITIES':
                case 'COUNT_MILESTONES':
                case 'COUNT_PROJECTS':
                case 'COUNT_USERS':
                  testValue = 100;
                  break;
                case 'COMPLETION_RATE':
                  testValue = 75.5;
                  break;
                case 'PERCENTAGE':
                  testValue = 50;
                  break;
                case 'SUM_PRIORITIES':
                  testValue = 500;
                  break;
                case 'AVG_PRIORITIES':
                  testValue = 65.3;
                  break;
              }

              processedFormula = processedFormula.replace(fullMatch, testValue.toString());
              break;
            }
          }
        }
      }

      const result = parser.parse(processedFormula);

      if (result.error) {
        return { valid: false, error: result.error };
      }

      let formattedResult = result.result;

      if (result.result instanceof Date) {
        formattedResult = result.result.toLocaleDateString('es-MX', {
          year: 'numeric',
          month: 'long',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        });
      } else if (typeof result.result === 'number') {
        formattedResult = Number.isInteger(result.result)
          ? result.result
          : result.result.toFixed(2);
      } else if (typeof result.result === 'boolean') {
        formattedResult = result.result ? 'Verdadero' : 'Falso';
      } else if (result.result === null || result.result === undefined) {
        formattedResult = 'Sin valor';
      } else if (typeof result.result === 'object') {
        formattedResult = JSON.stringify(result.result);
      }

      return { valid: true, result: formattedResult, rawResult: result.result };
    } catch (error: any) {
      console.error('Error validating formula:', error);
      return { valid: false, error: error.message || 'Error desconocido al validar la fórmula' };
    }
  }, [value, detectedVariables]);

  // Actualizar validación cuando cambia el valor o las variables
  useEffect(() => {
    if (showValidation) {
      const result = validateFormula();
      setValidation(result);
    }
  }, [value, detectedVariables, showValidation, validateFormula]);

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

        <div className="mt-2 flex items-start justify-between gap-3">
          <div className="flex-1">
            <p className="text-xs text-gray-600 dark:text-gray-400">
              💡 Autocompletado instantáneo: escribe una letra y aparecen las sugerencias automáticamente
            </p>
            <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-1">
              ✨ Funciones de Excel + funciones del sistema con datos reales (usuarios, proyectos, iniciativas)
            </p>
          </div>
          <button
            type="button"
            onClick={() => setShowValidation(!showValidation)}
            className="px-3 py-1.5 text-xs font-medium rounded-md bg-purple-100 text-purple-700 hover:bg-purple-200 dark:bg-purple-900/30 dark:text-purple-300 dark:hover:bg-purple-900/50 transition-colors whitespace-nowrap"
          >
            {showValidation ? '👁️ Ocultar validación' : '🔍 Validar fórmula'}
          </button>
        </div>

        {showValidation && validation && (
          <div
            className={`mt-3 p-3 rounded-lg text-sm ${
              validation.valid
                ? 'bg-green-50 text-green-800 border border-green-200 dark:bg-green-900/20 dark:text-green-300 dark:border-green-800'
                : 'bg-red-50 text-red-800 border border-red-200 dark:bg-red-900/20 dark:text-red-300 dark:border-red-800'
            }`}
          >
            {validation.valid ? (
              <div>
                <strong>✓ Fórmula válida</strong>
                <div className="mt-1">
                  <span className="text-xs opacity-75">Resultado de prueba:</span>
                  <div className="font-mono font-bold mt-1">
                    {validation.result}
                  </div>
                  {(validation as any).rawResult && (
                    <div className="text-xs mt-2 opacity-75">
                      Tipo: {
                        (validation as any).rawResult instanceof Date
                          ? '📅 Fecha'
                          : typeof (validation as any).rawResult === 'number'
                          ? '🔢 Número'
                          : typeof (validation as any).rawResult === 'boolean'
                          ? '✅ Booleano'
                          : typeof (validation as any).rawResult === 'string'
                          ? '📝 Texto'
                          : '📦 Objeto'
                      }
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div>
                <strong>✗ Error en la fórmula</strong>
                <div className="mt-1">{validation.error}</div>
              </div>
            )}
          </div>
        )}
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
