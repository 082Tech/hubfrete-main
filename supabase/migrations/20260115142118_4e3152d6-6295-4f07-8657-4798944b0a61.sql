-- Add foreign keys from cargas to enderecos_carga for PostgREST embedded queries
ALTER TABLE public.cargas
ADD CONSTRAINT cargas_endereco_origem_fkey 
FOREIGN KEY (endereco_origem_id) 
REFERENCES public.enderecos_carga(id) 
ON DELETE SET NULL;

ALTER TABLE public.cargas
ADD CONSTRAINT cargas_endereco_destino_fkey 
FOREIGN KEY (endereco_destino_id) 
REFERENCES public.enderecos_carga(id) 
ON DELETE SET NULL;