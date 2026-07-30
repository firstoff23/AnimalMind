-- Migration: Add MFA (TOTP) columns to users table
-- Adds mfa_secret (encrypted TOTP secret) and mfa_enabled flag

ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS mfa_secret TEXT,
  ADD COLUMN IF NOT EXISTS mfa_enabled BOOLEAN NOT NULL DEFAULT FALSE;

-- Index for efficient MFA lookups (only rows with MFA enabled)
CREATE INDEX IF NOT EXISTS idx_users_mfa_enabled
  ON public.users (id)
  WHERE mfa_enabled = TRUE;

COMMENT ON COLUMN public.users.mfa_secret IS 'Base32-encoded TOTP secret (stored server-side, never sent to client after setup)';
COMMENT ON COLUMN public.users.mfa_enabled IS 'Whether TOTP-based MFA is active for this account';

NOTIFY pgrst, 'reload schema';
