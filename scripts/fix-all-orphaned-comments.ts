import mongoose from 'mongoose';
import Comment from '../models/Comment';
import User from '../models/User';
import dotenv from 'dotenv';

dotenv.config({ path: '.env' });

async function fixAllOrphanedComments() {
  try {
    await mongoose.connect(process.env.MONGODB_URI as string);
    console.log('Conectado a MongoDB');

    // Obtener todos los comentarios
    const allComments = await Comment.find().lean();
    console.log(`\nRevisando ${allComments.length} comentarios...`);

    let orphanedCount = 0;
    let fixedCount = 0;
    const orphanedComments = [];

    // Verificar cada comentario
    for (const comment of allComments) {
      if (comment.userId) {
        const user = await User.findById(comment.userId).lean();

        if (!user) {
          orphanedCount++;
          orphanedComments.push(comment);
          console.log(`\n❌ Comentario huérfano encontrado:`);
          console.log(`   ID: ${comment._id}`);
          console.log(`   userId inválido: ${comment.userId}`);
          console.log(`   Texto: ${comment.text.substring(0, 50)}...`);
          console.log(`   Creado: ${comment.createdAt}`);
        }
      }
    }

    console.log(`\n\n=== RESUMEN ===`);
    console.log(`Total comentarios: ${allComments.length}`);
    console.log(`Comentarios huérfanos: ${orphanedCount}`);

    if (orphanedCount === 0) {
      console.log('✅ No hay comentarios huérfanos');
      return;
    }

    console.log(`\n⚠️ Se encontraron ${orphanedCount} comentarios huérfanos`);
    console.log('Estos comentarios tienen un userId que ya no existe en la base de datos');
    console.log('\nNo se pueden corregir automáticamente sin saber quién fue el autor original.');
    console.log('Opciones:');
    console.log('1. Eliminarlos');
    console.log('2. Asignarlos a un usuario del sistema');
    console.log('3. Revisar manualmente cada uno');

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await mongoose.disconnect();
  }
}

fixAllOrphanedComments();
