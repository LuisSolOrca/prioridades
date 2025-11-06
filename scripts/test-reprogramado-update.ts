import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI!;

// Importar el modelo real
import Priority from '../models/Priority';

async function testReprogramadoUpdate() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Conectado a MongoDB');

    // Buscar una prioridad COMPLETADA para probar
    const testPriority = await Priority.findOne({ status: 'COMPLETADO' });

    if (!testPriority) {
      console.log('❌ No se encontró ninguna prioridad COMPLETADA para probar');
      await mongoose.disconnect();
      return;
    }

    console.log(`\n📋 Probando con prioridad: "${testPriority.title}"`);
    console.log(`   Status actual: ${testPriority.status}`);

    // Intentar actualizar a REPROGRAMADO
    try {
      testPriority.status = 'REPROGRAMADO';
      await testPriority.save();
      console.log('✅ Se pudo actualizar a REPROGRAMADO exitosamente');

      // Verificar
      const updated = await Priority.findById(testPriority._id);
      console.log(`   Status después de guardar: ${updated?.status}`);

      // Revertir
      if (updated) {
        updated.status = 'COMPLETADO';
        await updated.save();
        console.log('✅ Reverted back to COMPLETADO');
      }
    } catch (error: any) {
      console.log('❌ Error al actualizar a REPROGRAMADO:');
      console.log(`   ${error.message}`);
    }

    await mongoose.disconnect();
    console.log('\n✅ Desconectado de MongoDB');
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

testReprogramadoUpdate();
