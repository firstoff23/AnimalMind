-- AnimalMind - Self-Healing and Learning System Foundation
-- Migration file: supabase-migrations/20260605_self_healing_foundation.sql

BEGIN;

-- ─── 1. App Errors Table ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.app_errors (
  id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  user_id BIGINT REFERENCES public.users(id) ON DELETE CASCADE,
  error_message TEXT NOT NULL,
  error_stack TEXT,
  error_code VARCHAR(100),
  severity VARCHAR(20) NOT NULL DEFAULT 'error' CHECK (severity IN ('info', 'warning', 'error', 'critical')),
  component VARCHAR(100) NOT NULL DEFAULT 'unknown',
  context JSONB,
  is_resolved BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  resolved_at TIMESTAMPTZ
);

-- ─── 2. App Healing Actions Table ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.app_healing_actions (
  id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  error_id BIGINT REFERENCES public.app_errors(id) ON DELETE SET NULL,
  user_id BIGINT REFERENCES public.users(id) ON DELETE CASCADE,
  action_type VARCHAR(100) NOT NULL,
  action_details TEXT,
  status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'running', 'success', 'failed')),
  result_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  completed_at TIMESTAMPTZ
);

-- ─── 3. App Health State Table ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.app_health_state (
  id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  user_id BIGINT REFERENCES public.users(id) ON DELETE CASCADE,
  status VARCHAR(20) NOT NULL DEFAULT 'healthy' CHECK (status IN ('healthy', 'degraded', 'unhealthy')),
  last_checked_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  latency_ms INT,
  cpu_usage DECIMAL(5, 2),
  memory_usage DECIMAL(5, 2),
  services_status JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- ─── 4. Performance Indexes ───────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_app_errors_user_id ON public.app_errors(user_id);
CREATE INDEX IF NOT EXISTS idx_app_errors_created_at ON public.app_errors(created_at);
CREATE INDEX IF NOT EXISTS idx_app_errors_is_resolved ON public.app_errors(is_resolved);

CREATE INDEX IF NOT EXISTS idx_app_healing_actions_user_id ON public.app_healing_actions(user_id);
CREATE INDEX IF NOT EXISTS idx_app_healing_actions_error_id ON public.app_healing_actions(error_id);
CREATE INDEX IF NOT EXISTS idx_app_healing_actions_created_at ON public.app_healing_actions(created_at);

CREATE INDEX IF NOT EXISTS idx_app_health_state_user_id ON public.app_health_state(user_id);
CREATE INDEX IF NOT EXISTS idx_app_health_state_created_at ON public.app_health_state(created_at);

-- ─── 5. Tables Permissions ────────────────────────────────────────────────
GRANT SELECT, INSERT, UPDATE, DELETE ON public.app_errors TO authenticated, service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.app_healing_actions TO authenticated, service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.app_health_state TO authenticated, service_role;

-- ─── 6. Enable Row Level Security (RLS) ───────────────────────────────────
ALTER TABLE public.app_errors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.app_healing_actions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.app_health_state ENABLE ROW LEVEL SECURITY;

-- ─── 7. RLS Policies ──────────────────────────────────────────────────────

-- Policies for app_errors
DROP POLICY IF EXISTS "owners_manage_own_errors" ON public.app_errors;
CREATE POLICY "owners_manage_own_errors" ON public.app_errors
FOR ALL TO authenticated
USING (user_id = private.current_app_user_id() OR private.current_app_user_role() = 'admin')
WITH CHECK (user_id = private.current_app_user_id() OR private.current_app_user_role() = 'admin');

-- Policies for app_healing_actions
DROP POLICY IF EXISTS "owners_manage_own_healing_actions" ON public.app_healing_actions;
CREATE POLICY "owners_manage_own_healing_actions" ON public.app_healing_actions
FOR ALL TO authenticated
USING (user_id = private.current_app_user_id() OR private.current_app_user_role() = 'admin')
WITH CHECK (user_id = private.current_app_user_id() OR private.current_app_user_role() = 'admin');

-- Policies for app_health_state
DROP POLICY IF EXISTS "owners_manage_own_health_state" ON public.app_health_state;
CREATE POLICY "owners_manage_own_health_state" ON public.app_health_state
FOR ALL TO authenticated
USING (user_id = private.current_app_user_id() OR private.current_app_user_role() = 'admin')
WITH CHECK (user_id = private.current_app_user_id() OR private.current_app_user_role() = 'admin');

-- ─── 8. Admin Stored Procedures ───────────────────────────────────────────

-- Procedure to bulk clear old self-healing logs
CREATE OR REPLACE FUNCTION public.clear_app_error_history(older_than_days INT)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  -- Perform admin role authorization check
  IF private.current_app_user_role() <> 'admin' THEN
    RAISE EXCEPTION 'Não autorizado: apenas administradores podem limpar o histórico de autocura.';
  END IF;

  DELETE FROM public.app_healing_actions WHERE created_at < NOW() - (older_than_days || ' days')::INTERVAL;
  DELETE FROM public.app_errors WHERE created_at < NOW() - (older_than_days || ' days')::INTERVAL;
  DELETE FROM public.app_health_state WHERE created_at < NOW() - (older_than_days || ' days')::INTERVAL;
END;
$$;

REVOKE ALL ON FUNCTION public.clear_app_error_history(INT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.clear_app_error_history(INT) TO authenticated, service_role;

NOTIFY pgrst, 'reload schema';

COMMIT;
