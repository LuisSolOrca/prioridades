/**
 * Script de migración para crear canales General y asignar mensajes
 *
 * Ejecutar con: npx tsx scripts/migrate-channels.ts
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';

// Cargar variables de entorno
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });
// Fallback a .env si .env.local no existe
if (!process.env.MONGODB_URI) {
  dotenv.config({ path: path.resolve(process.cwd(), '.env') });
}

// Importar modelos
import Channel from '../models/Channel';
import Project from '../models/Project';
import ChannelMessage from '../models/ChannelMessage';
import User from '../models/User';

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  throw new Error('Por favor define la variable de entorno MONGODB_URI en .env.local');
}

async function migrateChannels() {
  try {
    console.log('🔌 Conectando a MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Conectado a MongoDB\n');

    // Obtener todos los proyectos
    const projects = await Project.find({ isActive: true });
    console.log(`📁 Encontrados ${projects.length} proyectos activos\n`);

    // Obtener el primer admin para ser createdBy
    const admin = await User.findOne({ role: 'ADMIN' });
    if (!admin) {
      throw new Error('No se encontró ningún usuario admin');
    }

    let totalChannelsCreated = 0;
    let totalMessagesUpdated = 0;

    for (const project of projects) {
      console.log(`\n📂 Procesando proyecto: ${project.name} (${project._id})`);

      // Verificar si ya existe un canal General
      let generalChannel = await Channel.findOne({
        projectId: project._id,
        name: 'General',
        parentId: null
      });

      if (generalChannel) {
        console.log('  ℹ️  Ya existe canal General, reutilizando...');
      } else {
        // Crear canal General
        generalChannel = await Channel.create({
          projectId: project._id,
          name: 'General',
          description: 'Canal principal del proyecto',
          parentId: null,
          order: 0,
          icon: 'Hash',
          isActive: true,
          createdBy: admin._id
        });
        console.log('  ✅ Canal General creado');
        totalChannelsCreated++;
      }

      // Contar mensajes sin channelId
      const messagesWithoutChannel = await ChannelMessage.countDocuments({
        projectId: project._id,
        channelId: { $exists: false }
      });

      if (messagesWithoutChannel > 0) {
        // Asignar todos los mensajes sin channelId al canal General
        const result = await ChannelMessage.updateMany(
          {
            projectId: project._id,
            channelId: { $exists: false }
          },
          {
            $set: { channelId: generalChannel._id }
          }
        );

        console.log(`  ✅ ${result.modifiedCount} mensajes asignados al canal General`);
        totalMessagesUpdated += result.modifiedCount;
      } else {
        console.log('  ℹ️  Todos los mensajes ya tienen canal asignado');
      }
    }

    console.log('\n\n📊 RESUMEN DE MIGRACIÓN:');
    console.log('═══════════════════════════════════════');
    console.log(`✅ Canales "General" creados: ${totalChannelsCreated}`);
    console.log(`✅ Mensajes actualizados: ${totalMessagesUpdated}`);
    console.log(`✅ Proyectos procesados: ${projects.length}`);
    console.log('═══════════════════════════════════════\n');

    console.log('🎉 ¡Migración completada exitosamente!\n');
  } catch (error) {
    console.error('\n❌ Error durante la migración:', error);
    throw error;
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Desconectado de MongoDB');
  }
}

// Ejecutar migración
migrateChannels()
  .then(() => {
    console.log('\n✅ Script finalizado correctamente');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Script finalizado con errores');
    console.error(error);
    process.exit(1);
  });
