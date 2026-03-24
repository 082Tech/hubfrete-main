
ALTER TABLE public.empresas 
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'ativa';

ALTER TYPE public.classe_empresa ADD VALUE IF NOT EXISTS 'TRANSPORTADORA';

ALTER TABLE public.pre_cadastros
  ADD COLUMN IF NOT EXISTS razao_social text,
  ADD COLUMN IF NOT EXISTS nome_fantasia text,
  ADD COLUMN IF NOT EXISTS inscricao_estadual text,
  ADD COLUMN IF NOT EXISTS cidade text,
  ADD COLUMN IF NOT EXISTS estado text,
  ADD COLUMN IF NOT EXISTS endereco text,
  ADD COLUMN IF NOT EXISTS cep text,
  ADD COLUMN IF NOT EXISTS auth_user_id uuid REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS empresa_id bigint REFERENCES public.empresas(id);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'pre_cadastros' 
    AND policyname = 'Allow anonymous insert pre_cadastros'
  ) THEN
    CREATE POLICY "Allow anonymous insert pre_cadastros"
    ON public.pre_cadastros
    FOR INSERT
    TO anon, authenticated
    WITH CHECK (true);
  END IF;
END$$;
