import mongoose from 'mongoose';
import AzureDevOpsWorkItem from '../models/AzureDevOpsWorkItem';
import Priority from '../models/Priority';
import dotenv from 'dotenv';

dotenv.config();

async function cleanOrphanedAdoLinks() {
  try {
    await mongoose.connect(process.env.MONGODB_URI!);
    console.log('✅ Conectado a MongoDB\n');

    // Obtener todos los vínculos de Azure DevOps
    const allLinks = await AzureDevOpsWorkItem.find({});
    console.log(`📊 Total de vínculos de Azure DevOps: ${allLinks.length}\n`);

    let orphanedCount = 0;
    const orphanedLinks = [];

    // Verificar cada vínculo
    for (const link of allLinks) {
      const priority = await Priority.findById(link.priorityId);

      if (!priority) {
        orphanedCount++;
        orphanedLinks.push({
          workItemId: link.workItemId,
          priorityId: link.priorityId.toString(),
          userId: link.userId.toString(),
          linkId: link._id.toString()
        });

        console.log(`❌ Vínculo huérfano encontrado:`);
        console.log(`   Work Item ID: ${link.workItemId}`);
        console.log(`   Priority ID (eliminada): ${link.priorityId}`);
        console.log(`   User ID: ${link.userId}`);
        console.log(`   Fecha de sincronización: ${link.lastSyncDate || 'N/A'}`);
        console.log();
      }
    }

    if (orphanedCount === 0) {
      console.log('✅ No se encontraron vínculos huérfanos. ¡Todo está limpio!');
      await mongoose.disconnect();
      return;
    }

    console.log(`\n⚠️  Se encontraron ${orphanedCount} vínculos huérfanos.\n`);
    console.log('🗑️  Eliminando vínculos huérfanos...\n');

    // Eliminar todos los vínculos huérfanos
    const deleteResult = await AzureDevOpsWorkItem.deleteMany({
      _id: { $in: orphanedLinks.map(l => new mongoose.Types.ObjectId(l.linkId)) }
    });

    console.log(`✅ Eliminados ${deleteResult.deletedCount} vínculos huérfanos.\n`);

    // Resumen
    console.log('📋 Resumen:');
    console.log(`   Total de vínculos revisados: ${allLinks.length}`);
    console.log(`   Vínculos huérfanos eliminados: ${deleteResult.deletedCount}`);
    console.log(`   Vínculos válidos restantes: ${allLinks.length - deleteResult.deletedCount}`);

    await mongoose.disconnect();
    console.log('\n✅ Desconectado. Limpieza completada.');
  } catch (error: any) {
    console.error('❌ Error:', error.message);
    await mongoose.disconnect();
    process.exit(1);
  }
}

cleanOrphanedAdoLinks();
