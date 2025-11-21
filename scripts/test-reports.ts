/**
 * Script de prueba para reportes de rendimiento
 *
 * Uso:
 *   npx tsx scripts/test-reports.ts
 *
 * Este script genera reportes de prueba sin enviar correos
 */

import dotenv from 'dotenv';
import mongoose from 'mongoose';
import { generateAllUsersReports } from '../lib/reportStats';

dotenv.config();

async function testReports() {
  try {
    console.log('🔗 Conectando a MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI!);
    console.log('✅ Conectado a MongoDB\n');

    // Generar reportes semanales
    console.log('📊 Generando reportes SEMANALES...\n');
    const weeklyReports = await generateAllUsersReports('SEMANAL');

    console.log(`Total de usuarios: ${weeklyReports.length}\n`);

    for (const report of weeklyReports) {
      console.log('━'.repeat(80));
      console.log(`👤 Usuario: ${report.userName} (${report.userEmail})`);
      console.log(`📅 Período: ${report.period.label}`);
      console.log('━'.repeat(80));

      console.log('\n📈 Estadísticas del Período Actual:');
      console.log(`   • Prioridades Atendidas: ${report.currentStats.totalPriorities}`);
      console.log(`   • Prioridades Completadas: ${report.currentStats.completedPriorities}`);
      console.log(`   • Prioridades Retrasadas: ${report.currentStats.delayedPriorities}`);
      console.log(`   • Tareas Ejecutadas: ${report.currentStats.completedTasks} / ${report.currentStats.totalTasks}`);
      console.log(`   • Horas Reportadas: ${report.currentStats.totalHoursReported.toFixed(1)}h`);
      console.log(`   • Promedio de Completitud: ${report.currentStats.averageCompletionPercentage.toFixed(1)}%`);

      console.log('\n📊 Comparación con Período Anterior:');
      const formatChange = (value: number) => {
        if (value > 0) return `+${value.toFixed(1)}% ↑`;
        if (value < 0) return `${value.toFixed(1)}% ↓`;
        return '0% =';
      };

      console.log(`   • Prioridades: ${formatChange(report.comparison.prioritiesChange)}`);
      console.log(`   • Tasa de Completitud: ${formatChange(report.comparison.completionRateChange)}`);
      console.log(`   • Tareas: ${formatChange(report.comparison.tasksChange)}`);
      console.log(`   • Horas: ${formatChange(report.comparison.hoursChange)}`);
      console.log(`   • Retrasadas: ${formatChange(report.comparison.delayedChange)}`);

      if (report.topPriorities.length > 0) {
        console.log('\n⭐ Top Prioridades:');
        report.topPriorities.forEach((p, i) => {
          console.log(`   ${i + 1}. ${p.title}`);
          console.log(`      Status: ${p.status} | Completitud: ${p.completionPercentage}%`);
          console.log(`      Tareas: ${p.tasksCompleted}/${p.totalTasks}`);
        });
      }

      console.log('\n');
    }

    console.log('━'.repeat(80));
    console.log('\n🎉 Reportes generados exitosamente\n');

    // Estadísticas generales
    const totalPriorities = weeklyReports.reduce(
      (acc, r) => acc + r.currentStats.totalPriorities,
      0
    );
    const totalCompleted = weeklyReports.reduce(
      (acc, r) => acc + r.currentStats.completedPriorities,
      0
    );
    const totalHours = weeklyReports.reduce(
      (acc, r) => acc + r.currentStats.totalHoursReported,
      0
    );

    console.log('📊 Resumen General:');
    console.log(`   • Total de usuarios: ${weeklyReports.length}`);
    console.log(`   • Total de prioridades: ${totalPriorities}`);
    console.log(`   • Total completadas: ${totalCompleted}`);
    console.log(`   • Tasa de completitud global: ${totalPriorities > 0 ? ((totalCompleted / totalPriorities) * 100).toFixed(1) : 0}%`);
    console.log(`   • Total de horas reportadas: ${totalHours.toFixed(1)}h`);
    console.log('\n');

    // Generar reporte mensual de ejemplo
    console.log('━'.repeat(80));
    console.log('📊 Generando ejemplo de reporte MENSUAL...\n');
    const monthlyReports = await generateAllUsersReports('MENSUAL');

    if (monthlyReports.length > 0) {
      const report = monthlyReports[0];
      console.log(`👤 Usuario: ${report.userName}`);
      console.log(`📅 Período: ${report.period.label}`);
      console.log(`   • Prioridades Atendidas: ${report.currentStats.totalPriorities}`);
      console.log(`   • Prioridades Completadas: ${report.currentStats.completedPriorities}`);
      console.log(`   • Horas Reportadas: ${report.currentStats.totalHoursReported.toFixed(1)}h`);
      console.log('\n');
    }

  } catch (error) {
    console.error('❌ Error:', error);
    throw error;
  } finally {
    await mongoose.disconnect();
    console.log('✅ Desconectado de MongoDB');
  }
}

testReports()
  .then(() => {
    console.log('\n✅ Script completado exitosamente');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Error en el script:', error);
    process.exit(1);
  });
