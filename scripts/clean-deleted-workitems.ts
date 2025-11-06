/**
 * Script para limpiar referencias a work items eliminados de Azure DevOps
 */

import dotenv from 'dotenv';
import path from 'path';

// Cargar variables de entorno del archivo .env
dotenv.config({ path: path.resolve(__dirname, '../.env') });

import connectDB from '../lib/mongodb';
import AzureDevOpsWorkItem from '../models/AzureDevOpsWorkItem';

async function cleanDeletedWorkItems() {
  try {
    console.log('Conectando a la base de datos...');
    await connectDB();

    // IDs de los work items que fueron eliminados en Azure DevOps
    const deletedWorkItemIds = [11748, 11752, 11756];

    console.log(`\nBuscando referencias a work items eliminados: ${deletedWorkItemIds.join(', ')}`);

    // Buscar los documentos
    const workItemLinks = await AzureDevOpsWorkItem.find({
      workItemId: { $in: deletedWorkItemIds }
    }).populate('priorityId', 'title');

    if (workItemLinks.length === 0) {
      console.log('✅ No se encontraron referencias a estos work items.');
      process.exit(0);
    }

    console.log(`\nEncontrados ${workItemLinks.length} vínculos a eliminar:`);
    workItemLinks.forEach((link: any) => {
      console.log(`  - Work Item #${link.workItemId}: ${link.priorityId?.title || 'Prioridad no encontrada'}`);
    });

    // Eliminar los documentos
    const result = await AzureDevOpsWorkItem.deleteMany({
      workItemId: { $in: deletedWorkItemIds }
    });

    console.log(`\n✅ Se eliminaron ${result.deletedCount} referencias de work items.`);
    console.log('Las prioridades ahora están disponibles para ser exportadas nuevamente.');

    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

cleanDeletedWorkItems();
