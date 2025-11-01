/**
 * Script de inicialización de la base de datos
 * 
 * Este script se ejecuta una vez para crear:
 * - Usuario administrador inicial
 * - Iniciativas estratégicas iniciales
 * 
 * Ejecutar con: npx tsx scripts/init-db.ts
 */

import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const MONGODB_URI = process.env.MONGODB_URI || '';
const ADMIN_PASSWORD = process.env.ADMIN_INITIAL_PASSWORD || 'GCPGlobaldsdsd323232';

async function initDatabase() {
  try {
    console.log('🔌 Conectando a MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Conectado a MongoDB');

    const db = mongoose.connection.db;
    
    if (!db) {
      throw new Error('Database connection not established');
    }

    // Verificar si ya existe un admin
    const adminExists = await db.collection('users').findOne({ 
      role: 'ADMIN' 
    });

    if (adminExists) {
      console.log('⚠️  Usuario administrador ya existe');
    } else {
      // Crear usuario administrador
      const hashedPassword = await bcrypt.hash(ADMIN_PASSWORD, 10);
      
      await db.collection('users').insertOne({
        name: 'Administrador',
        email: 'admin@empresa.com',
        password: hashedPassword,
        role: 'ADMIN',
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      
      console.log('✅ Usuario administrador creado');
      console.log('   Email: admin@empresa.com');
      console.log(`   Password: ${ADMIN_PASSWORD}`);
    }

    // Verificar si ya existen iniciativas
    const initiativesCount = await db
      .collection('strategicinitiatives')
      .countDocuments();

    if (initiativesCount > 0) {
      console.log('⚠️  Iniciativas estratégicas ya existen');
    } else {
      // Crear iniciativas estratégicas iniciales
      const initiatives = [
        { 
          name: 'Generación de ingresos', 
          color: '#10b981', 
          order: 1, 
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        { 
          name: 'Nuevo negocio con clientes actuales', 
          color: '#3b82f6', 
          order: 2, 
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        { 
          name: 'Eficiencia Operativa', 
          color: '#f59e0b', 
          order: 3, 
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        { 
          name: 'Analítica Avanzada, Talento y Cultura', 
          color: '#8b5cf6', 
          order: 4, 
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        { 
          name: 'Orca SNS', 
          color: '#ec4899', 
          order: 5, 
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      await db
        .collection('strategicinitiatives')
        .insertMany(initiatives);

      console.log('✅ Iniciativas estratégicas creadas');
    }

    console.log('\n🎉 Inicialización completada exitosamente!');
    
  } catch (error) {
    console.error('❌ Error durante la inicialización:', error);
  } finally {
    await mongoose.disconnect();
    console.log('👋 Desconectado de MongoDB');
  }
}

initDatabase();
