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
 * Extrae las variables de una fórmula
 * Las variables son palabras que comienzan con letra y pueden contener letras, números y guiones bajos
 * Excluye palabras reservadas de las funciones
 */
export function extractVariablesFromFormula(formula: string): string[] {
  if (!formula || !formula.trim()) {
    return [];
  }

  // Obtener todas las funciones soportadas por hot-formula-parser (385+ funciones)
  const supportedFormulas = getSupportedFormulas();

  // Normalizar a mayúsculas para comparación case-insensitive
  const reservedFunctions = new Set(supportedFormulas.map(f => f.toUpperCase()));

  // Extraer todas las palabras que podrían ser variables
  // Una variable es una palabra que empieza con letra y contiene letras, números o guiones bajos
  const variablePattern = /\b[a-zA-Z_][a-zA-Z0-9_]*\b/g;
  const matches = formula.match(variablePattern) || [];

  // Filtrar funciones reservadas y duplicados
  const variables = [...new Set(matches)]
    .filter(word => !reservedFunctions.has(word.toUpperCase()))
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
