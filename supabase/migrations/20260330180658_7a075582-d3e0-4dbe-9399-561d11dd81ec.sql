
-- 1) Add audio columns to mensagens table
ALTER TABLE public.mensagens 
  ADD COLUMN IF NOT EXISTS audio_url text,
  ADD COLUMN IF NOT EXISTS audio_duracao integer; -- duration in seconds

-- 2) Create storage bucket for audio messages
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('chat-audios', 'chat-audios', true, 10485760, ARRAY['audio/webm', 'audio/ogg', 'audio/mp4', 'audio/mpeg', 'audio/wav'])
ON CONFLICT (id) DO NOTHING;

-- 3) Storage RLS for chat-audios bucket
CREATE POLICY "Authenticated users can upload audio" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'chat-audios');

CREATE POLICY "Anyone can view chat audios" ON storage.objects
  FOR SELECT TO public
  USING (bucket_id = 'chat-audios');

-- 4) Fix criar_financeiro_entrega trigger to use prazo_dias from config
CREATE OR REPLACE FUNCTION public.criar_financeiro_entrega()
  RETURNS trigger
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO 'public'
AS $function$
DECLARE
  v_embarcador_empresa_id INTEGER;
  v_transportadora_empresa_id INTEGER;
  v_motorista_id UUID;
  v_tipo_cadastro TEXT;
  v_comissao_percent NUMERIC;
  v_valor_frete NUMERIC;
  v_valor_comissao NUMERIC;
  v_valor_liquido NUMERIC;
  v_data_vencimento TIMESTAMPTZ;
  v_prazo_dias INTEGER;
BEGIN
  IF NEW.status = 'entregue' AND (OLD.status IS NULL OR OLD.status != 'entregue') THEN
    IF EXISTS (SELECT 1 FROM financeiro_entregas WHERE entrega_id = NEW.id) THEN
      RETURN NEW;
    END IF;

    SELECT c.empresa_id INTO v_embarcador_empresa_id FROM cargas c WHERE c.id = NEW.carga_id;
    SELECT m.empresa_id, m.id, m.tipo_cadastro::text
      INTO v_transportadora_empresa_id, v_motorista_id, v_tipo_cadastro
      FROM motoristas m WHERE m.id = NEW.motorista_id;

    SELECT COALESCE(e.comissao_hubfrete_percent, 0) INTO v_comissao_percent
    FROM empresas e WHERE e.id = v_embarcador_empresa_id;

    -- Read prazo_dias from embarcador's financial config, default to 30
    SELECT COALESCE(ecf.prazo_dias, 30) INTO v_prazo_dias
    FROM empresa_config_financeira ecf
    WHERE ecf.empresa_id = v_embarcador_empresa_id;

    IF v_prazo_dias IS NULL THEN
      v_prazo_dias := 30;
    END IF;

    v_valor_frete := COALESCE(NEW.valor_frete, 0);
    v_valor_comissao := ROUND(v_valor_frete * v_comissao_percent / 100, 2);
    v_valor_liquido := v_valor_frete - v_valor_comissao;

    -- D+X from delivery date using the embarcador's configured prazo
    v_data_vencimento := COALESCE(NEW.entregue_em, NOW()) + (v_prazo_dias || ' days')::interval;

    INSERT INTO financeiro_entregas (
      entrega_id, empresa_transportadora_id, empresa_embarcadora_id,
      valor_frete, valor_comissao, valor_liquido,
      data_vencimento, motorista_id,
      tipo_beneficiario
    ) VALUES (
      NEW.id, v_transportadora_empresa_id, v_embarcador_empresa_id,
      v_valor_frete, v_valor_comissao, v_valor_liquido,
      v_data_vencimento, v_motorista_id,
      CASE WHEN v_tipo_cadastro = 'autonomo' THEN 'autonomo' ELSE 'transportadora' END
    );
  END IF;

  RETURN NEW;
END;
$function$;
