ALTER TABLE public.animals 
  ADD COLUMN IF NOT EXISTS date_of_birth DATE,
  ADD COLUMN IF NOT EXISTS sex VARCHAR(10) 
    CHECK (sex IN ('male', 'female', 'unknown')),
  ADD COLUMN IF NOT EXISTS color TEXT,
  ADD COLUMN IF NOT EXISTS coat VARCHAR(10) 
    CHECK (coat IN ('short', 'medium', 'long')),
  ADD COLUMN IF NOT EXISTS photo_url TEXT,
  ADD COLUMN IF NOT EXISTS microchip_number VARCHAR(15);
