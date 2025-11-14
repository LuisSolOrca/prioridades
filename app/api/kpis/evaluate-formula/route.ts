import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { usesSystemFunctions } from '@/lib/kpi-utils/formula-parser';
import {
  COUNT_PRIORITIES,
  SUM_PRIORITIES,
  AVG_PRIORITIES,
  COUNT_MILESTONES,
  COUNT_PROJECTS,
  COUNT_USERS,
  COMPLETION_RATE,
  PERCENTAGE
} from '@/lib/kpi-utils/system-data-functions';

/**
 * POST - Evalúa una fórmula que puede contener funciones del sistema
 * Body: {
 *   formula: string,
 *   variables?: { [key: string]: any }
 * }
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const body = await request.json();
    const { formula, variables = {} } = body;

    if (!formula) {
      return NextResponse.json({ error: 'Fórmula requerida' }, { status: 400 });
    }

    // Si la fórmula no usa funciones del sistema, usar hot-formula-parser normal
    if (!usesSystemFunctions(formula)) {
      const Parser = require('hot-formula-parser').Parser;
      const parser = new Parser();

      // Registrar variables
      Object.keys(variables).forEach(varName => {
        parser.setVariable(varName, variables[varName]);
      });

      const result = parser.parse(formula);

      if (result.error) {
        return NextResponse.json({
          success: false,
          error: result.error
        }, { status: 400 });
      }

      return NextResponse.json({
        success: true,
        result: result.result,
        usesSystemFunctions: false
      });
    }

    // La fórmula usa funciones del sistema - evaluarlas primero y luego pasar a hot-formula-parser
    try {
      // Pre-procesar: Evaluar funciones del sistema y reemplazarlas con sus resultados
      let processedFormula = formula;

      // Buscar todas las llamadas a funciones del sistema usando regex
      const systemFunctionPattern = /(COUNT_PRIORITIES|SUM_PRIORITIES|AVG_PRIORITIES|COUNT_MILESTONES|COUNT_PROJECTS|COUNT_USERS|COMPLETION_RATE|PERCENTAGE)\s*\(([^)]*)\)/g;

      const matches = [...formula.matchAll(systemFunctionPattern)];

      // Evaluar cada función del sistema y reemplazarla con su resultado
      for (const match of matches) {
        const fullMatch = match[0];
        const functionName = match[1];
        const argsString = match[2];

        let result: number;

        try {
          // Evaluar los argumentos de la función
          const evalArgs = new Function('return ' + (argsString.trim() || '{}'))();

          // Llamar a la función correspondiente
          switch (functionName) {
            case 'COUNT_PRIORITIES':
              result = await COUNT_PRIORITIES(evalArgs);
              break;
            case 'SUM_PRIORITIES':
              // Extraer campo y filtros: SUM_PRIORITIES("campo", {filtros})
              const sumMatch = argsString.match(/"([^"]+)"\s*,?\s*(.*)/);
              if (sumMatch) {
                const field = sumMatch[1];
                const filters = sumMatch[2] ? new Function('return ' + sumMatch[2])() : {};
                result = await SUM_PRIORITIES(field, filters);
              } else {
                throw new Error(`Argumentos inválidos para SUM_PRIORITIES: ${argsString}`);
              }
              break;
            case 'AVG_PRIORITIES':
              // Extraer campo y filtros: AVG_PRIORITIES("campo", {filtros})
              const avgMatch = argsString.match(/"([^"]+)"\s*,?\s*(.*)/);
              if (avgMatch) {
                const field = avgMatch[1];
                const filters = avgMatch[2] ? new Function('return ' + avgMatch[2])() : {};
                result = await AVG_PRIORITIES(field, filters);
              } else {
                throw new Error(`Argumentos inválidos para AVG_PRIORITIES: ${argsString}`);
              }
              break;
            case 'COUNT_MILESTONES':
              result = await COUNT_MILESTONES(evalArgs);
              break;
            case 'COUNT_PROJECTS':
              result = await COUNT_PROJECTS(evalArgs);
              break;
            case 'COUNT_USERS':
              result = await COUNT_USERS(evalArgs);
              break;
            case 'COMPLETION_RATE':
              result = await COMPLETION_RATE(evalArgs);
              break;
            case 'PERCENTAGE':
              // PERCENTAGE(parte, total)
              const percentageArgs = argsString.split(',').map((arg: string) => {
                const trimmed = arg.trim();
                return parseFloat(trimmed);
              });
              if (percentageArgs.length === 2) {
                result = PERCENTAGE(percentageArgs[0], percentageArgs[1]);
              } else {
                throw new Error(`PERCENTAGE requiere 2 argumentos: ${argsString}`);
              }
              break;
            default:
              throw new Error(`Función desconocida: ${functionName}`);
          }

          // Reemplazar la llamada con el resultado numérico
          processedFormula = processedFormula.replace(fullMatch, result.toString());

        } catch (err: any) {
          console.error(`Error evaluando ${functionName}:`, err);
          throw new Error(`Error en ${functionName}: ${err.message}`);
        }
      }

      // Ahora que las funciones del sistema están evaluadas,
      // pasar la fórmula procesada a hot-formula-parser para funciones Excel
      const Parser = require('hot-formula-parser').Parser;
      const parser = new Parser();

      // Registrar variables
      Object.keys(variables).forEach(varName => {
        parser.setVariable(varName, variables[varName]);
      });

      const parseResult = parser.parse(processedFormula);

      if (parseResult.error) {
        return NextResponse.json({
          success: false,
          error: parseResult.error
        }, { status: 400 });
      }

      return NextResponse.json({
        success: true,
        result: parseResult.result,
        usesSystemFunctions: true,
        processedFormula // Para debugging
      });

    } catch (evalError: any) {
      console.error('Error evaluating system formula:', evalError);
      return NextResponse.json({
        success: false,
        error: `Error al evaluar la fórmula: ${evalError.message}`
      }, { status: 400 });
    }

  } catch (error: any) {
    console.error('Error in evaluate-formula:', error);
    return NextResponse.json({
      error: error.message
    }, { status: 500 });
  }
}
