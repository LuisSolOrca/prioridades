/**
 * Script para reparar prioridades huérfanas de auto-reprogramación
 *
 * Encuentra prioridades marcadas como REPROGRAMADO sin su copia correspondiente
 * y las reprograma correctamente creando la copia faltante.
 *
 * Uso: npx tsx scripts/fix-orphaned-reschedules.ts
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

// Import models
import connectDB from '../lib/mongodb';
import Priority from '../models/Priority';
import Comment from '../models/Comment';
import User from '../models/User';
import { getWeekDates } from '../lib/utils';

async function main() {
  try {
    console.log('🔌 Conectando a MongoDB...');
    await connectDB();
    console.log('✅ Conectado a MongoDB\n');

    // Find all REPROGRAMADO priorities
    const reprogrammedPriorities = await Priority.find({
      status: 'REPROGRAMADO'
    }).populate('userId', 'name email').sort({ updatedAt: -1 });

    console.log(`📋 Verificando ${reprogrammedPriorities.length} prioridades REPROGRAMADO...\n`);

    const orphanedPriorities = [];

    for (const reprogrammed of reprogrammedPriorities) {
      // Look for corresponding carried over priority
      const originalWeekEnd = new Date(reprogrammed.weekEnd);

      const carriedOver = await Priority.findOne({
        userId: reprogrammed.userId,
        title: reprogrammed.title,
        isCarriedOver: true,
        weekStart: { $gt: originalWeekEnd }
      }).sort({ weekStart: 1 });

      if (!carriedOver) {
        orphanedPriorities.push(reprogrammed);
      }
    }

    console.log(`❌ Prioridades huérfanas encontradas: ${orphanedPriorities.length}\n`);

    if (orphanedPriorities.length === 0) {
      console.log('✅ No hay prioridades huérfanas que reparar.\n');
      return;
    }

    console.log('Las siguientes prioridades serán reparadas:\n');
    orphanedPriorities.forEach((p, index) => {
      const user = p.userId as any;
      console.log(`${index + 1}. ${p.title}`);
      console.log(`   Usuario: ${user.name} (${user.email})`);
      console.log(`   Semana original: ${new Date(p.weekStart).toLocaleDateString('es-MX')} - ${new Date(p.weekEnd).toLocaleDateString('es-MX')}\n`);
    });

    const readline = require('readline').createInterface({
      input: process.stdin,
      output: process.stdout
    });

    const answer = await new Promise<string>((resolve) => {
      readline.question('¿Deseas crear las copias faltantes? (si/no): ', resolve);
    });

    readline.close();

    if (answer.toLowerCase() !== 'si' && answer.toLowerCase() !== 's') {
      console.log('\n❌ Operación cancelada.\n');
      return;
    }

    console.log('\n🔧 Reparando prioridades huérfanas...\n');

    let successCount = 0;
    let failCount = 0;

    // Calculate next week using the same logic as the rest of the app
    const now = new Date();
    const nextWeekDate = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    const nextWeek = getWeekDates(nextWeekDate);
    const nextMonday = nextWeek.monday;
    const nextFriday = new Date(nextWeek.friday);
    nextFriday.setHours(23, 59, 59, 999);

    console.log(`📅 Semana de destino: ${nextMonday.toLocaleDateString('es-MX')} - ${nextFriday.toLocaleDateString('es-MX')}\n`);

    for (const original of orphanedPriorities) {
      try {
        console.log(`🔄 Procesando: ${original.title}...`);

        // Create new priority for next week
        const newPriority = new Priority({
          title: original.title,
          description: original.description,
          weekStart: nextMonday,
          weekEnd: nextFriday,
          completionPercentage: 0,
          status: 'EN_TIEMPO',
          type: original.type,
          userId: original.userId,
          initiativeIds: original.initiativeIds,
          clientId: original.clientId,
          projectId: original.projectId,
          checklist: original.checklist?.map(item => ({
            text: item.text,
            completed: false
          })) || [],
          evidenceLinks: [],
          wasEdited: false,
          isCarriedOver: true
        });

        const savedPriority = await newPriority.save();

        // Create system comment on the new priority
        await Comment.create({
          priorityId: savedPriority._id,
          userId: original.userId,
          text: `🤖 Prioridad creada por reparación automática desde la semana del ${new Date(original.weekStart).toLocaleDateString('es-MX')}`,
          isSystemComment: true
        });

        console.log(`   ✅ Copia creada con ID: ${savedPriority._id}`);
        successCount++;

      } catch (error) {
        console.log(`   ❌ Error: ${error instanceof Error ? error.message : 'Error desconocido'}`);
        failCount++;
      }
    }

    console.log('\n═'.repeat(80));
    console.log('📊 RESUMEN DE REPARACIÓN:\n');
    console.log(`   Prioridades procesadas: ${orphanedPriorities.length}`);
    console.log(`   Exitosas: ${successCount}`);
    console.log(`   Fallidas: ${failCount}\n`);

    if (successCount > 0) {
      console.log('✅ Las copias han sido creadas exitosamente.');
      console.log(`   Puedes verificarlas en la semana del ${nextMonday.toLocaleDateString('es-MX')}\n`);
    }

  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  } finally {
    await mongoose.connection.close();
    console.log('🔌 Conexión cerrada');
  }
}

main();
