-- Schedule daily cleanup of stale players
-- This job runs at 2:00 AM every day
-- Deletes players whose records are older than 24 hours

SELECT cron.schedule(
  'delete-inactive-players',
  '0 2 * * *',
  $$
    DELETE FROM players WHERE created_at < NOW() - INTERVAL '24 hours';
  $$
);
