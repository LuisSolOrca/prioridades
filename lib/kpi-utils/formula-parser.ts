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
  // Incluye las funciones más comunes de hot-formula-parser
  const reservedFunctions = [
    // Matemáticas básicas
    'SUM', 'AVERAGE', 'AVG', 'MAX', 'MIN', 'ABS', 'ROUND', 'CEILING', 'FLOOR',
    'SQRT', 'POW', 'POWER', 'EXP', 'LOG', 'LN', 'LOG10',

    // Estadísticas
    'MEDIAN', 'MODE', 'STDEV', 'VAR', 'COUNT', 'COUNTA', 'COUNTBLANK',
    'PERCENTILE', 'QUARTILE', 'RANK', 'CORREL', 'COVARIANCE',

    // Lógica
    'IF', 'AND', 'OR', 'NOT', 'TRUE', 'FALSE', 'XOR', 'SWITCH',

    // Texto
    'CONCAT', 'CONCATENATE', 'LEN', 'UPPER', 'LOWER', 'TRIM', 'LEFT',
    'RIGHT', 'MID', 'REPLACE', 'FIND', 'SEARCH', 'SUBSTITUTE', 'TEXT',

    // Fechas
    'TODAY', 'NOW', 'DATE', 'YEAR', 'MONTH', 'DAY', 'HOUR', 'MINUTE', 'SECOND',
    'WEEKDAY', 'DAYS', 'DAYS360', 'EDATE', 'EOMONTH', 'NETWORKDAYS', 'WORKDAY',
    'DATEDIF', 'DATEVALUE', 'TIMEVALUE',

    // Trigonométricas
    'SIN', 'COS', 'TAN', 'ASIN', 'ACOS', 'ATAN', 'ATAN2',
    'SINH', 'COSH', 'TANH', 'ASINH', 'ACOSH', 'ATANH',

    // Financieras
    'NPV', 'IRR', 'PMT', 'PV', 'FV', 'RATE', 'NPER', 'XIRR', 'XNPV',

    // Otras comunes
    'PI', 'E', 'RAND', 'RANDBETWEEN', 'MOD', 'GCD', 'LCM',
    'FACT', 'COMBIN', 'PERMUT', 'SIGN', 'QUOTIENT'
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
