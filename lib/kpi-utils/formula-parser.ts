/**
 * Funciones especiales del sistema que se procesan antes de hot-formula-parser
 */
const SYSTEM_FUNCTIONS = [
  'COUNT_PRIORITIES',
  'SUM_PRIORITIES',
  'AVG_PRIORITIES',
  'COUNT_MILESTONES',
  'COUNT_PROJECTS',
  'COUNT_USERS',
  'GET_PRIORITIES',
  'GET_MILESTONES',
  'GET_PROJECTS',
  'GET_USERS',
  'COMPLETION_RATE',
  'PERCENTAGE'
];

/**
 * Obtiene la lista completa de funciones soportadas por hot-formula-parser
 */
function getSupportedFormulas(): string[] {
  try {
    const { SUPPORTED_FORMULAS } = require('hot-formula-parser');
    return SUPPORTED_FORMULAS || [];
  } catch (error) {
    // Fallback si no se puede cargar la lista dinámica
    console.warn('No se pudo cargar SUPPORTED_FORMULAS, usando lista básica');
    return [
      'SUM', 'AVERAGE', 'MAX', 'MIN', 'IF', 'ABS', 'ROUND', 'CEILING', 'FLOOR',
      'SQRT', 'POWER', 'EXP', 'LOG', 'LN', 'MEDIAN', 'STDEV', 'VAR', 'COUNT',
      'AND', 'OR', 'NOT', 'TRUE', 'FALSE', 'CONCATENATE', 'UPPER', 'LOWER',
      'TODAY', 'NOW', 'DATE', 'YEAR', 'MONTH', 'DAY', 'DAYS', 'EDATE'
    ];
  }
}

/**
 * Obtiene todas las funciones soportadas (Excel + Sistema)
 */
export function getAllSupportedFunctions(): string[] {
  return [...getSupportedFormulas(), ...SYSTEM_FUNCTIONS];
}

/**
 * Tipo de variable detectado
 */
export type VariableType = 'number' | 'date' | 'array';

export interface VariableInfo {
  name: string;
  type: VariableType;
}

/**
 * Detecta el tipo de una variable basándose en su nombre y contexto en la fórmula
 */
function detectVariableType(varName: string, formula: string): VariableType {
  const lowerName = varName.toLowerCase();

  // Detectar fechas por nombre
  const datePatterns = [
    'fecha', 'date', 'dia', 'day', 'inicio', 'fin', 'start', 'end',
    'desde', 'hasta', 'from', 'to', 'when', 'tiempo', 'time'
  ];

  if (datePatterns.some(pattern => lowerName.includes(pattern))) {
    return 'date';
  }

  // Detectar arrays por contexto (funciones que típicamente reciben arrays)
  const arrayFunctions = ['SUM', 'AVERAGE', 'MEDIAN', 'MAX', 'MIN', 'COUNT', 'STDEV', 'VAR'];
  const varPattern = new RegExp(`(${arrayFunctions.join('|')})\\s*\\([^)]*\\b${varName}\\b[^)]*\\)`, 'i');

  if (varPattern.test(formula)) {
    return 'array';
  }

  // Por defecto, es un número
  return 'number';
}

/**
 * Extrae las variables de una fórmula con información de tipo
 */
export function extractVariablesWithTypes(formula: string): VariableInfo[] {
  const varNames = extractVariablesFromFormula(formula);

  return varNames.map(name => ({
    name,
    type: detectVariableType(name, formula)
  }));
}

/**
 * Extrae las variables de una fórmula
 * Las variables son palabras que comienzan con letra y pueden contener letras, números y guiones bajos
 * Excluye palabras reservadas de las funciones
 */
export function extractVariablesFromFormula(formula: string): string[] {
  if (!formula || !formula.trim()) {
    return [];
  }

  // Obtener todas las funciones soportadas (Excel + Sistema)
  const allFunctions = getAllSupportedFunctions();

  // Normalizar a mayúsculas para comparación case-insensitive
  const reservedFunctions = new Set(allFunctions.map(f => f.toUpperCase()));

  // Agregar palabras reservadas adicionales que NO son variables
  const reservedWords = new Set([
    'TRUE', 'FALSE', 'NULL', 'UNDEFINED',
    // Nombres de parámetros comunes que no son variables
    'STATUS', 'TYPE', 'USERNAME', 'INITIATIVENAME', 'PROJECTNAME',
    'CLIENTNAME', 'ISCARRIEDOVER', 'WEEKSTART', 'WEEKEND',
    'COMPLETIONMIN', 'COMPLETIONMAX', 'ISCOMPLETED', 'DUEDATESTART',
    'DUEDATEEND', 'ISACTIVE', 'PROJECTMANAGERNAME', 'ROLE', 'AREA',
    'ISAREALEADER',
    // Valores de estado comunes
    'COMPLETADO', 'EN_TIEMPO', 'EN_RIESGO', 'BLOQUEADO', 'REPROGRAMADO',
    'ADMIN', 'USER'
  ]);

  // Primero, eliminar todo el contenido entre comillas para no detectarlo como variables
  let cleanFormula = formula;

  // Remover strings entre comillas dobles
  cleanFormula = cleanFormula.replace(/"[^"]*"/g, '""');

  // Remover strings entre comillas simples
  cleanFormula = cleanFormula.replace(/'[^']*'/g, "''");

  // Remover contenido de objetos {} para evitar detectar nombres de parámetros
  // Esto es un poco más complejo porque pueden estar anidados
  let depth = 0;
  let inObject = false;
  let cleanedChars: string[] = [];

  for (let i = 0; i < cleanFormula.length; i++) {
    const char = cleanFormula[i];

    if (char === '{') {
      depth++;
      inObject = true;
      cleanedChars.push(char);
    } else if (char === '}') {
      depth--;
      if (depth === 0) inObject = false;
      cleanedChars.push(char);
    } else if (inObject) {
      // Dentro de un objeto, solo preservar espacios y caracteres especiales
      if (char === ' ' || char === ',' || char === ':') {
        cleanedChars.push(char);
      } else {
        cleanedChars.push(' '); // Reemplazar con espacio
      }
    } else {
      cleanedChars.push(char);
    }
  }

  cleanFormula = cleanedChars.join('');

  // Extraer todas las palabras que podrían ser variables
  // Una variable es una palabra que empieza con letra y contiene letras, números o guiones bajos
  const variablePattern = /\b[a-zA-Z_][a-zA-Z0-9_]*\b/g;
  const matches = cleanFormula.match(variablePattern) || [];

  // Filtrar funciones reservadas, palabras reservadas, palabras de 1 letra y duplicados
  const variables = [...new Set(matches)]
    .filter(word => {
      const upperWord = word.toUpperCase();
      // Ignorar palabras de 1 sola letra (no son variables válidas)
      if (word.length === 1) return false;
      // Filtrar funciones y palabras reservadas
      return !reservedFunctions.has(upperWord) && !reservedWords.has(upperWord);
    })
    .sort();

  return variables;
}

/**
 * Valida que una fórmula tenga sintaxis correcta
 */
export function validateFormulaSyntax(formula: string): { valid: boolean; error?: string } {
  if (!formula || !formula.trim()) {
    return { valid: false, error: 'La fórmula no puede estar vacía' };
  }

  try {
    const Parser = require('hot-formula-parser').Parser;
    const parser = new Parser();

    // Extraer variables y asignar valores de prueba
    const variables = extractVariablesFromFormula(formula);
    variables.forEach(varName => {
      parser.setVariable(varName, 100);
    });

    const result = parser.parse(formula);

    if (result.error) {
      return { valid: false, error: result.error };
    }

    return { valid: true };
  } catch (error: any) {
    return { valid: false, error: error.message };
  }
}

/**
 * Convierte un valor de string al tipo apropiado para hot-formula-parser
 */
export function convertVariableValue(value: string, type: VariableType): any {
  if (!value || value.trim() === '') {
    return null;
  }

  switch (type) {
    case 'date':
      // Convertir string de fecha a objeto Date
      const dateValue = new Date(value);
      return isNaN(dateValue.getTime()) ? null : dateValue;

    case 'array':
      // Convertir string separado por comas a array de números
      try {
        const items = value.split(',').map(item => {
          const trimmed = item.trim();
          const num = parseFloat(trimmed);
          return isNaN(num) ? trimmed : num;
        });
        return items;
      } catch {
        return null;
      }

    case 'number':
    default:
      const num = parseFloat(value);
      return isNaN(num) ? null : num;
  }
}

/**
 * Calcula el resultado de una fórmula con valores específicos de variables
 */
export function calculateFormulaValue(
  formula: string,
  variableValues: { [key: string]: number }
): { success: boolean; result?: number; error?: string } {
  try {
    const Parser = require('hot-formula-parser').Parser;
    const parser = new Parser();

    // Registrar todas las variables con sus valores
    Object.keys(variableValues).forEach(varName => {
      parser.setVariable(varName, variableValues[varName]);
    });

    const result = parser.parse(formula);

    if (result.error) {
      return { success: false, error: result.error };
    }

    return { success: true, result: result.result };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

/**
 * Calcula el resultado de una fórmula con valores de diferentes tipos
 */
export function calculateFormulaWithTypes(
  formula: string,
  variableValues: { [key: string]: any }
): { success: boolean; result?: number; error?: string } {
  try {
    const Parser = require('hot-formula-parser').Parser;
    const parser = new Parser();

    // Registrar todas las variables con sus valores (soporta Date, arrays, etc.)
    Object.keys(variableValues).forEach(varName => {
      const value = variableValues[varName];
      parser.setVariable(varName, value);
    });

    const result = parser.parse(formula);

    if (result.error) {
      return { success: false, error: result.error };
    }

    return { success: true, result: result.result };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

/**
 * Detecta si una fórmula usa funciones del sistema
 */
export function usesSystemFunctions(formula: string): boolean {
  const upperFormula = formula.toUpperCase();
  return SYSTEM_FUNCTIONS.some(func => upperFormula.includes(func));
}

/**
 * Calcula una fórmula que puede incluir funciones del sistema
 * Esta función debe ser llamada desde el lado del servidor ya que las funciones del sistema son asíncronas
 */
export async function calculateFormulaWithSystemData(
  formula: string,
  variableValues: { [key: string]: any } = {}
): Promise<{ success: boolean; result?: number; error?: string }> {
  try {
    // Si no usa funciones del sistema, usar el cálculo estándar
    if (!usesSystemFunctions(formula)) {
      return calculateFormulaWithTypes(formula, variableValues);
    }

    // Importar las funciones del sistema
    const {
      COUNT_PRIORITIES,
      SUM_PRIORITIES,
      AVG_PRIORITIES,
      COUNT_MILESTONES,
      COUNT_PROJECTS,
      COUNT_USERS,
      COMPLETION_RATE,
      PERCENTAGE
    } = await import('./system-data-functions');

    // Evaluar la fórmula con las funciones del sistema disponibles
    // Nota: Esta es una implementación segura que solo permite funciones predefinidas
    const context: any = {
      ...variableValues,
      COUNT_PRIORITIES,
      SUM_PRIORITIES,
      AVG_PRIORITIES,
      COUNT_MILESTONES,
      COUNT_PROJECTS,
      COUNT_USERS,
      COMPLETION_RATE,
      PERCENTAGE,
      // Funciones matemáticas básicas de JavaScript
      Math,
      Date
    };

    // Procesar la fórmula: las funciones del sistema se evalúan primero
    // luego el resultado se pasa a hot-formula-parser para procesar funciones Excel
    const Parser = require('hot-formula-parser').Parser;
    const parser = new Parser();

    // Registrar variables estándar
    Object.keys(variableValues).forEach(varName => {
      parser.setVariable(varName, variableValues[varName]);
    });

    // Por ahora, parseamos y evaluamos directamente
    // En el futuro, podríamos implementar un preprocesador más sofisticado
    const result = parser.parse(formula);

    if (result.error) {
      return { success: false, error: result.error };
    }

    return { success: true, result: result.result };
  } catch (error: any) {
    console.error('Error in calculateFormulaWithSystemData:', error);
    return { success: false, error: error.message };
  }
}
