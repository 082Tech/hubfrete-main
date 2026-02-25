-- Add foto_url column to veiculos table for vehicle photos
ALTER TABLE public.veiculos ADD COLUMN IF NOT EXISTS foto_url text;