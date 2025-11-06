import mongoose from 'mongoose';
import Comment from '../models/Comment';
import User from '../models/User';
import dotenv from 'dotenv';

dotenv.config({ path: '.env' });

async function fixOrphanedComment() {
  try {
    await mongoose.connect(process.env.MONGODB_URI as string);
    console.log('Conectado a MongoDB');

    const commentId = '6907ed56da8a6724096d852e';
    const correctUserEmail = 'lgarcia@orcagrc.com';

    // Buscar el comentario
    const comment = await Comment.findById(commentId);

    if (!comment) {
      console.log(`❌ Comentario ${commentId} no encontrado`);
      return;
    }

    console.log('\n=== COMENTARIO ANTES ===');
    console.log(`ID: ${comment._id}`);
    console.log(`userId (incorrecto): ${comment.userId}`);
    console.log(`Texto: ${comment.text}`);

    // Buscar el usuario correcto
    const correctUser = await User.findOne({ email: correctUserEmail }).lean();

    if (!correctUser) {
      console.log(`❌ Usuario ${correctUserEmail} no encontrado`);
      return;
    }

    console.log(`\n✅ Usuario correcto encontrado:`);
    console.log(`   Nombre: ${correctUser.name}`);
    console.log(`   Email: ${correctUser.email}`);
    console.log(`   ID: ${correctUser._id}`);

    // Actualizar el comentario
    comment.userId = correctUser._id as any;
    await comment.save();

    console.log('\n=== COMENTARIO DESPUÉS ===');
    console.log(`ID: ${comment._id}`);
    console.log(`userId (correcto): ${comment.userId}`);
    console.log(`✅ Comentario actualizado correctamente`);

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await mongoose.disconnect();
  }
}

fixOrphanedComment();
