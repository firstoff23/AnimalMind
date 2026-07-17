-- Migration: Enable Row Level Security on users and settings tables
-- Date: 2026-07-13

-- 1. Enable RLS on users table
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any
DROP POLICY IF EXISTS "Users can read own row" ON public.users;
DROP POLICY IF EXISTS "Users can update own non-sensitive fields" ON public.users;

-- Policy to allow authenticated users to SELECT their own user row
CREATE POLICY "Users can read own row" ON public.users
  FOR SELECT TO authenticated
  USING (email = (auth.jwt() ->> 'email'));

-- Policy to allow authenticated users to UPDATE their own email/non-sensitive fields
-- but prevents changing the role (role must remain what it currently is in the DB)
CREATE POLICY "Users can update own non-sensitive fields" ON public.users
  FOR UPDATE TO authenticated
  USING (email = (auth.jwt() ->> 'email'))
  WITH CHECK (
    email = (auth.jwt() ->> 'email')
    AND role = (SELECT role FROM public.users WHERE email = (auth.jwt() ->> 'email'))
  );


-- 2. Enable RLS on settings table
ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any
DROP POLICY IF EXISTS "Users can view own settings" ON public.settings;
DROP POLICY IF EXISTS "Users can insert own settings" ON public.settings;
DROP POLICY IF EXISTS "Users can update own settings" ON public.settings;

-- Policy to allow authenticated users to SELECT their own settings row
CREATE POLICY "Users can view own settings" ON public.settings
  FOR SELECT TO authenticated
  USING (user_id = private.current_app_user_id());

-- Policy to allow authenticated users to INSERT their own settings row
CREATE POLICY "Users can insert own settings" ON public.settings
  FOR INSERT TO authenticated
  WITH CHECK (user_id = private.current_app_user_id());

-- Policy to allow authenticated users to UPDATE their own settings row
CREATE POLICY "Users can update own settings" ON public.settings
  FOR UPDATE TO authenticated
  USING (user_id = private.current_app_user_id())
  WITH CHECK (user_id = private.current_app_user_id());
