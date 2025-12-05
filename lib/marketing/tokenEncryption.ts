import crypto from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;
const AUTH_TAG_LENGTH = 16;

/**
 * Get encryption key from environment variable
 * Key should be 32 bytes (256 bits) for AES-256
 */
function getEncryptionKey(): Buffer {
  const key = process.env.TOKEN_ENCRYPTION_KEY;

  if (!key) {
    // In development, use a default key (NOT FOR PRODUCTION)
    if (process.env.NODE_ENV === 'development') {
      console.warn('⚠️ Using default encryption key. Set TOKEN_ENCRYPTION_KEY in production!');
      return crypto.scryptSync('development-key-not-for-production', 'salt', 32);
    }
    throw new Error('TOKEN_ENCRYPTION_KEY environment variable is not set');
  }

  // If key is base64 encoded
  if (key.length === 44) {
    return Buffer.from(key, 'base64');
  }

  // If key is hex encoded (64 chars = 32 bytes)
  if (key.length === 64) {
    return Buffer.from(key, 'hex');
  }

  // Use scrypt to derive a key from any string
  return crypto.scryptSync(key, 'marketing-platform-salt', 32);
}

/**
 * Encrypt a token string
 * @param plainText - The token to encrypt
 * @returns Encrypted string in format: iv:authTag:encryptedData (all hex)
 */
export function encryptToken(plainText: string): string {
  if (!plainText) return '';

  const key = getEncryptionKey();
  const iv = crypto.randomBytes(IV_LENGTH);

  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

  let encrypted = cipher.update(plainText, 'utf8', 'hex');
  encrypted += cipher.final('hex');

  const authTag = cipher.getAuthTag();

  // Format: iv:authTag:encryptedData
  return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
}

/**
 * Decrypt an encrypted token
 * @param encryptedText - The encrypted string from encryptToken
 * @returns The original plain text token
 */
export function decryptToken(encryptedText: string): string {
  if (!encryptedText) return '';

  const parts = encryptedText.split(':');
  if (parts.length !== 3) {
    throw new Error('Invalid encrypted token format');
  }

  const [ivHex, authTagHex, encryptedData] = parts;

  const key = getEncryptionKey();
  const iv = Buffer.from(ivHex, 'hex');
  const authTag = Buffer.from(authTagHex, 'hex');

  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);

  let decrypted = decipher.update(encryptedData, 'hex', 'utf8');
  decrypted += decipher.final('utf8');

  return decrypted;
}

/**
 * Check if a string is encrypted (has the expected format)
 */
export function isEncrypted(text: string): boolean {
  if (!text) return false;
  const parts = text.split(':');
  return parts.length === 3 &&
         parts[0].length === IV_LENGTH * 2 &&
         parts[1].length === AUTH_TAG_LENGTH * 2;
}

/**
 * Safely encrypt a token (returns original if already encrypted or empty)
 */
export function safeEncrypt(token: string): string {
  if (!token || isEncrypted(token)) return token;
  return encryptToken(token);
}

/**
 * Safely decrypt a token (returns original if not encrypted or empty)
 */
export function safeDecrypt(token: string): string {
  if (!token || !isEncrypted(token)) return token;
  try {
    return decryptToken(token);
  } catch {
    // If decryption fails, return original (might not be encrypted)
    return token;
  }
}

/**
 * Generate a new encryption key (for setup)
 */
export function generateEncryptionKey(): string {
  return crypto.randomBytes(32).toString('base64');
}

/**
 * Hash a value (for non-reversible storage like client IDs)
 */
export function hashValue(value: string): string {
  return crypto.createHash('sha256').update(value).digest('hex');
}
