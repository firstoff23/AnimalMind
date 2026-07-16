-- Apagar registos de teste antigos (sem breed, antes de Junho 2026)
DELETE FROM public.feedback_annotations
WHERE predicted_breed IS NULL AND created_at < '2026-06-01';

-- Índices de performance
CREATE INDEX IF NOT EXISTS idx_feedback_annotations_created_at
  ON public.feedback_annotations (created_at DESC);

CREATE INDEX IF NOT EXISTS idx_feedback_annotations_animal_type
  ON public.feedback_annotations (animal_type);
