-- Add logo_url column to empresas
ALTER TABLE public.empresas ADD COLUMN logo_url text;

-- Update Carajas company with the logo URL
UPDATE public.empresas 
SET logo_url = 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcSyc6Vj1rXcM2fyxrPe53s-rkbUXZhAEyZLIg&s'
WHERE nome ILIKE '%caraj%' OR cnpj_matriz LIKE '%caraj%';