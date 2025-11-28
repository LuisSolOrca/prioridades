/**
 * Duplicate Detection Utilities
 *
 * Implements fuzzy matching using Levenshtein distance and other algorithms
 * for detecting potential duplicate records in the CRM.
 */

/**
 * Calculate Levenshtein distance between two strings
 * @param str1 First string
 * @param str2 Second string
 * @returns Number of edits needed to transform str1 into str2
 */
export function levenshteinDistance(str1: string, str2: string): number {
  const s1 = str1.toLowerCase();
  const s2 = str2.toLowerCase();

  const m = s1.length;
  const n = s2.length;

  // Create matrix
  const dp: number[][] = Array(m + 1)
    .fill(null)
    .map(() => Array(n + 1).fill(0));

  // Initialize first row and column
  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;

  // Fill the matrix
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (s1[i - 1] === s2[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1];
      } else {
        dp[i][j] = 1 + Math.min(
          dp[i - 1][j],     // deletion
          dp[i][j - 1],     // insertion
          dp[i - 1][j - 1]  // substitution
        );
      }
    }
  }

  return dp[m][n];
}

/**
 * Calculate similarity ratio between two strings (0-1)
 * @param str1 First string
 * @param str2 Second string
 * @returns Similarity score from 0 (completely different) to 1 (identical)
 */
export function calculateSimilarity(str1: string, str2: string): number {
  if (!str1 || !str2) return 0;
  if (str1 === str2) return 1;

  const distance = levenshteinDistance(str1, str2);
  const maxLength = Math.max(str1.length, str2.length);

  if (maxLength === 0) return 1;

  return 1 - (distance / maxLength);
}

/**
 * Normalize string for comparison
 * Removes accents, extra spaces, and common business suffixes
 */
export function normalizeString(str: string): string {
  if (!str) return '';

  return str
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Remove accents
    .replace(/[^\w\s@.-]/g, '') // Remove special chars except @, ., -
    .replace(/\s+/g, ' ') // Normalize spaces
    .replace(/\b(s\.?a\.?|s\.?a\.?\s*de\s*c\.?v\.?|s\.?c\.?|s\.?r\.?l\.?|inc\.?|corp\.?|ltd\.?|llc\.?)\b/gi, '') // Remove business suffixes
    .trim();
}

/**
 * Normalize email for comparison
 */
export function normalizeEmail(email: string): string {
  if (!email) return '';

  const normalized = email.toLowerCase().trim();

  // Handle Gmail plus addressing (user+tag@gmail.com -> user@gmail.com)
  const [localPart, domain] = normalized.split('@');
  if (domain === 'gmail.com' || domain === 'googlemail.com') {
    const cleanLocal = localPart.split('+')[0].replace(/\./g, '');
    return `${cleanLocal}@gmail.com`;
  }

  return normalized;
}

/**
 * Normalize phone number for comparison
 */
export function normalizePhone(phone: string): string {
  if (!phone) return '';

  // Remove all non-digit characters
  return phone.replace(/\D/g, '');
}

/**
 * Check if two phone numbers are potentially the same
 */
export function phonesMatch(phone1: string, phone2: string): boolean {
  const n1 = normalizePhone(phone1);
  const n2 = normalizePhone(phone2);

  if (!n1 || !n2) return false;

  // Direct match
  if (n1 === n2) return true;

  // Check if one contains the other (handles country codes)
  if (n1.length >= 10 && n2.length >= 10) {
    const shorter = n1.length < n2.length ? n1 : n2;
    const longer = n1.length >= n2.length ? n1 : n2;
    return longer.endsWith(shorter);
  }

  return false;
}

/**
 * Check if two emails are potentially the same
 */
export function emailsMatch(email1: string, email2: string): boolean {
  return normalizeEmail(email1) === normalizeEmail(email2);
}

export interface DuplicateCandidate {
  _id: string;
  name: string;
  email?: string;
  phone?: string;
  similarity: number;
  matchedOn: string[];
}

export interface DuplicateCheckResult {
  hasDuplicates: boolean;
  duplicates: DuplicateCandidate[];
}

/**
 * Configuration for duplicate detection thresholds
 */
export const DUPLICATE_THRESHOLDS = {
  name: 0.8,      // 80% similarity for names
  email: 1.0,     // Exact match for emails (after normalization)
  phone: 1.0,     // Exact match for phones (after normalization)
  combined: 0.7,  // Overall threshold when multiple fields match
};

/**
 * Score weights for different field matches
 */
export const MATCH_WEIGHTS = {
  name: 0.4,
  email: 0.35,
  phone: 0.25,
};

/**
 * Check for potential duplicates among a list of records
 * @param newRecord The record to check
 * @param existingRecords List of existing records to compare against
 * @param options Configuration options
 */
export function findDuplicates(
  newRecord: { name?: string; email?: string; phone?: string },
  existingRecords: Array<{ _id: string; name?: string; email?: string; phone?: string }>,
  options: {
    nameThreshold?: number;
    emailExact?: boolean;
    phoneExact?: boolean;
  } = {}
): DuplicateCheckResult {
  const {
    nameThreshold = DUPLICATE_THRESHOLDS.name,
    emailExact = true,
    phoneExact = true,
  } = options;

  const duplicates: DuplicateCandidate[] = [];
  const normalizedNewName = normalizeString(newRecord.name || '');
  const normalizedNewEmail = normalizeEmail(newRecord.email || '');
  const normalizedNewPhone = normalizePhone(newRecord.phone || '');

  for (const record of existingRecords) {
    const matchedOn: string[] = [];
    let totalScore = 0;
    let fieldsChecked = 0;

    // Check name similarity
    if (newRecord.name && record.name) {
      const normalizedName = normalizeString(record.name);
      const nameSimilarity = calculateSimilarity(normalizedNewName, normalizedName);

      if (nameSimilarity >= nameThreshold) {
        matchedOn.push('name');
        totalScore += nameSimilarity * MATCH_WEIGHTS.name;
      }
      fieldsChecked++;
    }

    // Check email match
    if (newRecord.email && record.email) {
      if (emailExact) {
        if (emailsMatch(newRecord.email, record.email)) {
          matchedOn.push('email');
          totalScore += MATCH_WEIGHTS.email;
        }
      } else {
        const emailSimilarity = calculateSimilarity(normalizedNewEmail, normalizeEmail(record.email));
        if (emailSimilarity >= 0.9) {
          matchedOn.push('email');
          totalScore += emailSimilarity * MATCH_WEIGHTS.email;
        }
      }
      fieldsChecked++;
    }

    // Check phone match
    if (newRecord.phone && record.phone) {
      if (phoneExact) {
        if (phonesMatch(newRecord.phone, record.phone)) {
          matchedOn.push('phone');
          totalScore += MATCH_WEIGHTS.phone;
        }
      }
      fieldsChecked++;
    }

    // Calculate final similarity score
    if (matchedOn.length > 0) {
      // Normalize score based on fields checked
      const maxPossibleScore = fieldsChecked > 0
        ? Object.values(MATCH_WEIGHTS).slice(0, fieldsChecked).reduce((a, b) => a + b, 0)
        : 1;
      const normalizedScore = totalScore / maxPossibleScore;

      // Email match alone is high confidence
      if (matchedOn.includes('email')) {
        duplicates.push({
          _id: record._id.toString(),
          name: record.name || '',
          email: record.email,
          phone: record.phone,
          similarity: Math.max(normalizedScore, 0.95),
          matchedOn,
        });
      }
      // Multiple field matches
      else if (matchedOn.length > 1 || normalizedScore >= DUPLICATE_THRESHOLDS.combined) {
        duplicates.push({
          _id: record._id.toString(),
          name: record.name || '',
          email: record.email,
          phone: record.phone,
          similarity: normalizedScore,
          matchedOn,
        });
      }
      // Single name match with high similarity
      else if (matchedOn.includes('name') && totalScore / MATCH_WEIGHTS.name >= 0.9) {
        duplicates.push({
          _id: record._id.toString(),
          name: record.name || '',
          email: record.email,
          phone: record.phone,
          similarity: normalizedScore,
          matchedOn,
        });
      }
    }
  }

  // Sort by similarity descending
  duplicates.sort((a, b) => b.similarity - a.similarity);

  return {
    hasDuplicates: duplicates.length > 0,
    duplicates: duplicates.slice(0, 10), // Limit to top 10
  };
}

/**
 * Find all potential duplicate pairs in a collection
 * Used for the duplicates management page
 */
export function findAllDuplicatePairs(
  records: Array<{ _id: string; name?: string; email?: string; phone?: string }>,
  options: { nameThreshold?: number } = {}
): Array<{
  record1: typeof records[0];
  record2: typeof records[0];
  similarity: number;
  matchedOn: string[];
}> {
  const { nameThreshold = DUPLICATE_THRESHOLDS.name } = options;
  const pairs: Array<{
    record1: typeof records[0];
    record2: typeof records[0];
    similarity: number;
    matchedOn: string[];
  }> = [];

  const seen = new Set<string>();

  for (let i = 0; i < records.length; i++) {
    for (let j = i + 1; j < records.length; j++) {
      const record1 = records[i];
      const record2 = records[j];
      const pairKey = [record1._id, record2._id].sort().join('-');

      if (seen.has(pairKey)) continue;

      const result = findDuplicates(record1, [record2], { nameThreshold });

      if (result.hasDuplicates) {
        pairs.push({
          record1,
          record2,
          similarity: result.duplicates[0].similarity,
          matchedOn: result.duplicates[0].matchedOn,
        });
        seen.add(pairKey);
      }
    }
  }

  // Sort by similarity descending
  pairs.sort((a, b) => b.similarity - a.similarity);

  return pairs;
}
