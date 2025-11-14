/**
 * Script de prueba para verificar fórmulas de KPI a través del endpoint
 * Ejecutar con: npx tsx scripts/test-kpi-formulas.ts
 *
 * Este script prueba las fórmulas tal como se evaluarían en producción
 */

import 'dotenv/config';

// Simular las funciones que se usan en el endpoint
import {
  COUNT_PRIORITIES,
  SUM_PRIORITIES,
  AVG_PRIORITIES,
  COUNT_MILESTONES,
  COUNT_PROJECTS,
  COUNT_USERS,
  COMPLETION_RATE,
  PERCENTAGE
} from '../lib/kpi-utils/system-data-functions-server';

// Simular el Parser de hot-formula-parser
const Parser = require('hot-formula-parser').Parser;

interface TestCase {
  name: string;
  formula: string;
  description: string;
}

const testCases: TestCase[] = [
  {
    name: 'Tasa de completitud simple',
    formula: 'COMPLETION_RATE()',
    description: 'Calcula el porcentaje de prioridades completadas'
  },
  {
    name: 'Tasa de completitud esta semana',
    formula: 'COMPLETION_RATE({weekStart: "2025-11-10T06:00:00.000Z", weekEnd: "2025-11-15T05:59:59.999Z"})',
    description: 'Tasa de completitud filtrada por semana'
  },
  {
    name: 'Total de prioridades',
    formula: 'COUNT_PRIORITIES()',
    description: 'Cuenta todas las prioridades'
  },
  {
    name: 'Prioridades completadas',
    formula: 'COUNT_PRIORITIES({status: "COMPLETADO"})',
    description: 'Cuenta solo prioridades completadas'
  },
  {
    name: 'Prioridades en tiempo',
    formula: 'COUNT_PRIORITIES({status: "EN_TIEMPO"})',
    description: 'Cuenta prioridades en tiempo'
  },
  {
    name: 'Promedio de completitud',
    formula: 'AVG_PRIORITIES("completionPercentage", {})',
    description: 'Promedio de % de completitud'
  },
  {
    name: 'Fórmula híbrida - ROUND',
    formula: 'ROUND(COMPLETION_RATE(), 2)',
    description: 'Tasa de completitud redondeada a 2 decimales'
  },
  {
    name: 'Fórmula híbrida - multiplicación',
    formula: 'COMPLETION_RATE() * 100',
    description: 'Tasa expresada como número sin %'
  },
  {
    name: 'Fórmula híbrida - ROUND y multiplicación',
    formula: 'ROUND(COMPLETION_RATE() * 100, 2)',
    description: 'Tasa como número redondeado'
  },
  {
    name: 'Promedio redondeado',
    formula: 'ROUND(AVG_PRIORITIES("completionPercentage", {}), 1)',
    description: 'Promedio de completitud redondeado'
  },
  {
    name: 'Total de proyectos activos',
    formula: 'COUNT_PROJECTS({isActive: true})',
    description: 'Cuenta proyectos activos'
  },
  {
    name: 'Total de usuarios activos',
    formula: 'COUNT_USERS({isActive: true})',
    description: 'Cuenta usuarios activos'
  },
  {
    name: 'Porcentaje de prioridades completadas',
    formula: 'PERCENTAGE(COUNT_PRIORITIES({status: "COMPLETADO"}), COUNT_PRIORITIES())',
    description: 'Porcentaje calculado con PERCENTAGE helper'
  },
  {
    name: 'Fórmula compleja con IF',
    formula: 'IF(COMPLETION_RATE() > 50, "✅ Bien", "⚠️ Mejorar")',
    description: 'Condicional basado en tasa de completitud'
  },
  {
    name: 'Suma de Excel con conteos',
    formula: 'SUM(COUNT_PRIORITIES({status: "COMPLETADO"}), COUNT_PRIORITIES({status: "EN_TIEMPO"}))',
    description: 'Suma usando función Excel'
  }
];

async function evaluateFormula(formula: string): Promise<any> {
  // Simular exactamente lo que hace el endpoint /api/kpis/evaluate-formula

  // Pre-procesar: Evaluar funciones del sistema y reemplazarlas con sus resultados
  let processedFormula = formula;

  // Procesar funciones anidadas múltiples veces hasta que no haya más funciones del sistema
  let maxIterations = 10; // Prevenir loops infinitos
  let iteration = 0;

  while (iteration < maxIterations) {
    // Buscar funciones del sistema que NO contengan otras funciones del sistema en sus argumentos
    // Esto nos permite procesar de adentro hacia afuera
    const systemFunctions = 'COUNT_PRIORITIES|SUM_PRIORITIES|AVG_PRIORITIES|COUNT_MILESTONES|COUNT_PROJECTS|COUNT_USERS|COMPLETION_RATE|PERCENTAGE';

    // Primero, buscamos funciones que solo tienen argumentos simples (sin otras funciones del sistema)
    const simpleFunctionPattern = new RegExp(`(${systemFunctions})\\s*\\(([^()]*)\\)`, 'g');

    const matches = [...processedFormula.matchAll(simpleFunctionPattern)];

    // Si no hay más matches, terminamos
    if (matches.length === 0) break;

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
      throw new Error(`Error en ${functionName}: ${err.message}`);
    }
  }

    iteration++;
  }

  // Ahora que las funciones del sistema están evaluadas,
  // pasar la fórmula procesada a hot-formula-parser para funciones Excel
  const parser = new Parser();
  const parseResult = parser.parse(processedFormula);

  if (parseResult.error) {
    throw new Error(parseResult.error);
  }

  return {
    result: parseResult.result,
    processedFormula
  };
}

async function runTests() {
  console.log('\n🧪 Probando fórmulas de KPI como lo haría el endpoint\n');
  console.log('═'.repeat(70));

  let passed = 0;
  let failed = 0;

  for (const testCase of testCases) {
    try {
      console.log(`\n📝 ${testCase.name}`);
      console.log(`   Fórmula: ${testCase.formula}`);
      console.log(`   Descripción: ${testCase.description}`);

      const startTime = Date.now();
      const { result, processedFormula } = await evaluateFormula(testCase.formula);
      const duration = Date.now() - startTime;

      console.log(`   ✅ Resultado: ${typeof result === 'string' ? `"${result}"` : result}`);
      if (processedFormula !== testCase.formula) {
        console.log(`   📊 Procesada: ${processedFormula}`);
      }
      console.log(`   ⏱️  Tiempo: ${duration}ms`);

      passed++;
    } catch (error: any) {
      console.log(`   ❌ Error: ${error.message}`);
      failed++;
    }
  }

  console.log('\n' + '═'.repeat(70));
  console.log(`\n📊 Resultados: ${passed} pasadas, ${failed} fallidas de ${testCases.length} pruebas`);

  if (failed === 0) {
    console.log('✅ ¡Todas las pruebas pasaron!\n');
  } else {
    console.log('⚠️  Algunas pruebas fallaron\n');
    process.exit(1);
  }

  process.exit(0);
}

runTests();
