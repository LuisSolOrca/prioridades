/**
 * MongoDB Atlas Search - Crear Índices Automáticamente
 *
 * Este script crea todos los índices de Atlas Search necesarios para
 * la búsqueda global en la aplicación.
 *
 * REQUISITOS:
 * - MongoDB Atlas M10 o superior (Atlas Search no está disponible en M0/M2/M5)
 * - Variable de entorno MONGODB_URI configurada
 *
 * EJECUCIÓN:
 * npx tsx scripts/setup-atlas-search-indexes.ts
 *
 * NOTA: Los índices tardan unos minutos en construirse después de crearlos.
 * Puedes verificar el estado en MongoDB Atlas Dashboard > Database > Search
 */

import { MongoClient } from 'mongodb';
import dotenv from 'dotenv';
import { SEARCHABLE_ENTITIES, SearchableEntityConfig } from '../lib/atlasSearch';

// Cargar variables de entorno
dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI;
const INDEX_NAME = 'global_search';

if (!MONGODB_URI) {
  console.error('❌ Error: MONGODB_URI no está configurado en .env');
  process.exit(1);
}

/**
 * Genera la definición del índice para una colección
 */
function generateIndexDefinition(config: SearchableEntityConfig): any {
  const fields: Record<string, any> = {};

  for (const field of config.searchFields) {
    if (field === 'email') {
      // Email usa keyword analyzer para búsquedas exactas
      fields[field] = { type: 'string', analyzer: 'lucene.keyword' };
    } else if (field.includes('.')) {
      // Campos anidados (ej: voiceMessage.transcription)
      const [parent, child] = field.split('.');
      if (!fields[parent]) {
        fields[parent] = { type: 'document', fields: {} };
      }
      fields[parent].fields[child] = [
        { type: 'string', analyzer: 'lucene.spanish' },
        { type: 'autocomplete', analyzer: 'lucene.standard' },
      ];
    } else {
      // Campos de texto con analyzer español y autocomplete
      fields[field] = [
        { type: 'string', analyzer: 'lucene.spanish' },
        { type: 'autocomplete', analyzer: 'lucene.standard' },
      ];
    }
  }

  return {
    mappings: {
      dynamic: false,
      fields,
    },
  };
}

/**
 * Verifica si un índice ya existe en una colección
 */
async function indexExists(
  db: any,
  collectionName: string
): Promise<boolean> {
  try {
    const collection = db.collection(collectionName);
    const indexes = await collection.listSearchIndexes().toArray();
    return indexes.some((idx: any) => idx.name === INDEX_NAME);
  } catch (error: any) {
    // Si el método no existe o hay error, asumimos que no existe
    if (error.code === 59 || error.message?.includes('not found')) {
      return false;
    }
    throw error;
  }
}

/**
 * Crea un índice de búsqueda en una colección
 */
async function createSearchIndex(
  db: any,
  collectionName: string,
  config: SearchableEntityConfig
): Promise<{ success: boolean; message: string; skipped?: boolean }> {
  try {
    const collection = db.collection(collectionName);

    // Verificar si el índice ya existe
    const exists = await indexExists(db, collectionName);
    if (exists) {
      return {
        success: true,
        message: `Índice ya existe`,
        skipped: true
      };
    }

    // Generar definición del índice
    const indexDefinition = generateIndexDefinition(config);

    // Crear el índice
    await collection.createSearchIndex({
      name: INDEX_NAME,
      definition: indexDefinition,
    });

    return {
      success: true,
      message: `Índice creado exitosamente`
    };
  } catch (error: any) {
    // Manejar error si el índice ya existe
    if (error.code === 68 || error.message?.includes('already exists')) {
      return {
        success: true,
        message: `Índice ya existe`,
        skipped: true
      };
    }

    // Error de Atlas Search no disponible (cluster free tier)
    if (error.code === 31 || error.message?.includes('not enabled') || error.message?.includes('Atlas')) {
      return {
        success: false,
        message: `Atlas Search no disponible (¿cluster M0/M2/M5?)`
      };
    }

    return {
      success: false,
      message: error.message || 'Error desconocido'
    };
  }
}

/**
 * Función principal
 */
async function main() {
  console.log('🔍 MongoDB Atlas Search - Configuración de Índices\n');
  console.log('=' .repeat(60));

  const client = new MongoClient(MONGODB_URI!);

  try {
    // Conectar a MongoDB
    console.log('\n📡 Conectando a MongoDB Atlas...');
    await client.connect();

    // Obtener nombre de la base de datos del URI
    const dbName = new URL(MONGODB_URI!.replace('mongodb+srv://', 'https://')).pathname.slice(1).split('?')[0] || 'prioridades';
    const db = client.db(dbName);

    console.log(`✓ Conectado a la base de datos: ${dbName}\n`);
    console.log('=' .repeat(60));
    console.log('\n📝 Creando índices de búsqueda...\n');

    const results: { collection: string; status: string; message: string }[] = [];
    let created = 0;
    let skipped = 0;
    let failed = 0;

    // Iterar sobre todas las entidades configuradas
    for (const [type, config] of Object.entries(SEARCHABLE_ENTITIES)) {
      process.stdout.write(`  ${config.collection.padEnd(25)} `);

      const result = await createSearchIndex(db, config.collection, config);

      if (result.success) {
        if (result.skipped) {
          console.log(`⏭️  ${result.message}`);
          skipped++;
        } else {
          console.log(`✅ ${result.message}`);
          created++;
        }
      } else {
        console.log(`❌ ${result.message}`);
        failed++;
      }

      results.push({
        collection: config.collection,
        status: result.success ? (result.skipped ? 'skipped' : 'created') : 'failed',
        message: result.message,
      });
    }

    // Resumen
    console.log('\n' + '=' .repeat(60));
    console.log('\n📊 Resumen:\n');
    console.log(`   ✅ Creados:  ${created}`);
    console.log(`   ⏭️  Existentes: ${skipped}`);
    console.log(`   ❌ Fallidos: ${failed}`);
    console.log(`   📁 Total:    ${Object.keys(SEARCHABLE_ENTITIES).length}`);

    if (created > 0) {
      console.log('\n⏳ Los índices tardan unos minutos en construirse.');
      console.log('   Verifica el estado en: MongoDB Atlas Dashboard > Database > Search');
    }

    if (failed > 0) {
      console.log('\n⚠️  Algunos índices no se pudieron crear.');
      console.log('   Posibles causas:');
      console.log('   - El cluster es M0/M2/M5 (Atlas Search requiere M10+)');
      console.log('   - La colección no existe aún');
      console.log('   - Permisos insuficientes');
    }

    console.log('\n' + '=' .repeat(60));
    console.log('\n✨ Proceso completado\n');

  } catch (error: any) {
    console.error('\n❌ Error fatal:', error.message);

    if (error.message?.includes('ENOTFOUND') || error.message?.includes('getaddrinfo')) {
      console.error('\n   No se pudo conectar a MongoDB Atlas.');
      console.error('   Verifica tu conexión a internet y el MONGODB_URI.');
    }

    process.exit(1);
  } finally {
    await client.close();
  }
}

// Ejecutar
main();
