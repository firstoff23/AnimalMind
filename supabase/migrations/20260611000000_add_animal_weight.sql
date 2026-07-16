-- Migration to add weight field to animals table
ALTER TABLE public.animals
  ADD COLUMN IF NOT EXISTS weight VARCHAR(50);

-- Notify PostgREST to reload the schema cache
NOTIFY pgrst, 'reload schema';
