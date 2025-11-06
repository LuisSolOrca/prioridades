import mongoose from 'mongoose';
import AzureDevOpsConfig from '../models/AzureDevOpsConfig';
import AzureDevOpsWorkItem from '../models/AzureDevOpsWorkItem';
import Priority from '../models/Priority';
import User from '../models/User';
import { AzureDevOpsClient, mapAzureDevOpsStateToAppState } from '../lib/azureDevOps';
import { getWeekDates } from '../lib/utils';
import dotenv from 'dotenv';

dotenv.config();

async function manualImport() {
  try {
    console.log('🔌 Conectando a MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI!);
    console.log('✅ Conectado\n');

    // Buscar usuario Luis García
    const user = await User.findOne({ email: 'lgarcia@orcagrc.com' }).lean();

    if (!user) {
      console.log('❌ Usuario lgarcia@orcagrc.com no encontrado');
      await mongoose.disconnect();
      return;
    }

    console.log(`✅ Usuario encontrado: ${user.name} (${user._id})\n`);

    // Buscar configuración
    const config = await AzureDevOpsConfig.findOne({ userId: user._id });

    if (!config) {
      console.log('❌ No hay configuración de Azure DevOps para este usuario');
      await mongoose.disconnect();
      return;
    }

    console.log('✅ Configuración encontrada');
    console.log(`   Org: ${config.organization}`);
    console.log(`   Proyecto: ${config.project}\n`);

    // Crear cliente
    const client = new AzureDevOpsClient({
      organization: config.organization,
      project: config.project,
      personalAccessToken: config.personalAccessToken
    });

    // Obtener work items
    console.log('🔍 Obteniendo work items...');
    const workItems = await client.getMyWorkItems(user.email);
    console.log(`✅ Encontrados ${workItems.length} work items\n`);

    if (workItems.length === 0) {
      console.log('⚠️ No hay work items para importar');
      await mongoose.disconnect();
      return;
    }

    // Buscar "Casos de uso de Roles"
    const targetWorkItem = workItems.find(wi =>
      wi.fields['System.Title'].toLowerCase().includes('casos de uso de roles')
    );

    if (!targetWorkItem) {
      console.log('❌ No se encontró work item "Casos de uso de Roles"');
      console.log('\n📄 Work items disponibles:');
      workItems.forEach((wi, idx) => {
        console.log(`${idx + 1}. ${wi.fields['System.Title']} (${wi.fields['System.WorkItemType']})`);
      });
      await mongoose.disconnect();
      return;
    }

    console.log('✅ Work item encontrado!');
    console.log(`   ID: ${targetWorkItem.id}`);
    console.log(`   Título: ${targetWorkItem.fields['System.Title']}`);
    console.log(`   Tipo: ${targetWorkItem.fields['System.WorkItemType']}`);
    console.log(`   Estado: ${targetWorkItem.fields['System.State']}\n`);

    // Obtener child tasks
    console.log('🔍 Obteniendo child tasks...');
    const childTasks = await client.getChildTasks(targetWorkItem.id);
    console.log(`✅ Encontradas ${childTasks.length} child tasks`);

    if (childTasks.length > 0) {
      childTasks.forEach((task, idx) => {
        console.log(`   ${idx + 1}. ${task.fields['System.Title']} (${task.fields['System.State']})`);
      });
    }
    console.log();

    // Obtener enlaces de discusiones
    console.log('🔍 Obteniendo enlaces de discusiones...');
    const discussionLinks = await client.getWorkItemLinks(targetWorkItem.id);
    console.log(`✅ Encontrados ${discussionLinks.length} enlaces`);

    if (discussionLinks.length > 0) {
      discussionLinks.forEach((link, idx) => {
        console.log(`   ${idx + 1}. ${link.title}`);
        console.log(`      ${link.url}`);
      });
    }
    console.log();

    // Preparar datos para crear prioridad
    const checklist = childTasks.map(task => ({
      text: task.fields['System.Title'],
      completed: task.fields['System.State'] === 'Done' || task.fields['System.State'] === 'Closed',
      createdAt: new Date()
    }));

    const workItemWebUrl = `https://dev.azure.com/${config.organization}/${config.project}/_workitems/edit/${targetWorkItem.id}`;
    const evidenceLinks = [
      {
        title: `Azure DevOps: ${targetWorkItem.fields['System.WorkItemType']} #${targetWorkItem.id}`,
        url: workItemWebUrl,
        createdAt: new Date()
      },
      ...discussionLinks.map(link => ({
        ...link,
        createdAt: new Date()
      }))
    ];

    const appState = mapAzureDevOpsStateToAppState(
      targetWorkItem.fields['System.State'],
      config.stateMapping
    );

    const currentWeek = getWeekDates();

    console.log('📝 Datos preparados para crear prioridad:');
    console.log(`   Título: ${targetWorkItem.fields['System.Title']}`);
    console.log(`   Estado: ${appState}`);
    console.log(`   Checklist: ${checklist.length} tareas`);
    console.log(`   Enlaces: ${evidenceLinks.length} enlaces`);
    console.log(`   Usuario: ${user._id}`);
    console.log(`   Semana: ${currentWeek.monday.toLocaleDateString()} - ${currentWeek.friday.toLocaleDateString()}\n`);

    // Intentar crear la prioridad
    console.log('💾 Creando prioridad...');

    try {
      const priority = await Priority.create({
        title: targetWorkItem.fields['System.Title'],
        description: targetWorkItem.fields['System.Description'] || '',
        weekStart: currentWeek.monday,
        weekEnd: currentWeek.friday,
        status: appState,
        completionPercentage: appState === 'COMPLETADO' ? 100 : 0,
        type: 'ESTRATEGICA',
        userId: user._id,
        initiativeIds: [],
        wasEdited: false,
        isCarriedOver: false,
        checklist: checklist,
        evidenceLinks: evidenceLinks
      });

      console.log(`✅ Prioridad creada con ID: ${priority._id}`);

      // Crear vínculo Azure DevOps
      await AzureDevOpsWorkItem.create({
        userId: user._id,
        priorityId: priority._id,
        workItemId: targetWorkItem.id,
        workItemType: targetWorkItem.fields['System.WorkItemType'],
        organization: config.organization,
        project: config.project,
        lastSyncedState: targetWorkItem.fields['System.State']
      });

      console.log('✅ Vínculo Azure DevOps creado');
      console.log('\n🎉 ¡Importación completada exitosamente!');

    } catch (error: any) {
      console.error('❌ Error al crear prioridad:', error.message);
      if (error.errors) {
        console.error('Errores de validación:');
        for (const field in error.errors) {
          console.error(`  - ${field}: ${error.errors[field].message}`);
        }
      }
    }

    await mongoose.disconnect();
  } catch (error: any) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
    await mongoose.disconnect();
    process.exit(1);
  }
}

manualImport();
