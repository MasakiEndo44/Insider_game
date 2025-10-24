-- ============================================================
-- TEMPORARY: Force PostgREST schema cache reload for production
-- ============================================================
-- Purpose: Reload schema cache to fix PGRST204 error
-- Date: 2025-10-24
-- This can be safely deleted after successful deployment
-- ============================================================

BEGIN;

-- Force immediate schema reload
NOTIFY pgrst, 'reload schema';

COMMIT;
