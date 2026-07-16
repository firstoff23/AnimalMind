-- Migration to create rate_limits table for AI analysis limits

CREATE TABLE IF NOT EXISTS public.rate_limits (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id BIGINT NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  endpoint VARCHAR(255) NOT NULL,
  count INT NOT NULL DEFAULT 1,
  window_start TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.rate_limits ENABLE ROW LEVEL SECURITY;

-- Policy to allow admins/service role full control (backend bypasses RLS using service role key)
DROP POLICY IF EXISTS "allow_all_admins" ON public.rate_limits;
CREATE POLICY "allow_all_admins" ON public.rate_limits
  FOR ALL USING (true) WITH CHECK (true);

-- Notify PostgREST to reload schema cache
NOTIFY pgrst, 'reload schema';
