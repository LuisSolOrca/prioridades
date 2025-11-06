import mongoose from 'mongoose';
import AzureDevOpsConfig from '../models/AzureDevOpsConfig';
import AzureDevOpsWorkItem from '../models/AzureDevOpsWorkItem';
import Priority from '../models/Priority';
import { AzureDevOpsClient, mapAzureDevOpsStateToAppState } from '../lib/azureDevOps';
import dotenv from 'dotenv';

dotenv.config();

async function diagnoseSync() {
  try {
    await mongoose.connect(process.env.MONGODB_URI!);
    console.log('✅ Conectado a MongoDB\n');

    // Obtener usuario (ajusta el email según necesites)
    const userEmail = 'lgarcia@orcagrc.com';

    // Obtener configuración de Azure DevOps
    const config = await AzureDevOpsConfig.findOne({ isActive: true });

    if (!config) {
      console.log('❌ No hay configuración de Azure DevOps activa');
      await mongoose.disconnect();
      return;
    }

    console.log('📋 Configuración encontrada:');
    console.log(`   Organization: ${config.organization}`);
    console.log(`   Project: ${config.project}`);
    console.log(`   Sync Enabled: ${config.syncEnabled}\n`);

    // Crear cliente de Azure DevOps
    const client = new AzureDevOpsClient({
      organization: config.organization,
      project: config.project,
      personalAccessToken: config.personalAccessToken
    });

    // Obtener todos los vínculos del usuario
    const workItemLinks = await AzureDevOpsWorkItem.find({
      userId: config.userId
    });

    console.log(`🔗 Total de vínculos encontrados: ${workItemLinks.length}\n`);

    // Buscar específicamente la historia "prueba"
    for (const link of workItemLinks) {
      try {
        // Obtener prioridad local
        const priority = await Priority.findById(link.priorityId).lean();

        if (!priority) {
          console.log(`⚠️  Vínculo huérfano: WI ${link.workItemId} (prioridad ${link.priorityId} no existe)\n`);
          continue;
        }

        // Obtener work item de Azure DevOps
        const workItem = await client.getWorkItem(link.workItemId);
        const workItemTitle = workItem.fields['System.Title'];

        // Solo analizar la historia "prueba"
        if (!workItemTitle.toLowerCase().includes('prueba')) {
          continue;
        }

        console.log('═══════════════════════════════════════════════════════════');
        console.log(`📊 DIAGNÓSTICO: ${workItemTitle}`);
        console.log('═══════════════════════════════════════════════════════════\n');

        console.log(`🔢 Work Item ID: ${link.workItemId}`);
        console.log(`📝 Priority ID: ${link.priorityId}\n`);

        // Estado
        const currentAdoState = workItem.fields['System.State'];
        const mappedState = mapAzureDevOpsStateToAppState(currentAdoState, config.stateMapping);

        console.log('📍 ESTADOS:');
        console.log(`   Azure DevOps: ${currentAdoState}`);
        console.log(`   Mapeado a: ${mappedState}`);
        console.log(`   Local: ${priority.status}`);
        console.log(`   Último sincronizado: ${link.lastSyncedState || 'N/A'}`);
        console.log(`   ¿Cambió?: ${currentAdoState !== link.lastSyncedState ? '✅ SÍ' : '❌ NO'}\n`);

        // Obtener child tasks
        const childTasks = await client.getChildTasks(link.workItemId);

        console.log(`📋 TAREAS (${childTasks.length} en Azure DevOps, ${priority.checklist?.length || 0} en checklist local):\n`);

        if (childTasks.length > 0) {
          const localChecklistMap = new Map(
            (priority.checklist || []).map((item: any) => [item.text, item.completed])
          );

          for (const task of childTasks) {
            const taskTitle = task.fields['System.Title'];
            const taskState = task.fields['System.State'];
            const taskIsClosed = taskState === 'Done' || taskState === 'Closed';
            const isCompletedLocally = localChecklistMap.get(taskTitle) === true;
            const existsLocally = localChecklistMap.has(taskTitle);

            console.log(`   📌 ${taskTitle}`);
            console.log(`      Azure DevOps State: ${taskState}`);
            console.log(`      ¿Está cerrada en ADO?: ${taskIsClosed ? '✅ SÍ' : '❌ NO'}`);
            console.log(`      ¿Existe en checklist local?: ${existsLocally ? '✅ SÍ' : '❌ NO'}`);
            console.log(`      ¿Completada localmente?: ${isCompletedLocally ? '✅ SÍ' : '❌ NO'}`);

            // Verificar si hay horas asignadas
            const completedWork = task.fields['Microsoft.VSTS.Scheduling.CompletedWork'];
            const originalEstimate = task.fields['Microsoft.VSTS.Scheduling.OriginalEstimate'];
            const remainingWork = task.fields['Microsoft.VSTS.Scheduling.RemainingWork'];

            console.log(`      Horas completadas: ${completedWork || 0}`);
            console.log(`      Horas estimadas: ${originalEstimate || 0}`);
            console.log(`      Horas restantes: ${remainingWork || 0}`);

            // Detectar si debería sincronizarse
            if (taskIsClosed && !isCompletedLocally && existsLocally) {
              console.log(`      🔄 DEBERÍA SINCRONIZARSE: Cerrada en ADO pero no localmente`);
            } else if (!taskIsClosed && isCompletedLocally) {
              console.log(`      🔄 DEBERÍA SINCRONIZARSE: Completada localmente pero no en ADO`);
            } else {
              console.log(`      ✅ SINCRONIZADA`);
            }

            console.log();
          }
        }

        console.log('\n📊 CHECKLIST LOCAL:');
        if (priority.checklist && priority.checklist.length > 0) {
          for (const item of priority.checklist) {
            console.log(`   ${(item as any).completed ? '✅' : '⬜'} ${(item as any).text}`);
          }
        } else {
          console.log('   (vacío)');
        }

        console.log('\n═══════════════════════════════════════════════════════════\n');

      } catch (error) {
        console.error(`❌ Error analizando work item ${link.workItemId}:`, error);
      }
    }

    await mongoose.disconnect();
    console.log('✅ Diagnóstico completado');

  } catch (error: any) {
    console.error('❌ Error:', error.message);
    await mongoose.disconnect();
    process.exit(1);
  }
}

diagnoseSync();
