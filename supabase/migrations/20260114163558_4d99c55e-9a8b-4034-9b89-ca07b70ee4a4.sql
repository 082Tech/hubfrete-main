-- Add latitude and longitude columns to filiais table
ALTER TABLE public.filiais 
ADD COLUMN IF NOT EXISTS latitude numeric,
ADD COLUMN IF NOT EXISTS longitude numeric;