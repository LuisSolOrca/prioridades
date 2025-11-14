'use client';

import { useState, useEffect } from 'react';
import { extractVariablesFromFormula } from '@/lib/kpi-utils/formula-parser';

interface FormulaEditorProps {
  value: string;
  onChange: (value: string) => void;
}

const FORMULA_FUNCTIONS = [
  // Matemáticas básicas
  { name: 'SUM', description: 'Suma de valores', example: 'SUM(A, B, C)', category: 'Matemáticas' },
  { name: 'AVERAGE', description: 'Promedio', example: 'AVERAGE(A, B, C)', category: 'Estadísticas' },
  { name: 'MEDIAN', description: 'Mediana', example: 'MEDIAN(A, B, C)', category: 'Estadísticas' },
  { name: 'MAX', description: 'Valor máximo', example: 'MAX(A, B, C)', category: 'Matemáticas' },
  { name: 'MIN', description: 'Valor mínimo', example: 'MIN(A, B, C)', category: 'Matemáticas' },

  // Lógica
  { name: 'IF', description: 'Condicional', example: 'IF(A>100, "Alto", "Bajo")', category: 'Lógica' },
  { name: 'AND', description: 'Y lógico', example: 'AND(A>10, B<20)', category: 'Lógica' },
  { name: 'OR', description: 'O lógico', example: 'OR(A>100, B>100)', category: 'Lógica' },
  { name: 'NOT', description: 'Negación', example: 'NOT(A>100)', category: 'Lógica' },

  // Redondeo y valores absolutos
  { name: 'ABS', description: 'Valor absoluto', example: 'ABS(A)', category: 'Matemáticas' },
  { name: 'ROUND', description: 'Redondear', example: 'ROUND(A, 2)', category: 'Matemáticas' },
  { name: 'CEILING', description: 'Redondear hacia arriba', example: 'CEILING(A)', category: 'Matemáticas' },
  { name: 'FLOOR', description: 'Redondear hacia abajo', example: 'FLOOR(A)', category: 'Matemáticas' },

  // Potencias y raíces
  { name: 'SQRT', description: 'Raíz cuadrada', example: 'SQRT(A)', category: 'Matemáticas' },
  { name: 'POWER', description: 'Potencia', example: 'POWER(A, 2)', category: 'Matemáticas' },
  { name: 'EXP', description: 'Exponencial e^x', example: 'EXP(A)', category: 'Matemáticas' },
  { name: 'LOG', description: 'Logaritmo', example: 'LOG(A, 10)', category: 'Matemáticas' },
  { name: 'LN', description: 'Logaritmo natural', example: 'LN(A)', category: 'Matemáticas' },

  // Estadísticas avanzadas
  { name: 'STDEV', description: 'Desviación estándar', example: 'STDEV(A, B, C)', category: 'Estadísticas' },
  { name: 'VAR', description: 'Varianza', example: 'VAR(A, B, C)', category: 'Estadísticas' },
  { name: 'COUNT', description: 'Contar valores', example: 'COUNT(A, B, C)', category: 'Estadísticas' },
  { name: 'COUNTA', description: 'Contar no vacíos', example: 'COUNTA(A, B, C)', category: 'Estadísticas' },

  // Porcentajes
  { name: 'PERCENTILE', description: 'Percentil', example: 'PERCENTILE(A, 0.95)', category: 'Estadísticas' },
  { name: 'QUARTILE', description: 'Cuartil', example: 'QUARTILE(A, 1)', category: 'Estadísticas' },

  // Texto
  { name: 'CONCATENATE', description: 'Concatenar texto', example: 'CONCATENATE(A, " ", B)', category: 'Texto' },
  { name: 'UPPER', description: 'Mayúsculas', example: 'UPPER(A)', category: 'Texto' },
  { name: 'LOWER', description: 'Minúsculas', example: 'LOWER(A)', category: 'Texto' },

  // Fechas
  { name: 'TODAY', description: 'Fecha actual', example: 'TODAY()', category: 'Fechas' },
  { name: 'NOW', description: 'Fecha y hora actual', example: 'NOW()', category: 'Fechas' },
  { name: 'YEAR', description: 'Año de una fecha', example: 'YEAR(A)', category: 'Fechas' },
  { name: 'MONTH', description: 'Mes de una fecha', example: 'MONTH(A)', category: 'Fechas' },
  { name: 'DAY', description: 'Día de una fecha', example: 'DAY(A)', category: 'Fechas' },
];

const OPERATORS = [
  { symbol: '+', description: 'Suma' },
  { symbol: '-', description: 'Resta' },
  { symbol: '*', description: 'Multiplicación' },
  { symbol: '/', description: 'División' },
  { symbol: '%', description: 'Módulo' },
  { symbol: '()', description: 'Paréntesis' },
];

export default function FormulaEditor({ value, onChange }: FormulaEditorProps) {
  const [showHelp, setShowHelp] = useState(false);
  const [cursorPosition, setCursorPosition] = useState(0);
  const [detectedVariables, setDetectedVariables] = useState<string[]>([]);

  // Extraer variables automáticamente cuando cambia la fórmula
  useEffect(() => {
    const variables = extractVariablesFromFormula(value);
    setDetectedVariables(variables);
  }, [value]);

  const insertText = (text: string) => {
    const newValue = value.slice(0, cursorPosition) + text + value.slice(cursorPosition);
    onChange(newValue);
    setCursorPosition(cursorPosition + text.length);
  };

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    onChange(e.target.value);
    setCursorPosition(e.target.selectionStart || 0);
  };

  const validateFormula = () => {
    if (!value.trim()) return null;

    try {
      const Parser = require('hot-formula-parser').Parser;
      const parser = new Parser();

      // Asignar valores de prueba a las variables detectadas
      detectedVariables.forEach((varName) => {
        parser.setVariable(varName, 100);
      });

      const result = parser.parse(value);

      if (result.error) {
        return { valid: false, error: result.error };
      }

      return { valid: true, result: result.result };
    } catch (error: any) {
      return { valid: false, error: error.message };
    }
  };

  const validation = validateFormula();

  return (
    <div className="space-y-4">
      <div>
        <div className="flex justify-between items-center mb-2">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            Fórmula de cálculo
          </label>
          <button
            type="button"
            onClick={() => setShowHelp(!showHelp)}
            className="text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
          >
            {showHelp ? 'Ocultar' : 'Mostrar'} ayuda
          </button>
        </div>

        <textarea
          value={value}
          onChange={handleTextChange}
          onSelect={(e) => setCursorPosition((e.target as HTMLTextAreaElement).selectionStart || 0)}
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg font-mono text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
          rows={4}
          placeholder="Ejemplo: (A + B) / 2"
        />

        {validation && (
          <div
            className={`mt-2 p-3 rounded-lg text-sm ${
              validation.valid
                ? 'bg-green-50 text-green-800 border border-green-200'
                : 'bg-red-50 text-red-800 border border-red-200'
            }`}
          >
            {validation.valid ? (
              <div>
                <strong>✓ Fórmula válida</strong>
                <div className="mt-1">
                  Resultado de prueba: {validation.result}
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

      {showHelp && (
        <div className="bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg p-4">
          <h4 className="font-semibold text-gray-900 dark:text-gray-100 mb-3">Ayuda de Fórmulas</h4>

          {detectedVariables.length > 0 && (
            <div className="mb-4">
              <h5 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Variables detectadas en la fórmula:
              </h5>
              <div className="flex flex-wrap gap-2">
                {detectedVariables.map((varName) => (
                  <span
                    key={varName}
                    className="px-3 py-1 bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 rounded text-sm font-mono"
                  >
                    {varName}
                  </span>
                ))}
              </div>
              <p className="text-xs text-gray-600 dark:text-gray-400 mt-2">
                Estas variables se solicitarán al registrar valores para este KPI
              </p>
            </div>
          )}

          <div className="mb-4">
            <h5 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Operadores:</h5>
            <div className="grid grid-cols-3 gap-2">
              {OPERATORS.map((op) => (
                <button
                  key={op.symbol}
                  type="button"
                  onClick={() => insertText(op.symbol)}
                  className="px-3 py-1 bg-gray-100 dark:bg-gray-600 text-gray-800 dark:text-gray-200 rounded text-sm hover:bg-gray-200 dark:hover:bg-gray-500 text-left"
                >
                  <span className="font-mono font-semibold">{op.symbol}</span>
                  <span className="text-xs ml-2 text-gray-600">{op.description}</span>
                </button>
              ))}
            </div>
          </div>

          <div>
            <h5 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Funciones disponibles (33 funciones):
            </h5>
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {/* Agrupar por categoría */}
              {['Matemáticas', 'Estadísticas', 'Lógica', 'Texto', 'Fechas'].map((category) => {
                const funcsInCategory = FORMULA_FUNCTIONS.filter(f => f.category === category);
                if (funcsInCategory.length === 0) return null;

                return (
                  <div key={category} className="space-y-2">
                    <h6 className="text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                      {category}
                    </h6>
                    {funcsInCategory.map((func) => (
                      <div
                        key={func.name}
                        className="flex items-start justify-between bg-white dark:bg-gray-800 p-2 rounded border border-gray-200 dark:border-gray-600"
                      >
                        <div className="flex-1">
                          <div className="font-mono text-sm font-semibold text-gray-900 dark:text-gray-100">
                            {func.name}
                          </div>
                          <div className="text-xs text-gray-600 dark:text-gray-400">{func.description}</div>
                          <div className="text-xs text-gray-500 dark:text-gray-400 font-mono mt-1">
                            {func.example}
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => insertText(func.name + '()')}
                          className="ml-2 px-2 py-1 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 rounded text-xs hover:bg-blue-200 dark:hover:bg-blue-800"
                        >
                          Insertar
                        </button>
                      </div>
                    ))}
                  </div>
                );
              })}
            </div>
          </div>

          <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded text-sm">
            <strong className="text-blue-900 dark:text-blue-300">Nota:</strong>
            <p className="text-blue-800 dark:text-blue-200 mt-1">
              Las variables deben ser definidas al momento de registrar valores para el KPI.
              Puedes usar operadores matemáticos y funciones para crear fórmulas complejas.
            </p>
            <p className="text-blue-800 dark:text-blue-200 mt-2">
              <strong>Más funciones:</strong> El motor de fórmulas (hot-formula-parser) soporta más de 600 funciones,
              incluyendo funciones financieras (NPV, IRR, PMT), trigonométricas avanzadas (SIN, COS, TAN),
              conversión de bases (BIN2DEC, DEC2HEX), expresiones regulares (REGEXMATCH), y muchas más.
              Consulta la{' '}
              <a
                href="https://www.npmjs.com/package/hot-formula-parser"
                target="_blank"
                rel="noopener noreferrer"
                className="underline hover:text-blue-900 dark:hover:text-blue-100"
              >
                documentación oficial
              </a>{' '}
              para ver la lista completa.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
