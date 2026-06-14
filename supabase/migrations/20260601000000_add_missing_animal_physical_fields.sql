-- Keeps the animals table aligned with the profile and health-bulletin forms.
ALTER TABLE public.animals
  ADD COLUMN IF NOT EXISTS height VARCHAR(50),
  ADD COLUMN IF NOT EXISTS tail VARCHAR(50),
  ADD COLUMN IF NOT EXISTS special_markings TEXT;
