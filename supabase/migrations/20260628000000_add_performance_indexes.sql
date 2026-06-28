-- Create performance indexes for heavily queried tables/columns
CREATE INDEX IF NOT EXISTS idx_animals_user_id ON public.animals(user_id);
CREATE INDEX IF NOT EXISTS idx_classification_events_animal_id ON public.classification_events(animal_id);
CREATE INDEX IF NOT EXISTS idx_classification_events_created_at ON public.classification_events(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_health_records_animal_id ON public.health_records(animal_id);
CREATE INDEX IF NOT EXISTS idx_users_open_id ON public.users(open_id);

-- Notify PostgREST to reload schema cache
NOTIFY pgrst, 'reload schema';
