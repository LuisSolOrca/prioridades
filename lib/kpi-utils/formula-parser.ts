/**
 * Extrae las variables de una fórmula
 * Las variables son palabras que comienzan con letra y pueden contener letras, números y guiones bajos
 * Excluye palabras reservadas de las funciones
 */
export function extractVariablesFromFormula(formula: string): string[] {
  if (!formula || !formula.trim()) {
    return [];
  }

  // Funciones reservadas que no son variables
  const reservedFunctions = [
    'SUM', 'AVERAGE', 'AVG', 'MAX', 'MIN', 'IF', 'ABS', 'ROUND',
    'SQRT', 'POW', 'POWER', 'COUNT', 'MEDIAN', 'MODE', 'STDEV',
    'VAR', 'CONCAT', 'LEN', 'UPPER', 'LOWER', 'TRIM', 'LEFT',
    'RIGHT', 'MID', 'REPLACE', 'FIND', 'AND', 'OR', 'NOT', 'TRUE', 'FALSE'
  ];

  // Extraer todas las palabras que podrían ser variables
  // Una variable es una palabra que empieza con letra y contiene letras, números o guiones bajos
  const variablePattern = /\b[a-zA-Z_][a-zA-Z0-9_]*\b/g;
  const matches = formula.match(variablePattern) || [];

  // Filtrar funciones reservadas y duplicados
  const variables = [...new Set(matches)]
    .filter(word => !reservedFunctions.includes(word.toUpperCase()))
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
