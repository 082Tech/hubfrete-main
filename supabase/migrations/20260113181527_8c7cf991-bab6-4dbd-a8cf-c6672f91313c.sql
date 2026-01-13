-- Add filial_id column to cargas table to link loads to specific branches
ALTER TABLE public.cargas 
ADD COLUMN filial_id integer REFERENCES public.filiais(id);

-- Create index for better query performance
CREATE INDEX idx_cargas_filial_id ON public.cargas(filial_id);

-- Update existing cargas to link to the matriz filial of their empresa
UPDATE public.cargas c
SET filial_id = (
  SELECT f.id 
  FROM public.filiais f 
  WHERE f.empresa_id = c.empresa_id 
    AND f.is_matriz = true
  LIMIT 1
)
WHERE c.filial_id IS NULL;