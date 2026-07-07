-- Enable RLS on feedback_annotations
ALTER TABLE public.feedback_annotations ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist to ensure idempotency
DROP POLICY IF EXISTS "Allow inserts on feedback_annotations" ON public.feedback_annotations;
DROP POLICY IF EXISTS "Restrict reading/updating/deleting on feedback_annotations" ON public.feedback_annotations;

-- Allow inserts from anyone (anonymous or authenticated) so clients/backend can submit feedback
CREATE POLICY "Allow inserts on feedback_annotations" ON public.feedback_annotations
  FOR INSERT WITH CHECK (true);

-- Restrict reading, updating or deleting to authenticated users only
CREATE POLICY "Restrict reading/updating/deleting on feedback_annotations" ON public.feedback_annotations
  FOR ALL USING (auth.role() = 'authenticated');

