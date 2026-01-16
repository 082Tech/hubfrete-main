-- Criar tabela de carrocerias (implementos)
CREATE TABLE public.carrocerias (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  placa TEXT NOT NULL,
  tipo TEXT NOT NULL,
  marca TEXT,
  modelo TEXT,
  ano INTEGER,
  renavam TEXT,
  capacidade_kg NUMERIC,
  capacidade_m3 NUMERIC,
  foto_url TEXT,
  ativo BOOLEAN DEFAULT true,
  empresa_id BIGINT REFERENCES public.empresas(id),
  motorista_id UUID REFERENCES public.motoristas(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.carrocerias ENABLE ROW LEVEL SECURITY;

-- Create policy for authenticated users
CREATE POLICY "Allow all for authenticated" 
ON public.carrocerias 
FOR ALL 
USING (true)
WITH CHECK (true);

-- Add indexes
CREATE INDEX idx_carrocerias_empresa_id ON public.carrocerias(empresa_id);
CREATE INDEX idx_carrocerias_motorista_id ON public.carrocerias(motorista_id);

-- Create trigger for updated_at using existing function
CREATE TRIGGER update_carrocerias_updated_at
BEFORE UPDATE ON public.carrocerias
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at();