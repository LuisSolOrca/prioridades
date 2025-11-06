import mongoose from 'mongoose';
import Priority from '../models/Priority';
import AzureDevOpsWorkItem from '../models/AzureDevOpsWorkItem';
import dotenv from 'dotenv';

dotenv.config();

async function deleteImportedPriority() {
  try {
    await mongoose.connect(process.env.MONGODB_URI!);
    console.log('✅ Conectado\n');

    // Buscar work item de Azure DevOps con ID 11737 (Casos de uso de Roles)
    const adoWorkItem = await AzureDevOpsWorkItem.findOne({ workItemId: 11737 });

    if (!adoWorkItem) {
      console.log('⚠️ No se encontró vínculo con Azure DevOps para work item #11737');
      await mongoose.disconnect();
      return;
    }

    console.log('📋 Vínculo encontrado:');
    console.log(`   Priority ID: ${adoWorkItem.priorityId}`);
    console.log(`   Work Item ID: ${adoWorkItem.workItemId}`);
    console.log();

    // Buscar la prioridad
    const priority = await Priority.findById(adoWorkItem.priorityId);

    if (priority) {
      console.log('🗑️ Eliminando prioridad:');
      console.log(`   Título: ${priority.title}`);
      console.log(`   Checklist: ${priority.checklist.length} tareas`);
      console.log(`   Enlaces: ${priority.evidenceLinks.length} enlaces`);
      console.log();

      await Priority.findByIdAndDelete(adoWorkItem.priorityId);
      console.log('✅ Prioridad eliminada');
    } else {
      console.log('⚠️ No se encontró la prioridad asociada');
    }

    // Eliminar vínculo Azure DevOps
    await AzureDevOpsWorkItem.findByIdAndDelete(adoWorkItem._id);
    console.log('✅ Vínculo Azure DevOps eliminado\n');

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('✅ Ahora puedes probar la importación desde la GUI');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    await mongoose.disconnect();
  } catch (error: any) {
    console.error('❌ Error:', error.message);
    await mongoose.disconnect();
    process.exit(1);
  }
}

deleteImportedPriority();
