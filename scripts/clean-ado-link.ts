import mongoose from 'mongoose';
import AzureDevOpsWorkItem from '../models/AzureDevOpsWorkItem';
import Priority from '../models/Priority';
import dotenv from 'dotenv';

dotenv.config();

async function cleanADOLink() {
  try {
    await mongoose.connect(process.env.MONGODB_URI!);
    console.log('✅ Conectado\n');

    // Buscar vínculo de work item #11737
    const adoLink = await AzureDevOpsWorkItem.findOne({ workItemId: 11737 });

    if (!adoLink) {
      console.log('✅ No hay vínculo para work item #11737');
      await mongoose.disconnect();
      return;
    }

    console.log('📋 Vínculo encontrado:');
    console.log(`   Priority ID: ${adoLink.priorityId}`);
    console.log(`   Work Item ID: ${adoLink.workItemId}`);

    // Verificar si la prioridad existe
    const priority = await Priority.findById(adoLink.priorityId);

    if (priority) {
      console.log('\n⚠️ La prioridad todavía existe:');
      console.log(`   Título: ${priority.title}`);
      console.log(`   Estado: ${priority.status}`);
      console.log('\n¿La borraste manualmente desde MongoDB?');
    } else {
      console.log('\n✅ La prioridad ya no existe (huérfano)');
    }

    // Eliminar vínculo
    console.log('\n🗑️ Eliminando vínculo...');
    await AzureDevOpsWorkItem.deleteOne({ workItemId: 11737 });
    console.log('✅ Vínculo eliminado\n');

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('✅ Ahora puedes importar desde la GUI');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    await mongoose.disconnect();
  } catch (error: any) {
    console.error('❌ Error:', error.message);
    await mongoose.disconnect();
    process.exit(1);
  }
}

cleanADOLink();
