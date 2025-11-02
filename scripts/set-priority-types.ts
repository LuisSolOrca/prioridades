/**
 * Script para establecer el tipo de todas las prioridades existentes como ESTRATEGICA
 * si no tienen un tipo definido
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';

// Cargar variables de entorno
dotenv.config({ path: path.resolve(__dirname, '../.env') });

// Definir el schema directamente
const prioritySchema = new mongoose.Schema({
  title: String,
  description: String,
  weekStart: Date,
  weekEnd: Date,
  completionPercentage: { type: Number, default: 0 },
  status: {
    type: String,
    enum: ['EN_TIEMPO', 'EN_RIESGO', 'BLOQUEADO', 'COMPLETADO', 'REPROGRAMADO'],
    default: 'EN_TIEMPO'
  },
  type: {
    type: String,
    enum: ['ESTRATEGICA', 'OPERATIVA'],
    default: 'ESTRATEGICA'
  },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  initiativeId: { type: mongoose.Schema.Types.ObjectId, ref: 'StrategicInitiative' },
  initiativeIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'StrategicInitiative' }],
  checklist: [{
    text: String,
    completed: { type: Boolean, default: false }
  }],
  evidenceLinks: [{
    title: String,
    url: String
  }],
  wasEdited: { type: Boolean, default: false },
  lastEditedAt: Date,
  isCarriedOver: { type: Boolean, default: false }
}, {
  timestamps: true
});

const Priority = mongoose.models.Priority || mongoose.model('Priority', prioritySchema);

async function connectDB() {
  if (mongoose.connection.readyState >= 1) {
    return;
  }

  const MONGODB_URI = process.env.MONGODB_URI;

  if (!MONGODB_URI) {
    throw new Error('MONGODB_URI no está definido en las variables de entorno');
  }

  await mongoose.connect(MONGODB_URI);
  console.log('✅ Conectado a MongoDB');
}

async function setPriorityTypes() {
  try {
    await connectDB();

    console.log('🔍 Buscando prioridades sin tipo definido...\n');

    // Buscar todas las prioridades que no tienen el campo type o que es null/undefined
    const priorities = await Priority.find({
      $or: [
        { type: { $exists: false } },
        { type: null }
      ]
    });

    console.log(`📊 Encontradas ${priorities.length} prioridades sin tipo\n`);

    if (priorities.length === 0) {
      console.log('✨ Todas las prioridades ya tienen un tipo definido');
      return;
    }

    // Mostrar información de las prioridades a actualizar
    console.log('Prioridades a actualizar:');
    console.log('═'.repeat(80));
    for (const priority of priorities.slice(0, 10)) {
      console.log(`
📌 ID: ${priority._id}
   Título: ${priority.title}
   Status: ${priority.status}
   User ID: ${priority.userId}
   Semana: ${priority.weekStart.toISOString().split('T')[0]} a ${priority.weekEnd.toISOString().split('T')[0]}
      `);
    }

    if (priorities.length > 10) {
      console.log(`\n... y ${priorities.length - 10} prioridades más\n`);
    }

    console.log('═'.repeat(80));

    // Preguntar confirmación
    console.log('\n⚠️  Se establecerá el tipo ESTRATEGICA para todas estas prioridades');
    console.log('Presiona Ctrl+C para cancelar o espera 5 segundos para continuar...\n');

    await new Promise(resolve => setTimeout(resolve, 5000));

    // Actualizar todas las prioridades sin tipo
    const result = await Priority.updateMany(
      {
        $or: [
          { type: { $exists: false } },
          { type: null }
        ]
      },
      {
        $set: {
          type: 'ESTRATEGICA',
          updatedAt: new Date()
        }
      }
    );

    console.log(`\n✅ Actualización completada:`);
    console.log(`   - Prioridades modificadas: ${result.modifiedCount}`);
    console.log(`   - Prioridades coincidentes: ${result.matchedCount}`);

    // Verificar que se actualizaron correctamente
    const remainingWithoutType = await Priority.countDocuments({
      $or: [
        { type: { $exists: false } },
        { type: null }
      ]
    });

    if (remainingWithoutType === 0) {
      console.log('\n🎉 ¡Perfecto! Todas las prioridades ahora tienen tipo ESTRATEGICA');
    } else {
      console.log(`\n⚠️  Atención: Aún quedan ${remainingWithoutType} prioridades sin tipo`);
    }

    // Mostrar estadísticas finales
    const estrategicas = await Priority.countDocuments({ type: 'ESTRATEGICA' });
    const operativas = await Priority.countDocuments({ type: 'OPERATIVA' });
    const total = await Priority.countDocuments();

    console.log('\n📊 Estadísticas finales:');
    console.log(`   - Total de prioridades: ${total}`);
    console.log(`   - Estratégicas: ${estrategicas} (${((estrategicas/total)*100).toFixed(1)}%)`);
    console.log(`   - Operativas: ${operativas} (${((operativas/total)*100).toFixed(1)}%)`);

  } catch (error) {
    console.error('\n❌ Error al ejecutar el script:', error);
    throw error;
  } finally {
    await mongoose.connection.close();
    console.log('\n🔌 Desconectado de MongoDB');
  }
}

// Ejecutar el script
setPriorityTypes()
  .then(() => {
    console.log('\n✨ Script finalizado exitosamente');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 Script finalizado con errores:', error);
    process.exit(1);
  });
