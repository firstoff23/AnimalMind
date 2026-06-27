-- Create push_subscriptions table
CREATE TABLE IF NOT EXISTS public.push_subscriptions (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id BIGINT NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  endpoint TEXT NOT NULL UNIQUE,
  p256dh TEXT NOT NULL,
  auth TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for user lookup
CREATE INDEX IF NOT EXISTS idx_push_subscriptions_user_id ON public.push_subscriptions(user_id);

-- Enable Row Level Security
ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;

-- Grant access to authenticated and service_role
GRANT SELECT, INSERT, UPDATE, DELETE ON public.push_subscriptions TO authenticated, service_role;

-- Policies for owners to manage their own subscriptions
DROP POLICY IF EXISTS "owners_manage_push_subscriptions" ON public.push_subscriptions;
CREATE POLICY "owners_manage_push_subscriptions" ON public.push_subscriptions
  FOR ALL
  TO authenticated
  USING (user_id = private.current_app_user_id())
  WITH CHECK (user_id = private.current_app_user_id());

-- Notify PostgREST to reload schema cache
NOTIFY pgrst, 'reload schema';
