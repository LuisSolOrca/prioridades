import mongoose from 'mongoose';
import Comment from '../models/Comment';
import User from '../models/User';
import Priority from '../models/Priority';
import dotenv from 'dotenv';

dotenv.config({ path: '.env' });

async function checkSpecificPriorityComments() {
  try {
    await mongoose.connect(process.env.MONGODB_URI as string);
    console.log('Conectado a MongoDB');

    // Buscar la prioridad por ID (de la búsqueda anterior)
    const priorityId = '69057cd406cc1419ab90573a';

    const priority = await Priority.findById(priorityId).lean();

    if (!priority) {
      console.log(`❌ Prioridad con ID ${priorityId} no encontrada`);

      // Buscar prioridades similares
      const similarPriorities = await Priority.find({
        title: { $regex: 'Optimización.*Activos', $options: 'i' }
      }).select('title _id weekStart').lean();

      if (similarPriorities.length > 0) {
        console.log('\nPrioridades similares encontradas:');
        similarPriorities.forEach(p => {
          console.log(`- ${p.title}`);
          console.log(`  ID: ${p._id}`);
          console.log(`  Semana: ${new Date(p.weekStart).toLocaleDateString('es-MX')}`);
        });
      }
      return;
    }

    console.log(`\n✅ Prioridad encontrada:`);
    console.log(`Título: ${priority.title}`);
    console.log(`ID: ${priority._id}`);
    console.log(`Usuario ID: ${priority.userId}`);
    console.log(`Semana: ${new Date(priority.weekStart).toLocaleDateString('es-MX')}`);

    // Buscar comentarios de esta prioridad
    const comments = await Comment.find({
      priorityId: priority._id
    }).lean();

    console.log(`\n=== COMENTARIOS (${comments.length} total) ===\n`);

    for (const comment of comments) {
      console.log(`--- Comentario ID: ${comment._id} ---`);
      console.log(`Creado: ${comment.createdAt}`);
      console.log(`userId (raw): ${comment.userId}`);
      console.log(`Tipo de userId: ${typeof comment.userId}`);
      console.log(`isSystemComment: ${comment.isSystemComment}`);
      console.log(`Texto: ${comment.text.substring(0, 100)}...`);

      // Intentar buscar el usuario
      if (comment.userId) {
        try {
          const user = await User.findById(comment.userId).lean();

          if (user) {
            console.log(`✅ Usuario encontrado:`);
            console.log(`   Nombre: ${user.name}`);
            console.log(`   Email: ${user.email}`);
            console.log(`   ID: ${user._id}`);
          } else {
            console.log(`❌ Usuario NO encontrado con ID: ${comment.userId}`);

            // Buscar si existe Luis García
            const luisGarcia = await User.findOne({ email: 'lgarcia@orcagrc.com' }).lean();
            if (luisGarcia) {
              console.log(`\n⚠️ Luis García SÍ existe en la DB:`);
              console.log(`   ID correcto: ${luisGarcia._id}`);
              console.log(`   ID en comentario: ${comment.userId}`);
              console.log(`   ¿Son iguales? ${luisGarcia._id.toString() === comment.userId.toString()}`);
            }
          }
        } catch (err) {
          console.log(`❌ Error buscando usuario: ${err}`);
        }
      } else {
        console.log(`❌ userId es NULL`);
      }
      console.log('');
    }

    // Verificar el usuario dueño de la prioridad
    console.log('\n=== USUARIO DUEÑO DE LA PRIORIDAD ===');
    const owner = await User.findById(priority.userId).lean();
    if (owner) {
      console.log(`✅ Dueño: ${owner.name} (${owner.email})`);
    } else {
      console.log(`❌ Dueño no encontrado con ID: ${priority.userId}`);
    }

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await mongoose.disconnect();
  }
}

checkSpecificPriorityComments();
