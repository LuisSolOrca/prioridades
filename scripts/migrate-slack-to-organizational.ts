/**
 * Script de migración de integraciones de Slack de por usuario a organizacional
 *
 * Este script convierte las integraciones de Slack existentes (por usuario)
 * en una única integración organizacional.
 *
 * Ejecutar con: npx tsx scripts/migrate-slack-to-organizational.ts
 */
import 'dotenv/config';
import mongoose from 'mongoose';

const MONGODB_URI = process.env.MONGODB_URI || '';

interface OldSlackIntegration {
  _id: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  slackUserId: string;
  slackTeamId: string;
  slackTeamName: string;
  accessToken: string;
  scope: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

async function migrateSlackIntegrations() {
  try {
    console.log('🔌 Conectando a MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Conectado a MongoDB\n');

    const db = mongoose.connection.db;

    if (!db) {
      throw new Error('Database connection not established');
    }

    // Obtener todas las integraciones de Slack existentes
    const slackIntegrations = await db
      .collection('slackintegrations')
      .find({})
      .toArray() as unknown as OldSlackIntegration[];

    console.log(`📊 Encontradas ${slackIntegrations.length} integraciones de Slack\n`);

    if (slackIntegrations.length === 0) {
      console.log('✅ No hay integraciones para migrar');
      await mongoose.disconnect();
      return;
    }

    // Ordenar por activas primero, luego por fecha de creación (más reciente primero)
    slackIntegrations.sort((a, b) => {
      if (a.isActive && !b.isActive) return -1;
      if (!a.isActive && b.isActive) return 1;
      return b.createdAt.getTime() - a.createdAt.getTime();
    });

    // Tomar la primera integración como la organizacional
    const mainIntegration = slackIntegrations[0];

    console.log('🎯 Integración seleccionada como organizacional:');
    console.log(`   - Usuario ID: ${mainIntegration.userId}`);
    console.log(`   - Workspace: ${mainIntegration.slackTeamName}`);
    console.log(`   - Activa: ${mainIntegration.isActive ? 'Sí' : 'No'}`);
    console.log(`   - Fecha: ${mainIntegration.createdAt}\n`);

    // Eliminar TODAS las integraciones existentes
    const deleteResult = await db
      .collection('slackintegrations')
      .deleteMany({});

    console.log(`🗑️  Eliminadas ${deleteResult.deletedCount} integraciones antiguas\n`);

    // Crear nueva integración organizacional
    await db.collection('slackintegrations').insertOne({
      configuredBy: mainIntegration.userId, // userId se convierte en configuredBy
      slackUserId: mainIntegration.slackUserId,
      slackTeamId: mainIntegration.slackTeamId,
      slackTeamName: mainIntegration.slackTeamName,
      accessToken: mainIntegration.accessToken,
      scope: mainIntegration.scope,
      isActive: true, // Siempre activar la nueva integración
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    console.log('✅ Nueva integración organizacional creada\n');

    console.log('📋 Resumen:');
    console.log(`   - Integraciones antiguas eliminadas: ${deleteResult.deletedCount}`);
    console.log(`   - Nueva integración organizacional creada: 1`);
    console.log(`   - Workspace: ${mainIntegration.slackTeamName}`);
    console.log(`   - Configurada por: ${mainIntegration.userId}\n`);

    console.log('✅ Migración completada exitosamente');

    await mongoose.disconnect();
    console.log('👋 Desconectado de MongoDB');
  } catch (error) {
    console.error('❌ Error durante la migración:', error);
    process.exit(1);
  }
}

// Ejecutar migración
migrateSlackIntegrations();
