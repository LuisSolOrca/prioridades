import mongoose from 'mongoose';
import Priority from '../models/Priority';
import AzureDevOpsWorkItem from '../models/AzureDevOpsWorkItem';
import User from '../models/User';
import StrategicInitiative from '../models/StrategicInitiative';
import dotenv from 'dotenv';

dotenv.config();

async function verifyImport() {
  try {
    await mongoose.connect(process.env.MONGODB_URI!);

    const priorityId = '690baca435a506fb65835881';

    const priority = await Priority.findById(priorityId).lean();

    if (!priority) {
      console.log('❌ Prioridad no encontrada');
      await mongoose.disconnect();
      return;
    }

    // Obtener detalles de usuario e iniciativas manualmente
    const user = await User.findById(priority.userId).lean();
    const initiatives = await StrategicInitiative.find({
      _id: { $in: priority.initiativeIds }
    }).lean();

    console.log('✅ PRIORIDAD ENCONTRADA EN LA BASE DE DATOS\n');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📋 DETALLES DE LA PRIORIDAD');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    console.log(`ID: ${priority._id}`);
    console.log(`Título: ${priority.title}`);
    console.log(`Tipo: ${priority.type}`);
    console.log(`Estado: ${priority.status}`);
    console.log(`Progreso: ${priority.completionPercentage}%`);
    if (user) {
      console.log(`Usuario: ${user.name} (${user.email})`);
    }
    console.log(`Semana: ${new Date(priority.weekStart).toLocaleDateString()} - ${new Date(priority.weekEnd).toLocaleDateString()}\n`);

    console.log('⭐ Iniciativas Estratégicas:');
    if (initiatives.length > 0) {
      initiatives.forEach((init, idx) => {
        console.log(`   ${idx + 1}. ${init.name} (${init.color})`);
      });
    } else {
      console.log('   (ninguna)');
    }
    console.log();

    console.log('✓ Checklist:');
    if (priority.checklist && priority.checklist.length > 0) {
      priority.checklist.forEach((task: any, idx: number) => {
        console.log(`   ${idx + 1}. [${task.completed ? '✓' : ' '}] ${task.text}`);
      });
    } else {
      console.log('   (sin tareas)');
    }
    console.log();

    console.log('🔗 Enlaces de Evidencia:');
    if (priority.evidenceLinks && priority.evidenceLinks.length > 0) {
      priority.evidenceLinks.forEach((link: any, idx: number) => {
        console.log(`   ${idx + 1}. ${link.title}`);
        console.log(`      ${link.url}`);
      });
    } else {
      console.log('   (sin enlaces)');
    }
    console.log();

    // Verificar vínculo con Azure DevOps
    const adoLink = await AzureDevOpsWorkItem.findOne({ priorityId: priority._id }).lean();

    if (adoLink) {
      console.log('🔗 Vínculo Azure DevOps:');
      console.log(`   Work Item ID: ${adoLink.workItemId}`);
      console.log(`   Tipo: ${adoLink.workItemType}`);
      console.log(`   Organización: ${adoLink.organization}`);
      console.log(`   Proyecto: ${adoLink.project}`);
      console.log(`   Último estado sincronizado: ${adoLink.lastSyncedState}`);
    } else {
      console.log('⚠️ No se encontró vínculo con Azure DevOps');
    }

    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('✅ La importación se completó correctamente');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    await mongoose.disconnect();
  } catch (error: any) {
    console.error('❌ Error:', error.message);
    await mongoose.disconnect();
    process.exit(1);
  }
}

verifyImport();
