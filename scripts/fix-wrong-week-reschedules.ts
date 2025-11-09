/**
 * Script para corregir prioridades reprogramadas en la semana incorrecta
 *
 * Las prioridades fueron reprogramadas a la semana 9-13 de noviembre,
 * pero deberían estar en la semana 11-15 de noviembre (próxima semana).
 *
 * Este script:
 * 1. Encuentra prioridades con isCarriedOver: true en la semana 9-13 nov
 * 2. Las mueve a la semana 11-15 nov
 * 3. Actualiza los comentarios del sistema
 *
 * Uso: npx tsx scripts/fix-wrong-week-reschedules.ts
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

    // Force model registration
    User;
    Priority;
    Comment;

    // Calculate the correct next week (11-15 November)
    const now = new Date();
    const nextWeekDate = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    const correctWeek = getWeekDates(nextWeekDate);
    const correctMonday = correctWeek.monday;
    const correctFriday = new Date(correctWeek.friday);
    correctFriday.setHours(23, 59, 59, 999);

    console.log(`📅 Semana correcta: ${correctMonday.toLocaleDateString('es-MX')} - ${correctFriday.toLocaleDateString('es-MX')}\n`);

    // Find priorities in the wrong week
    // The dates are stored with local timezone offset, so Nov 9 18:00 CST = Nov 10 00:00 UTC
    // We need to find priorities where weekStart is around Nov 10 00:00 UTC (Nov 9 18:00 local)
    const wrongWeekPriorities = await Priority.find({
      isCarriedOver: true,
      weekStart: {
        $gte: new Date('2025-11-09T00:00:00.000Z'),
        $lt: new Date('2025-11-11T00:00:00.000Z') // Before Nov 11 to catch Nov 9-10
      }
    }).populate('userId', 'name email').lean();

    console.log(`🔍 Prioridades encontradas en semana incorrecta: ${wrongWeekPriorities.length}\n`);

    if (wrongWeekPriorities.length === 0) {
      console.log('✅ No hay prioridades que corregir.\n');
      return;
    }

    console.log('Las siguientes prioridades serán movidas a la semana correcta:\n');
    wrongWeekPriorities.forEach((p: any, index) => {
      console.log(`${index + 1}. ${p.title}`);
      console.log(`   Usuario: ${p.userId.name} (${p.userId.email})`);
      console.log(`   Semana actual: ${new Date(p.weekStart).toLocaleDateString('es-MX')} - ${new Date(p.weekEnd).toLocaleDateString('es-MX')}`);
      console.log(`   → Nueva semana: ${correctMonday.toLocaleDateString('es-MX')} - ${correctFriday.toLocaleDateString('es-MX')}\n`);
    });

    const readline = require('readline').createInterface({
      input: process.stdin,
      output: process.stdout
    });

    const answer = await new Promise<string>((resolve) => {
      readline.question('¿Deseas mover estas prioridades a la semana correcta? (si/no): ', resolve);
    });

    readline.close();

    if (answer.toLowerCase() !== 'si' && answer.toLowerCase() !== 's') {
      console.log('\n❌ Operación cancelada.\n');
      return;
    }

    console.log('\n🔧 Moviendo prioridades a la semana correcta...\n');

    let successCount = 0;
    let failCount = 0;

    for (const priority of wrongWeekPriorities) {
      try {
        console.log(`🔄 Procesando: ${priority.title}...`);

        // Update the priority with correct week
        await Priority.findByIdAndUpdate(
          priority._id,
          {
            weekStart: correctMonday,
            weekEnd: correctFriday,
            updatedAt: new Date()
          }
        );

        // Add a system comment explaining the correction
        await Comment.create({
          priorityId: priority._id,
          userId: priority.userId,
          text: `🤖 Semana corregida automáticamente de ${new Date(priority.weekStart).toLocaleDateString('es-MX')} a ${correctMonday.toLocaleDateString('es-MX')} (corrección de cálculo de semana)`,
          isSystemComment: true
        });

        console.log(`   ✅ Movida a semana correcta`);
        successCount++;

      } catch (error) {
        console.log(`   ❌ Error: ${error instanceof Error ? error.message : 'Error desconocido'}`);
        failCount++;
      }
    }

    console.log('\n═'.repeat(80));
    console.log('📊 RESUMEN DE CORRECCIÓN:\n');
    console.log(`   Prioridades procesadas: ${wrongWeekPriorities.length}`);
    console.log(`   Exitosas: ${successCount}`);
    console.log(`   Fallidas: ${failCount}\n`);

    if (successCount > 0) {
      console.log('✅ Las prioridades han sido movidas a la semana correcta.');
      console.log(`   Ahora aparecen en la semana del ${correctMonday.toLocaleDateString('es-MX')}\n`);
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
