-- Add cte_url column to entregas table for storing CT-e document links
ALTER TABLE public.entregas 
ADD COLUMN IF NOT EXISTS cte_url text;