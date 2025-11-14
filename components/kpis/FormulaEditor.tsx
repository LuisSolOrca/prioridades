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
  { name: 'DATE', description: 'Crear fecha', example: 'DATE(2025, 1, 15)', category: 'Fechas' },
  { name: 'YEAR', description: 'Año de una fecha', example: 'YEAR(A)', category: 'Fechas' },
  { name: 'MONTH', description: 'Mes de una fecha', example: 'MONTH(A)', category: 'Fechas' },
  { name: 'DAY', description: 'Día de una fecha', example: 'DAY(A)', category: 'Fechas' },
  { name: 'HOUR', description: 'Hora de una fecha', example: 'HOUR(A)', category: 'Fechas' },
  { name: 'MINUTE', description: 'Minutos de una fecha', example: 'MINUTE(A)', category: 'Fechas' },
  { name: 'SECOND', description: 'Segundos de una fecha', example: 'SECOND(A)', category: 'Fechas' },
  { name: 'WEEKDAY', description: 'Día de la semana', example: 'WEEKDAY(A)', category: 'Fechas' },
  { name: 'DAYS', description: 'Días entre fechas', example: 'DAYS(FechaFinal, FechaInicio)', category: 'Fechas' },
  { name: 'DAYS360', description: 'Días entre fechas (año 360)', example: 'DAYS360(FechaInicio, FechaFinal)', category: 'Fechas' },
  { name: 'EDATE', description: 'Sumar/restar meses', example: 'EDATE(Fecha, 3)', category: 'Fechas' },
  { name: 'EOMONTH', description: 'Último día del mes', example: 'EOMONTH(Fecha, 0)', category: 'Fechas' },
  { name: 'NETWORKDAYS', description: 'Días laborables', example: 'NETWORKDAYS(Inicio, Fin)', category: 'Fechas' },
  { name: 'WORKDAY', description: 'Fecha laboral futura', example: 'WORKDAY(Inicio, Dias)', category: 'Fechas' },
  { name: 'DATEDIF', description: 'Diferencia entre fechas', example: 'DATEDIF(Inicio, Fin, "D")', category: 'Fechas' },

  // FUNCIONES DEL SISTEMA - Acceso a datos de prioridades, hitos, proyectos y usuarios
  { name: 'COUNT_PRIORITIES', description: 'Contar prioridades con filtros', example: 'COUNT_PRIORITIES({status: "COMPLETADO"})', category: 'Sistema' },
  { name: 'SUM_PRIORITIES', description: 'Sumar campo de prioridades', example: 'SUM_PRIORITIES("completionPercentage", {userId: "123"})', category: 'Sistema' },
  { name: 'AVG_PRIORITIES', description: 'Promedio de campo de prioridades', example: 'AVG_PRIORITIES("completionPercentage", {status: "COMPLETADO"})', category: 'Sistema' },
  { name: 'COUNT_MILESTONES', description: 'Contar hitos con filtros', example: 'COUNT_MILESTONES({isCompleted: true})', category: 'Sistema' },
  { name: 'COUNT_PROJECTS', description: 'Contar proyectos con filtros', example: 'COUNT_PROJECTS({isActive: true})', category: 'Sistema' },
  { name: 'COUNT_USERS', description: 'Contar usuarios con filtros', example: 'COUNT_USERS({area: "Tecnología"})', category: 'Sistema' },
  { name: 'COMPLETION_RATE', description: 'Tasa de cumplimiento de prioridades', example: 'COMPLETION_RATE({userId: "123"})', category: 'Sistema' },
  { name: 'PERCENTAGE', description: 'Calcular porcentaje', example: 'PERCENTAGE(parte, total)', category: 'Sistema' },
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
  const [isDownloading, setIsDownloading] = useState(false);

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

  const downloadPDF = async () => {
    try {
      setIsDownloading(true);
      const response = await fetch('/api/kpis/system-data-docs');

      if (!response.ok) {
        throw new Error('Error al descargar el PDF');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'Funciones-Sistema-KPIs.pdf';
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Error downloading PDF:', error);
      alert('Error al descargar el PDF');
    } finally {
      setIsDownloading(false);
    }
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
          <div className="flex gap-3">
            <button
              type="button"
              onClick={downloadPDF}
              disabled={isDownloading}
              className="text-sm text-purple-600 hover:text-purple-700 dark:text-purple-400 dark:hover:text-purple-300 flex items-center gap-1 disabled:opacity-50"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              {isDownloading ? 'Descargando...' : 'Descargar PDF'}
            </button>
            <button
              type="button"
              onClick={() => setShowHelp(!showHelp)}
              className="text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
            >
              {showHelp ? 'Ocultar' : 'Mostrar'} ayuda
            </button>
          </div>
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
              Funciones disponibles (45 funciones):
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

          {/* Ejemplos de tipos de datos */}
          <div className="mt-4 p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded">
            <h5 className="text-sm font-semibold text-green-900 dark:text-green-300 mb-3">
              📝 Tipos de datos y ejemplos de uso
            </h5>

            <div className="space-y-3 text-sm">
              {/* Números */}
              <div className="bg-white dark:bg-gray-800 p-3 rounded border border-green-200 dark:border-green-700">
                <div className="flex items-center mb-2">
                  <span className="font-semibold text-green-900 dark:text-green-300">🔢 Variables numéricas</span>
                </div>
                <p className="text-gray-700 dark:text-gray-300 mb-2">
                  Usa nombres descriptivos. Al registrar valores, ingresarás números.
                </p>
                <div className="bg-gray-50 dark:bg-gray-700 p-2 rounded font-mono text-xs">
                  <div className="text-gray-600 dark:text-gray-400">Ejemplo:</div>
                  <div className="text-gray-900 dark:text-gray-100 mt-1">
                    (Ventas - Costos) / Ventas * 100
                  </div>
                  <div className="text-gray-500 dark:text-gray-400 mt-1 text-xs">
                    → Variables: Ventas, Costos (números como 1000, 750)
                  </div>
                </div>
              </div>

              {/* Fechas */}
              <div className="bg-white dark:bg-gray-800 p-3 rounded border border-green-200 dark:border-green-700">
                <div className="flex items-center mb-2">
                  <span className="font-semibold text-green-900 dark:text-green-300">📅 Variables de fecha</span>
                </div>
                <p className="text-gray-700 dark:text-gray-300 mb-2">
                  Usa palabras como: <code className="px-1 bg-gray-200 dark:bg-gray-700 rounded">fecha, date, dia, inicio, fin, desde, hasta</code>.
                  Se mostrará un selector de fecha.
                </p>
                <div className="space-y-2">
                  <div className="bg-gray-50 dark:bg-gray-700 p-2 rounded font-mono text-xs">
                    <div className="text-gray-600 dark:text-gray-400">Ejemplo 1: Días entre fechas</div>
                    <div className="text-gray-900 dark:text-gray-100 mt-1">
                      DAYS(FechaFin, FechaInicio)
                    </div>
                    <div className="text-gray-500 dark:text-gray-400 mt-1 text-xs">
                      → Variables: FechaFin, FechaInicio (calendario)
                    </div>
                  </div>
                  <div className="bg-gray-50 dark:bg-gray-700 p-2 rounded font-mono text-xs">
                    <div className="text-gray-600 dark:text-gray-400">Ejemplo 2: Edad en días</div>
                    <div className="text-gray-900 dark:text-gray-100 mt-1">
                      DAYS(TODAY(), FechaNacimiento)
                    </div>
                    <div className="text-gray-500 dark:text-gray-400 mt-1 text-xs">
                      → Variable: FechaNacimiento (calendario)
                    </div>
                  </div>
                  <div className="bg-gray-50 dark:bg-gray-700 p-2 rounded font-mono text-xs">
                    <div className="text-gray-600 dark:text-gray-400">Ejemplo 3: Días laborables</div>
                    <div className="text-gray-900 dark:text-gray-100 mt-1">
                      NETWORKDAYS(FechaInicio, FechaFin)
                    </div>
                    <div className="text-gray-500 dark:text-gray-400 mt-1 text-xs">
                      → Calcula días hábiles (excluye fines de semana)
                    </div>
                  </div>
                </div>
              </div>

              {/* Arrays */}
              <div className="bg-white dark:bg-gray-800 p-3 rounded border border-green-200 dark:border-green-700">
                <div className="flex items-center mb-2">
                  <span className="font-semibold text-green-900 dark:text-green-300">📊 Variables de lista/array</span>
                </div>
                <p className="text-gray-700 dark:text-gray-300 mb-2">
                  Usa la variable dentro de funciones agregadas. Al registrar valores, ingresarás números separados por comas.
                </p>
                <div className="space-y-2">
                  <div className="bg-gray-50 dark:bg-gray-700 p-2 rounded font-mono text-xs">
                    <div className="text-gray-600 dark:text-gray-400">Ejemplo 1: Promedio de valores</div>
                    <div className="text-gray-900 dark:text-gray-100 mt-1">
                      AVERAGE(Calificaciones)
                    </div>
                    <div className="text-gray-500 dark:text-gray-400 mt-1 text-xs">
                      → Variable: Calificaciones (ingresas: 85, 90, 88, 92)
                    </div>
                  </div>
                  <div className="bg-gray-50 dark:bg-gray-700 p-2 rounded font-mono text-xs">
                    <div className="text-gray-600 dark:text-gray-400">Ejemplo 2: Suma de ventas</div>
                    <div className="text-gray-900 dark:text-gray-100 mt-1">
                      SUM(VentasMensuales)
                    </div>
                    <div className="text-gray-500 dark:text-gray-400 mt-1 text-xs">
                      → Variable: VentasMensuales (ingresas: 1000, 1200, 980, 1100)
                    </div>
                  </div>
                  <div className="bg-gray-50 dark:bg-gray-700 p-2 rounded font-mono text-xs">
                    <div className="text-gray-600 dark:text-gray-400">Ejemplo 3: Desviación estándar</div>
                    <div className="text-gray-900 dark:text-gray-100 mt-1">
                      STDEV(TiemposRespuesta)
                    </div>
                    <div className="text-gray-500 dark:text-gray-400 mt-1 text-xs">
                      → Mide variabilidad en tiempos
                    </div>
                  </div>
                </div>
              </div>

              {/* Mixtos */}
              <div className="bg-white dark:bg-gray-800 p-3 rounded border border-green-200 dark:border-green-700">
                <div className="flex items-center mb-2">
                  <span className="font-semibold text-green-900 dark:text-green-300">🔀 Fórmulas combinadas</span>
                </div>
                <p className="text-gray-700 dark:text-gray-300 mb-2">
                  Combina diferentes tipos de datos en una misma fórmula.
                </p>
                <div className="space-y-2">
                  <div className="bg-gray-50 dark:bg-gray-700 p-2 rounded font-mono text-xs">
                    <div className="text-gray-600 dark:text-gray-400">Ejemplo 1: Promedio diario</div>
                    <div className="text-gray-900 dark:text-gray-100 mt-1">
                      SUM(Ventas) / DAYS(FechaFin, FechaInicio)
                    </div>
                    <div className="text-gray-500 dark:text-gray-400 mt-1 text-xs">
                      → Array (Ventas) y fechas (FechaFin, FechaInicio)
                    </div>
                  </div>
                  <div className="bg-gray-50 dark:bg-gray-700 p-2 rounded font-mono text-xs">
                    <div className="text-gray-600 dark:text-gray-400">Ejemplo 2: Eficiencia por día</div>
                    <div className="text-gray-900 dark:text-gray-100 mt-1">
                      (CompletadoTotal / ObjetivoTotal) * 100 / DAYS(FechaFin, FechaInicio)
                    </div>
                    <div className="text-gray-500 dark:text-gray-400 mt-1 text-xs">
                      → Números y fechas combinados
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Funciones del Sistema */}
          <div className="mt-4 p-4 bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded">
            <h5 className="text-sm font-semibold text-purple-900 dark:text-purple-300 mb-3">
              🔌 Funciones del Sistema - Acceso a Datos Reales
            </h5>
            <p className="text-sm text-purple-800 dark:text-purple-200 mb-3">
              Usa datos reales de prioridades, hitos, proyectos y usuarios directamente en tus fórmulas.
            </p>

            <div className="space-y-3 text-sm">
              {/* COUNT_PRIORITIES */}
              <div className="bg-white dark:bg-gray-800 p-3 rounded border border-purple-200 dark:border-purple-700">
                <div className="font-semibold text-purple-900 dark:text-purple-300 mb-2">
                  COUNT_PRIORITIES - Contar prioridades
                </div>
                <div className="space-y-2">
                  <div className="bg-gray-50 dark:bg-gray-700 p-2 rounded font-mono text-xs">
                    <div className="text-gray-600 dark:text-gray-400">Sin filtros (todas las prioridades):</div>
                    <div className="text-gray-900 dark:text-gray-100 mt-1">COUNT_PRIORITIES()</div>
                  </div>
                  <div className="bg-gray-50 dark:bg-gray-700 p-2 rounded font-mono text-xs">
                    <div className="text-gray-600 dark:text-gray-400">Con filtros específicos:</div>
                    <div className="text-gray-900 dark:text-gray-100 mt-1">COUNT_PRIORITIES({`{status: "COMPLETADO"}`})</div>
                    <div className="text-gray-500 dark:text-gray-400 mt-1">
                      Filtros: status, type, userId, initiativeId, projectId, clientId, weekStart, weekEnd, completionMin, completionMax
                    </div>
                  </div>
                </div>
              </div>

              {/* COMPLETION_RATE */}
              <div className="bg-white dark:bg-gray-800 p-3 rounded border border-purple-200 dark:border-purple-700">
                <div className="font-semibold text-purple-900 dark:text-purple-300 mb-2">
                  COMPLETION_RATE - Tasa de cumplimiento
                </div>
                <div className="space-y-2">
                  <div className="bg-gray-50 dark:bg-gray-700 p-2 rounded font-mono text-xs">
                    <div className="text-gray-600 dark:text-gray-400">Tasa general:</div>
                    <div className="text-gray-900 dark:text-gray-100 mt-1">COMPLETION_RATE()</div>
                  </div>
                  <div className="bg-gray-50 dark:bg-gray-700 p-2 rounded font-mono text-xs">
                    <div className="text-gray-600 dark:text-gray-400">Por área/usuario:</div>
                    <div className="text-gray-900 dark:text-gray-100 mt-1">COMPLETION_RATE({`{userId: "123abc"}`})</div>
                  </div>
                </div>
              </div>

              {/* AVG_PRIORITIES */}
              <div className="bg-white dark:bg-gray-800 p-3 rounded border border-purple-200 dark:border-purple-700">
                <div className="font-semibold text-purple-900 dark:text-purple-300 mb-2">
                  AVG_PRIORITIES - Promedio de campo
                </div>
                <div className="bg-gray-50 dark:bg-gray-700 p-2 rounded font-mono text-xs">
                  <div className="text-gray-600 dark:text-gray-400">Promedio de completitud:</div>
                  <div className="text-gray-900 dark:text-gray-100 mt-1">
                    AVG_PRIORITIES("completionPercentage", {`{status: "COMPLETADO"}`})
                  </div>
                </div>
              </div>

              {/* COUNT_MILESTONES */}
              <div className="bg-white dark:bg-gray-800 p-3 rounded border border-purple-200 dark:border-purple-700">
                <div className="font-semibold text-purple-900 dark:text-purple-300 mb-2">
                  COUNT_MILESTONES - Contar hitos
                </div>
                <div className="bg-gray-50 dark:bg-gray-700 p-2 rounded font-mono text-xs">
                  <div className="text-gray-600 dark:text-gray-400">Hitos completados:</div>
                  <div className="text-gray-900 dark:text-gray-100 mt-1">COUNT_MILESTONES({`{isCompleted: true}`})</div>
                  <div className="text-gray-500 dark:text-gray-400 mt-1">
                    Filtros: userId, projectId, isCompleted, dueDateStart, dueDateEnd
                  </div>
                </div>
              </div>

              {/* Ejemplo combinado */}
              <div className="bg-white dark:bg-gray-800 p-3 rounded border border-purple-200 dark:border-purple-700">
                <div className="font-semibold text-purple-900 dark:text-purple-300 mb-2">
                  💡 Ejemplo combinado
                </div>
                <div className="bg-gray-50 dark:bg-gray-700 p-2 rounded font-mono text-xs">
                  <div className="text-gray-600 dark:text-gray-400">Índice de efectividad (prioridades completadas vs hitos):</div>
                  <div className="text-gray-900 dark:text-gray-100 mt-1">
                    (COUNT_PRIORITIES({`{status: "COMPLETADO"}`}) / COUNT_MILESTONES({`{isCompleted: true}`})) * 100
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded text-sm">
            <strong className="text-blue-900 dark:text-blue-300">Nota:</strong>
            <p className="text-blue-800 dark:text-blue-200 mt-1">
              Las variables se detectan automáticamente según su nombre y contexto.
              El sistema mostrará el tipo de input apropiado (número, fecha, o lista) al registrar valores.
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
