/**
 * Passphrase Utility Unit Tests
 *
 * Tests for Argon2id hashing and HMAC-SHA256 lookup hash generation
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { hashPassphrase, verifyPassphrase, generateLookupHash } from './passphrase';

describe('hashPassphrase', () => {
  it('should generate a valid Argon2id hash', async () => {
    const passphrase = 'test123';
    const hash = await hashPassphrase(passphrase);

    // Argon2id hashes start with $argon2id$
    expect(hash).toMatch(/^\$argon2id\$/);
    expect(typeof hash).toBe('string');
    expect(hash.length).toBeGreaterThan(50); // Argon2 hashes are long
  });

  it('should generate different hashes for the same passphrase (salted)', async () => {
    const passphrase = 'test123';
    const hash1 = await hashPassphrase(passphrase);
    const hash2 = await hashPassphrase(passphrase);

    // Argon2id uses random salts, so hashes should be different
    expect(hash1).not.toBe(hash2);
  });

  it('should handle Japanese characters', async () => {
    const passphrase = 'こんにちは';
    const hash = await hashPassphrase(passphrase);

    expect(hash).toMatch(/^\$argon2id\$/);
  });

  it('should handle Unicode emoji', async () => {
    const passphrase = '🎮🎲🎯';
    const hash = await hashPassphrase(passphrase);

    expect(hash).toMatch(/^\$argon2id\$/);
  });

  it('should handle empty string', async () => {
    const passphrase = '';
    const hash = await hashPassphrase(passphrase);

    expect(hash).toMatch(/^\$argon2id\$/);
  });
});

describe('verifyPassphrase', () => {
  let testHash: string;
  const originalPassphrase = 'test123';

  beforeEach(async () => {
    testHash = await hashPassphrase(originalPassphrase);
  });

  it('should verify correct passphrase', async () => {
    const isValid = await verifyPassphrase(originalPassphrase, testHash);
    expect(isValid).toBe(true);
  });

  it('should reject incorrect passphrase', async () => {
    const isValid = await verifyPassphrase('wrongpassword', testHash);
    expect(isValid).toBe(false);
  });

  it('should reject passphrase with extra characters', async () => {
    const isValid = await verifyPassphrase('test123extra', testHash);
    expect(isValid).toBe(false);
  });

  it('should reject passphrase with missing characters', async () => {
    const isValid = await verifyPassphrase('test12', testHash);
    expect(isValid).toBe(false);
  });

  it('should be case-sensitive', async () => {
    const hash = await hashPassphrase('Test123');
    const isValidLower = await verifyPassphrase('test123', hash);
    expect(isValidLower).toBe(false);
  });

  it('should handle Japanese passphrases', async () => {
    const japanesePassphrase = 'こんにちは';
    const hash = await hashPassphrase(japanesePassphrase);
    const isValid = await verifyPassphrase(japanesePassphrase, hash);
    expect(isValid).toBe(true);
  });

  it('should throw error for invalid hash format', async () => {
    await expect(verifyPassphrase('test123', 'invalid-hash-format')).rejects.toThrow();
  });
});

describe('generateLookupHash', () => {
  it('should generate a deterministic hash (same input = same output)', () => {
    const passphrase = 'test123';
    const hash1 = generateLookupHash(passphrase);
    const hash2 = generateLookupHash(passphrase);

    expect(hash1).toBe(hash2);
  });

  it('should generate different hashes for different inputs', () => {
    const hash1 = generateLookupHash('test123');
    const hash2 = generateLookupHash('test456');

    expect(hash1).not.toBe(hash2);
  });

  it('should return a valid hex string', () => {
    const passphrase = 'test123';
    const hash = generateLookupHash(passphrase);

    // HMAC-SHA256 produces 64-character hex string
    expect(hash).toMatch(/^[a-f0-9]{64}$/);
  });

  it('should handle Japanese characters deterministically', () => {
    const passphrase = 'こんにちは';
    const hash1 = generateLookupHash(passphrase);
    const hash2 = generateLookupHash(passphrase);

    expect(hash1).toBe(hash2);
    expect(hash1).toMatch(/^[a-f0-9]{64}$/);
  });

  it('should handle empty string', () => {
    const hash = generateLookupHash('');
    expect(hash).toMatch(/^[a-f0-9]{64}$/);
  });

  it('should be case-sensitive', () => {
    const hashLower = generateLookupHash('test123');
    const hashUpper = generateLookupHash('TEST123');

    expect(hashLower).not.toBe(hashUpper);
  });

  it('should produce different hashes for similar passphrases', () => {
    const hash1 = generateLookupHash('test123');
    const hash2 = generateLookupHash('test124'); // Only 1 character different

    expect(hash1).not.toBe(hash2);
  });
});

describe('Integration: hash + verify + lookup', () => {
  it('should work together for full passphrase flow', async () => {
    const passphrase = 'ゲーム開始';

    // 1. Generate lookup hash (for database query)
    const lookupHash = generateLookupHash(passphrase);
    expect(lookupHash).toMatch(/^[a-f0-9]{64}$/);

    // 2. Hash passphrase (for storage)
    const storedHash = await hashPassphrase(passphrase);
    expect(storedHash).toMatch(/^\$argon2id\$/);

    // 3. Verify passphrase (on join)
    const isValid = await verifyPassphrase(passphrase, storedHash);
    expect(isValid).toBe(true);

    // 4. Lookup hash should be deterministic
    const lookupHash2 = generateLookupHash(passphrase);
    expect(lookupHash).toBe(lookupHash2);
  });

  it('should reject wrong passphrase even with correct lookup hash', async () => {
    const correctPassphrase = 'test123';
    const wrongPassphrase = 'test456';

    // Both might theoretically have same lookup hash (extremely unlikely)
    const lookupHash1 = generateLookupHash(correctPassphrase);
    const lookupHash2 = generateLookupHash(wrongPassphrase);

    // Lookup hashes should be different
    expect(lookupHash1).not.toBe(lookupHash2);

    // Even if lookup hash matched, Argon2 verification should fail
    const storedHash = await hashPassphrase(correctPassphrase);
    const isValid = await verifyPassphrase(wrongPassphrase, storedHash);
    expect(isValid).toBe(false);
  });
});
