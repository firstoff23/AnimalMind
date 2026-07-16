-- Enable browser Realtime subscriptions for classification events.
-- RLS keeps owner/family/vet access enforced at the database layer.

GRANT SELECT ON public.classification_events TO authenticated;

ALTER TABLE public.classification_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "owners_read_classification_events" ON public.classification_events;
CREATE POLICY "owners_read_classification_events"
ON public.classification_events
FOR SELECT
TO authenticated
USING (user_id = private.current_app_user_id());

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'classification_events'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.classification_events;
  END IF;
END $$;

NOTIFY pgrst, 'reload schema';
