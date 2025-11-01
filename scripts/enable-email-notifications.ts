import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';

// Cargar variables de entorno
dotenv.config({ path: path.resolve(__dirname, '../.env') });

// Definir el schema de User
const UserSchema = new mongoose.Schema({
  name: String,
  email: String,
  password: String,
  role: String,
  isActive: Boolean,
  emailNotifications: {
    enabled: { type: Boolean, default: true },
    newComments: { type: Boolean, default: true },
    priorityAssigned: { type: Boolean, default: true },
    statusChanges: { type: Boolean, default: true },
  },
}, { timestamps: true });

const User = mongoose.models.User || mongoose.model('User', UserSchema);

async function enableEmailNotificationsForAllUsers() {
  try {
    console.log('🔄 Conectando a MongoDB...');

    if (!process.env.MONGODB_URI) {
      throw new Error('MONGODB_URI no está configurada en .env');
    }

    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Conectado a MongoDB exitosamente\n');

    // Obtener todos los usuarios
    const users = await User.find({});
    console.log(`📊 Usuarios encontrados: ${users.length}\n`);

    if (users.length === 0) {
      console.log('⚠️  No hay usuarios para actualizar');
      return;
    }

    // Configuración de notificaciones por defecto
    const defaultNotifications = {
      enabled: true,
      newComments: true,
      priorityAssigned: true,
      statusChanges: true,
    };

    let updated = 0;
    let alreadyConfigured = 0;

    for (const user of users) {
      const userDoc = user as any;

      // Verificar si ya tiene configuración de notificaciones
      if (userDoc.emailNotifications?.enabled !== undefined) {
        console.log(`⏭️  ${userDoc.name} (${userDoc.email}) - Ya tiene configuración de notificaciones`);
        alreadyConfigured++;
        continue;
      }

      // Actualizar usuario con preferencias de notificación habilitadas
      await User.updateOne(
        { _id: userDoc._id },
        {
          $set: {
            emailNotifications: defaultNotifications
          }
        }
      );

      console.log(`✅ ${userDoc.name} (${userDoc.email}) - Notificaciones habilitadas`);
      updated++;
    }

    console.log('\n📈 Resumen:');
    console.log(`   - Total de usuarios: ${users.length}`);
    console.log(`   - Actualizados: ${updated}`);
    console.log(`   - Ya configurados: ${alreadyConfigured}`);

    // Verificar los cambios
    console.log('\n🔍 Verificando configuraciones actuales...\n');
    const updatedUsers = await User.find({});

    for (const user of updatedUsers) {
      const userDoc = user as any;
      console.log(`👤 ${userDoc.name} (${userDoc.email}):`);
      console.log(`   - Notificaciones habilitadas: ${userDoc.emailNotifications?.enabled || false}`);
      console.log(`   - Nuevos comentarios: ${userDoc.emailNotifications?.newComments || false}`);
      console.log(`   - Prioridad asignada: ${userDoc.emailNotifications?.priorityAssigned || false}`);
      console.log(`   - Cambios de estado: ${userDoc.emailNotifications?.statusChanges || false}`);
      console.log('');
    }

    console.log('✅ Proceso completado exitosamente');

  } catch (error) {
    console.error('❌ Error:', error);
    throw error;
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Desconectado de MongoDB');
  }
}

// Ejecutar el script
enableEmailNotificationsForAllUsers()
  .then(() => {
    console.log('\n✨ Script finalizado exitosamente');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 Error en el script:', error);
    process.exit(1);
  });
