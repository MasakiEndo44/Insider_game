-- ================================================================
-- Migration: Add Passphrase Lookup Hash for Performance
-- Date: 2025-10-22
-- Purpose: Fix room join bug by adding deterministic hash for lookup
-- ================================================================

-- Add passphrase_lookup_hash column (SHA-256 for fast lookup)
ALTER TABLE rooms
ADD COLUMN IF NOT EXISTS passphrase_lookup_hash TEXT;

-- Create unique index for fast lookup
CREATE UNIQUE INDEX IF NOT EXISTS idx_rooms_passphrase_lookup_hash
ON rooms(passphrase_lookup_hash)
WHERE is_suspended = false;

-- Backfill existing rooms with NULL (will require manual update or recreation)
-- Production rooms will need to be recreated with new passphrases
-- since we can't reverse the Argon2id hash

-- Add comment for documentation
COMMENT ON COLUMN rooms.passphrase_lookup_hash IS
'Deterministic SHA-256 hash of passphrase for fast lookup. Used with passphrase_hash (Argon2id) for secure verification.';

-- ================================================================
-- DEPLOYMENT NOTES:
-- ================================================================
--
-- 1. This migration adds a lookup hash column but does NOT populate it
-- 2. New rooms will automatically include the lookup hash
-- 3. Existing rooms will need to be manually recreated (cannot reverse Argon2id)
-- 4. RLS policies remain unchanged - security is maintained via Argon2id verification
--
-- Performance Impact:
-- - Before: O(n) passphrase verification (iterate all rooms)
-- - After: O(1) lookup via index, then single Argon2id verify
-- - Expected 100x speedup for rooms with 100+ active games
--
-- Security Model:
-- - passphrase_lookup_hash: Fast index lookup (deterministic SHA-256)
-- - passphrase_hash: Secure verification (Argon2id with random salt)
-- - Both are required for join: lookup finds candidate, verify confirms
-- ================================================================
