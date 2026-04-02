-- 1. Remove CHECK constraints on both tables
ALTER TABLE public.cargos_config DROP CONSTRAINT IF EXISTS cargos_config_escopo_check;
ALTER TABLE public.cargo_permissoes DROP CONSTRAINT IF EXISTS cargo_permissoes_escopo_check;

-- 2. Insert new cargos for embarcador
INSERT INTO public.cargos_config (escopo, nome, descricao, editavel)
VALUES
  ('embarcador', 'ADMIN', 'Administrador da empresa embarcadora. Acesso total às funcionalidades da empresa.', false),
  ('embarcador', 'OPERADOR', 'Operador da empresa embarcadora. Acesso operacional limitado conforme permissões configuradas.', false);

-- 3. Insert new cargos for transportadora
INSERT INTO public.cargos_config (escopo, nome, descricao, editavel)
VALUES
  ('transportadora', 'ADMIN', 'Administrador da empresa transportadora. Acesso total às funcionalidades da empresa.', false),
  ('transportadora', 'OPERADOR', 'Operador da empresa transportadora. Acesso operacional limitado conforme permissões configuradas.', false);

-- 4. Duplicate permissions from 'sistema' to 'embarcador'
INSERT INTO public.cargo_permissoes (escopo, cargo, permissao, permitido)
SELECT 'embarcador', cargo, permissao, permitido
FROM public.cargo_permissoes
WHERE escopo = 'sistema';

-- 5. Duplicate permissions from 'sistema' to 'transportadora'
INSERT INTO public.cargo_permissoes (escopo, cargo, permissao, permitido)
SELECT 'transportadora', cargo, permissao, permitido
FROM public.cargo_permissoes
WHERE escopo = 'sistema';

-- 6. Remove old 'sistema' data
DELETE FROM public.cargo_permissoes WHERE escopo = 'sistema';
DELETE FROM public.cargos_config WHERE escopo = 'sistema';

-- 7. Add new CHECK constraints
ALTER TABLE public.cargos_config ADD CONSTRAINT cargos_config_escopo_check 
  CHECK (escopo IN ('torre', 'embarcador', 'transportadora'));
ALTER TABLE public.cargo_permissoes ADD CONSTRAINT cargo_permissoes_escopo_check 
  CHECK (escopo IN ('torre', 'embarcador', 'transportadora'));