-- Add updated_at column to locations table for online/offline tracking
ALTER TABLE public.locations 
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- Create trigger function to auto-update updated_at on every INSERT/UPDATE
CREATE OR REPLACE FUNCTION public.update_locations_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- Create trigger
DROP TRIGGER IF EXISTS trigger_locations_updated_at ON public.locations;
CREATE TRIGGER trigger_locations_updated_at
  BEFORE INSERT OR UPDATE ON public.locations
  FOR EACH ROW
  EXECUTE FUNCTION public.update_locations_updated_at();

-- Update existing rows to have current timestamp
UPDATE public.locations SET updated_at = NOW() WHERE updated_at IS NULL;