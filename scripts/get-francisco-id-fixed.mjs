import { config } from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

// Get directory of this script
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load .env from project root
config({ path: resolve(__dirname, '../.env') });

import mongoose from 'mongoose';

async function main() {
  try {
    const MONGODB_URI = process.env.MONGODB_URI;

    if (!MONGODB_URI) {
      console.error('❌ MONGODB_URI no encontrado en .env');
      process.exit(1);
    }

    console.log('🔌 Conectando a MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Conectado a MongoDB\n');

    // Create simple User model
    const UserSchema = new mongoose.Schema({}, { strict: false });
    const User = mongoose.models.User || mongoose.model('User', UserSchema, 'users');

    // Find Francisco Puente
    const francisco = await User.findOne({ name: /Francisco Puente/i }).lean();

    if (!francisco) {
      console.log('❌ No se encontró usuario con nombre "Francisco Puente"\n');
      console.log('Usuarios disponibles:');
      const allUsers = await User.find().select('name email').lean();
      allUsers.forEach(u => {
        console.log(`  - ${u.name} (${u.email})`);
      });
    } else {
      console.log('✅ Usuario encontrado:\n');
      console.log(`   Nombre: ${francisco.name}`);
      console.log(`   Email: ${francisco.email}`);
      console.log(`   ID: ${francisco._id.toString()}`);
      console.log(`   Role: ${francisco.role}`);
      console.log(`   Active: ${francisco.isActive}`);
      console.log('\n📋 Para hardcodear en el código:\n');
      console.log(`   const DIRECCION_GENERAL_USER_ID = '${francisco._id.toString()}';`);
      console.log('');
    }

    await mongoose.connection.close();
    console.log('🔌 Conexión cerrada');
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

main();
