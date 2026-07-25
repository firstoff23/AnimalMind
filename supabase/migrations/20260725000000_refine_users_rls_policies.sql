-- Migration: Refine Row Level Security policies on users table using auth.uid() with email fallback
-- Date: 2026-07-25

-- 1. Ensure RLS is enabled on public.users
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- 2. Drop existing policies if any
DROP POLICY IF EXISTS "Users can read own row" ON public.users;
DROP POLICY IF EXISTS "Users can update own non-sensitive fields" ON public.users;

-- 3. Policy to allow authenticated users to SELECT their own user row (open_id or email fallback)
CREATE POLICY "Users can read own row" ON public.users
  FOR SELECT TO authenticated
  USING (
    open_id = auth.uid()::text
    OR email = (auth.jwt() ->> 'email')
  );

-- 4. Policy to allow authenticated users to UPDATE their own non-sensitive fields
-- but prevents changing the role (role must remain what it currently is in the DB)
CREATE POLICY "Users can update own non-sensitive fields" ON public.users
  FOR UPDATE TO authenticated
  USING (
    open_id = auth.uid()::text
    OR email = (auth.jwt() ->> 'email')
  )
  WITH CHECK (
    (open_id = auth.uid()::text OR email = (auth.jwt() ->> 'email'))
    AND role = (SELECT role FROM public.users WHERE open_id = auth.uid()::text OR email = (auth.jwt() ->> 'email'))
  );
