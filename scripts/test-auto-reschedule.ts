/**
 * Script para probar la funcionalidad de auto-reprogramación
 *
 * Este script crea prioridades de prueba que ya vencieron en estado EN_TIEMPO
 * y luego ejecuta la función de auto-reprogramación para verificar que funciona.
 *
 * Uso: npx tsx scripts/test-auto-reschedule.ts
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

// Import models
import connectDB from '../lib/mongodb';
import Priority from '../models/Priority';
import User from '../models/User';
import StrategicInitiative from '../models/StrategicInitiative';
import Client from '../models/Client';

async function main() {
  try {
    console.log('🔌 Conectando a MongoDB...');
    await connectDB();
    console.log('✅ Conectado a MongoDB\n');

    // Find a test user
    const testUser = await User.findOne({ email: 'admin@empresa.com' });
    if (!testUser) {
      console.error('❌ No se encontró el usuario de prueba (admin@empresa.com)');
      process.exit(1);
    }
    console.log(`👤 Usuario de prueba: ${testUser.name} (${testUser.email})\n`);

    // Find an initiative
    const initiative = await StrategicInitiative.findOne({ isActive: true });
    if (!initiative) {
      console.error('❌ No se encontró ninguna iniciativa activa');
      process.exit(1);
    }
    console.log(`📋 Iniciativa: ${initiative.name}\n`);

    // Find a client
    const client = await Client.findOne({ isActive: true });
    if (!client) {
      console.error('❌ No se encontró ningún cliente activo');
      process.exit(1);
    }
    console.log(`🏢 Cliente: ${client.name}\n`);

    // Create expired priorities in EN_TIEMPO status (last week)
    const lastWeekMonday = new Date();
    lastWeekMonday.setDate(lastWeekMonday.getDate() - lastWeekMonday.getDay() + 1 - 7); // Last Monday
    lastWeekMonday.setHours(0, 0, 0, 0);

    const lastWeekFriday = new Date(lastWeekMonday);
    lastWeekFriday.setDate(lastWeekMonday.getDate() + 4); // Last Friday

    console.log(`📅 Creando prioridades de prueba para la semana pasada:`);
    console.log(`   Lunes: ${lastWeekMonday.toLocaleDateString('es-MX')}`);
    console.log(`   Viernes: ${lastWeekFriday.toLocaleDateString('es-MX')}\n`);

    // Create 2 test priorities
    const testPriorities = [
      {
        title: '🧪 TEST - Prioridad Auto-Reprogramación 1',
        description: 'Prioridad de prueba para verificar auto-reprogramación',
        weekStart: lastWeekMonday,
        weekEnd: lastWeekFriday,
        completionPercentage: 45,
        status: 'EN_TIEMPO',
        type: 'ESTRATEGICA',
        userId: testUser._id,
        initiativeIds: [initiative._id],
        clientId: client._id,
        checklist: [
          { text: 'Tarea de prueba 1', completed: false },
          { text: 'Tarea de prueba 2', completed: true, completedHours: 2 }
        ],
        wasEdited: false,
        isCarriedOver: false
      },
      {
        title: '🧪 TEST - Prioridad Auto-Reprogramación 2',
        description: 'Segunda prioridad de prueba para verificar auto-reprogramación',
        weekStart: lastWeekMonday,
        weekEnd: lastWeekFriday,
        completionPercentage: 30,
        status: 'EN_TIEMPO',
        type: 'OPERATIVA',
        userId: testUser._id,
        initiativeIds: [initiative._id],
        clientId: client._id,
        checklist: [
          { text: 'Tarea operativa 1', completed: false }
        ],
        wasEdited: false,
        isCarriedOver: false
      }
    ];

    const createdPriorities = await Priority.insertMany(testPriorities);
    console.log(`✅ Creadas ${createdPriorities.length} prioridades de prueba:\n`);
    createdPriorities.forEach((p, index) => {
      console.log(`   ${index + 1}. ${p.title}`);
      console.log(`      ID: ${p._id}`);
      console.log(`      Status: ${p.status}`);
      console.log(`      Avance: ${p.completionPercentage}%`);
      console.log(`      Semana: ${p.weekStart.toLocaleDateString('es-MX')} - ${p.weekEnd.toLocaleDateString('es-MX')}\n`);
    });

    // Now trigger auto-reschedule
    console.log('🔄 Ejecutando auto-reprogramación...\n');

    const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000';
    const response = await fetch(`${baseUrl}/api/priorities/auto-reschedule`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    const result = await response.json();

    if (!response.ok) {
      console.error('❌ Error en auto-reprogramación:', result);
      process.exit(1);
    }

    console.log('✅ Auto-reprogramación completada:\n');
    console.log(`   Éxitos: ${result.stats.success}`);
    console.log(`   Fallos: ${result.stats.failed}`);
    console.log(`   Próxima semana: ${new Date(result.nextWeek.monday).toLocaleDateString('es-MX')} - ${new Date(result.nextWeek.friday).toLocaleDateString('es-MX')}\n`);

    // Verify results
    console.log('🔍 Verificando resultados...\n');

    for (const created of createdPriorities) {
      const originalPriority = await Priority.findById(created._id);
      console.log(`📋 Prioridad Original: ${originalPriority?.title}`);
      console.log(`   Status: ${originalPriority?.status} ${originalPriority?.status === 'REPROGRAMADO' ? '✅' : '❌'}`);

      // Find the rescheduled copy
      const rescheduledPriority = await Priority.findOne({
        userId: testUser._id,
        title: created.title,
        isCarriedOver: true,
        weekStart: { $gte: new Date() }
      });

      if (rescheduledPriority) {
        console.log(`📋 Prioridad Reprogramada: ${rescheduledPriority.title}`);
        console.log(`   ID: ${rescheduledPriority._id}`);
        console.log(`   Status: ${rescheduledPriority.status} ${rescheduledPriority.status === 'EN_TIEMPO' ? '✅' : '❌'}`);
        console.log(`   Avance: ${rescheduledPriority.completionPercentage}% ${rescheduledPriority.completionPercentage === 0 ? '✅' : '❌'}`);
        console.log(`   isCarriedOver: ${rescheduledPriority.isCarriedOver} ${rescheduledPriority.isCarriedOver ? '✅' : '❌'}`);
        console.log(`   Semana: ${rescheduledPriority.weekStart.toLocaleDateString('es-MX')} - ${rescheduledPriority.weekEnd.toLocaleDateString('es-MX')}`);
        console.log(`   Checklist: ${rescheduledPriority.checklist?.length} tareas (todas sin completar) ${rescheduledPriority.checklist?.every(t => !t.completed) ? '✅' : '❌'}\n`);
      } else {
        console.log(`❌ No se encontró la prioridad reprogramada\n`);
      }
    }

    console.log('\n🎉 Prueba completada exitosamente!');
    console.log('\n💡 Limpieza: Las prioridades de prueba permanecerán en la base de datos.');
    console.log('   Puedes eliminarlas manualmente o ejecutar el script de limpieza si lo deseas.\n');

  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  } finally {
    await mongoose.connection.close();
    console.log('🔌 Conexión cerrada');
  }
}

main();
