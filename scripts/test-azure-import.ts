import mongoose from 'mongoose';
import AzureDevOpsConfig from '../models/AzureDevOpsConfig';
import Priority from '../models/Priority';
import { AzureDevOpsClient } from '../lib/azureDevOps';
import dotenv from 'dotenv';

dotenv.config();

async function testImport() {
  try {
    console.log('🔌 Conectando a MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI!);
    console.log('✅ Conectado\n');

    // Verificar configuración de Azure DevOps
    console.log('🔍 Buscando configuraciones de Azure DevOps...');
    const configs = await AzureDevOpsConfig.find().lean();

    if (configs.length === 0) {
      console.log('❌ No hay configuraciones de Azure DevOps');
      await mongoose.disconnect();
      return;
    }

    console.log(`✅ Encontradas ${configs.length} configuraciones\n`);

    for (const config of configs) {
      console.log(`\n📋 Configuración:`);
      console.log(`   Usuario ID: ${config.userId}`);
      console.log(`   Organización: ${config.organization}`);
      console.log(`   Proyecto: ${config.project}`);
      console.log(`   Activa: ${config.isActive}`);
      console.log(`   Sync habilitado: ${config.syncEnabled}`);
      console.log(`   Tiene PAT: ${!!config.personalAccessToken}`);

      // Intentar obtener work items
      try {
        console.log('\n🔄 Intentando obtener work items...');
        const client = new AzureDevOpsClient({
          organization: config.organization,
          project: config.project,
          personalAccessToken: config.personalAccessToken
        });

        // Necesitamos el email del usuario
        const User = mongoose.model('User');
        const user = await User.findById(config.userId).lean();

        if (!user) {
          console.log('❌ Usuario no encontrado');
          continue;
        }

        console.log(`   Usuario: ${user.email}`);

        const workItems = await client.getMyWorkItems(user.email);
        console.log(`✅ Obtenidos ${workItems.length} work items`);

        if (workItems.length > 0) {
          console.log('\n📄 Work Items encontrados:');
          for (const wi of workItems.slice(0, 5)) {
            console.log(`\n   ${wi.id}. ${wi.fields['System.Title']}`);
            console.log(`      Tipo: ${wi.fields['System.WorkItemType']}`);
            console.log(`      Estado: ${wi.fields['System.State']}`);

            // Obtener child tasks
            const childTasks = await client.getChildTasks(wi.id);
            console.log(`      Child Tasks: ${childTasks.length}`);
            if (childTasks.length > 0) {
              childTasks.forEach((task, idx) => {
                console.log(`         ${idx + 1}. ${task.fields['System.Title']} (${task.fields['System.State']})`);
              });
            }

            // Obtener enlaces de discusiones
            const links = await client.getWorkItemLinks(wi.id);
            console.log(`      Enlaces de discusiones: ${links.length}`);
            if (links.length > 0) {
              links.forEach((link, idx) => {
                console.log(`         ${idx + 1}. ${link.title}`);
                console.log(`            ${link.url}`);
              });
            }
          }
        }
      } catch (error: any) {
        console.error(`❌ Error obteniendo work items:`, error.message);
        if (error.stack) {
          console.error(error.stack);
        }
      }
    }

    console.log('\n✅ Prueba completada');
    await mongoose.disconnect();
  } catch (error) {
    console.error('❌ Error:', error);
    await mongoose.disconnect();
    process.exit(1);
  }
}

testImport();
