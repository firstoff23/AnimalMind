-- AnimalMind - Modo Veterinário completo
-- Estrutura profissional para roles, perfis veterinários, partilhas, notas internas e alertas.

BEGIN;

ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS role VARCHAR(30) NOT NULL DEFAULT 'owner';

UPDATE public.users
SET role = 'owner'
WHERE role IS NULL OR role = 'user';

ALTER TABLE public.users
  ALTER COLUMN role SET DEFAULT 'owner';

ALTER TABLE public.users
  DROP CONSTRAINT IF EXISTS users_role_check;

ALTER TABLE public.users
  ADD CONSTRAINT users_role_check
  CHECK (role IN ('owner', 'user', 'vet', 'veterinarian', 'clinic_admin', 'admin'));

CREATE SCHEMA IF NOT EXISTS private;

CREATE OR REPLACE FUNCTION private.current_app_user_id()
RETURNS BIGINT
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT id
  FROM public.users
  WHERE email = (auth.jwt() ->> 'email')
  LIMIT 1
$$;

CREATE OR REPLACE FUNCTION private.current_app_user_role()
RETURNS TEXT
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT role
  FROM public.users
  WHERE email = (auth.jwt() ->> 'email')
  LIMIT 1
$$;

CREATE OR REPLACE FUNCTION private.current_user_is_veterinary()
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT COALESCE(
    private.current_app_user_role() IN ('vet', 'veterinarian', 'clinic_admin', 'admin'),
    FALSE
  )
$$;

CREATE OR REPLACE FUNCTION private.current_user_is_vet()
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT private.current_user_is_veterinary()
$$;

REVOKE ALL ON FUNCTION private.current_app_user_id() FROM PUBLIC;
REVOKE ALL ON FUNCTION private.current_app_user_role() FROM PUBLIC;
REVOKE ALL ON FUNCTION private.current_user_is_veterinary() FROM PUBLIC;
REVOKE ALL ON FUNCTION private.current_user_is_vet() FROM PUBLIC;
GRANT USAGE ON SCHEMA private TO authenticated;
GRANT EXECUTE ON FUNCTION private.current_app_user_id() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION private.current_app_user_role() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION private.current_user_is_veterinary() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION private.current_user_is_vet() TO authenticated, service_role;

CREATE TABLE IF NOT EXISTS public.user_roles (
  id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  user_id BIGINT NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  role VARCHAR(30) NOT NULL CHECK (role IN ('owner', 'veterinarian', 'clinic_admin', 'admin')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, role)
);

CREATE TABLE IF NOT EXISTS public.vet_profiles (
  id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  user_id BIGINT NOT NULL UNIQUE REFERENCES public.users(id) ON DELETE CASCADE,
  display_name TEXT,
  clinic_name TEXT,
  license_number TEXT,
  vet_code VARCHAR(32) UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.vet_pet_access (
  id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  animal_id BIGINT NOT NULL REFERENCES public.animals(id) ON DELETE CASCADE,
  owner_id BIGINT NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  vet_user_id BIGINT REFERENCES public.users(id) ON DELETE SET NULL,
  vet_email VARCHAR(320) NOT NULL,
  vet_name TEXT,
  vet_code VARCHAR(32),
  permission VARCHAR(20) NOT NULL DEFAULT 'read' CHECK (permission IN ('read', 'write')),
  status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('pending', 'active', 'revoked')),
  case_status VARCHAR(30) NOT NULL DEFAULT 'monitor' CHECK (case_status IN ('stable', 'monitor', 'requires_attention')),
  owner_note TEXT,
  shared_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  revoked_at TIMESTAMPTZ,
  UNIQUE (animal_id, vet_email)
);

CREATE TABLE IF NOT EXISTS public.vet_shares (
  id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  animal_id BIGINT NOT NULL REFERENCES public.animals(id) ON DELETE CASCADE,
  owner_id BIGINT NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  vet_user_id BIGINT REFERENCES public.users(id) ON DELETE SET NULL,
  vet_email VARCHAR(320) NOT NULL,
  vet_name TEXT,
  owner_note TEXT,
  shared_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (animal_id, vet_email)
);

ALTER TABLE public.vet_shares
  ADD COLUMN IF NOT EXISTS permission VARCHAR(20) NOT NULL DEFAULT 'read',
  ADD COLUMN IF NOT EXISTS status VARCHAR(20) NOT NULL DEFAULT 'active',
  ADD COLUMN IF NOT EXISTS case_status VARCHAR(30) NOT NULL DEFAULT 'monitor',
  ADD COLUMN IF NOT EXISTS vet_code VARCHAR(32),
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS revoked_at TIMESTAMPTZ;

CREATE TABLE IF NOT EXISTS public.vet_notes (
  id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  animal_id BIGINT NOT NULL REFERENCES public.animals(id) ON DELETE CASCADE,
  vet_user_id BIGINT NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  note TEXT NOT NULL,
  visibility VARCHAR(20) NOT NULL DEFAULT 'internal' CHECK (visibility = 'internal'),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS public.vet_alerts (
  id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  animal_id BIGINT NOT NULL REFERENCES public.animals(id) ON DELETE CASCADE,
  vet_user_id BIGINT REFERENCES public.users(id) ON DELETE SET NULL,
  alert_type VARCHAR(40) NOT NULL,
  severity VARCHAR(20) NOT NULL CHECK (severity IN ('info', 'warning', 'critical')),
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'dismissed')),
  detected_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  dismissed_at TIMESTAMPTZ
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_roles TO authenticated, service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.vet_profiles TO authenticated, service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.vet_pet_access TO authenticated, service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.vet_shares TO authenticated, service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.vet_notes TO authenticated, service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.vet_alerts TO authenticated, service_role;

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vet_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vet_pet_access ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vet_shares ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vet_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vet_alerts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "users_read_own_roles" ON public.user_roles;
CREATE POLICY "users_read_own_roles"
ON public.user_roles FOR SELECT
USING (user_id = private.current_app_user_id());

DROP POLICY IF EXISTS "users_read_own_vet_profile" ON public.vet_profiles;
CREATE POLICY "users_read_own_vet_profile"
ON public.vet_profiles FOR SELECT
USING (user_id = private.current_app_user_id());

DROP POLICY IF EXISTS "veterinary_manage_own_profile" ON public.vet_profiles;
CREATE POLICY "veterinary_manage_own_profile"
ON public.vet_profiles FOR ALL
USING (private.current_user_is_veterinary() AND user_id = private.current_app_user_id())
WITH CHECK (private.current_user_is_veterinary() AND user_id = private.current_app_user_id());

DROP POLICY IF EXISTS "owners_manage_vet_pet_access" ON public.vet_pet_access;
CREATE POLICY "owners_manage_vet_pet_access"
ON public.vet_pet_access FOR ALL
USING (owner_id = private.current_app_user_id())
WITH CHECK (owner_id = private.current_app_user_id());

DROP POLICY IF EXISTS "veterinary_read_own_pet_access" ON public.vet_pet_access;
CREATE POLICY "veterinary_read_own_pet_access"
ON public.vet_pet_access FOR SELECT
USING (
  private.current_user_is_veterinary()
  AND status <> 'revoked'
  AND revoked_at IS NULL
  AND (
    vet_user_id = private.current_app_user_id()
    OR LOWER(vet_email) = LOWER(auth.jwt() ->> 'email')
  )
);

DROP POLICY IF EXISTS "owners_manage_vet_shares" ON public.vet_shares;
CREATE POLICY "owners_manage_vet_shares"
ON public.vet_shares FOR ALL
USING (owner_id = private.current_app_user_id())
WITH CHECK (owner_id = private.current_app_user_id());

DROP POLICY IF EXISTS "veterinary_read_own_vet_shares" ON public.vet_shares;
CREATE POLICY "veterinary_read_own_vet_shares"
ON public.vet_shares FOR SELECT
USING (
  private.current_user_is_veterinary()
  AND status <> 'revoked'
  AND revoked_at IS NULL
  AND (
    vet_user_id = private.current_app_user_id()
    OR LOWER(vet_email) = LOWER(auth.jwt() ->> 'email')
  )
);

DROP POLICY IF EXISTS "veterinary_manage_internal_notes" ON public.vet_notes;
CREATE POLICY "veterinary_manage_internal_notes"
ON public.vet_notes FOR ALL
USING (
  private.current_user_is_veterinary()
  AND vet_user_id = private.current_app_user_id()
  AND EXISTS (
    SELECT 1 FROM public.vet_pet_access vpa
    WHERE vpa.animal_id = vet_notes.animal_id
      AND vpa.status <> 'revoked'
      AND vpa.revoked_at IS NULL
      AND (
        vpa.vet_user_id = private.current_app_user_id()
        OR LOWER(vpa.vet_email) = LOWER(auth.jwt() ->> 'email')
      )
  )
)
WITH CHECK (
  private.current_user_is_veterinary()
  AND vet_user_id = private.current_app_user_id()
  AND visibility = 'internal'
  AND EXISTS (
    SELECT 1 FROM public.vet_pet_access vpa
    WHERE vpa.animal_id = vet_notes.animal_id
      AND vpa.status <> 'revoked'
      AND vpa.revoked_at IS NULL
      AND (
        vpa.vet_user_id = private.current_app_user_id()
        OR LOWER(vpa.vet_email) = LOWER(auth.jwt() ->> 'email')
      )
  )
);

DROP POLICY IF EXISTS "veterinary_read_alerts_for_shared_animals" ON public.vet_alerts;
CREATE POLICY "veterinary_read_alerts_for_shared_animals"
ON public.vet_alerts FOR SELECT
USING (
  private.current_user_is_veterinary()
  AND EXISTS (
    SELECT 1 FROM public.vet_pet_access vpa
    WHERE vpa.animal_id = vet_alerts.animal_id
      AND vpa.status <> 'revoked'
      AND vpa.revoked_at IS NULL
      AND (
        vpa.vet_user_id = private.current_app_user_id()
        OR LOWER(vpa.vet_email) = LOWER(auth.jwt() ->> 'email')
      )
  )
);

DROP POLICY IF EXISTS "veterinary_read_shared_animals_v2" ON public.animals;
CREATE POLICY "veterinary_read_shared_animals_v2"
ON public.animals FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.vet_pet_access vpa
    WHERE vpa.animal_id = animals.id
      AND private.current_user_is_veterinary()
      AND vpa.status <> 'revoked'
      AND vpa.revoked_at IS NULL
      AND (
        vpa.vet_user_id = private.current_app_user_id()
        OR LOWER(vpa.vet_email) = LOWER(auth.jwt() ->> 'email')
      )
  )
);

DROP POLICY IF EXISTS "veterinary_read_shared_events_v2" ON public.classification_events;
CREATE POLICY "veterinary_read_shared_events_v2"
ON public.classification_events FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.vet_pet_access vpa
    WHERE vpa.animal_id = classification_events.animal_id
      AND private.current_user_is_veterinary()
      AND vpa.status <> 'revoked'
      AND vpa.revoked_at IS NULL
      AND (
        vpa.vet_user_id = private.current_app_user_id()
        OR LOWER(vpa.vet_email) = LOWER(auth.jwt() ->> 'email')
      )
  )
);

NOTIFY pgrst, 'reload schema';

COMMIT;
