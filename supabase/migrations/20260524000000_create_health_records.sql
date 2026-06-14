-- Migration to add digital health bulletin (Boletim Sanitário Digital)
-- Based on Despacho nº 8196/2018 DGAV

-- 1. Add new columns to public.animals table
ALTER TABLE public.animals 
  ADD COLUMN IF NOT EXISTS height VARCHAR(50),
  ADD COLUMN IF NOT EXISTS tail VARCHAR(50),
  ADD COLUMN IF NOT EXISTS special_markings TEXT;

-- 2. Create vaccinations table
CREATE TABLE IF NOT EXISTS public.vaccinations (
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

-- 3. Create dewormings table
CREATE TABLE IF NOT EXISTS public.dewormings (
  id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  animal_id BIGINT NOT NULL REFERENCES public.animals(id) ON DELETE CASCADE,
  type VARCHAR(20) NOT NULL CHECK (type IN ('internal', 'external', 'both')),
  product VARCHAR(100) NOT NULL,
  dosage VARCHAR(100),
  date_administered DATE NOT NULL,
  next_due_date DATE,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- 4. Create diagnostic_tests table
CREATE TABLE IF NOT EXISTS public.diagnostic_tests (
  id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  animal_id BIGINT NOT NULL REFERENCES public.animals(id) ON DELETE CASCADE,
  test_name VARCHAR(100) NOT NULL,
  date_performed DATE NOT NULL,
  result VARCHAR(200) NOT NULL,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- 5. Create other_treatments table
CREATE TABLE IF NOT EXISTS public.other_treatments (
  id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  animal_id BIGINT NOT NULL REFERENCES public.animals(id) ON DELETE CASCADE,
  treatment_name VARCHAR(200) NOT NULL,
  date_administered DATE NOT NULL,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- 6. Create licensing table
CREATE TABLE IF NOT EXISTS public.licensing (
  id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  animal_id BIGINT NOT NULL REFERENCES public.animals(id) ON DELETE CASCADE,
  license_number VARCHAR(100) NOT NULL,
  issue_date DATE NOT NULL,
  expiry_date DATE,
  issuing_authority VARCHAR(150) NOT NULL DEFAULT 'Junta de Freguesia',
  category VARCHAR(50) NOT NULL CHECK (category IN ('companion', 'dangerous', 'potentially_dangerous', 'hunting', 'guard', 'other')),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- 7. Grant access permissions to authenticated and service_role
GRANT SELECT, INSERT, UPDATE, DELETE ON public.vaccinations TO authenticated, service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.dewormings TO authenticated, service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.diagnostic_tests TO authenticated, service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.other_treatments TO authenticated, service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.licensing TO authenticated, service_role;

-- 8. Enable Row Level Security (RLS) on new tables
ALTER TABLE public.vaccinations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dewormings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.diagnostic_tests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.other_treatments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.licensing ENABLE ROW LEVEL SECURITY;

-- 9. Create RLS Policies for Vaccinations
DROP POLICY IF EXISTS "owners_manage_vaccinations" ON public.vaccinations;
CREATE POLICY "owners_manage_vaccinations" ON public.vaccinations
FOR ALL TO authenticated
USING (EXISTS (SELECT 1 FROM public.animals a WHERE a.id = vaccinations.animal_id AND a.user_id = private.current_app_user_id()))
WITH CHECK (EXISTS (SELECT 1 FROM public.animals a WHERE a.id = vaccinations.animal_id AND a.user_id = private.current_app_user_id()));

DROP POLICY IF EXISTS "vets_read_vaccinations" ON public.vaccinations;
CREATE POLICY "vets_read_vaccinations" ON public.vaccinations
FOR SELECT TO authenticated
USING (private.current_user_is_vet() AND EXISTS (SELECT 1 FROM public.vet_shares vs WHERE vs.animal_id = vaccinations.animal_id AND (vs.vet_user_id = private.current_app_user_id() OR vs.vet_email = (auth.jwt() ->> 'email'))));

-- 10. Create RLS Policies for Dewormings
DROP POLICY IF EXISTS "owners_manage_dewormings" ON public.dewormings;
CREATE POLICY "owners_manage_dewormings" ON public.dewormings
FOR ALL TO authenticated
USING (EXISTS (SELECT 1 FROM public.animals a WHERE a.id = dewormings.animal_id AND a.user_id = private.current_app_user_id()))
WITH CHECK (EXISTS (SELECT 1 FROM public.animals a WHERE a.id = dewormings.animal_id AND a.user_id = private.current_app_user_id()));

DROP POLICY IF EXISTS "vets_read_dewormings" ON public.dewormings;
CREATE POLICY "vets_read_dewormings" ON public.dewormings
FOR SELECT TO authenticated
USING (private.current_user_is_vet() AND EXISTS (SELECT 1 FROM public.vet_shares vs WHERE vs.animal_id = dewormings.animal_id AND (vs.vet_user_id = private.current_app_user_id() OR vs.vet_email = (auth.jwt() ->> 'email'))));

-- 11. Create RLS Policies for Diagnostic Tests
DROP POLICY IF EXISTS "owners_manage_diagnostic_tests" ON public.diagnostic_tests;
CREATE POLICY "owners_manage_diagnostic_tests" ON public.diagnostic_tests
FOR ALL TO authenticated
USING (EXISTS (SELECT 1 FROM public.animals a WHERE a.id = diagnostic_tests.animal_id AND a.user_id = private.current_app_user_id()))
WITH CHECK (EXISTS (SELECT 1 FROM public.animals a WHERE a.id = diagnostic_tests.animal_id AND a.user_id = private.current_app_user_id()));

DROP POLICY IF EXISTS "vets_read_diagnostic_tests" ON public.diagnostic_tests;
CREATE POLICY "vets_read_diagnostic_tests" ON public.diagnostic_tests
FOR SELECT TO authenticated
USING (private.current_user_is_vet() AND EXISTS (SELECT 1 FROM public.vet_shares vs WHERE vs.animal_id = diagnostic_tests.animal_id AND (vs.vet_user_id = private.current_app_user_id() OR vs.vet_email = (auth.jwt() ->> 'email'))));

-- 12. Create RLS Policies for Other Treatments
DROP POLICY IF EXISTS "owners_manage_other_treatments" ON public.other_treatments;
CREATE POLICY "owners_manage_other_treatments" ON public.other_treatments
FOR ALL TO authenticated
USING (EXISTS (SELECT 1 FROM public.animals a WHERE a.id = other_treatments.animal_id AND a.user_id = private.current_app_user_id()))
WITH CHECK (EXISTS (SELECT 1 FROM public.animals a WHERE a.id = other_treatments.animal_id AND a.user_id = private.current_app_user_id()));

DROP POLICY IF EXISTS "vets_read_other_treatments" ON public.other_treatments;
CREATE POLICY "vets_read_other_treatments" ON public.other_treatments
FOR SELECT TO authenticated
USING (private.current_user_is_vet() AND EXISTS (SELECT 1 FROM public.vet_shares vs WHERE vs.animal_id = other_treatments.animal_id AND (vs.vet_user_id = private.current_app_user_id() OR vs.vet_email = (auth.jwt() ->> 'email'))));

-- 13. Create RLS Policies for Licensing
DROP POLICY IF EXISTS "owners_manage_licensing" ON public.licensing;
CREATE POLICY "owners_manage_licensing" ON public.licensing
FOR ALL TO authenticated
USING (EXISTS (SELECT 1 FROM public.animals a WHERE a.id = licensing.animal_id AND a.user_id = private.current_app_user_id()))
WITH CHECK (EXISTS (SELECT 1 FROM public.animals a WHERE a.id = licensing.animal_id AND a.user_id = private.current_app_user_id()));

DROP POLICY IF EXISTS "vets_read_licensing" ON public.licensing;
CREATE POLICY "vets_read_licensing" ON public.licensing
FOR SELECT TO authenticated
USING (private.current_user_is_vet() AND EXISTS (SELECT 1 FROM public.vet_shares vs WHERE vs.animal_id = licensing.animal_id AND (vs.vet_user_id = private.current_app_user_id() OR vs.vet_email = (auth.jwt() ->> 'email'))));
