-- Alter settings table to add share_diagnostic_data defaulting to false
ALTER TABLE public.settings ADD COLUMN IF NOT EXISTS share_diagnostic_data BOOLEAN DEFAULT FALSE;

-- Ensure age gate confirmation on auth.users before registration
CREATE OR REPLACE FUNCTION public.check_age_gate()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.raw_user_meta_data IS NULL OR (NEW.raw_user_meta_data ->> 'age_confirmed')::boolean IS NOT TRUE THEN
    RAISE EXCEPTION 'A confirmação de idade é obrigatória para efetuar o registo.';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recreate trigger to avoid conflicts
DROP TRIGGER IF EXISTS check_age_gate_trigger ON auth.users;
CREATE TRIGGER check_age_gate_trigger
  BEFORE INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.check_age_gate();

-- Reload PostgREST schema
NOTIFY pgrst, 'reload schema';
