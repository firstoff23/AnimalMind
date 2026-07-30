-- Drop old table if exists
DROP TABLE IF EXISTS public.feedback_annotations CASCADE;

-- Recreate table with new layout
CREATE TABLE IF NOT EXISTS public.feedback_annotations (
  id                    BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  classification_event_id BIGINT NOT NULL REFERENCES public.classification_events(id) ON DELETE CASCADE,
  user_id               BIGINT NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  confirmed_state       VARCHAR(50),
  comment               TEXT,
  reviewed_by           BIGINT REFERENCES public.users(id) ON DELETE SET NULL,
  reviewed_at           TIMESTAMP,
  created_at            TIMESTAMP DEFAULT NOW() NOT NULL,

  -- Unique constraint per user per event
  CONSTRAINT unique_feedback_per_user_event UNIQUE (classification_event_id, user_id)
);

-- Performance/Auditing Indexes
CREATE INDEX IF NOT EXISTS idx_feedback_annotations_event_id 
  ON public.feedback_annotations(classification_event_id);

CREATE INDEX IF NOT EXISTS idx_feedback_annotations_created_at 
  ON public.feedback_annotations(created_at DESC);

-- Enable RLS
ALTER TABLE public.feedback_annotations ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist to be idempotent
DROP POLICY IF EXISTS "Users can insert own feedback" ON public.feedback_annotations;
DROP POLICY IF EXISTS "Users can update own unreviewed feedback" ON public.feedback_annotations;
DROP POLICY IF EXISTS "Users and staff can view feedback" ON public.feedback_annotations;
DROP POLICY IF EXISTS "Staff can update any feedback" ON public.feedback_annotations;

-- 1. INSERT (User): authenticated users can insert their own feedback
CREATE POLICY "Users can insert own feedback" ON public.feedback_annotations
  FOR INSERT TO authenticated
  WITH CHECK (user_id = private.current_app_user_id());

-- 2. UPDATE (User): authenticated users can update their own feedback before review
CREATE POLICY "Users can update own unreviewed feedback" ON public.feedback_annotations
  FOR UPDATE TO authenticated
  USING (user_id = private.current_app_user_id() AND reviewed_by IS NULL)
  WITH CHECK (user_id = private.current_app_user_id() AND reviewed_by IS NULL);

-- 3. SELECT: users view their own; admins/vets view all
CREATE POLICY "Users and staff can view feedback" ON public.feedback_annotations
  FOR SELECT TO authenticated
  USING (
    user_id = private.current_app_user_id()
    OR (SELECT role FROM public.users WHERE id = private.current_app_user_id()) 
       IN ('admin', 'vet', 'veterinarian')
  );

-- 4. UPDATE (Staff): staff/admins can update any row (e.g. mark as reviewed)
CREATE POLICY "Staff can update any feedback" ON public.feedback_annotations
  FOR UPDATE TO authenticated
  USING (
    (SELECT role FROM public.users WHERE id = private.current_app_user_id()) 
     IN ('admin', 'vet', 'veterinarian')
  )
  WITH CHECK (true);

-- Notify PostgREST to reload schema cache
NOTIFY pgrst, 'reload schema';
