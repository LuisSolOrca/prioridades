import mongoose from 'mongoose';
import AzureDevOpsConfig from '../models/AzureDevOpsConfig';
import AzureDevOpsWorkItem from '../models/AzureDevOpsWorkItem';
import Priority from '../models/Priority';
import User from '../models/User';
import StrategicInitiative from '../models/StrategicInitiative';
import { AzureDevOpsClient, mapAzureDevOpsStateToAppState } from '../lib/azureDevOps';
import { getWeekDates } from '../lib/utils';
import dotenv from 'dotenv';

dotenv.config();

async function testCompleteImport() {
  try {
    console.log('🔌 Conectando a MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI!);
    console.log('✅ Conectado\n');

    // 1. Buscar usuario Luis García
    const user = await User.findOne({ email: 'lgarcia@orcagrc.com' }).lean();

    if (!user) {
      console.log('❌ Usuario lgarcia@orcagrc.com no encontrado');
      await mongoose.disconnect();
      return;
    }

    console.log(`✅ Usuario: ${user.name} (${user._id})\n`);

    // 2. Obtener iniciativas estratégicas activas
    const initiatives = await StrategicInitiative.find({ isActive: true }).lean();
    console.log(`✅ Iniciativas encontradas: ${initiatives.length}`);
    initiatives.forEach((init, idx) => {
      console.log(`   ${idx + 1}. ${init.name} (${init._id})`);
    });
    console.log();

    if (initiatives.length === 0) {
      console.log('❌ No hay iniciativas estratégicas activas');
      await mongoose.disconnect();
      return;
    }

    // 3. Buscar configuración de Azure DevOps
    const config = await AzureDevOpsConfig.findOne({ userId: user._id });

    if (!config) {
      console.log('❌ No hay configuración de Azure DevOps para este usuario');
      await mongoose.disconnect();
      return;
    }

    console.log('✅ Configuración Azure DevOps encontrada');
    console.log(`   Org: ${config.organization}`);
    console.log(`   Proyecto: ${config.project}\n`);

    // 4. Crear cliente Azure DevOps
    const client = new AzureDevOpsClient({
      organization: config.organization,
      project: config.project,
      personalAccessToken: config.personalAccessToken
    });

    // 5. Obtener work items del usuario
    console.log('🔍 Obteniendo work items...');
    const workItems = await client.getMyWorkItems(user.email);
    console.log(`✅ Encontrados ${workItems.length} work items\n`);

    if (workItems.length === 0) {
      console.log('⚠️ No hay work items para importar');
      await mongoose.disconnect();
      return;
    }

    // 6. Buscar "Casos de uso de Roles"
    const targetWorkItem = workItems.find(wi =>
      wi.fields['System.Title'].toLowerCase().includes('casos de uso de roles')
    );

    if (!targetWorkItem) {
      console.log('❌ No se encontró work item "Casos de uso de Roles"');
      console.log('\n📄 Work items disponibles:');
      workItems.forEach((wi, idx) => {
        console.log(`${idx + 1}. ${wi.fields['System.Title']} (${wi.fields['System.WorkItemType']}) - ID: ${wi.id}`);
      });
      await mongoose.disconnect();
      return;
    }

    console.log('✅ Work item encontrado!');
    console.log(`   ID: ${targetWorkItem.id}`);
    console.log(`   Título: ${targetWorkItem.fields['System.Title']}`);
    console.log(`   Tipo: ${targetWorkItem.fields['System.WorkItemType']}`);
    console.log(`   Estado: ${targetWorkItem.fields['System.State']}\n`);

    // 7. Verificar si ya existe
    const existing = await AzureDevOpsWorkItem.findOne({
      userId: user._id,
      workItemId: targetWorkItem.id
    });

    if (existing) {
      console.log('⚠️ Este work item ya fue importado anteriormente');
      console.log(`   Priority ID: ${existing.priorityId}`);

      const existingPriority = await Priority.findById(existing.priorityId);
      if (existingPriority) {
        console.log(`   Título: ${existingPriority.title}`);
        console.log(`   Estado: ${existingPriority.status}`);
        console.log(`   Checklist: ${existingPriority.checklist.length} tareas`);
        console.log(`   Enlaces: ${existingPriority.evidenceLinks.length} enlaces`);
        console.log(`   Iniciativas: ${existingPriority.initiativeIds.length}\n`);

        // Mostrar detalles del checklist
        if (existingPriority.checklist.length > 0) {
          console.log('📝 Tareas del checklist:');
          existingPriority.checklist.forEach((task: any, idx: number) => {
            console.log(`   ${idx + 1}. [${task.completed ? '✓' : ' '}] ${task.text}`);
          });
          console.log();
        }
      }

      console.log('¿Deseas eliminar la prioridad existente y crear una nueva? (No - solo mostrando info)');
      await mongoose.disconnect();
      return;
    }

    // 8. Obtener child tasks
    console.log('🔍 Obteniendo child tasks...');
    const childTasks = await client.getChildTasks(targetWorkItem.id);
    console.log(`✅ Encontradas ${childTasks.length} child tasks`);

    if (childTasks.length > 0) {
      childTasks.forEach((task, idx) => {
        const completed = task.fields['System.State'] === 'Done' || task.fields['System.State'] === 'Closed';
        console.log(`   ${idx + 1}. [${completed ? '✓' : ' '}] ${task.fields['System.Title']} (${task.fields['System.State']})`);
      });
    }
    console.log();

    // 9. Obtener enlaces de discusiones
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

    // 10. Preparar datos para importación
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

    // 11. Seleccionar la primera iniciativa activa (simulando selección del usuario)
    const selectedInitiativeIds = [initiatives[0]._id.toString()];

    console.log('📝 Datos preparados para importación:');
    console.log(`   Título: ${targetWorkItem.fields['System.Title']}`);
    console.log(`   Estado Azure: ${targetWorkItem.fields['System.State']} → App: ${appState}`);
    console.log(`   Checklist: ${checklist.length} tareas`);
    console.log(`   Enlaces: ${evidenceLinks.length} enlaces`);
    console.log(`   Iniciativas: ${selectedInitiativeIds.length} (${initiatives[0].name})`);
    console.log(`   Usuario: ${user._id}`);
    console.log(`   Semana: ${currentWeek.monday.toLocaleDateString()} - ${currentWeek.friday.toLocaleDateString()}\n`);

    // 12. Crear la prioridad (como lo hace el endpoint /api/azure-devops/import)
    console.log('💾 Creando prioridad...\n');

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
        initiativeIds: selectedInitiativeIds, // ¡IMPORTANTE! Debe incluir al menos una iniciativa
        wasEdited: false,
        isCarriedOver: false,
        checklist: checklist,
        evidenceLinks: evidenceLinks
      });

      console.log(`✅ Prioridad creada exitosamente!`);
      console.log(`   ID: ${priority._id}`);
      console.log(`   Título: ${priority.title}`);
      console.log(`   Estado: ${priority.status}`);
      console.log(`   Iniciativas: ${priority.initiativeIds.length}`);
      console.log(`   Checklist: ${priority.checklist.length} tareas`);
      console.log(`   Enlaces: ${priority.evidenceLinks.length} enlaces\n`);

      // 13. Crear vínculo Azure DevOps
      console.log('🔗 Creando vínculo Azure DevOps...');
      await AzureDevOpsWorkItem.create({
        userId: user._id,
        priorityId: priority._id,
        workItemId: targetWorkItem.id,
        workItemType: targetWorkItem.fields['System.WorkItemType'],
        organization: config.organization,
        project: config.project,
        lastSyncedState: targetWorkItem.fields['System.State']
      });

      console.log('✅ Vínculo Azure DevOps creado\n');

      // 14. Mostrar resumen final
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('🎉 ¡IMPORTACIÓN COMPLETADA EXITOSAMENTE!');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

      console.log('📊 Resumen:');
      console.log(`   ✓ Work Item: ${targetWorkItem.fields['System.Title']}`);
      console.log(`   ✓ Prioridad ID: ${priority._id}`);
      console.log(`   ✓ Tareas importadas: ${checklist.length}`);
      if (checklist.length > 0) {
        const completedTasks = checklist.filter(t => t.completed).length;
        console.log(`     - Completadas: ${completedTasks}`);
        console.log(`     - Pendientes: ${checklist.length - completedTasks}`);
      }
      console.log(`   ✓ Enlaces de evidencia: ${evidenceLinks.length}`);
      console.log(`   ✓ Iniciativas asignadas: ${priority.initiativeIds.length}`);
      console.log();

    } catch (error: any) {
      console.error('❌ Error al crear prioridad:', error.message);
      if (error.errors) {
        console.error('\n📋 Errores de validación:');
        for (const field in error.errors) {
          console.error(`   ✗ ${field}: ${error.errors[field].message}`);
        }
      }
      console.error('\n📝 Stack trace:');
      console.error(error.stack);
    }

    await mongoose.disconnect();
  } catch (error: any) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
    await mongoose.disconnect();
    process.exit(1);
  }
}

testCompleteImport();
