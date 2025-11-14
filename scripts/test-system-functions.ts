/**
 * Script de prueba para verificar todas las funciones del sistema
 * Ejecutar con: npx tsx scripts/test-system-functions.ts
 */

import 'dotenv/config';

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

async function testSystemFunctions() {
  console.log('\n🧪 Iniciando pruebas de funciones del sistema...\n');

  try {
    // Test 1: COUNT_PRIORITIES
    console.log('1️⃣ COUNT_PRIORITIES()');
    const totalPriorities = await COUNT_PRIORITIES();
    console.log(`   ✓ Total de prioridades: ${totalPriorities}`);

    const completedPriorities = await COUNT_PRIORITIES({ status: 'COMPLETADO' });
    console.log(`   ✓ Prioridades completadas: ${completedPriorities}`);

    const inTimePriorities = await COUNT_PRIORITIES({ status: 'EN_TIEMPO' });
    console.log(`   ✓ Prioridades en tiempo: ${inTimePriorities}`);

    // Test 2: SUM_PRIORITIES
    console.log('\n2️⃣ SUM_PRIORITIES()');
    const sumCompletion = await SUM_PRIORITIES('completionPercentage', {});
    console.log(`   ✓ Suma de % de completitud: ${sumCompletion.toFixed(2)}`);

    // Test 3: AVG_PRIORITIES
    console.log('\n3️⃣ AVG_PRIORITIES()');
    const avgCompletion = await AVG_PRIORITIES('completionPercentage', {});
    console.log(`   ✓ Promedio de % de completitud: ${avgCompletion.toFixed(2)}%`);

    const avgCompletedOnly = await AVG_PRIORITIES('completionPercentage', { status: 'COMPLETADO' });
    console.log(`   ✓ Promedio de completadas: ${avgCompletedOnly.toFixed(2)}%`);

    // Test 4: COUNT_MILESTONES
    console.log('\n4️⃣ COUNT_MILESTONES()');
    const totalMilestones = await COUNT_MILESTONES();
    console.log(`   ✓ Total de hitos: ${totalMilestones}`);

    const completedMilestones = await COUNT_MILESTONES({ isCompleted: true });
    console.log(`   ✓ Hitos completados: ${completedMilestones}`);

    // Test 5: COUNT_PROJECTS
    console.log('\n5️⃣ COUNT_PROJECTS()');
    const totalProjects = await COUNT_PROJECTS();
    console.log(`   ✓ Total de proyectos: ${totalProjects}`);

    const activeProjects = await COUNT_PROJECTS({ isActive: true });
    console.log(`   ✓ Proyectos activos: ${activeProjects}`);

    // Test 6: COUNT_USERS
    console.log('\n6️⃣ COUNT_USERS()');
    const totalUsers = await COUNT_USERS();
    console.log(`   ✓ Total de usuarios: ${totalUsers}`);

    const activeUsers = await COUNT_USERS({ isActive: true });
    console.log(`   ✓ Usuarios activos: ${activeUsers}`);

    // Test 7: COMPLETION_RATE
    console.log('\n7️⃣ COMPLETION_RATE()');
    const completionRate = await COMPLETION_RATE();
    console.log(`   ✓ Tasa de completitud general: ${completionRate.toFixed(2)}%`);

    // Test 8: PERCENTAGE
    console.log('\n8️⃣ PERCENTAGE()');
    const percentage = PERCENTAGE(completedPriorities, totalPriorities);
    console.log(`   ✓ Porcentaje calculado: ${percentage.toFixed(2)}%`);

    // Test 9: Filtros combinados
    console.log('\n9️⃣ Pruebas con filtros combinados');

    // Obtener fecha de inicio y fin de la semana actual
    const now = new Date();
    const monday = new Date(now);
    monday.setDate(now.getDate() - now.getDay() + 1);
    monday.setHours(0, 0, 0, 0);

    const friday = new Date(monday);
    friday.setDate(monday.getDate() + 4);
    friday.setHours(23, 59, 59, 999);

    const thisWeekPriorities = await COUNT_PRIORITIES({
      weekStart: monday.toISOString(),
      weekEnd: friday.toISOString()
    });
    console.log(`   ✓ Prioridades esta semana: ${thisWeekPriorities}`);

    const thisWeekCompletionRate = await COMPLETION_RATE({
      weekStart: monday.toISOString(),
      weekEnd: friday.toISOString()
    });
    console.log(`   ✓ Tasa de completitud esta semana: ${thisWeekCompletionRate.toFixed(2)}%`);

    // Test 10: Verificar filtros de rango
    console.log('\n🔟 Pruebas con rangos de completitud');
    const lowCompletion = await COUNT_PRIORITIES({ completionMin: 0, completionMax: 50 });
    console.log(`   ✓ Prioridades con 0-50% completitud: ${lowCompletion}`);

    const highCompletion = await COUNT_PRIORITIES({ completionMin: 50, completionMax: 100 });
    console.log(`   ✓ Prioridades con 50-100% completitud: ${highCompletion}`);

    // Resumen
    console.log('\n📊 RESUMEN DE PRUEBAS');
    console.log('═══════════════════════════════════════');
    console.log(`Total Prioridades:     ${totalPriorities}`);
    console.log(`  - Completadas:       ${completedPriorities} (${percentage.toFixed(1)}%)`);
    console.log(`  - En Tiempo:         ${inTimePriorities}`);
    console.log(`  - Esta semana:       ${thisWeekPriorities}`);
    console.log(`Promedio Completitud:  ${avgCompletion.toFixed(1)}%`);
    console.log(`Total Hitos:           ${totalMilestones}`);
    console.log(`  - Completados:       ${completedMilestones}`);
    console.log(`Total Proyectos:       ${totalProjects}`);
    console.log(`  - Activos:           ${activeProjects}`);
    console.log(`Total Usuarios:        ${totalUsers}`);
    console.log(`  - Activos:           ${activeUsers}`);
    console.log('═══════════════════════════════════════');

    console.log('\n✅ ¡Todas las pruebas completadas exitosamente!\n');

  } catch (error) {
    console.error('\n❌ Error durante las pruebas:', error);
    process.exit(1);
  }

  process.exit(0);
}

// Ejecutar pruebas
testSystemFunctions();
