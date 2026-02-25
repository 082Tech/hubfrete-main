-- Add quantidade_paletes column to cargas table (optional field)
ALTER TABLE public.cargas 
ADD COLUMN quantidade_paletes INTEGER DEFAULT NULL;