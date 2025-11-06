/**
 * Script para limpiar referencias a work items eliminados de Azure DevOps
 */

require('dotenv').config();

async function cleanDeletedWorkItems() {
  const mongoose = require('mongoose');

  try {
    console.log('Conectando a la base de datos...');

    // Conectar a MongoDB
    if (!process.env.MONGODB_URI) {
      throw new Error('MONGODB_URI no está definida');
    }

    await mongoose.connect(process.env.MONGODB_URI);

    // Definir el schema del modelo
    const AzureDevOpsWorkItemSchema = new mongoose.Schema({
      userId: mongoose.Schema.Types.ObjectId,
      priorityId: mongoose.Schema.Types.ObjectId,
      workItemId: Number,
      workItemType: String,
      organization: String,
      project: String,
      lastSyncedState: String,
      lastSyncDate: Date
    });

    const AzureDevOpsWorkItem = mongoose.models.AzureDevOpsWorkItem ||
      mongoose.model('AzureDevOpsWorkItem', AzureDevOpsWorkItemSchema);

    // IDs de los work items que fueron eliminados en Azure DevOps
    const deletedWorkItemIds = [11784, 11788, 11792];

    console.log(`\nBuscando referencias a work items eliminados: ${deletedWorkItemIds.join(', ')}`);

    // Buscar los documentos
    const workItemLinks = await AzureDevOpsWorkItem.find({
      workItemId: { $in: deletedWorkItemIds }
    });

    if (workItemLinks.length === 0) {
      console.log('✅ No se encontraron referencias a estos work items.');
      await mongoose.disconnect();
      process.exit(0);
    }

    console.log(`\nEncontrados ${workItemLinks.length} vínculos a eliminar:`);
    workItemLinks.forEach((link) => {
      console.log(`  - Work Item #${link.workItemId} (Priority ID: ${link.priorityId})`);
    });

    // Eliminar los documentos
    const result = await AzureDevOpsWorkItem.deleteMany({
      workItemId: { $in: deletedWorkItemIds }
    });

    console.log(`\n✅ Se eliminaron ${result.deletedCount} referencias de work items.`);
    console.log('Las prioridades ahora están disponibles para ser exportadas nuevamente.');

    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

cleanDeletedWorkItems();
