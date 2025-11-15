'use client';

import { useEffect, useRef, useState } from 'react';
import Editor, { OnMount } from '@monaco-editor/react';
import { editor } from 'monaco-editor';
import { extractVariablesFromFormula } from '@/lib/kpi-utils/formula-parser';

interface MonacoFormulaEditorProps {
  value: string;
  onChange: (value: string) => void;
}

interface AutocompleteData {
  users: Array<{ id: string; name: string; email: string; area: string; label: string; value: string }>;
  projects: Array<{ id: string; name: string; label: string; value: string }>;
  initiatives: Array<{ id: string; name: string; label: string; value: string }>;
  clients: Array<{ id: string; name: string; label: string; value: string }>;
  areas: Array<{ label: string; value: string }>;
  statuses: Array<{ label: string; value: string; description: string }>;
  roles: Array<{ label: string; value: string; description: string }>;
  fields: Array<{ label: string; value: string; description: string }>;
}

// Definición de funciones del sistema con sus parámetros
const SYSTEM_FUNCTIONS = [
  {
    name: 'COUNT_PRIORITIES',
    signature: 'COUNT_PRIORITIES(filtros?)',
    description: 'Cuenta prioridades que cumplen ciertos criterios',
    documentation: `Cuenta el número de prioridades según los criterios especificados.

**Filtros disponibles:**
• status: Estado de la prioridad (usa autocompletado)
• type: Tipo de prioridad
• userName: Nombre del usuario (usa autocompletado)
• initiativeName: Nombre de iniciativa (usa autocompletado)
• projectName: Nombre del proyecto (usa autocompletado)
• clientName: Nombre del cliente (usa autocompletado)
• isCarriedOver: Prioridades arrastradas (true/false)
• weekStart: Fecha inicio "YYYY-MM-DD"
• weekEnd: Fecha fin "YYYY-MM-DD"
• completionMin: % mínimo (0-100)
• completionMax: % máximo (0-100)

**Ejemplos:**
COUNT_PRIORITIES()
COUNT_PRIORITIES({status: "COMPLETADO"})
COUNT_PRIORITIES({userName: "Juan Pérez", status: "EN_RIESGO"})
COUNT_PRIORITIES({initiativeName: "Generación de ingresos"})`,
    insertText: 'COUNT_PRIORITIES({})',
    detail: '🔌 Sistema',
    params: ['status', 'type', 'userName', 'initiativeName', 'projectName', 'clientName', 'isCarriedOver', 'weekStart', 'weekEnd', 'completionMin', 'completionMax']
  },
  {
    name: 'SUM_PRIORITIES',
    signature: 'SUM_PRIORITIES(campo, filtros?)',
    description: 'Suma un campo numérico de las prioridades',
    documentation: `Suma el valor de un campo numérico en las prioridades filtradas.

**Parámetros:**
• campo: "completionPercentage" (entre comillas)
• filtros: Objeto con filtros (opcional)

**Filtros disponibles:**
• status, userName, initiativeName, projectName, etc.

**Ejemplos:**
SUM_PRIORITIES("completionPercentage")
SUM_PRIORITIES("completionPercentage", {status: "COMPLETADO"})
SUM_PRIORITIES("completionPercentage", {userName: "María López"})`,
    insertText: 'SUM_PRIORITIES("completionPercentage", {})',
    detail: '🔌 Sistema',
    params: ['status', 'type', 'userName', 'initiativeName', 'projectName']
  },
  {
    name: 'AVG_PRIORITIES',
    signature: 'AVG_PRIORITIES(campo, filtros?)',
    description: 'Calcula el promedio de un campo numérico',
    documentation: `Calcula el promedio de un campo numérico en las prioridades filtradas.

**Parámetros:**
• campo: "completionPercentage" (entre comillas)
• filtros: Objeto con filtros (opcional)

**Ejemplos:**
AVG_PRIORITIES("completionPercentage")
AVG_PRIORITIES("completionPercentage", {status: "COMPLETADO"})
AVG_PRIORITIES("completionPercentage", {projectName: "Proyecto Alpha"})`,
    insertText: 'AVG_PRIORITIES("completionPercentage", {})',
    detail: '🔌 Sistema',
    params: ['status', 'type', 'userName', 'initiativeName', 'projectName']
  },
  {
    name: 'COUNT_MILESTONES',
    signature: 'COUNT_MILESTONES(filtros?)',
    description: 'Cuenta hitos que cumplen ciertos criterios',
    documentation: `Cuenta hitos según los criterios especificados.

**Filtros disponibles:**
• userName: Nombre del usuario (usa autocompletado)
• projectName: Nombre del proyecto (usa autocompletado)
• isCompleted: Hitos completados (true/false)
• dueDateStart: Fecha desde "YYYY-MM-DD"
• dueDateEnd: Fecha hasta "YYYY-MM-DD"

**Ejemplos:**
COUNT_MILESTONES({isCompleted: true})
COUNT_MILESTONES({projectName: "Proyecto Beta"})
COUNT_MILESTONES({userName: "Carlos Ruiz", isCompleted: false})`,
    insertText: 'COUNT_MILESTONES({})',
    detail: '🔌 Sistema',
    params: ['userName', 'projectName', 'isCompleted', 'dueDateStart', 'dueDateEnd']
  },
  {
    name: 'COUNT_PROJECTS',
    signature: 'COUNT_PROJECTS(filtros?)',
    description: 'Cuenta proyectos',
    documentation: `Cuenta proyectos según los criterios especificados.

**Filtros disponibles:**
• isActive: Proyectos activos (true/false)
• projectManagerName: Nombre del gerente (usa autocompletado)

**Ejemplos:**
COUNT_PROJECTS({isActive: true})
COUNT_PROJECTS({projectManagerName: "Ana García"})`,
    insertText: 'COUNT_PROJECTS({})',
    detail: '🔌 Sistema',
    params: ['isActive', 'projectManagerName']
  },
  {
    name: 'COUNT_USERS',
    signature: 'COUNT_USERS(filtros?)',
    description: 'Cuenta usuarios del sistema',
    documentation: `Cuenta usuarios según los criterios especificados.

**Filtros disponibles:**
• role: Rol del usuario (usa autocompletado)
• area: Área o departamento (usa autocompletado)
• isActive: Usuarios activos (true/false)
• isAreaLeader: Líderes de área (true/false)

**Ejemplos:**
COUNT_USERS({area: "Tecnología"})
COUNT_USERS({role: "ADMIN"})
COUNT_USERS({area: "Ventas", isActive: true})`,
    insertText: 'COUNT_USERS({})',
    detail: '🔌 Sistema',
    params: ['role', 'area', 'isActive', 'isAreaLeader']
  },
  {
    name: 'COMPLETION_RATE',
    signature: 'COMPLETION_RATE(filtros?)',
    description: 'Calcula tasa de cumplimiento (%)',
    documentation: `Calcula el porcentaje de prioridades completadas.

**Filtros disponibles:** (mismos que COUNT_PRIORITIES)
• userName, initiativeName, projectName, weekStart, weekEnd, etc.

**Ejemplos:**
COMPLETION_RATE()
COMPLETION_RATE({userName: "Pedro Sánchez"})
COMPLETION_RATE({initiativeName: "Eficiencia Operativa"})
COMPLETION_RATE({weekStart: "2025-01-01", weekEnd: "2025-01-31"})`,
    insertText: 'COMPLETION_RATE({})',
    detail: '🔌 Sistema',
    params: ['userName', 'initiativeName', 'projectName', 'weekStart', 'weekEnd', 'status']
  },
  {
    name: 'PERCENTAGE',
    signature: 'PERCENTAGE(parte, total)',
    description: 'Calcula porcentaje: (parte / total) * 100',
    documentation: `Función auxiliar para calcular porcentajes.

**Parámetros:**
• parte: Valor parcial (número)
• total: Valor total (número)

**Retorna:** (parte / total) * 100

**Ejemplo:**
PERCENTAGE(25, 100) // = 25
PERCENTAGE(COUNT_PRIORITIES({status: "COMPLETADO"}), COUNT_PRIORITIES())`,
    insertText: 'PERCENTAGE(, )',
    detail: '🔌 Sistema',
    params: []
  }
];

// Funciones matemáticas y estadísticas de Excel/hot-formula-parser
const EXCEL_FUNCTIONS = [
  // Matemáticas Básicas
  { name: 'SUM', signature: 'SUM(...values)', description: 'Suma de valores', insertText: 'SUM()', detail: '🔢 Matemática' },
  { name: 'AVERAGE', signature: 'AVERAGE(...values)', description: 'Promedio aritmético', insertText: 'AVERAGE()', detail: '📊 Estadística' },
  { name: 'AVERAGEA', signature: 'AVERAGEA(...values)', description: 'Promedio incluyendo texto y lógicos', insertText: 'AVERAGEA()', detail: '📊 Estadística' },
  { name: 'MAX', signature: 'MAX(...values)', description: 'Valor máximo', insertText: 'MAX()', detail: '🔢 Matemática' },
  { name: 'MIN', signature: 'MIN(...values)', description: 'Valor mínimo', insertText: 'MIN()', detail: '🔢 Matemática' },
  { name: 'MAXA', signature: 'MAXA(...values)', description: 'Máximo incluyendo texto y lógicos', insertText: 'MAXA()', detail: '🔢 Matemática' },
  { name: 'MINA', signature: 'MINA(...values)', description: 'Mínimo incluyendo texto y lógicos', insertText: 'MINA()', detail: '🔢 Matemática' },
  { name: 'PRODUCT', signature: 'PRODUCT(...values)', description: 'Multiplicación de valores', insertText: 'PRODUCT()', detail: '🔢 Matemática' },
  { name: 'SUMPRODUCT', signature: 'SUMPRODUCT(array1, array2, ...)', description: 'Suma de productos', insertText: 'SUMPRODUCT(, )', detail: '🔢 Matemática' },

  // Redondeo
  { name: 'ROUND', signature: 'ROUND(number, decimals)', description: 'Redondear a decimales', insertText: 'ROUND(, 2)', detail: '🔢 Matemática' },
  { name: 'ROUNDUP', signature: 'ROUNDUP(number, decimals)', description: 'Redondear hacia arriba', insertText: 'ROUNDUP(, 2)', detail: '🔢 Matemática' },
  { name: 'ROUNDDOWN', signature: 'ROUNDDOWN(number, decimals)', description: 'Redondear hacia abajo', insertText: 'ROUNDDOWN(, 2)', detail: '🔢 Matemática' },
  { name: 'CEILING', signature: 'CEILING(number)', description: 'Redondear al entero superior', insertText: 'CEILING()', detail: '🔢 Matemática' },
  { name: 'FLOOR', signature: 'FLOOR(number)', description: 'Redondear al entero inferior', insertText: 'FLOOR()', detail: '🔢 Matemática' },
  { name: 'INT', signature: 'INT(number)', description: 'Parte entera', insertText: 'INT()', detail: '🔢 Matemática' },
  { name: 'TRUNC', signature: 'TRUNC(number, decimals)', description: 'Truncar decimales', insertText: 'TRUNC()', detail: '🔢 Matemática' },

  // Valor Absoluto y Signos
  { name: 'ABS', signature: 'ABS(number)', description: 'Valor absoluto', insertText: 'ABS()', detail: '🔢 Matemática' },
  { name: 'SIGN', signature: 'SIGN(number)', description: 'Signo del número (-1, 0, 1)', insertText: 'SIGN()', detail: '🔢 Matemática' },

  // Potencias y Raíces
  { name: 'SQRT', signature: 'SQRT(number)', description: 'Raíz cuadrada', insertText: 'SQRT()', detail: '🔢 Matemática' },
  { name: 'POWER', signature: 'POWER(base, exponent)', description: 'Potencia', insertText: 'POWER(, 2)', detail: '🔢 Matemática' },
  { name: 'EXP', signature: 'EXP(number)', description: 'Exponencial e^x', insertText: 'EXP()', detail: '🔢 Matemática' },

  // Logaritmos
  { name: 'LOG', signature: 'LOG(number, base)', description: 'Logaritmo en base especificada', insertText: 'LOG(, 10)', detail: '🔢 Matemática' },
  { name: 'LOG10', signature: 'LOG10(number)', description: 'Logaritmo base 10', insertText: 'LOG10()', detail: '🔢 Matemática' },
  { name: 'LN', signature: 'LN(number)', description: 'Logaritmo natural (base e)', insertText: 'LN()', detail: '🔢 Matemática' },

  // Trigonométricas
  { name: 'SIN', signature: 'SIN(angle)', description: 'Seno (ángulo en radianes)', insertText: 'SIN()', detail: '📐 Trigonométrica' },
  { name: 'COS', signature: 'COS(angle)', description: 'Coseno (ángulo en radianes)', insertText: 'COS()', detail: '📐 Trigonométrica' },
  { name: 'TAN', signature: 'TAN(angle)', description: 'Tangente (ángulo en radianes)', insertText: 'TAN()', detail: '📐 Trigonométrica' },
  { name: 'ASIN', signature: 'ASIN(number)', description: 'Arcoseno', insertText: 'ASIN()', detail: '📐 Trigonométrica' },
  { name: 'ACOS', signature: 'ACOS(number)', description: 'Arcocoseno', insertText: 'ACOS()', detail: '📐 Trigonométrica' },
  { name: 'ATAN', signature: 'ATAN(number)', description: 'Arcotangente', insertText: 'ATAN()', detail: '📐 Trigonométrica' },
  { name: 'ATAN2', signature: 'ATAN2(x, y)', description: 'Arcotangente de y/x', insertText: 'ATAN2(, )', detail: '📐 Trigonométrica' },
  { name: 'SINH', signature: 'SINH(number)', description: 'Seno hiperbólico', insertText: 'SINH()', detail: '📐 Trigonométrica' },
  { name: 'COSH', signature: 'COSH(number)', description: 'Coseno hiperbólico', insertText: 'COSH()', detail: '📐 Trigonométrica' },
  { name: 'TANH', signature: 'TANH(number)', description: 'Tangente hiperbólica', insertText: 'TANH()', detail: '📐 Trigonométrica' },

  // Estadísticas
  { name: 'COUNT', signature: 'COUNT(...values)', description: 'Contar valores numéricos', insertText: 'COUNT()', detail: '📊 Estadística' },
  { name: 'COUNTA', signature: 'COUNTA(...values)', description: 'Contar valores no vacíos', insertText: 'COUNTA()', detail: '📊 Estadística' },
  { name: 'COUNTBLANK', signature: 'COUNTBLANK(range)', description: 'Contar celdas vacías', insertText: 'COUNTBLANK()', detail: '📊 Estadística' },
  { name: 'COUNTIF', signature: 'COUNTIF(range, criteria)', description: 'Contar con criterio', insertText: 'COUNTIF(, )', detail: '📊 Estadística' },
  { name: 'MEDIAN', signature: 'MEDIAN(...values)', description: 'Mediana', insertText: 'MEDIAN()', detail: '📊 Estadística' },
  { name: 'MODE', signature: 'MODE(...values)', description: 'Moda (valor más frecuente)', insertText: 'MODE()', detail: '📊 Estadística' },
  { name: 'STDEV', signature: 'STDEV(...values)', description: 'Desviación estándar (muestra)', insertText: 'STDEV()', detail: '📊 Estadística' },
  { name: 'STDEVP', signature: 'STDEVP(...values)', description: 'Desviación estándar (población)', insertText: 'STDEVP()', detail: '📊 Estadística' },
  { name: 'VAR', signature: 'VAR(...values)', description: 'Varianza (muestra)', insertText: 'VAR()', detail: '📊 Estadística' },
  { name: 'VARP', signature: 'VARP(...values)', description: 'Varianza (población)', insertText: 'VARP()', detail: '📊 Estadística' },
  { name: 'PERCENTILE', signature: 'PERCENTILE(array, k)', description: 'Percentil (k entre 0 y 1)', insertText: 'PERCENTILE(, 0.95)', detail: '📊 Estadística' },
  { name: 'QUARTILE', signature: 'QUARTILE(array, quart)', description: 'Cuartil (1, 2, 3)', insertText: 'QUARTILE(, 1)', detail: '📊 Estadística' },

  // Lógicas
  { name: 'IF', signature: 'IF(condition, valueIfTrue, valueIfFalse)', description: 'Condicional', insertText: 'IF(, , )', detail: '🔀 Lógica' },
  { name: 'AND', signature: 'AND(...conditions)', description: 'Y lógico', insertText: 'AND()', detail: '🔀 Lógica' },
  { name: 'OR', signature: 'OR(...conditions)', description: 'O lógico', insertText: 'OR()', detail: '🔀 Lógica' },
  { name: 'NOT', signature: 'NOT(logical)', description: 'Negación lógica', insertText: 'NOT()', detail: '🔀 Lógica' },
  { name: 'XOR', signature: 'XOR(...conditions)', description: 'O exclusivo', insertText: 'XOR()', detail: '🔀 Lógica' },
  { name: 'TRUE', signature: 'TRUE()', description: 'Valor verdadero', insertText: 'TRUE()', detail: '🔀 Lógica' },
  { name: 'FALSE', signature: 'FALSE()', description: 'Valor falso', insertText: 'FALSE()', detail: '🔀 Lógica' },

  // Fechas
  { name: 'TODAY', signature: 'TODAY()', description: 'Fecha actual', insertText: 'TODAY()', detail: '📅 Fecha' },
  { name: 'NOW', signature: 'NOW()', description: 'Fecha y hora actual', insertText: 'NOW()', detail: '📅 Fecha' },
  { name: 'DATE', signature: 'DATE(year, month, day)', description: 'Crear fecha', insertText: 'DATE(2025, 1, 15)', detail: '📅 Fecha' },
  { name: 'TIME', signature: 'TIME(hour, minute, second)', description: 'Crear hora', insertText: 'TIME(12, 30, 0)', detail: '📅 Fecha' },
  { name: 'YEAR', signature: 'YEAR(date)', description: 'Año de una fecha', insertText: 'YEAR()', detail: '📅 Fecha' },
  { name: 'MONTH', signature: 'MONTH(date)', description: 'Mes de una fecha', insertText: 'MONTH()', detail: '📅 Fecha' },
  { name: 'DAY', signature: 'DAY(date)', description: 'Día de una fecha', insertText: 'DAY()', detail: '📅 Fecha' },
  { name: 'HOUR', signature: 'HOUR(time)', description: 'Hora', insertText: 'HOUR()', detail: '📅 Fecha' },
  { name: 'MINUTE', signature: 'MINUTE(time)', description: 'Minutos', insertText: 'MINUTE()', detail: '📅 Fecha' },
  { name: 'SECOND', signature: 'SECOND(time)', description: 'Segundos', insertText: 'SECOND()', detail: '📅 Fecha' },
  { name: 'WEEKDAY', signature: 'WEEKDAY(date)', description: 'Día de la semana (1-7)', insertText: 'WEEKDAY()', detail: '📅 Fecha' },
  { name: 'DAYS', signature: 'DAYS(endDate, startDate)', description: 'Días entre fechas', insertText: 'DAYS(, )', detail: '📅 Fecha' },
  { name: 'DAYS360', signature: 'DAYS360(startDate, endDate)', description: 'Días entre fechas (año 360)', insertText: 'DAYS360(, )', detail: '📅 Fecha' },
  { name: 'EDATE', signature: 'EDATE(startDate, months)', description: 'Sumar/restar meses', insertText: 'EDATE(, 3)', detail: '📅 Fecha' },
  { name: 'EOMONTH', signature: 'EOMONTH(startDate, months)', description: 'Último día del mes', insertText: 'EOMONTH(, 0)', detail: '📅 Fecha' },
  { name: 'NETWORKDAYS', signature: 'NETWORKDAYS(startDate, endDate)', description: 'Días laborables', insertText: 'NETWORKDAYS(, )', detail: '📅 Fecha' },
  { name: 'WORKDAY', signature: 'WORKDAY(startDate, days)', description: 'Fecha laboral futura', insertText: 'WORKDAY(, )', detail: '📅 Fecha' },

  // Texto
  { name: 'CONCATENATE', signature: 'CONCATENATE(...texts)', description: 'Concatenar textos', insertText: 'CONCATENATE()', detail: '📝 Texto' },
  { name: 'CONCAT', signature: 'CONCAT(...texts)', description: 'Concatenar (moderno)', insertText: 'CONCAT()', detail: '📝 Texto' },
  { name: 'UPPER', signature: 'UPPER(text)', description: 'Convertir a mayúsculas', insertText: 'UPPER()', detail: '📝 Texto' },
  { name: 'LOWER', signature: 'LOWER(text)', description: 'Convertir a minúsculas', insertText: 'LOWER()', detail: '📝 Texto' },
  { name: 'PROPER', signature: 'PROPER(text)', description: 'Capitalizar cada palabra', insertText: 'PROPER()', detail: '📝 Texto' },
  { name: 'LEN', signature: 'LEN(text)', description: 'Longitud del texto', insertText: 'LEN()', detail: '📝 Texto' },
  { name: 'LEFT', signature: 'LEFT(text, numChars)', description: 'Caracteres desde izquierda', insertText: 'LEFT(, )', detail: '📝 Texto' },
  { name: 'RIGHT', signature: 'RIGHT(text, numChars)', description: 'Caracteres desde derecha', insertText: 'RIGHT(, )', detail: '📝 Texto' },
  { name: 'MID', signature: 'MID(text, start, numChars)', description: 'Caracteres del medio', insertText: 'MID(, , )', detail: '📝 Texto' },
  { name: 'TRIM', signature: 'TRIM(text)', description: 'Eliminar espacios extras', insertText: 'TRIM()', detail: '📝 Texto' },
  { name: 'SUBSTITUTE', signature: 'SUBSTITUTE(text, oldText, newText)', description: 'Sustituir texto', insertText: 'SUBSTITUTE(, , )', detail: '📝 Texto' },
  { name: 'REPLACE', signature: 'REPLACE(oldText, start, numChars, newText)', description: 'Reemplazar caracteres', insertText: 'REPLACE(, , , )', detail: '📝 Texto' },
  { name: 'FIND', signature: 'FIND(findText, withinText)', description: 'Buscar texto (case sensitive)', insertText: 'FIND(, )', detail: '📝 Texto' },
  { name: 'SEARCH', signature: 'SEARCH(findText, withinText)', description: 'Buscar texto (case insensitive)', insertText: 'SEARCH(, )', detail: '📝 Texto' },

  // Búsqueda y Referencia
  { name: 'CHOOSE', signature: 'CHOOSE(index, value1, value2, ...)', description: 'Elegir valor por índice', insertText: 'CHOOSE(, , )', detail: '🔍 Búsqueda' },
  { name: 'INDEX', signature: 'INDEX(array, row, col)', description: 'Valor en posición', insertText: 'INDEX(, , )', detail: '🔍 Búsqueda' },
  { name: 'MATCH', signature: 'MATCH(lookupValue, lookupArray, matchType)', description: 'Posición de valor', insertText: 'MATCH(, , 0)', detail: '🔍 Búsqueda' },

  // Conversión
  { name: 'TEXT', signature: 'TEXT(value, format)', description: 'Convertir a texto con formato', insertText: 'TEXT(, )', detail: '🔄 Conversión' },
  { name: 'VALUE', signature: 'VALUE(text)', description: 'Convertir texto a número', insertText: 'VALUE()', detail: '🔄 Conversión' },
  { name: 'NUMBERVALUE', signature: 'NUMBERVALUE(text)', description: 'Convertir a número', insertText: 'NUMBERVALUE()', detail: '🔄 Conversión' },

  // Utilidades
  { name: 'ISBLANK', signature: 'ISBLANK(value)', description: 'Verificar si está vacío', insertText: 'ISBLANK()', detail: '✅ Validación' },
  { name: 'ISNUMBER', signature: 'ISNUMBER(value)', description: 'Verificar si es número', insertText: 'ISNUMBER()', detail: '✅ Validación' },
  { name: 'ISTEXT', signature: 'ISTEXT(value)', description: 'Verificar si es texto', insertText: 'ISTEXT()', detail: '✅ Validación' },
  { name: 'ISERROR', signature: 'ISERROR(value)', description: 'Verificar si hay error', insertText: 'ISERROR()', detail: '✅ Validación' },
  { name: 'IFERROR', signature: 'IFERROR(value, valueIfError)', description: 'Manejar errores', insertText: 'IFERROR(, )', detail: '✅ Validación' },
  { name: 'MOD', signature: 'MOD(number, divisor)', description: 'Resto de división', insertText: 'MOD(, )', detail: '🔢 Matemática' },
  { name: 'RAND', signature: 'RAND()', description: 'Número aleatorio entre 0 y 1', insertText: 'RAND()', detail: '🎲 Aleatorio' },
  { name: 'RANDBETWEEN', signature: 'RANDBETWEEN(bottom, top)', description: 'Entero aleatorio en rango', insertText: 'RANDBETWEEN(1, 100)', detail: '🎲 Aleatorio' },
];

export default function MonacoFormulaEditor({ value, onChange }: MonacoFormulaEditorProps) {
  const editorRef = useRef<editor.IStandaloneCodeEditor | null>(null);
  const [detectedVariables, setDetectedVariables] = useState<string[]>([]);
  const [isDownloading, setIsDownloading] = useState(false);
  const [autocompleteData, setAutocompleteData] = useState<AutocompleteData | null>(null);
  const [loadingData, setLoadingData] = useState(true);

  // Cargar datos de autocompletado
  useEffect(() => {
    const loadAutocompleteData = async () => {
      try {
        const response = await fetch('/api/kpis/autocomplete-data');
        if (response.ok) {
          const data = await response.json();
          setAutocompleteData(data);
        }
      } catch (error) {
        console.error('Error loading autocomplete data:', error);
      } finally {
        setLoadingData(false);
      }
    };

    loadAutocompleteData();
  }, []);

  // Extraer variables automáticamente
  useEffect(() => {
    const variables = extractVariablesFromFormula(value);
    setDetectedVariables(variables);
  }, [value]);

  const handleEditorDidMount: OnMount = (monacoEditor, monaco) => {
    editorRef.current = monacoEditor;

    // Registrar proveedor de autocompletado
    monaco.languages.registerCompletionItemProvider('plaintext', {
      triggerCharacters: ['(', '{', ',', ' ', '"', ':'],
      provideCompletionItems: (model, position) => {
        const word = model.getWordUntilPosition(position);
        const range = {
          startLineNumber: position.lineNumber,
          endLineNumber: position.lineNumber,
          startColumn: word.startColumn,
          endColumn: word.endColumn,
        };

        const textUntilPosition = model.getValueInRange({
          startLineNumber: 1,
          startColumn: 1,
          endLineNumber: position.lineNumber,
          endColumn: position.column,
        });

        const lineText = model.getLineContent(position.lineNumber);
        const beforeCursor = lineText.substring(0, position.column - 1);

        let suggestions: any[] = [];

        // Detectar contexto: ¿estamos dentro de una función del sistema?
        const inSystemFunction = SYSTEM_FUNCTIONS.find(fn => {
          const functionStart = textUntilPosition.lastIndexOf(fn.name + '(');
          if (functionStart === -1) return false;

          const afterFunction = textUntilPosition.substring(functionStart);
          const openParens = (afterFunction.match(/\(/g) || []).length;
          const closeParens = (afterFunction.match(/\)/g) || []).length;

          return openParens > closeParens;
        });

        if (inSystemFunction && autocompleteData) {
          // Estamos dentro de una función del sistema

          // Detectar si estamos escribiendo un parámetro específico
          const paramMatch = beforeCursor.match(/(\w+):\s*"?$/);

          if (paramMatch) {
            const paramName = paramMatch[1];

            // Autocompletar valores según el parámetro
            if (paramName === 'status') {
              suggestions = autocompleteData.statuses.map(status => ({
                label: status.label,
                kind: monaco.languages.CompletionItemKind.EnumMember,
                detail: status.description,
                insertText: `"${status.value}"`,
                range: range,
                sortText: '0' + status.label,
              }));
            } else if (paramName === 'userName' || paramName === 'projectManagerName') {
              suggestions = autocompleteData.users.map(user => ({
                label: user.label,
                kind: monaco.languages.CompletionItemKind.User,
                detail: `Área: ${user.area || 'N/A'}`,
                insertText: `"${user.value}"`,
                range: range,
                documentation: `Email: ${user.email}`,
                sortText: '0' + user.name,
              }));
            } else if (paramName === 'projectName') {
              suggestions = autocompleteData.projects.map(project => ({
                label: project.label,
                kind: monaco.languages.CompletionItemKind.Module,
                detail: 'Proyecto',
                insertText: `"${project.value}"`,
                range: range,
                sortText: '0' + project.name,
              }));
            } else if (paramName === 'initiativeName') {
              suggestions = autocompleteData.initiatives.map(initiative => ({
                label: initiative.label,
                kind: monaco.languages.CompletionItemKind.Class,
                detail: 'Iniciativa Estratégica',
                insertText: `"${initiative.value}"`,
                range: range,
                sortText: '0' + initiative.name,
              }));
            } else if (paramName === 'clientName') {
              suggestions = autocompleteData.clients.map(client => ({
                label: client.label,
                kind: monaco.languages.CompletionItemKind.Reference,
                detail: 'Cliente',
                insertText: `"${client.value}"`,
                range: range,
                sortText: '0' + client.name,
              }));
            } else if (paramName === 'area') {
              suggestions = autocompleteData.areas.map(area => ({
                label: area.label,
                kind: monaco.languages.CompletionItemKind.Folder,
                detail: 'Área',
                insertText: `"${area.value}"`,
                range: range,
                sortText: '0' + area.value,
              }));
            } else if (paramName === 'role') {
              suggestions = autocompleteData.roles.map(role => ({
                label: role.label,
                kind: monaco.languages.CompletionItemKind.EnumMember,
                detail: role.description,
                insertText: `"${role.value}"`,
                range: range,
                sortText: '0' + role.label,
              }));
            } else if (paramName === 'isCompleted' || paramName === 'isActive' || paramName === 'isAreaLeader' || paramName === 'isCarriedOver') {
              suggestions = [
                {
                  label: 'true',
                  kind: monaco.languages.CompletionItemKind.Constant,
                  detail: 'Verdadero',
                  insertText: 'true',
                  range: range,
                  sortText: '0true',
                },
                {
                  label: 'false',
                  kind: monaco.languages.CompletionItemKind.Constant,
                  detail: 'Falso',
                  insertText: 'false',
                  range: range,
                  sortText: '0false',
                }
              ];
            }
          } else if (beforeCursor.match(/{\s*$/)) {
            // Acabamos de abrir llaves, sugerir parámetros disponibles para esta función
            const availableParams = inSystemFunction.params;

            suggestions = availableParams.map(param => {
              let detail = 'Parámetro';
              let insertText = `${param}: `;

              if (param.includes('Name')) {
                detail = 'Nombre (autocompletado disponible)';
                insertText = `${param}: ""`;
              } else if (param === 'status') {
                detail = 'Estado (autocompletado disponible)';
                insertText = `${param}: ""`;
              } else if (param.startsWith('is')) {
                detail = 'Booleano (true/false)';
                insertText = `${param}: true`;
              } else if (param.includes('Date') || param.includes('week')) {
                detail = 'Fecha (formato: "YYYY-MM-DD")';
                insertText = `${param}: "2025-01-01"`;
              } else if (param.includes('Min') || param.includes('Max')) {
                detail = 'Número (0-100)';
                insertText = `${param}: 0`;
              }

              return {
                label: param,
                kind: monaco.languages.CompletionItemKind.Property,
                detail: detail,
                insertText: insertText,
                range: range,
                sortText: '0' + param,
              };
            });
          } else if (beforeCursor.match(/,\s*$/)) {
            // Después de una coma, sugerir más parámetros
            const availableParams = inSystemFunction.params;

            suggestions = availableParams.map(param => {
              let insertText = `${param}: `;

              if (param.includes('Name') || param === 'status' || param === 'role' || param === 'area') {
                insertText = `${param}: ""`;
              } else if (param.startsWith('is')) {
                insertText = `${param}: true`;
              } else if (param.includes('Date') || param.includes('week')) {
                insertText = `${param}: "2025-01-01"`;
              } else if (param.includes('Min') || param.includes('Max')) {
                insertText = `${param}: 0`;
              }

              return {
                label: param,
                kind: monaco.languages.CompletionItemKind.Property,
                detail: 'Parámetro adicional',
                insertText: insertText,
                range: range,
                sortText: '0' + param,
              };
            });
          }
        } else {
          // No estamos dentro de una función, sugerir funciones
          const systemSuggestions = SYSTEM_FUNCTIONS.map(func => ({
            label: func.name,
            kind: monaco.languages.CompletionItemKind.Function,
            detail: func.detail,
            documentation: {
              value: `**${func.signature}**\n\n${func.description}\n\n${func.documentation}`,
              isTrusted: true,
            },
            insertText: func.insertText,
            range: range,
            sortText: '0' + func.name,
          }));

          const excelSuggestions = EXCEL_FUNCTIONS.map(func => ({
            label: func.name,
            kind: monaco.languages.CompletionItemKind.Function,
            detail: func.detail,
            documentation: {
              value: `**${func.signature}**\n\n${func.description}`,
              isTrusted: true,
            },
            insertText: func.insertText,
            range: range,
            sortText: '1' + func.name,
          }));

          suggestions = [...systemSuggestions, ...excelSuggestions];
        }

        return { suggestions };
      },
    });

    // Configurar tema
    monaco.editor.defineTheme('formulaTheme', {
      base: 'vs-dark',
      inherit: true,
      rules: [],
      colors: {
        'editor.background': '#1f2937',
      },
    });
  };

  const validateFormula = () => {
    if (!value.trim()) return null;

    try {
      const Parser = require('hot-formula-parser').Parser;
      const parser = new Parser();

      detectedVariables.forEach((varName) => {
        parser.setVariable(varName, 100);
      });

      let processedFormula = value;
      const systemFunctions = 'COUNT_PRIORITIES|SUM_PRIORITIES|AVG_PRIORITIES|COUNT_MILESTONES|COUNT_PROJECTS|COUNT_USERS|COMPLETION_RATE|PERCENTAGE';
      const simpleFunctionPattern = new RegExp(`(${systemFunctions})\\s*\\(([^()]*)\\)`, 'g');

      let maxIterations = 10;
      let iteration = 0;

      while (iteration < maxIterations) {
        const matches = [...processedFormula.matchAll(simpleFunctionPattern)];
        if (matches.length === 0) break;

        for (const match of matches) {
          const fullMatch = match[0];
          const functionName = match[1];

          let testValue = 50;

          switch (functionName) {
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
        }

        iteration++;
      }

      const result = parser.parse(processedFormula);

      if (result.error) {
        return { valid: false, error: result.error };
      }

      return { valid: true, result: result.result };
    } catch (error: any) {
      return { valid: false, error: error.message };
    }
  };

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

  const validation = validateFormula();

  return (
    <div className="space-y-4">
      <div>
        <div className="flex justify-between items-center mb-2">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            Fórmula de cálculo {loadingData && <span className="text-xs text-gray-500">(cargando datos...)</span>}
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
          <Editor
            height="200px"
            defaultLanguage="plaintext"
            value={value}
            onChange={(newValue) => onChange(newValue || '')}
            onMount={handleEditorDidMount}
            theme="vs-dark"
            options={{
              minimap: { enabled: false },
              lineNumbers: 'off',
              glyphMargin: false,
              folding: false,
              lineDecorationsWidth: 0,
              lineNumbersMinChars: 0,
              renderLineHighlight: 'none',
              scrollBeyondLastLine: false,
              wordWrap: 'on',
              fontSize: 14,
              fontFamily: 'ui-monospace, "Cascadia Code", "Source Code Pro", Menlo, Monaco, "Courier New", monospace',
              suggest: {
                showKeywords: false,
                showSnippets: true,
                insertMode: 'replace',
              },
              quickSuggestions: {
                other: true,
                comments: false,
                strings: true,
              },
              parameterHints: {
                enabled: true,
              },
              suggestOnTriggerCharacters: true,
              acceptSuggestionOnEnter: 'on',
            }}
          />
        </div>

        <div className="mt-2 flex items-start gap-2">
          <div className="flex-1">
            <p className="text-xs text-gray-600 dark:text-gray-400">
              💡 Presiona <kbd className="px-1.5 py-0.5 bg-gray-200 dark:bg-gray-700 rounded text-xs font-mono">Ctrl+Espacio</kbd> para autocompletado inteligente con datos reales
            </p>
            <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-1">
              ✨ Los nombres de usuarios, proyectos, iniciativas y áreas se autocompletan automáticamente
            </p>
          </div>
        </div>

        {validation && (
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
                <div className="mt-1 font-mono">
                  Resultado de prueba: <span className="font-bold">{validation.result}</span>
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
