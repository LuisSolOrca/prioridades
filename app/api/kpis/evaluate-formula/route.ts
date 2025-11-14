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

    // La fórmula usa funciones del sistema - evaluarla con contexto del sistema
    try {
      // Crear un contexto seguro con las funciones del sistema
      const context: any = {
        ...variables,
        COUNT_PRIORITIES,
        SUM_PRIORITIES,
        AVG_PRIORITIES,
        COUNT_MILESTONES,
        COUNT_PROJECTS,
        COUNT_USERS,
        COMPLETION_RATE,
        PERCENTAGE,
        // Funciones matemáticas estándar
        Math,
        // Funciones de agregación para compatibilidad
        SUM: (...args: number[]) => args.reduce((a, b) => a + b, 0),
        AVERAGE: (...args: number[]) => args.reduce((a, b) => a + b, 0) / args.length,
        MAX: Math.max,
        MIN: Math.min,
        ROUND: Math.round,
        ABS: Math.abs,
        SQRT: Math.sqrt,
        POW: Math.pow,
      };

      // Evaluar la fórmula de manera segura
      // Reemplazar las llamadas a funciones del sistema con await
      let processedFormula = formula;

      // Lista de funciones async del sistema
      const asyncFunctions = [
        'COUNT_PRIORITIES',
        'SUM_PRIORITIES',
        'AVG_PRIORITIES',
        'COUNT_MILESTONES',
        'COUNT_PROJECTS',
        'COUNT_USERS',
        'COMPLETION_RATE'
      ];

      // Detectar si tiene funciones async
      const hasAsyncFunctions = asyncFunctions.some(fn =>
        processedFormula.includes(fn)
      );

      if (hasAsyncFunctions) {
        // Evaluar usando async function
        const AsyncFunction = Object.getPrototypeOf(async function(){}).constructor;

        // Preparar los parámetros de la función
        const paramNames = Object.keys(context);
        const paramValues = Object.values(context);

        // Crear función async con el contexto
        const evalFunc = new AsyncFunction(
          ...paramNames,
          `return (${processedFormula})`
        );

        // Ejecutar la función
        const result = await evalFunc(...paramValues);

        return NextResponse.json({
          success: true,
          result: typeof result === 'number' ? result : parseFloat(result),
          usesSystemFunctions: true
        });
      } else {
        // Evaluar sincrónicamente (solo PERCENTAGE)
        const func = new Function(
          ...Object.keys(context),
          `return (${processedFormula})`
        );

        const result = func(...Object.values(context));

        return NextResponse.json({
          success: true,
          result: typeof result === 'number' ? result : parseFloat(result),
          usesSystemFunctions: true
        });
      }

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
