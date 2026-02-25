-- Adicionar novos valores ao enum tipo_veiculo
ALTER TYPE public.tipo_veiculo ADD VALUE IF NOT EXISTS 'bitruck';

-- Adicionar novos valores ao enum tipo_carroceria
-- Abertas
ALTER TYPE public.tipo_carroceria ADD VALUE IF NOT EXISTS 'graneleiro';
ALTER TYPE public.tipo_carroceria ADD VALUE IF NOT EXISTS 'grade_baixa';
ALTER TYPE public.tipo_carroceria ADD VALUE IF NOT EXISTS 'cacamba';
ALTER TYPE public.tipo_carroceria ADD VALUE IF NOT EXISTS 'plataforma';

-- Fechadas
ALTER TYPE public.tipo_carroceria ADD VALUE IF NOT EXISTS 'bau';
ALTER TYPE public.tipo_carroceria ADD VALUE IF NOT EXISTS 'bau_frigorifico';
ALTER TYPE public.tipo_carroceria ADD VALUE IF NOT EXISTS 'bau_refrigerado';

-- Especiais
ALTER TYPE public.tipo_carroceria ADD VALUE IF NOT EXISTS 'silo';
ALTER TYPE public.tipo_carroceria ADD VALUE IF NOT EXISTS 'gaiola';
ALTER TYPE public.tipo_carroceria ADD VALUE IF NOT EXISTS 'bug_porta_container';
ALTER TYPE public.tipo_carroceria ADD VALUE IF NOT EXISTS 'munk';
ALTER TYPE public.tipo_carroceria ADD VALUE IF NOT EXISTS 'apenas_cavalo';
ALTER TYPE public.tipo_carroceria ADD VALUE IF NOT EXISTS 'cavaqueira';
ALTER TYPE public.tipo_carroceria ADD VALUE IF NOT EXISTS 'hopper';