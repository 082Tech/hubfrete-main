-- 1) Desativar o trigger que roda após criar usuário (para não bloquear o Auth)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- 2) Corrigir FKs que impedem deletar auth.users (campos de auditoria devem virar NULL)
-- carrocerias.created_by / updated_by
ALTER TABLE public.carrocerias DROP CONSTRAINT IF EXISTS carrocerias_created_by_fkey;
ALTER TABLE public.carrocerias
  ADD CONSTRAINT carrocerias_created_by_fkey
  FOREIGN KEY (created_by)
  REFERENCES auth.users(id)
  ON DELETE SET NULL;

ALTER TABLE public.carrocerias DROP CONSTRAINT IF EXISTS carrocerias_updated_by_fkey;
ALTER TABLE public.carrocerias
  ADD CONSTRAINT carrocerias_updated_by_fkey
  FOREIGN KEY (updated_by)
  REFERENCES auth.users(id)
  ON DELETE SET NULL;

-- entregas.created_by / updated_by
ALTER TABLE public.entregas DROP CONSTRAINT IF EXISTS entregas_created_by_fkey;
ALTER TABLE public.entregas
  ADD CONSTRAINT entregas_created_by_fkey
  FOREIGN KEY (created_by)
  REFERENCES auth.users(id)
  ON DELETE SET NULL;

ALTER TABLE public.entregas DROP CONSTRAINT IF EXISTS entregas_updated_by_fkey;
ALTER TABLE public.entregas
  ADD CONSTRAINT entregas_updated_by_fkey
  FOREIGN KEY (updated_by)
  REFERENCES auth.users(id)
  ON DELETE SET NULL;

-- veiculos.created_by / updated_by
ALTER TABLE public.veiculos DROP CONSTRAINT IF EXISTS veiculos_created_by_fkey;
ALTER TABLE public.veiculos
  ADD CONSTRAINT veiculos_created_by_fkey
  FOREIGN KEY (created_by)
  REFERENCES auth.users(id)
  ON DELETE SET NULL;

ALTER TABLE public.veiculos DROP CONSTRAINT IF EXISTS veiculos_updated_by_fkey;
ALTER TABLE public.veiculos
  ADD CONSTRAINT veiculos_updated_by_fkey
  FOREIGN KEY (updated_by)
  REFERENCES auth.users(id)
  ON DELETE SET NULL;

-- pre_cadastros.analisado_por
ALTER TABLE public.pre_cadastros DROP CONSTRAINT IF EXISTS pre_cadastros_analisado_por_fkey;
ALTER TABLE public.pre_cadastros
  ADD CONSTRAINT pre_cadastros_analisado_por_fkey
  FOREIGN KEY (analisado_por)
  REFERENCES auth.users(id)
  ON DELETE SET NULL;
