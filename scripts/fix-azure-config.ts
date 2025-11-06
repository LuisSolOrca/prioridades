import mongoose from 'mongoose';
import AzureDevOpsConfig from '../models/AzureDevOpsConfig';
import User from '../models/User';
import dotenv from 'dotenv';

dotenv.config();

async function fixConfig() {
  try {
    console.log('🔌 Conectando a MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI!);
    console.log('✅ Conectado\n');

    // Buscar la configuración con userId null
    console.log('🔍 Buscando configuración con userId null...');
    const config = await AzureDevOpsConfig.findOne({ userId: null });

    if (!config) {
      console.log('❌ No se encontró configuración con userId null');

      // Mostrar todas las configuraciones
      const allConfigs = await AzureDevOpsConfig.find().lean();
      console.log(`\nTotal de configuraciones: ${allConfigs.length}`);
      allConfigs.forEach((c: any, idx: number) => {
        console.log(`${idx + 1}. Usuario ID: ${c.userId}, Org: ${c.organization}, Proyecto: ${c.project}`);
      });

      await mongoose.disconnect();
      return;
    }

    console.log('✅ Configuración encontrada:');
    console.log(`   ID: ${config._id}`);
    console.log(`   Organización: ${config.organization}`);
    console.log(`   Proyecto: ${config.project}`);

    // Buscar usuarios
    console.log('\n📋 Usuarios disponibles:');
    const users = await User.find({ isActive: true }).lean();

    if (users.length === 0) {
      console.log('❌ No hay usuarios activos');
      await mongoose.disconnect();
      return;
    }

    users.forEach((u: any, idx: number) => {
      console.log(`${idx + 1}. ${u.name} (${u.email}) - ID: ${u._id}`);
    });

    // Asignar al primer usuario activo
    const firstUser = users[0];
    console.log(`\n🔄 Asignando configuración al usuario: ${firstUser.name}`);

    config.userId = firstUser._id;
    await config.save();

    console.log('✅ Configuración actualizada correctamente');
    console.log(`   Usuario ID: ${config.userId}`);

    await mongoose.disconnect();
    console.log('\n✅ Proceso completado');
  } catch (error) {
    console.error('❌ Error:', error);
    await mongoose.disconnect();
    process.exit(1);
  }
}

fixConfig();
