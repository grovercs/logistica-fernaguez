-- Read-only operational check for a recent media-backup dispatch attempt.
-- Run manually in Supabase SQL Editor only if you need to inspect the 11:24 attempt.
-- This query does not expose full identifiers and does not change any data.
SELECT
  left(id::text, 8) AS job_id,
  estado,
  left(actor_user_id::text, 8) AS actor_user_id,
  created_at,
  heartbeat_at,
  started_at,
  error_code
FROM public.backup_jobs
WHERE tipo = 'media'
  AND created_at >= now() - interval '24 hours'
ORDER BY created_at DESC
LIMIT 20;
