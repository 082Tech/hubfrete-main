
-- =========================================
-- Tabela: antt_pisos
-- =========================================
CREATE TABLE public.antt_pisos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  categoria_carga text NOT NULL,
  numero_eixos integer NOT NULL,
  valor_por_km numeric(10,4) NOT NULL,
  valor_por_km_carga_lotacao numeric(10,4),
  vigente_desde date NOT NULL DEFAULT CURRENT_DATE,
  ativo boolean NOT NULL DEFAULT true,
  observacao text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT antt_pisos_categoria_check CHECK (categoria_carga IN (
    'geral','granel_solido','granel_liquido','frigorificada',
    'perigosa','neogranel','florestal','conteinerizada'
  )),
  CONSTRAINT antt_pisos_eixos_check CHECK (numero_eixos BETWEEN 2 AND 9),
  CONSTRAINT antt_pisos_unique UNIQUE (categoria_carga, numero_eixos, vigente_desde)
);

CREATE INDEX idx_antt_pisos_lookup ON public.antt_pisos (categoria_carga, numero_eixos, ativo, vigente_desde DESC);

ALTER TABLE public.antt_pisos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "antt_pisos_select_authenticated"
  ON public.antt_pisos FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "antt_pisos_admin_insert"
  ON public.antt_pisos FOR INSERT
  TO authenticated
  WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "antt_pisos_admin_update"
  ON public.antt_pisos FOR UPDATE
  TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "antt_pisos_admin_delete"
  ON public.antt_pisos FOR DELETE
  TO authenticated
  USING (public.is_admin(auth.uid()));

CREATE TRIGGER trg_antt_pisos_updated_at
  BEFORE UPDATE ON public.antt_pisos
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- =========================================
-- Tabela: carga_precos_eixo
-- =========================================
CREATE TABLE public.carga_precos_eixo (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  carga_id uuid NOT NULL REFERENCES public.cargas(id) ON DELETE CASCADE,
  numero_eixos integer NOT NULL,
  valor_por_tonelada numeric(12,2) NOT NULL,
  piso_antt_calculado numeric(12,2) NOT NULL,
  distancia_km numeric(10,2),
  categoria_antt text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT carga_precos_eixo_unique UNIQUE (carga_id, numero_eixos),
  CONSTRAINT carga_precos_eixo_eixos_check CHECK (numero_eixos BETWEEN 2 AND 9)
);

CREATE INDEX idx_carga_precos_eixo_carga ON public.carga_precos_eixo (carga_id);

ALTER TABLE public.carga_precos_eixo ENABLE ROW LEVEL SECURITY;

CREATE POLICY "carga_precos_eixo_all_authenticated"
  ON public.carga_precos_eixo FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE TRIGGER trg_carga_precos_eixo_updated_at
  BEFORE UPDATE ON public.carga_precos_eixo
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- =========================================
-- Trigger de validação: bloquear preço abaixo do piso ANTT
-- =========================================
CREATE OR REPLACE FUNCTION public.fn_validar_piso_antt()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_peso_kg numeric;
  v_peso_ton numeric;
  v_frete_total numeric;
BEGIN
  SELECT peso_kg INTO v_peso_kg FROM public.cargas WHERE id = NEW.carga_id;

  IF v_peso_kg IS NULL OR v_peso_kg <= 0 THEN
    RETURN NEW;
  END IF;

  v_peso_ton := v_peso_kg / 1000.0;
  v_frete_total := NEW.valor_por_tonelada * v_peso_ton;

  IF v_frete_total < NEW.piso_antt_calculado THEN
    RAISE EXCEPTION 'Valor por tonelada (R$ %) resulta em frete total R$ % abaixo do piso ANTT R$ % para % eixos',
      NEW.valor_por_tonelada, v_frete_total, NEW.piso_antt_calculado, NEW.numero_eixos
      USING ERRCODE = 'check_violation';
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_validar_piso_antt
  BEFORE INSERT OR UPDATE ON public.carga_precos_eixo
  FOR EACH ROW
  EXECUTE FUNCTION public.fn_validar_piso_antt();

-- =========================================
-- Seed ANTT — Resolução vigente (carga geral, lotação CCD) — valores aproximados R$/km
-- Referência: Tabela A da Resolução ANTT (atualizar com valores oficiais conforme publicação)
-- =========================================
INSERT INTO public.antt_pisos (categoria_carga, numero_eixos, valor_por_km, valor_por_km_carga_lotacao, observacao) VALUES
  ('geral', 2, 4.4356, 1.0142, 'Carga Geral - 2 eixos (Tabela A ANTT)'),
  ('geral', 3, 5.4633, 1.4218, 'Carga Geral - 3 eixos (Tabela A ANTT)'),
  ('geral', 4, 6.4910, 1.8294, 'Carga Geral - 4 eixos (Tabela A ANTT)'),
  ('geral', 5, 7.5187, 2.2370, 'Carga Geral - 5 eixos (Tabela A ANTT)'),
  ('geral', 6, 8.5464, 2.6446, 'Carga Geral - 6 eixos (Tabela A ANTT)'),
  ('geral', 7, 9.5741, 3.0522, 'Carga Geral - 7 eixos (Tabela A ANTT)'),
  ('geral', 9, 11.6295, 3.8674, 'Carga Geral - 9 eixos (Tabela A ANTT)');

INSERT INTO public.antt_pisos (categoria_carga, numero_eixos, valor_por_km, valor_por_km_carga_lotacao, observacao) VALUES
  ('granel_solido', 2, 4.5811, 1.0142, 'Granel Sólido - 2 eixos'),
  ('granel_solido', 3, 5.6088, 1.4218, 'Granel Sólido - 3 eixos'),
  ('granel_solido', 4, 6.6365, 1.8294, 'Granel Sólido - 4 eixos'),
  ('granel_solido', 5, 7.6642, 2.2370, 'Granel Sólido - 5 eixos'),
  ('granel_solido', 6, 8.6919, 2.6446, 'Granel Sólido - 6 eixos'),
  ('granel_solido', 7, 9.7196, 3.0522, 'Granel Sólido - 7 eixos'),
  ('granel_solido', 9, 11.7750, 3.8674, 'Granel Sólido - 9 eixos');

INSERT INTO public.antt_pisos (categoria_carga, numero_eixos, valor_por_km, valor_por_km_carga_lotacao, observacao) VALUES
  ('granel_liquido', 2, 4.7234, 1.0142, 'Granel Líquido - 2 eixos'),
  ('granel_liquido', 3, 5.7511, 1.4218, 'Granel Líquido - 3 eixos'),
  ('granel_liquido', 4, 6.7788, 1.8294, 'Granel Líquido - 4 eixos'),
  ('granel_liquido', 5, 7.8065, 2.2370, 'Granel Líquido - 5 eixos'),
  ('granel_liquido', 6, 8.8342, 2.6446, 'Granel Líquido - 6 eixos'),
  ('granel_liquido', 7, 9.8619, 3.0522, 'Granel Líquido - 7 eixos'),
  ('granel_liquido', 9, 11.9173, 3.8674, 'Granel Líquido - 9 eixos');

INSERT INTO public.antt_pisos (categoria_carga, numero_eixos, valor_por_km, valor_por_km_carga_lotacao, observacao) VALUES
  ('frigorificada', 2, 5.2890, 1.0142, 'Frigorificada - 2 eixos'),
  ('frigorificada', 3, 6.3167, 1.4218, 'Frigorificada - 3 eixos'),
  ('frigorificada', 4, 7.3444, 1.8294, 'Frigorificada - 4 eixos'),
  ('frigorificada', 5, 8.3721, 2.2370, 'Frigorificada - 5 eixos'),
  ('frigorificada', 6, 9.3998, 2.6446, 'Frigorificada - 6 eixos'),
  ('frigorificada', 7, 10.4275, 3.0522, 'Frigorificada - 7 eixos'),
  ('frigorificada', 9, 12.4829, 3.8674, 'Frigorificada - 9 eixos');

INSERT INTO public.antt_pisos (categoria_carga, numero_eixos, valor_por_km, valor_por_km_carga_lotacao, observacao) VALUES
  ('perigosa', 2, 5.4123, 1.0142, 'Perigosa - 2 eixos'),
  ('perigosa', 3, 6.4400, 1.4218, 'Perigosa - 3 eixos'),
  ('perigosa', 4, 7.4677, 1.8294, 'Perigosa - 4 eixos'),
  ('perigosa', 5, 8.4954, 2.2370, 'Perigosa - 5 eixos'),
  ('perigosa', 6, 9.5231, 2.6446, 'Perigosa - 6 eixos'),
  ('perigosa', 7, 10.5508, 3.0522, 'Perigosa - 7 eixos'),
  ('perigosa', 9, 12.6062, 3.8674, 'Perigosa - 9 eixos');

INSERT INTO public.antt_pisos (categoria_carga, numero_eixos, valor_por_km, valor_por_km_carga_lotacao, observacao) VALUES
  ('neogranel', 2, 4.4815, 1.0142, 'Neogranel - 2 eixos'),
  ('neogranel', 3, 5.5092, 1.4218, 'Neogranel - 3 eixos'),
  ('neogranel', 4, 6.5369, 1.8294, 'Neogranel - 4 eixos'),
  ('neogranel', 5, 7.5646, 2.2370, 'Neogranel - 5 eixos'),
  ('neogranel', 6, 8.5923, 2.6446, 'Neogranel - 6 eixos'),
  ('neogranel', 7, 9.6200, 3.0522, 'Neogranel - 7 eixos'),
  ('neogranel', 9, 11.6754, 3.8674, 'Neogranel - 9 eixos');

INSERT INTO public.antt_pisos (categoria_carga, numero_eixos, valor_por_km, valor_por_km_carga_lotacao, observacao) VALUES
  ('florestal', 2, 4.5210, 1.0142, 'Florestal - 2 eixos'),
  ('florestal', 3, 5.5487, 1.4218, 'Florestal - 3 eixos'),
  ('florestal', 4, 6.5764, 1.8294, 'Florestal - 4 eixos'),
  ('florestal', 5, 7.6041, 2.2370, 'Florestal - 5 eixos'),
  ('florestal', 6, 8.6318, 2.6446, 'Florestal - 6 eixos'),
  ('florestal', 7, 9.6595, 3.0522, 'Florestal - 7 eixos'),
  ('florestal', 9, 11.7149, 3.8674, 'Florestal - 9 eixos');

INSERT INTO public.antt_pisos (categoria_carga, numero_eixos, valor_por_km, valor_por_km_carga_lotacao, observacao) VALUES
  ('conteinerizada', 2, 4.4356, 1.0142, 'Conteinerizada - 2 eixos'),
  ('conteinerizada', 3, 5.4633, 1.4218, 'Conteinerizada - 3 eixos'),
  ('conteinerizada', 4, 6.4910, 1.8294, 'Conteinerizada - 4 eixos'),
  ('conteinerizada', 5, 7.5187, 2.2370, 'Conteinerizada - 5 eixos'),
  ('conteinerizada', 6, 8.5464, 2.6446, 'Conteinerizada - 6 eixos'),
  ('conteinerizada', 7, 9.5741, 3.0522, 'Conteinerizada - 7 eixos'),
  ('conteinerizada', 9, 11.6295, 3.8674, 'Conteinerizada - 9 eixos');
