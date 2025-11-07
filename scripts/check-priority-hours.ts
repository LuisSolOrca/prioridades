import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';

// Cargar variables de entorno
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  throw new Error('MONGODB_URI no está definido en .env.local');
}

async function checkPriorityHours() {
  try {
    console.log('Conectando a MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('✓ Conectado a MongoDB\n');

    const Priority = mongoose.model('Priority', new mongoose.Schema({}, { strict: false }));

    // Buscar la prioridad específica
    const priorityId = '690d0e9c2199de7ccf2b4450';
    console.log(`Buscando prioridad con ID: ${priorityId}\n`);

    const priority = await Priority.findById(priorityId).lean();

    if (!priority) {
      console.log('❌ Prioridad no encontrada');
      return;
    }

    console.log('✓ Prioridad encontrada:');
    console.log('  Título:', priority.title);
    console.log('  Status:', priority.status);
    console.log('\n📋 Checklist:\n');

    if (priority.checklist && Array.isArray(priority.checklist)) {
      priority.checklist.forEach((item: any, index: number) => {
        console.log(`  ${index + 1}. ${item.text}`);
        console.log(`     - Completada: ${item.completed}`);
        console.log(`     - Horas: ${item.completedHours !== undefined ? item.completedHours : 'NO DEFINIDO'}`);
        console.log(`     - _id: ${item._id}`);
        console.log('');
      });
    } else {
      console.log('  No hay checklist');
    }

    console.log('\n📄 Documento completo:');
    console.log(JSON.stringify(priority, null, 2));

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.connection.close();
    console.log('\n✓ Conexión cerrada');
  }
}

checkPriorityHours();
