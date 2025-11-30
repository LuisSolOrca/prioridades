/**
 * Script para probar el workflow 692ba220755f7f0d0aba85c8
 * Trigger: activity_created con condición title starts_with "prueba"
 * Acciones: send_notification + send_channel_message
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

async function main() {
  console.log('Conectando a MongoDB...');
  await mongoose.connect(process.env.MONGODB_URI!);

  const db = mongoose.connection.db!;

  // 1. Verificar el workflow
  console.log('\n=== 1. VERIFICANDO WORKFLOW ===');
  const workflow = await db.collection('crmworkflows').findOne({
    _id: new mongoose.Types.ObjectId('692ba220755f7f0d0aba85c8')
  });

  if (!workflow) {
    console.error('Workflow no encontrado!');
    process.exit(1);
  }

  console.log('Workflow:', workflow.name);
  console.log('isActive:', workflow.isActive);
  console.log('Trigger:', workflow.trigger.type);
  console.log('Conditions:', JSON.stringify(workflow.trigger.conditions, null, 2));
  console.log('Actions:', workflow.actions.map((a: any) => a.type));

  // 2. Obtener datos necesarios
  console.log('\n=== 2. OBTENIENDO DATOS ===');
  const adminUser = await db.collection('users').findOne({ role: 'ADMIN' });
  const client = await db.collection('clients').findOne({});

  console.log('Admin:', adminUser?.name);
  console.log('Client:', client?.name);

  // 3. Crear actividad de prueba
  console.log('\n=== 3. CREANDO ACTIVIDAD ===');
  const activity = {
    type: 'note',
    title: 'prueba workflow ' + new Date().toISOString(),
    description: 'Actividad de prueba para workflow',
    clientId: client?._id,
    isCompleted: false,
    createdBy: adminUser?._id,
    createdAt: new Date(),
    updatedAt: new Date()
  };

  const insertResult = await db.collection('activities').insertOne(activity);
  const activityId = insertResult.insertedId;
  console.log('Actividad creada:', activityId.toString());
  console.log('Title:', activity.title);

  // 4. Simular el trigger del workflow
  console.log('\n=== 4. SIMULANDO TRIGGER DE WORKFLOW ===');

  // Import the workflow engine
  const { triggerWorkflowsSync } = await import('../lib/crmWorkflowEngine');

  // Obtener la actividad completa
  const fullActivity = await db.collection('activities').findOne({ _id: activityId });

  console.log('Llamando triggerWorkflowsSync...');
  await triggerWorkflowsSync('activity_created', {
    entityType: 'activity',
    entityId: activityId,
    entityName: activity.title,
    newData: fullActivity as Record<string, any>,
    userId: adminUser?._id.toString(),
  });

  // 5. Verificar resultados
  console.log('\n=== 5. VERIFICANDO RESULTADOS ===');

  // Check notifications created
  const notifications = await db.collection('notifications').find({
    createdAt: { $gte: new Date(Date.now() - 60000) } // Last minute
  }).toArray();
  console.log('Notificaciones recientes:', notifications.length);
  notifications.forEach(n => {
    console.log('  -', n.type, ':', n.message?.substring(0, 50));
  });

  // Check channel messages created
  const channelMessages = await db.collection('channelmessages').find({
    createdAt: { $gte: new Date(Date.now() - 60000) } // Last minute
  }).toArray();
  console.log('Mensajes de canal recientes:', channelMessages.length);
  channelMessages.forEach(m => {
    console.log('  -', m.content?.substring(0, 50));
  });

  // Check workflow execution
  const updatedWorkflow = await db.collection('crmworkflows').findOne({
    _id: new mongoose.Types.ObjectId('692ba220755f7f0d0aba85c8')
  });
  console.log('\nWorkflow execution count:', updatedWorkflow?.executionCount);
  console.log('Last executed:', updatedWorkflow?.lastExecutedAt);

  // 6. Cleanup - delete test activity
  console.log('\n=== 6. LIMPIEZA ===');
  await db.collection('activities').deleteOne({ _id: activityId });
  console.log('Actividad de prueba eliminada');

  await mongoose.disconnect();
  console.log('\n✅ Test completado');
}

main().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
