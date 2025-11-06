import mongoose from 'mongoose';
import Priority from '../models/Priority';
import AzureDevOpsWorkItem from '../models/AzureDevOpsWorkItem';
import dotenv from 'dotenv';

dotenv.config();

async function validateImport() {
  try {
    console.log('🔌 Conectando a MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI!);
    console.log('✅ Conectado a MongoDB\n');

    // Buscar la prioridad "Casos de uso de Roles"
    console.log('🔍 Buscando prioridad "Casos de uso de Roles"...');
    const priority = await Priority.findOne({
      title: { $regex: /Casos de uso de Roles/i }
    }).lean();

    if (!priority) {
      console.log('❌ No se encontró la prioridad "Casos de uso de Roles"');

      // Mostrar las últimas 5 prioridades creadas
      console.log('\n📋 Últimas 5 prioridades creadas:');
      const recentPriorities = await Priority.find()
        .sort({ createdAt: -1 })
        .limit(5)
        .select('title createdAt userId checklist evidenceLinks')
        .lean();

      recentPriorities.forEach((p: any, idx: number) => {
        console.log(`\n${idx + 1}. "${p.title}"`);
        console.log(`   Creada: ${p.createdAt}`);
        console.log(`   Usuario ID: ${p.userId}`);
        console.log(`   Tareas en checklist: ${p.checklist?.length || 0}`);
        console.log(`   Enlaces de evidencia: ${p.evidenceLinks?.length || 0}`);

        if (p.checklist && p.checklist.length > 0) {
          console.log(`   Checklist:`);
          p.checklist.forEach((task: any, i: number) => {
            console.log(`     ${i + 1}. [${task.completed ? '✓' : ' '}] ${task.text}`);
          });
        }
      });

      await mongoose.disconnect();
      return;
    }

    console.log('✅ Prioridad encontrada!\n');
    console.log('📄 Detalles de la prioridad:');
    console.log(`   ID: ${priority._id}`);
    console.log(`   Título: ${priority.title}`);
    console.log(`   Descripción: ${priority.description?.substring(0, 100)}...`);
    console.log(`   Usuario ID: ${priority.userId}`);
    console.log(`   Estado: ${priority.status}`);
    console.log(`   Semana: ${new Date(priority.weekStart).toLocaleDateString()} - ${new Date(priority.weekEnd).toLocaleDateString()}`);
    console.log(`   Creada: ${priority.createdAt}`);

    // Checklist
    console.log(`\n✓ Checklist (${priority.checklist?.length || 0} tareas):`);
    if (priority.checklist && priority.checklist.length > 0) {
      priority.checklist.forEach((task: any, idx: number) => {
        console.log(`   ${idx + 1}. [${task.completed ? '✓' : ' '}] ${task.text}`);
      });

      // Buscar las tareas específicas
      const expectedTasks = ['elaboracion caso de uso inicial', 'retro', 'retroalimentar'];
      console.log('\n🔍 Validando tareas esperadas:');
      expectedTasks.forEach(taskName => {
        const found = priority.checklist.some((t: any) =>
          t.text.toLowerCase().includes(taskName.toLowerCase())
        );
        console.log(`   ${found ? '✅' : '❌'} "${taskName}": ${found ? 'Encontrada' : 'NO encontrada'}`);
      });
    } else {
      console.log('   ⚠️ No hay tareas en el checklist');
    }

    // Enlaces de evidencia
    console.log(`\n🔗 Enlaces de Evidencia (${priority.evidenceLinks?.length || 0}):`);
    if (priority.evidenceLinks && priority.evidenceLinks.length > 0) {
      priority.evidenceLinks.forEach((link: any, idx: number) => {
        console.log(`   ${idx + 1}. ${link.title}`);
        console.log(`      URL: ${link.url}`);
      });
    } else {
      console.log('   ⚠️ No hay enlaces de evidencia');
    }

    // Buscar vínculo con Azure DevOps
    console.log('\n🔄 Vínculo con Azure DevOps:');
    const azureLink = await AzureDevOpsWorkItem.findOne({
      priorityId: priority._id
    }).lean();

    if (azureLink) {
      console.log(`   ✅ Work Item ID: ${azureLink.workItemId}`);
      console.log(`   Tipo: ${azureLink.workItemType}`);
      console.log(`   Organización: ${azureLink.organization}`);
      console.log(`   Proyecto: ${azureLink.project}`);
      console.log(`   Estado sincronizado: ${azureLink.lastSyncedState}`);
      console.log(`   Última sincronización: ${azureLink.lastSyncDate}`);
    } else {
      console.log('   ⚠️ No se encontró vínculo con Azure DevOps');
    }

    console.log('\n✅ Validación completada');
    await mongoose.disconnect();
  } catch (error) {
    console.error('❌ Error:', error);
    await mongoose.disconnect();
    process.exit(1);
  }
}

validateImport();
