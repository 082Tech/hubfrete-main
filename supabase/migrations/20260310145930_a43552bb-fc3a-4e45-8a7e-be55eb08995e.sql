
-- Enum para tipo de fatura
CREATE TYPE public.tipo_fatura AS ENUM ('a_receber', 'a_pagar');

-- Enum para status de fatura
CREATE TYPE public.status_fatura AS ENUM ('aberta', 'fechada', 'paga', 'cancelada');

-- Tabela de faturas (quinzenas persistidas)
CREATE TABLE public.faturas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id integer NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  tipo tipo_fatura NOT NULL,
  quinzena smallint NOT NULL,
  mes smallint NOT NULL,
  ano smallint NOT NULL,
  periodo_inicio date NOT NULL,
  periodo_fim date NOT NULL,
  valor_bruto numeric NOT NULL DEFAULT 0,
  valor_comissao numeric NOT NULL DEFAULT 0,
  valor_liquido numeric NOT NULL DEFAULT 0,
  qtd_entregas integer NOT NULL DEFAULT 0,
  status status_fatura NOT NULL DEFAULT 'aberta',
  data_pagamento date,
  metodo_pagamento text,
  comprovante_url text,
  observacoes text,
  baixa_por uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (empresa_id, tipo, ano, mes, quinzena)
);

-- Validação via trigger (quinzena 1 ou 2, mes 1-12)
CREATE OR REPLACE FUNCTION public.validar_fatura()
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

CREATE TRIGGER trg_validar_fatura
BEFORE INSERT OR UPDATE ON public.faturas
FOR EACH ROW EXECUTE FUNCTION public.validar_fatura();

-- Adicionar referências de fatura na financeiro_entregas
ALTER TABLE public.financeiro_entregas
  ADD COLUMN fatura_embarcador_id uuid REFERENCES public.faturas(id),
  ADD COLUMN fatura_transportadora_id uuid REFERENCES public.faturas(id);

-- Função para auto-vincular financeiro_entregas a faturas
CREATE OR REPLACE FUNCTION public.vincular_fatura_automatica()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE
  v_data date;
  v_quinzena smallint;
  v_mes smallint;
  v_ano smallint;
  v_periodo_inicio date;
  v_periodo_fim date;
  v_fatura_emb_id uuid;
  v_fatura_trans_id uuid;
  v_last_day integer;
BEGIN
  v_data := COALESCE(NEW.data_pagamento, NEW.created_at::date);
  v_mes := EXTRACT(MONTH FROM v_data)::smallint;
  v_ano := EXTRACT(YEAR FROM v_data)::smallint;
  
  IF EXTRACT(DAY FROM v_data) <= 15 THEN
    v_quinzena := 1;
    v_periodo_inicio := make_date(v_ano, v_mes, 1);
    v_periodo_fim := make_date(v_ano, v_mes, 15);
  ELSE
    v_quinzena := 2;
    v_periodo_inicio := make_date(v_ano, v_mes, 16);
    v_last_day := EXTRACT(DAY FROM (make_date(v_ano, v_mes, 1) + INTERVAL '1 month' - INTERVAL '1 day'))::integer;
    v_periodo_fim := make_date(v_ano, v_mes, v_last_day);
  END IF;

  -- Fatura do embarcador (a_receber)
  IF NEW.empresa_embarcadora_id IS NOT NULL THEN
    INSERT INTO faturas (empresa_id, tipo, quinzena, mes, ano, periodo_inicio, periodo_fim)
    VALUES (NEW.empresa_embarcadora_id, 'a_receber', v_quinzena, v_mes, v_ano, v_periodo_inicio, v_periodo_fim)
    ON CONFLICT (empresa_id, tipo, ano, mes, quinzena) DO NOTHING;

    SELECT id INTO v_fatura_emb_id FROM faturas
    WHERE empresa_id = NEW.empresa_embarcadora_id AND tipo = 'a_receber'
      AND ano = v_ano AND mes = v_mes AND quinzena = v_quinzena;

    NEW.fatura_embarcador_id := v_fatura_emb_id;
  END IF;

  -- Fatura da transportadora (a_pagar)
  IF NEW.empresa_transportadora_id IS NOT NULL THEN
    INSERT INTO faturas (empresa_id, tipo, quinzena, mes, ano, periodo_inicio, periodo_fim)
    VALUES (NEW.empresa_transportadora_id, 'a_pagar', v_quinzena, v_mes, v_ano, v_periodo_inicio, v_periodo_fim)
    ON CONFLICT (empresa_id, tipo, ano, mes, quinzena) DO NOTHING;

    SELECT id INTO v_fatura_trans_id FROM faturas
    WHERE empresa_id = NEW.empresa_transportadora_id AND tipo = 'a_pagar'
      AND ano = v_ano AND mes = v_mes AND quinzena = v_quinzena;

    NEW.fatura_transportadora_id := v_fatura_trans_id;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_vincular_fatura
BEFORE INSERT ON public.financeiro_entregas
FOR EACH ROW EXECUTE FUNCTION public.vincular_fatura_automatica();

-- Função para recalcular totais da fatura
CREATE OR REPLACE FUNCTION public.recalcular_fatura()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  -- Recalcular fatura do embarcador
  IF NEW.fatura_embarcador_id IS NOT NULL THEN
    UPDATE faturas SET
      valor_bruto = sub.total_bruto,
      valor_comissao = sub.total_comissao,
      valor_liquido = sub.total_liquido,
      qtd_entregas = sub.qtd,
      updated_at = now()
    FROM (
      SELECT 
        COALESCE(SUM(valor_frete), 0) as total_bruto,
        COALESCE(SUM(valor_comissao), 0) as total_comissao,
        COALESCE(SUM(valor_liquido), 0) as total_liquido,
        COUNT(*) as qtd
      FROM financeiro_entregas
      WHERE fatura_embarcador_id = NEW.fatura_embarcador_id
    ) sub
    WHERE id = NEW.fatura_embarcador_id;
  END IF;

  -- Recalcular fatura da transportadora
  IF NEW.fatura_transportadora_id IS NOT NULL THEN
    UPDATE faturas SET
      valor_bruto = sub.total_bruto,
      valor_comissao = sub.total_comissao,
      valor_liquido = sub.total_liquido,
      qtd_entregas = sub.qtd,
      updated_at = now()
    FROM (
      SELECT 
        COALESCE(SUM(valor_frete), 0) as total_bruto,
        COALESCE(SUM(valor_comissao), 0) as total_comissao,
        COALESCE(SUM(valor_liquido), 0) as total_liquido,
        COUNT(*) as qtd
      FROM financeiro_entregas
      WHERE fatura_transportadora_id = NEW.fatura_transportadora_id
    ) sub
    WHERE id = NEW.fatura_transportadora_id;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_recalcular_fatura
AFTER INSERT OR UPDATE ON public.financeiro_entregas
FOR EACH ROW EXECUTE FUNCTION public.recalcular_fatura();

-- RLS
ALTER TABLE public.faturas ENABLE ROW LEVEL SECURITY;

-- Admin pode tudo
CREATE POLICY "admin_full_access" ON public.faturas
FOR ALL TO authenticated
USING (public.is_admin(auth.uid()));

-- Empresa pode ver suas próprias faturas
CREATE POLICY "empresa_view_own" ON public.faturas
FOR SELECT TO authenticated
USING (public.user_belongs_to_empresa(auth.uid(), empresa_id::bigint));

-- Updated_at trigger
CREATE TRIGGER trg_faturas_updated_at
BEFORE UPDATE ON public.faturas
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- Índices
CREATE INDEX idx_faturas_empresa_periodo ON public.faturas (empresa_id, ano, mes);
CREATE INDEX idx_faturas_tipo_status ON public.faturas (tipo, status);
CREATE INDEX idx_financeiro_entregas_fatura_emb ON public.financeiro_entregas (fatura_embarcador_id);
CREATE INDEX idx_financeiro_entregas_fatura_trans ON public.financeiro_entregas (fatura_transportadora_id);
