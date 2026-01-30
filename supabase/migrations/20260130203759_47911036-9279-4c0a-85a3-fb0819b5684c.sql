-- Rename columns from Portuguese to English to match Flutter app
ALTER TABLE public.locations RENAME COLUMN precisao TO accuracy;
ALTER TABLE public.locations RENAME COLUMN velocidade TO speed;
ALTER TABLE public.locations RENAME COLUMN bussola_pos TO heading;