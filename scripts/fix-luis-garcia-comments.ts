import mongoose from 'mongoose';
import Comment from '../models/Comment';
import User from '../models/User';
import dotenv from 'dotenv';

dotenv.config({ path: '.env' });

async function fixLuisGarciaComments() {
  try {
    await mongoose.connect(process.env.MONGODB_URI as string);
    console.log('Conectado a MongoDB');

    const oldUserId = '6907b35b45c48c2bfdf75539';
    const correctUserEmail = 'lgarcia@orcagrc.com';

    // Buscar el usuario correcto
    const correctUser = await User.findOne({ email: correctUserEmail }).lean();

    if (!correctUser) {
      console.log(`❌ Usuario ${correctUserEmail} no encontrado`);
      return;
    }

    console.log(`✅ Usuario correcto encontrado:`);
    console.log(`   Nombre: ${correctUser.name}`);
    console.log(`   Email: ${correctUser.email}`);
    console.log(`   ID: ${correctUser._id}`);

    // Buscar todos los comentarios con el userId antiguo
    const orphanedComments = await Comment.find({ userId: oldUserId });

    console.log(`\n📊 Comentarios a corregir: ${orphanedComments.length}`);

    if (orphanedComments.length === 0) {
      console.log('✅ No hay comentarios por corregir');
      return;
    }

    // Actualizar todos los comentarios
    const result = await Comment.updateMany(
      { userId: oldUserId },
      { $set: { userId: correctUser._id } }
    );

    console.log(`\n✅ Comentarios actualizados: ${result.modifiedCount}`);
    console.log(`   De userId: ${oldUserId}`);
    console.log(`   A userId: ${correctUser._id}`);

    // Verificar
    const remainingOrphaned = await Comment.find({ userId: oldUserId });
    console.log(`\n📊 Comentarios huérfanos restantes: ${remainingOrphaned.length}`);

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await mongoose.disconnect();
  }
}

fixLuisGarciaComments();
