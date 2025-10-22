-- ============================================================
-- Auto-reload PostgREST schema cache after DDL changes
-- ============================================================
-- Purpose: Prevent PGRST204 errors by automatically notifying
--          PostgREST to reload schema after any DDL operation
-- Created: 2025-10-22
-- ============================================================

BEGIN;

-- Step 1: Force immediate schema reload
NOTIFY pgrst, 'reload schema';

-- Step 2: Create function to auto-reload on DDL changes
CREATE OR REPLACE FUNCTION public.pgrst_watch()
RETURNS event_trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  NOTIFY pgrst, 'reload schema';
END;
$$;

COMMENT ON FUNCTION public.pgrst_watch() IS
'Automatically notifies PostgREST to reload schema cache after DDL changes. Prevents PGRST204 errors.';

-- Step 3: Create event trigger for DDL commands
DROP EVENT TRIGGER IF EXISTS pgrst_watch_ddl;

CREATE EVENT TRIGGER pgrst_watch_ddl
  ON ddl_command_end
  EXECUTE FUNCTION public.pgrst_watch();

COMMENT ON EVENT TRIGGER pgrst_watch_ddl IS
'Fires after any DDL command (CREATE, ALTER, DROP) to auto-reload PostgREST schema cache.';

COMMIT;
