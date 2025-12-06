-- Schedule daily cleanup of stale rooms
-- This job runs at 2:00 AM every day
-- Deletes rooms whose records are older than 24 hours

SELECT cron.schedule(
  'delete-stale-rooms',
  '0 2 * * *',
  $$
    DELETE FROM rooms WHERE created_at < NOW() - INTERVAL '24 hours';
  $$
);
