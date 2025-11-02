/**
 * Script para eliminar badges duplicados de todos los usuarios
 * Uso: npx tsx scripts/remove-duplicate-badges.ts
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(__dirname, '..', '.env') });

import '../models/User';

const User = mongoose.models.User || mongoose.model('User');

async function connectDB() {
  if (mongoose.connection.readyState === 0) {
    await mongoose.connect(process.env.MONGODB_URI!);
    console.log('✅ Conectado a MongoDB');
  }
}

async function removeDuplicateBadges() {
  try {
    console.log('🚀 Iniciando limpieza de badges duplicados...\n');

    await connectDB();

    const users = await User.find({ 'gamification.badges': { $exists: true, $ne: [] } });
    console.log(`📊 Usuarios con badges: ${users.length}\n`);

    let totalCleaned = 0;

    for (const user of users) {
      if (!user.gamification?.badges || user.gamification.badges.length === 0) {
        continue;
      }

      const originalCount = user.gamification.badges.length;
      const seen = new Set<string>();
      const uniqueBadges: any[] = [];

      // Mantener solo el primer badge de cada tipo
      for (const badge of user.gamification.badges) {
        if (!seen.has(badge.badgeId)) {
          seen.add(badge.badgeId);
          uniqueBadges.push(badge);
        }
      }

      if (uniqueBadges.length < originalCount) {
        console.log(`👤 ${user.name} (${user.email}):`);
        console.log(`   Antes: ${originalCount} badges`);
        console.log(`   Después: ${uniqueBadges.length} badges`);
        console.log(`   Removidos: ${originalCount - uniqueBadges.length} duplicados\n`);

        user.gamification.badges = uniqueBadges;
        await user.save();
        totalCleaned += (originalCount - uniqueBadges.length);
      }
    }

    console.log('\n✅ Limpieza completada!');
    console.log(`📊 Total de badges duplicados eliminados: ${totalCleaned}\n`);

  } catch (error) {
    console.error('❌ Error durante la limpieza:', error);
    process.exit(1);
  } finally {
    await mongoose.connection.close();
    console.log('👋 Conexión cerrada');
    process.exit(0);
  }
}

removeDuplicateBadges();
