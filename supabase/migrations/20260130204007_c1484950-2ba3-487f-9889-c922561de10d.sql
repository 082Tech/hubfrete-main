-- Add entrega_id column to locations table for tracking which delivery driver is on
ALTER TABLE public.locations 
ADD COLUMN entrega_id uuid REFERENCES public.entregas(id) ON DELETE SET NULL;