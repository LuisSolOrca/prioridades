/**
 * Script para importar horas de trabajo desde Azure DevOps
 *
 * Este script:
 * 1. Busca todas las prioridades ligadas a Azure DevOps
 * 2. Para cada prioridad, obtiene las tareas hijas del work item
 * 3. Actualiza las horas completadas (completedHours) en cada tarea del checklist
 *    basándose en el campo Microsoft.VSTS.Scheduling.CompletedWork de Azure DevOps
 *
 * Uso:
 *   npx tsx scripts/import-hours-from-azure.ts [userId]
 *
 * Parámetros opcionales:
 *   userId - ID del usuario específico (si no se provee, procesa todos los usuarios)
 */

import mongoose from 'mongoose';
import * as dotenv from 'dotenv';
import AzureDevOpsWorkItem from '../models/AzureDevOpsWorkItem';
import AzureDevOpsConfig from '../models/AzureDevOpsConfig';
import Priority from '../models/Priority';
import User from '../models/User';
import { AzureDevOpsClient } from '../lib/azureDevOps';

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI!;

interface ImportStats {
  totalPriorities: number;
  totalTasks: number;
  tasksUpdated: number;
  hoursImported: number;
  errors: number;
  userStats: Map<string, {
    userName: string;
    priorities: number;
    tasksUpdated: number;
    hoursImported: number;
  }>;
}

async function importHoursFromAzure(userId?: string) {
  try {
    console.log('🔄 Iniciando importación de horas desde Azure DevOps...\n');

    // Conectar a MongoDB
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Conectado a MongoDB\n');

    const stats: ImportStats = {
      totalPriorities: 0,
      totalTasks: 0,
      tasksUpdated: 0,
      hoursImported: 0,
      errors: 0,
      userStats: new Map()
    };

    // Construir query para filtrar vínculos
    const linkQuery: any = {};
    if (userId) {
      linkQuery.userId = userId;
      const user = await User.findById(userId);
      console.log(`📌 Filtrando por usuario: ${user?.name} (${user?.email})\n`);
    }

    // Obtener todos los vínculos de Azure DevOps
    const azureLinks = await AzureDevOpsWorkItem.find(linkQuery)
      .populate('userId', 'name email')
      .populate('priorityId')
      .lean() as any[];

    console.log(`📊 Encontrados ${azureLinks.length} vínculos de Azure DevOps\n`);

    if (azureLinks.length === 0) {
      console.log('⚠️  No hay prioridades ligadas a Azure DevOps');
      return;
    }

    // Procesar cada vínculo
    for (const link of azureLinks) {
      const userId = (link.userId as any)._id.toString();
      const userName = (link.userId as any).name;
      const userEmail = (link.userId as any).email;
      const priority = link.priorityId as any;

      if (!priority) {
        console.log(`⚠️  Prioridad ${link.priorityId} no encontrada, omitiendo...`);
        continue;
      }

      console.log(`\n📋 Procesando: "${priority.title}"`);
      console.log(`   Usuario: ${userName}`);
      console.log(`   Work Item ID: ${link.workItemId}`);

      // Inicializar stats del usuario si no existe
      if (!stats.userStats.has(userId)) {
        stats.userStats.set(userId, {
          userName,
          priorities: 0,
          tasksUpdated: 0,
          hoursImported: 0
        });
      }

      const userStats = stats.userStats.get(userId)!;

      try {
        // Obtener configuración de Azure DevOps del usuario
        const adoConfig = await AzureDevOpsConfig.findOne({
          userId,
          isActive: true
        }) as any;

        if (!adoConfig) {
          console.log(`   ⚠️  No hay configuración de Azure DevOps activa para este usuario`);
          stats.errors++;
          continue;
        }

        // Crear cliente de Azure DevOps
        const client = new AzureDevOpsClient({
          organization: adoConfig.organization,
          project: adoConfig.project,
          personalAccessToken: adoConfig.personalAccessToken
        });

        // Obtener las child tasks del work item
        const childTasks = await client.getChildTasks(link.workItemId);
        console.log(`   📝 Tareas encontradas en Azure DevOps: ${childTasks.length}`);

        if (childTasks.length === 0) {
          console.log(`   ℹ️  No hay tareas hijas para importar`);
          continue;
        }

        // Obtener la prioridad actual de la base de datos
        const currentPriority = await Priority.findById(priority._id);

        if (!currentPriority) {
          console.log(`   ⚠️  Prioridad no encontrada en DB`);
          stats.errors++;
          continue;
        }

        if (!currentPriority.checklist || currentPriority.checklist.length === 0) {
          console.log(`   ℹ️  La prioridad no tiene checklist`);
          continue;
        }

        let priorityUpdated = false;
        let priorityTasksUpdated = 0;
        let priorityHoursImported = 0;

        // Actualizar horas en el checklist
        for (const checklistItem of currentPriority.checklist) {
          stats.totalTasks++;

          // Buscar la tarea correspondiente en Azure DevOps
          const azureTask = childTasks.find(task =>
            task.fields['System.Title'] === checklistItem.text
          );

          if (azureTask) {
            const completedWork = (azureTask.fields as any)['Microsoft.VSTS.Scheduling.CompletedWork'] || 0;

            // Solo actualizar si hay horas completadas en Azure DevOps y son diferentes
            if (completedWork > 0 && checklistItem.completedHours !== completedWork) {
              const oldHours = checklistItem.completedHours || 0;
              checklistItem.completedHours = completedWork;
              priorityUpdated = true;
              priorityTasksUpdated++;
              priorityHoursImported += completedWork;

              console.log(`   ✅ "${checklistItem.text}": ${oldHours}h → ${completedWork}h`);
            }
          }
        }

        // Guardar la prioridad si hubo cambios
        if (priorityUpdated) {
          // Usar updateOne con $set para forzar actualización del checklist
          await Priority.updateOne(
            { _id: currentPriority._id },
            {
              $set: {
                checklist: currentPriority.checklist,
                updatedAt: new Date()
              }
            }
          );

          stats.totalPriorities++;
          stats.tasksUpdated += priorityTasksUpdated;
          stats.hoursImported += priorityHoursImported;

          userStats.priorities++;
          userStats.tasksUpdated += priorityTasksUpdated;
          userStats.hoursImported += priorityHoursImported;

          console.log(`   📊 Resumen: ${priorityTasksUpdated} tareas actualizadas, ${priorityHoursImported}h importadas`);
        } else {
          console.log(`   ℹ️  No hubo cambios en las horas`);
        }

      } catch (error: any) {
        console.error(`   ❌ Error procesando prioridad:`, error.message);
        stats.errors++;
      }
    }

    // Mostrar resumen
    console.log('\n' + '='.repeat(60));
    console.log('📊 RESUMEN DE IMPORTACIÓN');
    console.log('='.repeat(60));
    console.log(`✅ Prioridades actualizadas: ${stats.totalPriorities}`);
    console.log(`📝 Tareas procesadas: ${stats.totalTasks}`);
    console.log(`✏️  Tareas actualizadas: ${stats.tasksUpdated}`);
    console.log(`⏱️  Horas importadas: ${stats.hoursImported}h`);
    console.log(`❌ Errores: ${stats.errors}`);

    if (stats.userStats.size > 0) {
      console.log('\n📈 Estadísticas por usuario:');
      console.log('-'.repeat(60));

      const userStatsArray = Array.from(stats.userStats.values());
      for (const userStat of userStatsArray) {
        if (userStat.priorities > 0) {
          console.log(`\n👤 ${userStat.userName}`);
          console.log(`   Prioridades: ${userStat.priorities}`);
          console.log(`   Tareas actualizadas: ${userStat.tasksUpdated}`);
          console.log(`   Horas importadas: ${userStat.hoursImported}h`);
        }
      }
    }

    console.log('\n✅ Importación completada');

  } catch (error) {
    console.error('❌ Error en la importación:', error);
    throw error;
  } finally {
    await mongoose.disconnect();
    console.log('\n👋 Desconectado de MongoDB');
  }
}

// Ejecutar script
const userIdArg = process.argv[2];

if (userIdArg && !mongoose.Types.ObjectId.isValid(userIdArg)) {
  console.error('❌ Error: El userId proporcionado no es válido');
  console.log('\nUso: npx tsx scripts/import-hours-from-azure.ts [userId]');
  process.exit(1);
}

importHoursFromAzure(userIdArg)
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Error fatal:', error);
    process.exit(1);
  });
