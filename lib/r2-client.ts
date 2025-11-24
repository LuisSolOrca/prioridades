import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand, ListObjectsV2Command } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

/**
 * Cliente de Cloudflare R2 (compatible con S3)
 *
 * Variables de entorno requeridas:
 * - R2_ACCOUNT_ID: Account ID de Cloudflare
 * - R2_ACCESS_KEY_ID: Access Key ID de R2
 * - R2_SECRET_ACCESS_KEY: Secret Access Key de R2
 * - R2_BUCKET_NAME: Nombre del bucket
 */

const R2_ACCOUNT_ID = process.env.R2_ACCOUNT_ID;
const R2_ACCESS_KEY_ID = process.env.R2_ACCESS_KEY_ID;
const R2_SECRET_ACCESS_KEY = process.env.R2_SECRET_ACCESS_KEY;
const R2_BUCKET_NAME = process.env.R2_BUCKET_NAME;

if (!R2_ACCOUNT_ID || !R2_ACCESS_KEY_ID || !R2_SECRET_ACCESS_KEY || !R2_BUCKET_NAME) {
  console.warn('⚠️ R2 configuration missing. File uploads will not work.');
}

// Cliente S3 configurado para R2
const r2Client = new S3Client({
  region: 'auto',
  endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: R2_ACCESS_KEY_ID || '',
    secretAccessKey: R2_SECRET_ACCESS_KEY || ''
  },
  forcePathStyle: true // R2 requiere path-style URLs
});

export interface UploadFileParams {
  key: string;
  body: Buffer;
  contentType: string;
  metadata?: Record<string, string>;
}

export interface DownloadUrlParams {
  key: string;
  expiresIn?: number; // segundos, default 3600 (1 hora)
}

/**
 * Sube un archivo a R2
 */
export async function uploadFileToR2(params: UploadFileParams): Promise<void> {
  const command = new PutObjectCommand({
    Bucket: R2_BUCKET_NAME,
    Key: params.key,
    Body: params.body,
    ContentType: params.contentType,
    Metadata: params.metadata
  });

  await r2Client.send(command);
}

/**
 * Genera URL firmada para descargar archivo
 */
export async function getDownloadUrl(params: DownloadUrlParams): Promise<string> {
  const command = new GetObjectCommand({
    Bucket: R2_BUCKET_NAME,
    Key: params.key
  });

  const url = await getSignedUrl(r2Client, command, {
    expiresIn: params.expiresIn || 3600 // 1 hora por defecto
  });

  return url;
}

/**
 * Elimina un archivo de R2
 */
export async function deleteFileFromR2(key: string): Promise<void> {
  const command = new DeleteObjectCommand({
    Bucket: R2_BUCKET_NAME,
    Key: key
  });

  await r2Client.send(command);
}

/**
 * Lista archivos en R2 con un prefijo
 */
export async function listFilesInR2(prefix?: string): Promise<string[]> {
  const command = new ListObjectsV2Command({
    Bucket: R2_BUCKET_NAME,
    Prefix: prefix
  });

  const response = await r2Client.send(command);
  return response.Contents?.map(item => item.Key || '') || [];
}

/**
 * Verifica si R2 está configurado correctamente
 */
export function isR2Configured(): boolean {
  return !!(R2_ACCOUNT_ID && R2_ACCESS_KEY_ID && R2_SECRET_ACCESS_KEY && R2_BUCKET_NAME);
}

/**
 * Genera un key único para R2
 */
export function generateR2Key(projectId: string, fileName: string): string {
  const timestamp = Date.now();
  const randomString = Math.random().toString(36).substring(2, 15);
  const sanitizedFileName = fileName.replace(/[^a-zA-Z0-9.-]/g, '_');

  return `projects/${projectId}/${timestamp}-${randomString}-${sanitizedFileName}`;
}

/**
 * Valida el tamaño de archivo (máximo 50MB por defecto)
 */
export function validateFileSize(size: number, maxSizeMB: number = 50): boolean {
  const maxSizeBytes = maxSizeMB * 1024 * 1024;
  return size <= maxSizeBytes;
}

/**
 * Valida el tipo de archivo permitido
 */
export function validateFileType(mimeType: string, allowedTypes?: string[]): boolean {
  if (!allowedTypes || allowedTypes.length === 0) {
    // Permitir todos los tipos si no se especifican restricciones
    return true;
  }

  return allowedTypes.some(allowed => {
    if (allowed.endsWith('/*')) {
      // Permitir categorías completas (e.g., "image/*")
      const category = allowed.split('/')[0];
      return mimeType.startsWith(category + '/');
    }
    return mimeType === allowed;
  });
}

/**
 * Formatea el tamaño de archivo en formato legible
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';

  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
}

/**
 * Obtiene el icono apropiado según el tipo de archivo
 */
export function getFileIcon(mimeType: string): string {
  if (mimeType.startsWith('image/')) return '🖼️';
  if (mimeType.startsWith('video/')) return '🎥';
  if (mimeType.startsWith('audio/')) return '🎵';
  if (mimeType.includes('pdf')) return '📄';
  if (mimeType.includes('word') || mimeType.includes('document')) return '📝';
  if (mimeType.includes('excel') || mimeType.includes('spreadsheet')) return '📊';
  if (mimeType.includes('powerpoint') || mimeType.includes('presentation')) return '📽️';
  if (mimeType.includes('zip') || mimeType.includes('compressed')) return '📦';
  if (mimeType.includes('text')) return '📃';

  return '📎';
}

/**
 * Sanitiza un string para usarlo como metadata en R2/S3
 * AWS S3/R2 metadata solo acepta caracteres US-ASCII
 */
export function sanitizeMetadata(value: string): string {
  // Normalizar y remover diacríticos (acentos)
  const normalized = value.normalize('NFD').replace(/[\u0300-\u036f]/g, '');

  // Reemplazar caracteres especiales comunes
  const replacements: Record<string, string> = {
    'ñ': 'n',
    'Ñ': 'N',
    'ü': 'u',
    'Ü': 'U',
    'ç': 'c',
    'Ç': 'C',
    'ß': 'ss'
  };

  let result = normalized;
  Object.entries(replacements).forEach(([char, replacement]) => {
    result = result.replace(new RegExp(char, 'g'), replacement);
  });

  // Mantener solo caracteres ASCII imprimibles (espacio a ~)
  return result.replace(/[^\x20-\x7E]/g, '_');
}

export default r2Client;
