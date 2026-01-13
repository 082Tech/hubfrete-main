-- Step 1: Add empresa_id columns to tables that reference embarcadores/transportadoras
ALTER TABLE public.cargas ADD COLUMN empresa_id bigint;
ALTER TABLE public.cotacoes ADD COLUMN empresa_id bigint;
ALTER TABLE public.entregas ADD COLUMN empresa_id bigint;
ALTER TABLE public.motoristas ADD COLUMN empresa_id bigint;
ALTER TABLE public.veiculos ADD COLUMN empresa_id bigint;

-- Step 2: Migrate data from embarcador_id to empresa_id in cargas
UPDATE public.cargas c
SET empresa_id = e.empresa_id
FROM public.embarcadores e
WHERE c.embarcador_id = e.id;

-- Step 3: Migrate data from transportadora_id to empresa_id in cotacoes
UPDATE public.cotacoes co
SET empresa_id = t.empresa_id
FROM public.transportadoras t
WHERE co.transportadora_id = t.id;

-- Step 4: Migrate data from transportadora_id to empresa_id in entregas
UPDATE public.entregas en
SET empresa_id = t.empresa_id
FROM public.transportadoras t
WHERE en.transportadora_id = t.id;

-- Step 5: Migrate data from transportadora_id to empresa_id in motoristas
UPDATE public.motoristas m
SET empresa_id = t.empresa_id
FROM public.transportadoras t
WHERE m.transportadora_id = t.id;

-- Step 6: Migrate data from transportadora_id to empresa_id in veiculos
UPDATE public.veiculos v
SET empresa_id = t.empresa_id
FROM public.transportadoras t
WHERE v.transportadora_id = t.id;

-- Step 7: Drop old columns
ALTER TABLE public.cargas DROP COLUMN embarcador_id;
ALTER TABLE public.cotacoes DROP COLUMN transportadora_id;
ALTER TABLE public.entregas DROP COLUMN transportadora_id;
ALTER TABLE public.motoristas DROP COLUMN transportadora_id;
ALTER TABLE public.veiculos DROP COLUMN transportadora_id;

-- Step 8: Add foreign key constraints to empresas
ALTER TABLE public.cargas 
ADD CONSTRAINT cargas_empresa_id_fkey 
FOREIGN KEY (empresa_id) REFERENCES public.empresas(id);

ALTER TABLE public.cotacoes 
ADD CONSTRAINT cotacoes_empresa_id_fkey 
FOREIGN KEY (empresa_id) REFERENCES public.empresas(id);

ALTER TABLE public.entregas 
ADD CONSTRAINT entregas_empresa_id_fkey 
FOREIGN KEY (empresa_id) REFERENCES public.empresas(id);

ALTER TABLE public.motoristas 
ADD CONSTRAINT motoristas_empresa_id_fkey 
FOREIGN KEY (empresa_id) REFERENCES public.empresas(id);

ALTER TABLE public.veiculos 
ADD CONSTRAINT veiculos_empresa_id_fkey 
FOREIGN KEY (empresa_id) REFERENCES public.empresas(id);

-- Step 9: Drop embarcadores and transportadoras tables
DROP TABLE public.embarcadores;
DROP TABLE public.transportadoras;