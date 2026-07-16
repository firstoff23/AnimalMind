-- Enable Row Level Security on public.animals table
ALTER TABLE public.animals ENABLE ROW LEVEL SECURITY;

-- Policy to allow authenticated users to SELECT animals they own
DROP POLICY IF EXISTS "owners_select_animals" ON public.animals;
CREATE POLICY "owners_select_animals" ON public.animals
FOR SELECT
TO authenticated
USING (user_id = private.current_app_user_id());

-- Policy to allow authenticated users to INSERT their own animals
DROP POLICY IF EXISTS "authenticated_insert_animals" ON public.animals;
CREATE POLICY "authenticated_insert_animals" ON public.animals
FOR INSERT
TO authenticated
WITH CHECK (user_id = private.current_app_user_id());

-- Policy to allow authenticated users to UPDATE their own animals
DROP POLICY IF EXISTS "owners_update_animals" ON public.animals;
CREATE POLICY "owners_update_animals" ON public.animals
FOR UPDATE
TO authenticated
USING (user_id = private.current_app_user_id())
WITH CHECK (user_id = private.current_app_user_id());

-- Policy to allow authenticated users to DELETE their own animals
DROP POLICY IF EXISTS "owners_delete_animals" ON public.animals;
CREATE POLICY "owners_delete_animals" ON public.animals
FOR DELETE
TO authenticated
USING (user_id = private.current_app_user_id());

-- Add missing owner_note column to vet_shares if it doesn't exist
ALTER TABLE public.vet_shares ADD COLUMN IF NOT EXISTS owner_note TEXT;
