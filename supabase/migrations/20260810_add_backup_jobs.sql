BEGIN;

CREATE TABLE IF NOT EXISTS public.backup_jobs (
  id uuid PRIMARY KEY,
  tipo text NOT NULL CHECK (tipo IN ('media')),
  destino text NOT NULL CHECK (destino IN ('local')),
  estado text NOT NULL DEFAULT 'pending' CHECK (estado IN ('pending','preparing','downloading','compressing','verifying','completed','failed','expired')),
  actor_user_id uuid NOT NULL REFERENCES public.perfiles(id) ON DELETE RESTRICT,
  total_items integer NOT NULL DEFAULT 0 CHECK (total_items >= 0),
  processed_items integer NOT NULL DEFAULT 0 CHECK (processed_items >= 0),
  failed_items integer NOT NULL DEFAULT 0 CHECK (failed_items >= 0),
  total_bytes bigint NOT NULL DEFAULT 0 CHECK (total_bytes >= 0),
  processed_bytes bigint NOT NULL DEFAULT 0 CHECK (processed_bytes >= 0),
  checksum_final text,
  storage_bucket text,
  storage_path text,
  error_code text,
  error_summary text,
  started_at timestamptz,
  heartbeat_at timestamptz,
  finished_at timestamptz,
  expires_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS backup_jobs_one_active_media_job
  ON public.backup_jobs (tipo)
  WHERE tipo = 'media' AND estado IN ('pending','preparing','downloading','compressing','verifying');
CREATE INDEX IF NOT EXISTS backup_jobs_actor_created_idx ON public.backup_jobs (actor_user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS backup_jobs_expiry_idx ON public.backup_jobs (expires_at) WHERE expires_at IS NOT NULL;

ALTER TABLE public.backup_jobs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS backup_jobs_no_direct_client_access ON public.backup_jobs;

REVOKE ALL PRIVILEGES ON TABLE public.backup_jobs FROM anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.backup_jobs TO service_role;
COMMIT;