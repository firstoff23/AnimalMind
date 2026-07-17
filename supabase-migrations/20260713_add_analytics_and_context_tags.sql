-- Migration: Add analytics_events table and context_tags column to classification_events
-- Date: 2026-07-13

-- 1. Create analytics_events table
CREATE TABLE IF NOT EXISTS public.analytics_events (
  id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  event_name VARCHAR(100) NOT NULL,
  user_id BIGINT REFERENCES public.users(id) ON DELETE SET NULL,
  properties JSONB DEFAULT '{}'::jsonb NOT NULL,
  created_at TIMESTAMP DEFAULT NOW() NOT NULL
);

-- Enable RLS on analytics_events
ALTER TABLE public.analytics_events ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any
DROP POLICY IF EXISTS "Users can only insert own analytics events" ON public.analytics_events;
DROP POLICY IF EXISTS "Only staff can view analytics events" ON public.analytics_events;

-- Policy to allow authenticated users to INSERT their own analytics events
CREATE POLICY "Users can only insert own analytics events" ON public.analytics_events
  FOR INSERT TO authenticated
  WITH CHECK (user_id = private.current_app_user_id());

-- Policy to allow staff to SELECT analytics events
CREATE POLICY "Only staff can view analytics events" ON public.analytics_events
  FOR SELECT TO authenticated
  USING (
    private.current_user_is_vet() 
    OR private.current_user_is_veterinary() 
    OR (SELECT role FROM public.users WHERE email = (auth.jwt() ->> 'email')) = 'admin'
  );

-- 2. Alter classification_events table to add context_tags column
ALTER TABLE public.classification_events 
  ADD COLUMN IF NOT EXISTS context_tags TEXT[] DEFAULT '{}'::text[] NOT NULL;
