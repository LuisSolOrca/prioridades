import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI!;

// Schema simple para consulta
const PrioritySchema = new mongoose.Schema({}, { strict: false, collection: 'priorities' });
const Priority = mongoose.models.Priority || mongoose.model('Priority', PrioritySchema);

async function findAllReprogrammed() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Conectado a MongoDB');

    // Buscar TODAS las prioridades REPROGRAMADAS
    const reprogrammedPriorities = await Priority.find({
      status: 'REPROGRAMADO'
    }).lean();

    console.log(`\n🔄 Total de prioridades REPROGRAMADAS en toda la BD: ${reprogrammedPriorities.length}\n`);

    if (reprogrammedPriorities.length > 0) {
      reprogrammedPriorities.forEach((p: any) => {
        console.log(`📋 ${p.title}`);
        console.log(`   ID: ${p._id}`);
        console.log(`   Status: ${p.status}`);
        console.log(`   User ID: ${p.userId}`);
        console.log(`   Semana: ${new Date(p.weekStart).toLocaleDateString('es-MX')} - ${new Date(p.weekEnd).toLocaleDateString('es-MX')}`);
        console.log(`   isCarriedOver: ${p.isCarriedOver}`);
        console.log(`   wasEdited: ${p.wasEdited}`);
        console.log('');
      });
    } else {
      console.log('❌ No se encontró ninguna prioridad con status REPROGRAMADO');
    }

    // Buscar TODAS las prioridades con isCarriedOver
    const carriedOverPriorities = await Priority.find({
      isCarriedOver: true
    }).lean();

    console.log(`📦 Total de prioridades con isCarriedOver=true: ${carriedOverPriorities.length}\n`);

    if (carriedOverPriorities.length > 0) {
      carriedOverPriorities.forEach((p: any) => {
        console.log(`📋 ${p.title}`);
        console.log(`   ID: ${p._id}`);
        console.log(`   Status: ${p.status}`);
        console.log(`   User ID: ${p.userId}`);
        console.log(`   Semana: ${new Date(p.weekStart).toLocaleDateString('es-MX')} - ${new Date(p.weekEnd).toLocaleDateString('es-MX')}`);
        console.log(`   isCarriedOver: ${p.isCarriedOver}`);
        console.log(`   wasEdited: ${p.wasEdited}`);
        console.log('');
      });
    }

    // Contar todas las prioridades por status
    const allPriorities = await Priority.find({}).lean();
    const statusCount: any = {};
    allPriorities.forEach((p: any) => {
      statusCount[p.status] = (statusCount[p.status] || 0) + 1;
    });

    console.log('\n📊 Resumen de todas las prioridades por status:');
    Object.entries(statusCount).forEach(([status, count]) => {
      console.log(`   ${status}: ${count}`);
    });
    console.log(`   TOTAL: ${allPriorities.length}`);

    await mongoose.disconnect();
    console.log('\n✅ Desconectado de MongoDB');
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

findAllReprogrammed();
