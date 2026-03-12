
CREATE TABLE public.faturas_motoristas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  motorista_id uuid NOT NULL REFERENCES public.motoristas(id) ON DELETE CASCADE,
  tipo text NOT NULL DEFAULT 'a_pagar',
  quinzena smallint NOT NULL,
  mes smallint NOT NULL,
  ano smallint NOT NULL,
  periodo_inicio date NOT NULL,
  periodo_fim date NOT NULL,
  valor_bruto numeric NOT NULL DEFAULT 0,
  valor_comissao numeric NOT NULL DEFAULT 0,
  valor_liquido numeric NOT NULL DEFAULT 0,
  qtd_entregas integer NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'aberta',
  data_pagamento date,
  metodo_pagamento text,
  comprovante_url text,
  observacoes text,
  baixa_por uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (motorista_id, ano, mes, quinzena)
);

ALTER TABLE public.faturas_motoristas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin_full_access" ON public.faturas_motoristas
  FOR ALL TO authenticated
  USING (is_admin(auth.uid()));

CREATE TRIGGER update_faturas_motoristas_updated_at
  BEFORE UPDATE ON public.faturas_motoristas
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE OR REPLACE FUNCTION public.validar_fatura_motorista()
  RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.quinzena NOT IN (1, 2) THEN
    RAISE EXCEPTION 'quinzena deve ser 1 ou 2';
  END IF;
  IF NEW.mes < 1 OR NEW.mes > 12 THEN
    RAISE EXCEPTION 'mes deve estar entre 1 e 12';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER validar_fatura_motorista_trigger
  BEFORE INSERT OR UPDATE ON public.faturas_motoristas
  FOR EACH ROW EXECUTE FUNCTION validar_fatura_motorista();
