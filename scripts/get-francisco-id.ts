/**
 * Script para obtener el ID de Francisco Puente
 *
 * Uso: npx tsx scripts/get-francisco-id.ts
 */

import dotenv from 'dotenv';
import path from 'path';

// Load environment variables FIRST
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

import mongoose from 'mongoose';
// Import models
import connectDB from '../lib/mongodb';
import User from '../models/User';

async function main() {
  try {
    console.log('🔌 Conectando a MongoDB...');
    await connectDB();
    console.log('✅ Conectado a MongoDB\n');

    // Force model registration
    User;

    // Buscar Francisco Puente
    const franciscoUser = await User.findOne({ name: /Francisco Puente/i }).lean();

    if (!franciscoUser) {
      console.log('❌ No se encontró usuario con nombre "Francisco Puente"\n');
      console.log('Usuarios disponibles:');
      const allUsers = await User.find().select('name email').lean();
      allUsers.forEach(u => {
        console.log(`  - ${u.name} (${u.email})`);
      });
    } else {
      console.log('✅ Usuario encontrado:\n');
      console.log(`   Nombre: ${franciscoUser.name}`);
      console.log(`   Email: ${franciscoUser.email}`);
      console.log(`   ID: ${franciscoUser._id.toString()}`);
      console.log(`   Role: ${franciscoUser.role}`);
      console.log(`   Active: ${franciscoUser.isActive}`);
      console.log('\n📋 Para hardcodear en el código:\n');
      console.log(`   const DIRECCION_GENERAL_USER_ID = '${franciscoUser._id.toString()}';`);
      console.log('');
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
