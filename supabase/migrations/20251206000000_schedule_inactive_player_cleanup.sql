-- Schedule daily cleanup of inactive players
-- This job runs at 2:00 AM every day

SELECT cron.schedule(
  'delete-inactive-players',
  '0 2 * * *',
  $$
    DELETE FROM players WHERE is_connected = false;
  $$
);
