/**
 * Passphrase Hashing Utilities
 *
 * Uses Argon2id for secure passphrase hashing with HMAC-SHA256 pepper
 * Also provides SHA-256 lookup hash for efficient database queries
 */

import { hash, verify } from '@node-rs/argon2';
import crypto from 'crypto';
import { getEnvVar } from '@/lib/env';

/**
 * Hash a passphrase using Argon2id with HMAC-SHA256 pepper
 *
 * @param passphrase - The raw passphrase to hash
 * @returns Promise<string> - The hashed passphrase
 */
export async function hashPassphrase(passphrase: string): Promise<string> {
  // Apply HMAC-SHA256 pepper before Argon2id hashing
  const secret = getEnvVar('PASSPHRASE_HMAC_SECRET');
  const pepperedPassphrase = crypto
    .createHmac('sha256', secret)
    .update(passphrase)
    .digest('hex');

  // Hash with Argon2id (memory-hard, resistant to GPU attacks)
  const hashed = await hash(pepperedPassphrase, {
    memoryCost: 19456, // 19 MiB
    timeCost: 2, // 2 iterations
    parallelism: 1, // Single thread
    outputLen: 32, // 32-byte hash
  });

  return hashed;
}

/**
 * Verify a passphrase against a stored hash
 *
 * @param passphrase - The raw passphrase to verify
 * @param hashedPassphrase - The stored hash to verify against
 * @returns Promise<boolean> - True if passphrase matches
 */
export async function verifyPassphrase(
  passphrase: string,
  hashedPassphrase: string
): Promise<boolean> {
  // Apply HMAC-SHA256 pepper before verification
  const secret = getEnvVar('PASSPHRASE_HMAC_SECRET');
  const pepperedPassphrase = crypto
    .createHmac('sha256', secret)
    .update(passphrase)
    .digest('hex');

  // Verify with Argon2id
  const isValid = await verify(hashedPassphrase, pepperedPassphrase);

  return isValid;
}

/**
 * Generate deterministic lookup hash for fast database queries
 *
 * Uses SHA-256 for deterministic hashing (same input = same output)
 * This allows efficient database indexing while maintaining security
 * via separate Argon2id verification
 *
 * @param passphrase - The raw passphrase to hash
 * @returns string - SHA-256 hash (hex string)
 */
export function generateLookupHash(passphrase: string): string {
  const secret = getEnvVar('PASSPHRASE_HMAC_SECRET');

  // Use HMAC-SHA256 for deterministic hash
  const lookupHash = crypto
    .createHmac('sha256', secret)
    .update(passphrase)
    .digest('hex');

  return lookupHash;
}
