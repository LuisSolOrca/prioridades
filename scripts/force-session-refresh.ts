/**
 * Script para forzar la actualización de sesiones de usuarios
 *
 * Este script actualiza el campo `updatedAt` de todos los usuarios activos
 * para forzar que NextAuth regenere sus tokens JWT al próximo request.
 *
 * Uso: npx tsx scripts/force-session-refresh.ts
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';

// Cargar variables de entorno
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

async function forceSessionRefresh() {
  try {
    console.log('🔄 Conectando a MongoDB...');

    if (!process.env.MONGODB_URI) {
      throw new Error('MONGODB_URI no está definido en las variables de entorno');
    }

    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Conectado a MongoDB\n');

    // Importar el modelo después de conectar
    const User = (await import('../models/User')).default;

    console.log('📊 Obteniendo usuarios activos...');
    const activeUsers = await User.find({ isActive: true });
    console.log(`   Encontrados ${activeUsers.length} usuarios activos\n`);

    console.log('🔧 Forzando actualización de sesiones...');

    let updatedCount = 0;
    for (const user of activeUsers) {
      // Actualizar el campo updatedAt para forzar regeneración del token
      user.updatedAt = new Date();
      await user.save();
      updatedCount++;
      console.log(`   ✓ ${user.email}`);
    }

    console.log(`\n✅ Se actualizaron ${updatedCount} usuarios`);
    console.log('\n📝 Notas importantes:');
    console.log('   - Los usuarios deben CERRAR SESIÓN y VOLVER A INICIAR SESIÓN');
    console.log('   - O esperar a que expire su token actual (30 días máximo)');
    console.log('   - Para forzar cierre de sesión inmediato, considerar limpiar cookies del lado del cliente\n');

    console.log('💡 Recomendación:');
    console.log('   Notificar a los usuarios que cierren sesión y vuelvan a iniciar sesión');
    console.log('   para ver los cambios en sus permisos.\n');

  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Desconectado de MongoDB');
  }
}

// Ejecutar el script
forceSessionRefresh();
