-- AnimalMind - Modo Veterinário
-- Aplicar manualmente no Supabase SQL Editor.

ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS role VARCHAR(20) NOT NULL DEFAULT 'owner';

UPDATE public.users
SET role = 'owner'
WHERE role IS NULL OR role = 'user';

ALTER TABLE public.users
  ALTER COLUMN role SET DEFAULT 'owner';

ALTER TABLE public.users
  DROP CONSTRAINT IF EXISTS users_role_check;

ALTER TABLE public.users
  ADD CONSTRAINT users_role_check
  CHECK (role IN ('owner', 'vet', 'admin'));

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

CREATE OR REPLACE FUNCTION private.current_user_is_vet()
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT COALESCE(private.current_app_user_role() IN ('vet', 'admin'), FALSE)
$$;

REVOKE ALL ON FUNCTION private.current_app_user_id() FROM PUBLIC;
REVOKE ALL ON FUNCTION private.current_app_user_role() FROM PUBLIC;
REVOKE ALL ON FUNCTION private.current_user_is_vet() FROM PUBLIC;
GRANT USAGE ON SCHEMA private TO authenticated;
GRANT EXECUTE ON FUNCTION private.current_app_user_id() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION private.current_app_user_role() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION private.current_user_is_vet() TO authenticated, service_role;

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

CREATE TABLE IF NOT EXISTS public.vet_clinical_notes (
  id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  animal_id BIGINT NOT NULL REFERENCES public.animals(id) ON DELETE CASCADE,
  vet_user_id BIGINT NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  notes TEXT NOT NULL DEFAULT '',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (animal_id, vet_user_id)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.vet_shares TO authenticated, service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.vet_clinical_notes TO authenticated, service_role;

ALTER TABLE public.vet_shares ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vet_clinical_notes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "owners_manage_vet_shares" ON public.vet_shares;
CREATE POLICY "owners_manage_vet_shares"
ON public.vet_shares
FOR ALL
USING (
  owner_id = private.current_app_user_id()
)
WITH CHECK (
  owner_id = private.current_app_user_id()
);

DROP POLICY IF EXISTS "vets_read_their_shares" ON public.vet_shares;
CREATE POLICY "vets_read_their_shares"
ON public.vet_shares
FOR SELECT
USING (
  private.current_user_is_vet()
  AND (
    vet_user_id = private.current_app_user_id()
    OR vet_email = (auth.jwt() ->> 'email')
  )
);

DROP POLICY IF EXISTS "vets_manage_clinical_notes" ON public.vet_clinical_notes;
CREATE POLICY "vets_manage_clinical_notes"
ON public.vet_clinical_notes
FOR ALL
USING (
  private.current_user_is_vet()
  AND vet_user_id = private.current_app_user_id()
)
WITH CHECK (
  private.current_user_is_vet()
  AND vet_user_id = private.current_app_user_id()
);

DROP POLICY IF EXISTS "vets_read_shared_animals" ON public.animals;
CREATE POLICY "vets_read_shared_animals"
ON public.animals
FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM public.vet_shares vs
    WHERE vs.animal_id = animals.id
      AND private.current_user_is_vet()
      AND (
        vs.vet_user_id = private.current_app_user_id()
        OR vs.vet_email = (auth.jwt() ->> 'email')
      )
  )
);

DROP POLICY IF EXISTS "vets_read_shared_events" ON public.classification_events;
CREATE POLICY "vets_read_shared_events"
ON public.classification_events
FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM public.vet_shares vs
    WHERE vs.animal_id = classification_events.animal_id
      AND private.current_user_is_vet()
      AND (
        vs.vet_user_id = private.current_app_user_id()
        OR vs.vet_email = (auth.jwt() ->> 'email')
      )
  )
);
