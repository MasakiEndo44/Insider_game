-- Add RPC function to get server timestamp
-- Used for client-server clock drift correction

CREATE OR REPLACE FUNCTION get_server_time()
RETURNS BIGINT
LANGUAGE SQL
STABLE
AS $$
  SELECT EXTRACT(EPOCH FROM NOW())::BIGINT;
$$;

COMMENT ON FUNCTION get_server_time() IS 'Returns current server time as Unix epoch (seconds). Used for timer synchronization in game phases.';
