/**
 * Script de prueba para verificar conexión y operaciones con Cloudflare R2
 *
 * Ejecutar con: npx tsx test-r2-connection.ts
 */

import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand, ListObjectsV2Command } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

// Credenciales de R2
const R2_ACCOUNT_ID = '057b7c295defb7db3937bc132799d69d';
const R2_ACCESS_KEY_ID = '147cfe0ed93940c7b0ba6bfb1fdeb84f';
const R2_SECRET_ACCESS_KEY = 'cdf5c19ce870b8bdfc87ec4b6eb0fc5ba0e9fc8e59030430c8b4f768aa83218f';
const R2_BUCKET_NAME = 'prioridades';

console.log('🔧 Configurando cliente R2...\n');

// Cliente S3 configurado para R2
const r2Client = new S3Client({
  region: 'auto',
  endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: R2_ACCESS_KEY_ID,
    secretAccessKey: R2_SECRET_ACCESS_KEY
  },
  forcePathStyle: true // Crítico para R2
});

async function testR2Connection() {
  const testKey = `test-${Date.now()}.txt`;
  const testContent = `Archivo de prueba creado el ${new Date().toISOString()}`;

  try {
    // 1. PRUEBA: Subir archivo
    console.log('📤 Prueba 1: Subir archivo de prueba...');
    const uploadCommand = new PutObjectCommand({
      Bucket: R2_BUCKET_NAME,
      Key: testKey,
      Body: Buffer.from(testContent),
      ContentType: 'text/plain',
      Metadata: {
        'test': 'true',
        'timestamp': Date.now().toString()
      }
    });

    await r2Client.send(uploadCommand);
    console.log('✅ Archivo subido exitosamente:', testKey);
    console.log('');

    // 2. PRUEBA: Listar archivos
    console.log('📋 Prueba 2: Listar archivos en el bucket...');
    const listCommand = new ListObjectsV2Command({
      Bucket: R2_BUCKET_NAME,
      MaxKeys: 10
    });

    const listResponse = await r2Client.send(listCommand);
    console.log(`✅ Total de archivos en bucket: ${listResponse.KeyCount || 0}`);
    if (listResponse.Contents && listResponse.Contents.length > 0) {
      console.log('Últimos archivos:');
      listResponse.Contents.slice(0, 5).forEach((item) => {
        console.log(`  - ${item.Key} (${(item.Size || 0) / 1024} KB)`);
      });
    }
    console.log('');

    // 3. PRUEBA: Generar URL firmada para descarga
    console.log('🔗 Prueba 3: Generar URL firmada para descarga...');
    const downloadCommand = new GetObjectCommand({
      Bucket: R2_BUCKET_NAME,
      Key: testKey
    });

    const signedUrl = await getSignedUrl(r2Client, downloadCommand, {
      expiresIn: 3600 // 1 hora
    });

    console.log('✅ URL firmada generada exitosamente');
    console.log('URL (válida por 1 hora):');
    console.log(signedUrl);
    console.log('');

    // 4. PRUEBA: Descargar archivo
    console.log('📥 Prueba 4: Descargar archivo...');
    const getResponse = await r2Client.send(downloadCommand);
    const downloadedContent = await getResponse.Body?.transformToString();

    if (downloadedContent === testContent) {
      console.log('✅ Archivo descargado correctamente');
      console.log('Contenido:', downloadedContent);
    } else {
      console.log('❌ El contenido descargado no coincide');
    }
    console.log('');

    // 5. PRUEBA: Eliminar archivo de prueba
    console.log('🗑️  Prueba 5: Eliminar archivo de prueba...');
    const deleteCommand = new DeleteObjectCommand({
      Bucket: R2_BUCKET_NAME,
      Key: testKey
    });

    await r2Client.send(deleteCommand);
    console.log('✅ Archivo eliminado exitosamente');
    console.log('');

    // RESUMEN
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('🎉 TODAS LAS PRUEBAS PASARON EXITOSAMENTE');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('');
    console.log('✅ Configuración de R2 correcta');
    console.log('✅ Credenciales válidas');
    console.log('✅ Permisos de lectura/escritura funcionando');
    console.log('✅ forcePathStyle configurado correctamente');
    console.log('');
    console.log('Tu aplicación está lista para usar Cloudflare R2 🚀');

  } catch (error: any) {
    console.error('');
    console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.error('❌ ERROR EN LAS PRUEBAS');
    console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.error('');
    console.error('Tipo de error:', error.name);
    console.error('Mensaje:', error.message);

    if (error.$metadata) {
      console.error('Código de estado HTTP:', error.$metadata.httpStatusCode);
    }

    console.error('');
    console.error('Posibles soluciones:');

    if (error.name === 'SignatureDoesNotMatch') {
      console.error('  1. Verifica que R2_ACCESS_KEY_ID y R2_SECRET_ACCESS_KEY sean correctos');
      console.error('  2. Asegúrate de que forcePathStyle esté en true');
      console.error('  3. Revisa que el ACCOUNT_ID sea correcto');
    } else if (error.name === 'NoSuchBucket') {
      console.error('  1. Verifica que el bucket "' + R2_BUCKET_NAME + '" exista en R2');
      console.error('  2. Revisa el nombre del bucket (sensible a mayúsculas/minúsculas)');
    } else if (error.name === 'AccessDenied') {
      console.error('  1. Verifica que el API token tenga permisos de Read & Write');
      console.error('  2. Revisa que el token esté activo (no expirado)');
    } else if (error.$metadata?.httpStatusCode === 403) {
      console.error('  1. Verifica los permisos del API token en R2');
      console.error('  2. Asegúrate de que el token pueda acceder a este bucket');
    }

    console.error('');
    console.error('Error completo:', error);
    process.exit(1);
  }
}

// Ejecutar pruebas
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('🧪 PRUEBAS DE CONEXIÓN CLOUDFLARE R2');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('');
console.log('Account ID:', R2_ACCOUNT_ID);
console.log('Bucket:', R2_BUCKET_NAME);
console.log('Endpoint:', `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`);
console.log('');

testR2Connection();
