-- AnimalMind - Modo Família
-- Aplicar manualmente no Supabase SQL Editor.

CREATE TABLE IF NOT EXISTS public.families (
  id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  name TEXT NOT NULL,
  owner_id BIGINT NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.family_members (
  family_id BIGINT NOT NULL REFERENCES public.families(id) ON DELETE CASCADE,
  user_id BIGINT NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  role VARCHAR(20) NOT NULL DEFAULT 'member',
  joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (family_id, user_id),
  CHECK (role IN ('admin', 'member'))
);

CREATE TABLE IF NOT EXISTS public.family_animals (
  family_id BIGINT NOT NULL REFERENCES public.families(id) ON DELETE CASCADE,
  animal_id BIGINT NOT NULL REFERENCES public.animals(id) ON DELETE CASCADE,
  shared_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (family_id, animal_id)
);

CREATE TABLE IF NOT EXISTS public.invites (
  code VARCHAR(6) PRIMARY KEY,
  family_id BIGINT NOT NULL REFERENCES public.families(id) ON DELETE CASCADE,
  expires_at TIMESTAMPTZ NOT NULL,
  used BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_family_members_user_id
  ON public.family_members(user_id);

CREATE INDEX IF NOT EXISTS idx_family_animals_animal_id
  ON public.family_animals(animal_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.families TO authenticated, service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.family_members TO authenticated, service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.family_animals TO authenticated, service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.invites TO authenticated, service_role;

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

CREATE OR REPLACE FUNCTION private.is_family_member(check_family_id BIGINT)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.family_members fm
    WHERE fm.family_id = check_family_id
      AND fm.user_id = private.current_app_user_id()
  )
$$;

CREATE OR REPLACE FUNCTION private.is_family_admin(check_family_id BIGINT)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.family_members fm
    WHERE fm.family_id = check_family_id
      AND fm.user_id = private.current_app_user_id()
      AND fm.role = 'admin'
  )
$$;

REVOKE ALL ON FUNCTION private.current_app_user_id() FROM PUBLIC;
REVOKE ALL ON FUNCTION private.is_family_member(BIGINT) FROM PUBLIC;
REVOKE ALL ON FUNCTION private.is_family_admin(BIGINT) FROM PUBLIC;
GRANT USAGE ON SCHEMA private TO authenticated;
GRANT EXECUTE ON FUNCTION private.current_app_user_id() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION private.is_family_member(BIGINT) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION private.is_family_admin(BIGINT) TO authenticated, service_role;

ALTER TABLE public.families ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.family_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.family_animals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invites ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "members_read_families" ON public.families;
CREATE POLICY "members_read_families"
ON public.families
FOR SELECT
USING (
  private.is_family_member(families.id)
);

DROP POLICY IF EXISTS "owners_create_families" ON public.families;
CREATE POLICY "owners_create_families"
ON public.families
FOR INSERT
WITH CHECK (
  owner_id = private.current_app_user_id()
);

DROP POLICY IF EXISTS "members_read_family_members" ON public.family_members;
CREATE POLICY "members_read_family_members"
ON public.family_members
FOR SELECT
USING (
  private.is_family_member(family_members.family_id)
);

DROP POLICY IF EXISTS "admins_manage_family_members" ON public.family_members;
CREATE POLICY "admins_manage_family_members"
ON public.family_members
FOR ALL
USING (
  private.is_family_admin(family_members.family_id)
)
WITH CHECK (
  private.is_family_admin(family_members.family_id)
);

DROP POLICY IF EXISTS "members_read_family_animals" ON public.family_animals;
CREATE POLICY "members_read_family_animals"
ON public.family_animals
FOR SELECT
USING (
  private.is_family_member(family_animals.family_id)
);

DROP POLICY IF EXISTS "admins_manage_family_animals" ON public.family_animals;
CREATE POLICY "admins_manage_family_animals"
ON public.family_animals
FOR ALL
USING (
  private.is_family_admin(family_animals.family_id)
)
WITH CHECK (
  private.is_family_admin(family_animals.family_id)
);

DROP POLICY IF EXISTS "members_manage_invites" ON public.invites;
CREATE POLICY "members_manage_invites"
ON public.invites
FOR ALL
USING (
  private.is_family_member(invites.family_id)
)
WITH CHECK (
  private.is_family_member(invites.family_id)
);

DROP POLICY IF EXISTS "members_read_family_owned_animals" ON public.animals;
CREATE POLICY "members_read_family_owned_animals"
ON public.animals
FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM public.family_animals fa
    WHERE fa.animal_id = animals.id
      AND private.is_family_member(fa.family_id)
  )
);

DROP POLICY IF EXISTS "members_read_family_events" ON public.classification_events;
CREATE POLICY "members_read_family_events"
ON public.classification_events
FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM public.family_animals fa
    WHERE fa.animal_id = classification_events.animal_id
      AND private.is_family_member(fa.family_id)
  )
);
