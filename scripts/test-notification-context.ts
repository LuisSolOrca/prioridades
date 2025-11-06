import mongoose from 'mongoose';
import * as dotenv from 'dotenv';
import { notifyMention } from '@/lib/notifications';

dotenv.config();

const UserSchema = new mongoose.Schema({
  name: String,
  email: String,
  password: String,
  role: String,
  isActive: Boolean,
  area: String,
  emailNotifications: {
    enabled: Boolean,
    newComments: Boolean,
    priorityAssigned: Boolean,
    statusChanges: Boolean,
  },
}, { timestamps: true });

const PrioritySchema = new mongoose.Schema({
  title: String,
  description: String,
  userId: mongoose.Schema.Types.ObjectId,
}, { timestamps: true });

async function testNotificationContext() {
  try {
    console.log('Conectando a MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI as string);
    console.log('✅ MongoDB conectado\n');

    const User = mongoose.models.User || mongoose.model('User', UserSchema);
    const Priority = mongoose.models.Priority || mongoose.model('Priority', PrioritySchema);

    // Buscar una prioridad de prueba
    const testPriority = await Priority.findOne().lean();
    if (!testPriority) {
      console.log('❌ No se encontraron prioridades en la base de datos');
      await mongoose.connection.close();
      return;
    }

    console.log('📋 Prioridad de prueba encontrada:');
    console.log('ID:', testPriority._id);
    console.log('Título:', testPriority.title);
    console.log();

    // Buscar un usuario de prueba
    const testUser = await User.findOne({
      isActive: true,
      'emailNotifications.enabled': true,
      'emailNotifications.newComments': true
    }).lean();

    if (!testUser) {
      console.log('❌ No se encontró un usuario con notificaciones habilitadas');
      await mongoose.connection.close();
      return;
    }

    console.log('👤 Usuario de prueba encontrado:');
    console.log('Nombre:', testUser.name);
    console.log('Email:', testUser.email);
    console.log('Notificaciones habilitadas:', testUser.emailNotifications?.enabled);
    console.log();

    console.log('📧 Creando notificación de mención de prueba...');
    // Crear un ObjectId válido para el commentId
    const testCommentId = new mongoose.Types.ObjectId();

    await notifyMention(
      testUser._id.toString(),
      'Usuario de Prueba',
      testPriority.title,
      'Este es un comentario de prueba para verificar que el contexto de la prioridad se incluye correctamente en las notificaciones.',
      testPriority._id.toString(),
      testCommentId.toString()
    );

    console.log('✅ Notificación creada exitosamente');
    console.log('\n⚠️  IMPORTANTE: Revisa el email de', testUser.email);
    console.log('   El email debe incluir el título de la prioridad:', testPriority.title);

    await mongoose.connection.close();
    console.log('\n✅ Proceso completado');
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

testNotificationContext();
