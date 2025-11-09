/**
 * Script de diagnóstico para verificar el estado de prioridades reprogramadas
 *
 * Este script busca:
 * 1. Prioridades marcadas como REPROGRAMADO
 * 2. Verifica si tienen su correspondiente copia con isCarriedOver: true
 * 3. Identifica prioridades huérfanas (reprogramadas sin su copia)
 *
 * Uso: npx tsx scripts/diagnose-auto-reschedule.ts
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

async function main() {
  try {
    console.log('🔌 Conectando a MongoDB...');
    await connectDB();
    console.log('✅ Conectado a MongoDB\n');

    // Force model registration (needed in some environments)
    User;
    Priority;
    Comment;

    // Find all REPROGRAMADO priorities
    const reprogrammedPriorities = await Priority.find({
      status: 'REPROGRAMADO'
    }).populate('userId', 'name email').sort({ updatedAt: -1 }).lean();

    console.log(`📋 Total prioridades REPROGRAMADO: ${reprogrammedPriorities.length}\n`);

    if (reprogrammedPriorities.length === 0) {
      console.log('✅ No hay prioridades reprogramadas para verificar.\n');
      return;
    }

    let orphanedCount = 0;
    const orphanedPriorities = [];

    for (const reprogrammed of reprogrammedPriorities) {
      console.log('─'.repeat(80));
      console.log(`📌 Prioridad Reprogramada:`);
      console.log(`   ID: ${reprogrammed._id}`);
      console.log(`   Título: ${reprogrammed.title}`);
      console.log(`   Usuario: ${(reprogrammed.userId as any).name} (${(reprogrammed.userId as any).email})`);
      console.log(`   Semana original: ${new Date(reprogrammed.weekStart).toLocaleDateString('es-MX')} - ${new Date(reprogrammed.weekEnd).toLocaleDateString('es-MX')}`);
      console.log(`   Actualizada: ${new Date(reprogrammed.updatedAt!).toLocaleString('es-MX')}`);

      // Look for corresponding carried over priority
      // Should have same title, same user, isCarriedOver: true, and week after the original
      const originalWeekEnd = new Date(reprogrammed.weekEnd);
      const nextWeekStart = new Date(originalWeekEnd);
      nextWeekStart.setDate(nextWeekStart.getDate() + 3); // A few days after, to find next week

      const carriedOver = await Priority.findOne({
        userId: reprogrammed.userId,
        title: reprogrammed.title,
        isCarriedOver: true,
        weekStart: { $gt: originalWeekEnd }
      }).sort({ weekStart: 1 }).lean();

      if (carriedOver) {
        console.log(`   ✅ COPIA ENCONTRADA:`);
        console.log(`      ID: ${carriedOver._id}`);
        console.log(`      Status: ${carriedOver.status}`);
        console.log(`      Semana: ${new Date(carriedOver.weekStart).toLocaleDateString('es-MX')} - ${new Date(carriedOver.weekEnd).toLocaleDateString('es-MX')}`);
        console.log(`      Avance: ${carriedOver.completionPercentage}%`);
        console.log(`      Creada: ${new Date(carriedOver.createdAt!).toLocaleString('es-MX')}`);
      } else {
        console.log(`   ❌ NO SE ENCONTRÓ COPIA`);
        console.log(`      Esta prioridad fue marcada como REPROGRAMADO pero no tiene su copia`);
        orphanedCount++;
        orphanedPriorities.push(reprogrammed);
      }

      // Check for system comments
      const comments = await Comment.find({
        priorityId: reprogrammed._id,
        isSystemComment: true,
        text: { $regex: 'reprogramada', $options: 'i' }
      }).sort({ createdAt: -1 }).limit(1).lean();

      if (comments.length > 0) {
        console.log(`   💬 Comentario del sistema: "${comments[0].text.substring(0, 100)}..."`);
      }

      console.log('');
    }

    console.log('═'.repeat(80));
    console.log('📊 RESUMEN DEL DIAGNÓSTICO:\n');
    console.log(`   Total prioridades REPROGRAMADO: ${reprogrammedPriorities.length}`);
    console.log(`   Con copia encontrada: ${reprogrammedPriorities.length - orphanedCount}`);
    console.log(`   Sin copia (huérfanas): ${orphanedCount}\n`);

    if (orphanedCount > 0) {
      console.log('⚠️  PRIORIDADES HUÉRFANAS ENCONTRADAS:\n');
      console.log('   Estas prioridades fueron marcadas como REPROGRAMADO pero no tienen');
      console.log('   su correspondiente copia con isCarriedOver: true en la siguiente semana.\n');

      console.log('   Posibles causas:');
      console.log('   1. Error durante la ejecución de auto-reprogramación');
      console.log('   2. Transacción incompleta (se marcó como REPROGRAMADO pero falló la creación)');
      console.log('   3. La copia fue eliminada manualmente después\n');

      console.log('   Lista de huérfanas:\n');
      orphanedPriorities.forEach((p: any, index) => {
        console.log(`   ${index + 1}. ${p.title}`);
        console.log(`      ID: ${p._id}`);
        console.log(`      Usuario: ${p.userId.name}`);
        console.log(`      Semana: ${new Date(p.weekStart).toLocaleDateString('es-MX')} - ${new Date(p.weekEnd).toLocaleDateString('es-MX')}\n`);
      });

      console.log('   💡 Recomendación:');
      console.log('   Puedes ejecutar el endpoint de auto-reprogramación manualmente, pero');
      console.log('   ya que estas están en estado REPROGRAMADO, no se procesarán de nuevo.');
      console.log('   Necesitarías cambiarlas manualmente a EN_TIEMPO o crear las copias manualmente.\n');
    } else {
      console.log('✅ Todas las prioridades REPROGRAMADO tienen su copia correspondiente.\n');
    }

    // Additional check: Find carried over priorities without REPROGRAMADO parent
    console.log('🔍 Verificando copias huérfanas (isCarriedOver sin padre REPROGRAMADO)...\n');

    const allCarriedOver = await Priority.find({
      isCarriedOver: true
    }).populate('userId', 'name email').lean();

    let carriedOverOrphans = 0;

    for (const carried of allCarriedOver) {
      // Look for parent with same title, same user, status REPROGRAMADO, week before
      const carriedWeekStart = new Date(carried.weekStart);
      const prevWeekEnd = new Date(carriedWeekStart);
      prevWeekEnd.setDate(prevWeekEnd.getDate() - 3);

      const parent = await Priority.findOne({
        userId: carried.userId,
        title: carried.title,
        status: 'REPROGRAMADO',
        weekEnd: { $lt: carriedWeekStart }
      }).sort({ weekEnd: -1 }).lean();

      if (!parent) {
        if (carriedOverOrphans === 0) {
          console.log('⚠️  Copias sin padre REPROGRAMADO encontradas:\n');
        }
        console.log(`   ${carriedOverOrphans + 1}. ${carried.title}`);
        console.log(`      ID: ${carried._id}`);
        console.log(`      Usuario: ${(carried.userId as any).name}`);
        console.log(`      Semana: ${new Date(carried.weekStart).toLocaleDateString('es-MX')}\n`);
        carriedOverOrphans++;
      }
    }

    if (carriedOverOrphans === 0) {
      console.log('✅ Todas las copias tienen su padre correspondiente.\n');
    } else {
      console.log(`   Total: ${carriedOverOrphans} copias sin padre REPROGRAMADO\n`);
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
