import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI!;

// Importar el modelo real
import Priority from '../models/Priority';

async function testReprogramadoDirect() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Conectado a MongoDB');

    // Buscar una prioridad COMPLETADA
    const testPriority = await Priority.findOne({ status: 'COMPLETADO' });

    if (!testPriority) {
      console.log('❌ No se encontró ninguna prioridad COMPLETADA');
      await mongoose.disconnect();
      return;
    }

    console.log(`\n📋 Probando con prioridad: "${testPriority.title}"`);
    console.log(`   ID: ${testPriority._id}`);
    console.log(`   Status actual: ${testPriority.status}`);

    // Intentar actualizar usando findByIdAndUpdate (como lo hace el endpoint)
    try {
      const updated = await Priority.findByIdAndUpdate(
        testPriority._id,
        {
          status: 'REPROGRAMADO',
          wasEdited: true,
          lastEditedAt: new Date(),
          updatedAt: new Date()
        },
        { new: true, runValidators: true }
      );

      console.log('✅ Se pudo actualizar a REPROGRAMADO exitosamente');
      console.log(`   Status después de guardar: ${updated?.status}`);

      // Verificar en BD
      const verified = await Priority.findById(testPriority._id);
      console.log(`   Status verificado en BD: ${verified?.status}`);

      // Revertir
      await Priority.findByIdAndUpdate(
        testPriority._id,
        { status: 'COMPLETADO' },
        { new: true }
      );
      console.log('✅ Reverted back to COMPLETADO');

    } catch (error: any) {
      console.log('❌ Error al actualizar a REPROGRAMADO:');
      console.log(`   Mensaje: ${error.message}`);
      if (error.errors) {
        Object.keys(error.errors).forEach(key => {
          console.log(`   - ${key}: ${error.errors[key].message}`);
        });
      }
    }

    await mongoose.disconnect();
    console.log('\n✅ Desconectado de MongoDB');
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

testReprogramadoDirect();
