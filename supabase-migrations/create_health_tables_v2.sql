-- Migration to add health_records and vaccines tables
-- Securing them with Row Level Security (RLS)

-- 1. Create health_records table
CREATE TABLE IF NOT EXISTS public.health_records (
  id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  animal_id BIGINT NOT NULL REFERENCES public.animals(id) ON DELETE CASCADE,
  record_type VARCHAR(50) NOT NULL CHECK (record_type IN ('deworming', 'diagnostic_test', 'other_treatment', 'licensing', 'notes')),
  date DATE NOT NULL,
  product VARCHAR(100),
  dosage VARCHAR(100),
  result VARCHAR(200),
  category VARCHAR(50),
  notes TEXT,
  license_number VARCHAR(100),
  issuing_authority VARCHAR(150),
  next_due_date DATE,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- 2. Create vaccines table
CREATE TABLE IF NOT EXISTS public.vaccines (
  id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  animal_id BIGINT NOT NULL REFERENCES public.animals(id) ON DELETE CASCADE,
  vaccine_name VARCHAR(100) NOT NULL,
  vaccine_type VARCHAR(20) NOT NULL CHECK (vaccine_type IN ('rabies', 'other')),
  date_administered DATE NOT NULL,
  batch_number VARCHAR(50),
  veterinarian VARCHAR(100),
  next_due_date DATE,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- 3. Grant access permissions to authenticated and service_role
GRANT SELECT, INSERT, UPDATE, DELETE ON public.health_records TO authenticated, service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.vaccines TO authenticated, service_role;

-- 4. Enable Row Level Security (RLS) on new tables
ALTER TABLE public.health_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vaccines ENABLE ROW LEVEL SECURITY;

-- 5. Create RLS Policies for health_records
DROP POLICY IF EXISTS "owners_manage_health_records" ON public.health_records;
CREATE POLICY "owners_manage_health_records" ON public.health_records
FOR ALL TO authenticated
USING (EXISTS (SELECT 1 FROM public.animals a WHERE a.id = health_records.animal_id AND a.user_id = private.current_app_user_id()))
WITH CHECK (EXISTS (SELECT 1 FROM public.animals a WHERE a.id = health_records.animal_id AND a.user_id = private.current_app_user_id()));

DROP POLICY IF EXISTS "vets_read_health_records" ON public.health_records;
CREATE POLICY "vets_read_health_records" ON public.health_records
FOR SELECT TO authenticated
USING (private.current_user_is_vet() AND EXISTS (SELECT 1 FROM public.vet_shares vs WHERE vs.animal_id = health_records.animal_id AND (vs.vet_user_id = private.current_app_user_id() OR vs.vet_email = (auth.jwt() ->> 'email'))));

-- 6. Create RLS Policies for vaccines
DROP POLICY IF EXISTS "owners_manage_vaccines" ON public.vaccines;
CREATE POLICY "owners_manage_vaccines" ON public.vaccines
FOR ALL TO authenticated
USING (EXISTS (SELECT 1 FROM public.animals a WHERE a.id = vaccines.animal_id AND a.user_id = private.current_app_user_id()))
WITH CHECK (EXISTS (SELECT 1 FROM public.animals a WHERE a.id = vaccines.animal_id AND a.user_id = private.current_app_user_id()));

DROP POLICY IF EXISTS "vets_read_vaccines" ON public.vaccines;
CREATE POLICY "vets_read_vaccines" ON public.vaccines
FOR SELECT TO authenticated
USING (private.current_user_is_vet() AND EXISTS (SELECT 1 FROM public.vet_shares vs WHERE vs.animal_id = vaccines.animal_id AND (vs.vet_user_id = private.current_app_user_id() OR vs.vet_email = (auth.jwt() ->> 'email'))));
