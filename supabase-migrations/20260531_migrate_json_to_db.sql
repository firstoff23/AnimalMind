-- Migration: Migrate JSON to Database Columns and Tables
-- Alter classification_events to hold metadata
ALTER TABLE public.classification_events
  ADD COLUMN IF NOT EXISTS notes TEXT,
  ADD COLUMN IF NOT EXISTS posture VARCHAR(50),
  ADD COLUMN IF NOT EXISTS belief_state JSONB;

-- Create family_shares table
CREATE TABLE IF NOT EXISTS public.family_shares (
  id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  owner_id BIGINT NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  animal_id BIGINT NOT NULL REFERENCES public.animals(id) ON DELETE CASCADE,
  shared_with_email VARCHAR(320) NOT NULL,
  shared_with_user_id BIGINT REFERENCES public.users(id) ON DELETE SET NULL,
  permission VARCHAR(20) NOT NULL CHECK (permission IN ('read', 'write')),
  status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (animal_id, shared_with_email)
);

-- Grant privileges
GRANT SELECT, INSERT, UPDATE, DELETE ON public.family_shares TO authenticated, service_role;

-- Enable RLS
ALTER TABLE public.family_shares ENABLE ROW LEVEL SECURITY;

-- Policies for family_shares
DROP POLICY IF EXISTS "owners_manage_family_shares" ON public.family_shares;
CREATE POLICY "owners_manage_family_shares"
ON public.family_shares
FOR ALL
USING (
  owner_id = private.current_app_user_id()
)
WITH CHECK (
  owner_id = private.current_app_user_id()
);

DROP POLICY IF EXISTS "users_read_family_shares" ON public.family_shares;
CREATE POLICY "users_read_family_shares"
ON public.family_shares
FOR SELECT
USING (
  shared_with_user_id = private.current_app_user_id()
  OR shared_with_email = (auth.jwt() ->> 'email')
);
