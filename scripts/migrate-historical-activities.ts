import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Priority from '../models/Priority';
import Comment from '../models/Comment';
import Milestone from '../models/Milestone';
import ProjectActivity from '../models/ProjectActivity';
import User from '../models/User';
import Project from '../models/Project';

// Load environment variables
dotenv.config({ path: '.env.local' });
if (!process.env.MONGODB_URI) {
  dotenv.config({ path: '.env' });
}

// Direct MongoDB connection function for scripts
async function connectToMongoDB() {
  const MONGODB_URI = process.env.MONGODB_URI;

  if (!MONGODB_URI) {
    throw new Error('MONGODB_URI no está definida en el archivo .env');
  }

  if (mongoose.connection.readyState === 1) {
    return;
  }

  await mongoose.connect(MONGODB_URI);
  console.log('✅ Conectado a MongoDB');
}

interface MigrationStats {
  prioritiesCreated: number;
  prioritiesCompleted: number;
  tasksCreated: number;
  tasksCompleted: number;
  commentsAdded: number;
  milestonesCreated: number;
  milestonesCompleted: number;
  totalActivities: number;
  errors: number;
}

async function migrateHistoricalActivities() {
  console.log('🚀 Iniciando migración de actividades históricas...\n');

  const stats: MigrationStats = {
    prioritiesCreated: 0,
    prioritiesCompleted: 0,
    tasksCreated: 0,
    tasksCompleted: 0,
    commentsAdded: 0,
    milestonesCreated: 0,
    milestonesCompleted: 0,
    totalActivities: 0,
    errors: 0
  };

  try {
    await connectToMongoDB();

    // 1. MIGRAR PRIORIDADES
    console.log('📋 Migrando prioridades...');
    const priorities = await Priority.find({})
      .sort({ createdAt: 1 })
      .lean();

    for (const priority of priorities) {
      if (!priority.projectId) {
        console.log(`  ⚠️  Prioridad "${priority.title}" sin proyecto asignado, saltando...`);
        continue;
      }

      try {
        // Crear actividad de creación de prioridad
        await ProjectActivity.create({
          projectId: priority.projectId,
          activityType: 'priority_created',
          userId: priority.userId,
          metadata: {
            priorityId: priority._id,
            priorityTitle: priority.title,
            priorityType: priority.type
          },
          createdAt: priority.createdAt
        });
        stats.prioritiesCreated++;

        // Si está completada, crear actividad de completado
        if (priority.status === 'COMPLETADO') {
          await ProjectActivity.create({
            projectId: priority.projectId,
            activityType: 'priority_completed',
            userId: priority.userId,
            metadata: {
              priorityId: priority._id,
              priorityTitle: priority.title
            },
            createdAt: priority.updatedAt || priority.createdAt
          });
          stats.prioritiesCompleted++;
        }

        // 2. MIGRAR TAREAS DEL CHECKLIST
        if (priority.checklist && priority.checklist.length > 0) {
          for (const task of priority.checklist) {
            // Crear actividad de creación de tarea
            await ProjectActivity.create({
              projectId: priority.projectId,
              activityType: 'task_created',
              userId: priority.userId,
              metadata: {
                taskId: task._id,
                taskTitle: task.text,
                priorityId: priority._id,
                priorityTitle: priority.title
              },
              createdAt: task.createdAt || priority.createdAt
            });
            stats.tasksCreated++;

            // Si está completada, crear actividad de completado
            if (task.completed) {
              await ProjectActivity.create({
                projectId: priority.projectId,
                activityType: 'task_completed',
                userId: priority.userId,
                metadata: {
                  taskId: task._id,
                  taskTitle: task.text,
                  priorityId: priority._id,
                  priorityTitle: priority.title
                },
                createdAt: task.createdAt || priority.updatedAt || priority.createdAt
              });
              stats.tasksCompleted++;
            }
          }
        }
      } catch (err: any) {
        console.error(`  ❌ Error procesando prioridad "${priority.title}":`, err.message);
        stats.errors++;
      }
    }

    console.log(`  ✅ Prioridades procesadas: ${stats.prioritiesCreated} creadas, ${stats.prioritiesCompleted} completadas`);
    console.log(`  ✅ Tareas procesadas: ${stats.tasksCreated} creadas, ${stats.tasksCompleted} completadas\n`);

    // 3. MIGRAR COMENTARIOS
    console.log('💬 Migrando comentarios...');
    const comments = await Comment.find({ isSystemComment: false })
      .sort({ createdAt: 1 })
      .lean();

    for (const comment of comments) {
      if (!comment.priorityId) {
        console.log(`  ⚠️  Comentario sin prioridad, saltando...`);
        continue;
      }

      try {
        // Buscar la prioridad manualmente para obtener el projectId
        const priority = await Priority.findById(comment.priorityId).lean();

        if (!priority || !priority.projectId) {
          console.log(`  ⚠️  Comentario sin proyecto válido, saltando...`);
          continue;
        }

        await ProjectActivity.create({
          projectId: priority.projectId,
          activityType: 'comment_added',
          userId: comment.userId,
          metadata: {
            commentId: comment._id,
            commentText: comment.text.substring(0, 100), // Limitar a 100 chars
            priorityId: priority._id,
            priorityTitle: priority.title
          },
          createdAt: comment.createdAt
        });
        stats.commentsAdded++;
      } catch (err: any) {
        console.error(`  ❌ Error procesando comentario:`, err.message);
        stats.errors++;
      }
    }

    console.log(`  ✅ Comentarios procesados: ${stats.commentsAdded}\n`);

    // 4. MIGRAR HITOS
    console.log('🎯 Migrando hitos...');
    const milestones = await Milestone.find({})
      .sort({ createdAt: 1 })
      .lean();

    for (const milestone of milestones) {
      if (!milestone.projectId) {
        console.log(`  ⚠️  Hito "${milestone.title}" sin proyecto asignado, saltando...`);
        continue;
      }

      try {
        // Crear actividad de creación de hito
        await ProjectActivity.create({
          projectId: milestone.projectId,
          activityType: 'milestone_created',
          userId: milestone.userId,
          metadata: {
            milestoneId: milestone._id,
            milestoneTitle: milestone.title,
            milestoneDueDate: milestone.dueDate
          },
          createdAt: milestone.createdAt
        });
        stats.milestonesCreated++;

        // Si está completado, crear actividad de completado
        if (milestone.isCompleted) {
          await ProjectActivity.create({
            projectId: milestone.projectId,
            activityType: 'milestone_completed',
            userId: milestone.userId,
            metadata: {
              milestoneId: milestone._id,
              milestoneTitle: milestone.title
            },
            createdAt: milestone.completedAt || milestone.updatedAt || milestone.createdAt
          });
          stats.milestonesCompleted++;
        }
      } catch (err: any) {
        console.error(`  ❌ Error procesando hito "${milestone.title}":`, err.message);
        stats.errors++;
      }
    }

    console.log(`  ✅ Hitos procesados: ${stats.milestonesCreated} creados, ${stats.milestonesCompleted} completados\n`);

    // RESUMEN FINAL
    stats.totalActivities =
      stats.prioritiesCreated +
      stats.prioritiesCompleted +
      stats.tasksCreated +
      stats.tasksCompleted +
      stats.commentsAdded +
      stats.milestonesCreated +
      stats.milestonesCompleted;

    console.log('═══════════════════════════════════════════');
    console.log('✨ MIGRACIÓN COMPLETADA');
    console.log('═══════════════════════════════════════════');
    console.log(`📊 Total de actividades creadas: ${stats.totalActivities}`);
    console.log(`   - Prioridades creadas: ${stats.prioritiesCreated}`);
    console.log(`   - Prioridades completadas: ${stats.prioritiesCompleted}`);
    console.log(`   - Tareas creadas: ${stats.tasksCreated}`);
    console.log(`   - Tareas completadas: ${stats.tasksCompleted}`);
    console.log(`   - Comentarios agregados: ${stats.commentsAdded}`);
    console.log(`   - Hitos creados: ${stats.milestonesCreated}`);
    console.log(`   - Hitos completados: ${stats.milestonesCompleted}`);
    if (stats.errors > 0) {
      console.log(`   ⚠️  Errores encontrados: ${stats.errors}`);
    }
    console.log('═══════════════════════════════════════════\n');

  } catch (error: any) {
    console.error('❌ Error durante la migración:', error);
    throw error;
  } finally {
    await mongoose.connection.close();
  }
}

// Ejecutar migración
migrateHistoricalActivities()
  .then(() => {
    console.log('✅ Script finalizado exitosamente');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Script finalizado con errores:', error);
    process.exit(1);
  });
