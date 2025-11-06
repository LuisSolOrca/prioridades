import mongoose from 'mongoose';
import Comment from '../models/Comment';
import User from '../models/User';
import Priority from '../models/Priority';
import dotenv from 'dotenv';

dotenv.config({ path: '.env' });

async function checkCommentsUsers() {
  try {
    await mongoose.connect(process.env.MONGODB_URI as string);
    console.log('Conectado a MongoDB');

    // Obtener fecha de hace una semana
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

    console.log(`\n=== REVISANDO COMENTARIOS DESDE ${oneWeekAgo.toISOString()} ===\n`);

    // Obtener comentarios de la última semana
    const comments = await Comment.find({
      createdAt: { $gte: oneWeekAgo }
    })
      .sort({ createdAt: -1 })
      .limit(20)
      .lean();

    console.log(`Total de comentarios encontrados: ${comments.length}\n`);

    for (const comment of comments) {
      console.log(`\n--- Comentario ID: ${comment._id} ---`);
      console.log(`Creado: ${comment.createdAt}`);
      console.log(`userId (ObjectId): ${comment.userId}`);
      console.log(`isSystemComment: ${comment.isSystemComment}`);
      console.log(`azureCommentId: ${comment.azureCommentId || 'N/A'}`);
      console.log(`Texto: ${comment.text.substring(0, 100)}...`);

      // Verificar si el usuario existe
      if (comment.userId) {
        const user = await User.findById(comment.userId).lean();

        if (user) {
          console.log(`✅ Usuario encontrado: ${user.name} (${user.email})`);
          console.log(`   Área: ${user.area || 'No definida'}`);
          console.log(`   Activo: ${user.isActive}`);
        } else {
          console.log(`❌ Usuario NO encontrado en la base de datos`);
          console.log(`   El userId ${comment.userId} no existe`);
        }
      } else {
        console.log(`❌ userId es NULL o undefined`);
      }

      // Obtener info de la prioridad
      if (comment.priorityId) {
        const priority = await Priority.findById(comment.priorityId).select('title weekStart').lean();
        if (priority) {
          console.log(`📋 Prioridad: ${priority.title}`);
          console.log(`   Semana: ${new Date(priority.weekStart).toLocaleDateString('es-MX')}`);
        }
      }
    }

    // Resumen de usuarios únicos en comentarios
    console.log('\n\n=== RESUMEN DE USUARIOS EN COMENTARIOS ===\n');

    const uniqueUserIds = [...new Set(comments.map(c => c.userId?.toString()).filter(Boolean))];
    console.log(`Usuarios únicos encontrados: ${uniqueUserIds.length}`);

    for (const userId of uniqueUserIds) {
      const user = await User.findById(userId).lean();
      const commentCount = comments.filter(c => c.userId?.toString() === userId).length;

      if (user) {
        console.log(`✅ ${user.name} (${user.email}) - ${commentCount} comentarios`);
      } else {
        console.log(`❌ Usuario ${userId} NO EXISTE - ${commentCount} comentarios huérfanos`);
      }
    }

    // Contar comentarios sin userId
    const commentsWithoutUser = comments.filter(c => !c.userId);
    if (commentsWithoutUser.length > 0) {
      console.log(`\n⚠️ ${commentsWithoutUser.length} comentarios sin userId asignado`);
    }

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await mongoose.disconnect();
  }
}

checkCommentsUsers();
