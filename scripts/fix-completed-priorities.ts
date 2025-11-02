/**
 * Script para actualizar prioridades marcadas como COMPLETADO
 * pero que no tienen 100% de progreso
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
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  initiativeIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'StrategicInitiative' }],
  checklist: [{
    text: String,
    completed: { type: Boolean, default: false }
  }],
  evidenceLinks: [String],
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

async function fixCompletedPriorities() {
  try {
    await connectDB();

    console.log('🔍 Buscando prioridades COMPLETADO con progreso < 100%...\n');

    // Buscar todas las prioridades con status COMPLETADO pero completionPercentage < 100
    const priorities = await Priority.find({
      status: 'COMPLETADO',
      completionPercentage: { $lt: 100 }
    });

    console.log(`📊 Encontradas ${priorities.length} prioridades para actualizar\n`);

    if (priorities.length === 0) {
      console.log('✨ No hay prioridades que necesiten corrección');
      return;
    }

    // Mostrar información de las prioridades a actualizar
    console.log('Prioridades a actualizar:');
    console.log('═'.repeat(80));
    for (const priority of priorities) {
      console.log(`
📌 ID: ${priority._id}
   Título: ${priority.title}
   User ID: ${priority.userId}
   Progreso actual: ${priority.completionPercentage}%
   Semana: ${priority.weekStart.toISOString().split('T')[0]} a ${priority.weekEnd.toISOString().split('T')[0]}
      `);
    }
    console.log('═'.repeat(80));

    // Preguntar confirmación
    console.log('\n⚠️  Se actualizarán todas estas prioridades al 100% de progreso');
    console.log('Presiona Ctrl+C para cancelar o espera 5 segundos para continuar...\n');

    await new Promise(resolve => setTimeout(resolve, 5000));

    // Actualizar todas las prioridades
    const result = await Priority.updateMany(
      {
        status: 'COMPLETADO',
        completionPercentage: { $lt: 100 }
      },
      {
        $set: {
          completionPercentage: 100,
          wasEdited: true,
          lastEditedAt: new Date(),
          updatedAt: new Date()
        }
      }
    );

    console.log(`\n✅ Actualización completada:`);
    console.log(`   - Prioridades modificadas: ${result.modifiedCount}`);
    console.log(`   - Prioridades coincidentes: ${result.matchedCount}`);

    // Verificar que se actualizaron correctamente
    const remainingBroken = await Priority.countDocuments({
      status: 'COMPLETADO',
      completionPercentage: { $lt: 100 }
    });

    if (remainingBroken === 0) {
      console.log('\n🎉 ¡Perfecto! Todas las prioridades COMPLETADO ahora tienen 100% de progreso');
    } else {
      console.log(`\n⚠️  Atención: Aún quedan ${remainingBroken} prioridades sin actualizar`);
    }

  } catch (error) {
    console.error('\n❌ Error al ejecutar el script:', error);
    throw error;
  } finally {
    await mongoose.connection.close();
    console.log('\n🔌 Desconectado de MongoDB');
  }
}

// Ejecutar el script
fixCompletedPriorities()
  .then(() => {
    console.log('\n✨ Script finalizado exitosamente');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 Script finalizado con errores:', error);
    process.exit(1);
  });
