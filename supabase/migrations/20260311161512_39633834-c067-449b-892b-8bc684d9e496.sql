
-- =============================================================
-- MIGRATION: Alinhar PROD com DEV
-- =============================================================

-- 1. DROP da assinatura obsoleta de accept_carga_tx (a que referencia veiculos.motorista_id)
DROP FUNCTION IF EXISTS public.accept_carga_tx(uuid, uuid, uuid, uuid, numeric, numeric, text, uuid, uuid);

-- 2. Atualizar generate_carga_codigo: CRG- → OFR- (compatível com ambos prefixos)
CREATE OR REPLACE FUNCTION public.generate_carga_codigo()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  ano TEXT;
  sequencia INTEGER;
BEGIN
  IF NEW.codigo IS NULL OR NEW.codigo = '' THEN
    ano := EXTRACT(YEAR FROM NOW())::TEXT;
    
    SELECT COALESCE(MAX(
      GREATEST(
        COALESCE(CAST(NULLIF(SUBSTRING(codigo FROM 'OFR-' || ano || '-(\d+)'), '') AS INTEGER), 0),
        COALESCE(CAST(NULLIF(SUBSTRING(codigo FROM 'CRG-' || ano || '-(\d+)'), '') AS INTEGER), 0)
      )
    ), 0) + 1
    INTO sequencia
    FROM public.cargas
    WHERE codigo LIKE 'OFR-' || ano || '-%' OR codigo LIKE 'CRG-' || ano || '-%';
    
    NEW.codigo := 'OFR-' || ano || '-' || LPAD(sequencia::TEXT, 4, '0');
  END IF;
  RETURN NEW;
END;
$function$;

-- 3. Atualizar generate_entrega_codigo: -E → -C
CREATE OR REPLACE FUNCTION public.generate_entrega_codigo()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  carga_codigo TEXT;
  sequencia INTEGER;
BEGIN
  IF NEW.codigo IS NULL OR NEW.codigo = '' THEN
    SELECT codigo INTO carga_codigo FROM public.cargas WHERE id = NEW.carga_id;
    
    IF carga_codigo IS NOT NULL THEN
      SELECT COUNT(*) + 1 INTO sequencia 
      FROM public.entregas 
      WHERE carga_id = NEW.carga_id AND id != NEW.id;
      
      NEW.codigo := carga_codigo || '-C' || LPAD(sequencia::TEXT, 2, '0');
    END IF;
  END IF;
  RETURN NEW;
END;
$function$;

-- 4. Criar generate_tracking_code()
CREATE OR REPLACE FUNCTION public.generate_tracking_code() RETURNS text
    LANGUAGE plpgsql
    AS $$
DECLARE
  chars text[] := '{A,B,C,D,E,F,G,H,J,K,L,M,N,P,Q,R,S,T,U,V,W,X,Y,Z,2,3,4,5,6,7,8,9}';
  result text := '';
  i integer;
BEGIN
  FOR i IN 1..12 LOOP
    result := result || chars[1+floor(random()*(array_length(chars, 1)))::int];
  END LOOP;
  RETURN result;
END;
$$;

-- 5. Criar set_tracking_code() trigger function
CREATE OR REPLACE FUNCTION public.set_tracking_code() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  IF NEW.tracking_code IS NULL THEN
    NEW.tracking_code := public.generate_tracking_code();
  END IF;
  RETURN NEW;
END;
$$;

-- 6. Criar trigger na tabela entregas
DROP TRIGGER IF EXISTS set_tracking_code_trigger ON public.entregas;
CREATE TRIGGER set_tracking_code_trigger 
  BEFORE INSERT ON public.entregas 
  FOR EACH ROW 
  EXECUTE FUNCTION public.set_tracking_code();

-- 7. Criar get_public_tracking_info()
CREATE OR REPLACE FUNCTION public.get_public_tracking_info(_tracking_code text) RETURNS json
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
DECLARE
  v_entrega_id uuid;
  v_nfe_id uuid;
  v_result json;
BEGIN
  SELECT id INTO v_entrega_id
  FROM entregas
  WHERE tracking_code = _tracking_code
  LIMIT 1;

  IF v_entrega_id IS NULL THEN
    RETURN json_build_object(
      'error', 'Rastreio não encontrado. Verifique o código e tente novamente.'
    );
  END IF;

  SELECT id INTO v_nfe_id
  FROM nfes
  WHERE entrega_id = v_entrega_id
  LIMIT 1;

  SELECT json_build_object(
    'nfe', (
      SELECT json_build_object(
        'numero', n.numero,
        'serie', n.serie,
        'emitente', n.remetente_razao_social,
        'destinatario', n.destinatario_razao_social,
        'valor', n.valor_total
      )
      FROM nfes n WHERE n.id = v_nfe_id
    ),
    'entrega', (
      SELECT json_build_object(
        'id', e.id,
        'status', e.status,
        'tracking_code', e.tracking_code,
        'previsao_entrega', c.data_entrega_limite,
        'motorista', (
           SELECT json_build_object(
             'nome', m.nome_completo,
             'foto', m.foto_url
           )
           FROM motoristas m 
           WHERE m.id = e.motorista_id
        ),
        'veiculo', (
           SELECT json_build_object(
             'placa', v.placa,
             'marca', v.marca,
             'modelo', v.modelo,
             'tipo', v.tipo,
             'carroceria', COALESCE(c_ent.tipo, c_veic.tipo, v.carroceria::text),
             'capacidade_kg', CASE 
                 WHEN v.carroceria_integrada THEN v.capacidade_kg 
                 ELSE COALESCE(c_ent.capacidade_kg, c_veic.capacidade_kg, v.capacidade_kg)
             END,
             'capacidade_m3', CASE
                 WHEN v.carroceria_integrada THEN v.capacidade_m3
                 ELSE COALESCE(c_ent.capacidade_m3, c_veic.capacidade_m3, v.capacidade_m3)
             END
           )
           FROM veiculos v 
           LEFT JOIN carrocerias c_ent ON c_ent.id = e.carroceria_id
           LEFT JOIN carrocerias c_veic ON c_veic.id = v.carroceria_id
           WHERE v.id = e.veiculo_id
        ),
        'placa_veiculo', (
           SELECT v.placa 
           FROM veiculos v 
           WHERE v.id = e.veiculo_id
        ),
        'localizacao_atual', (
           SELECT json_build_object(
             'latitude', l.latitude,
             'longitude', l.longitude,
             'updated_at', l.updated_at
           )
           FROM locations l
           WHERE l.motorista_id = e.motorista_id
           ORDER BY l.updated_at DESC
           LIMIT 1
        ),
        'carga', (
           json_build_object(
             'descricao', c.descricao,
             'peso', e.peso_alocado_kg,
             'peso_total_carga', c.peso_kg,
             'volume', c.volume_m3,
             'valor', c.valor_mercadoria,
             'quantidade', c.quantidade
           )
        )
      )
      FROM entregas e 
      LEFT JOIN cargas c ON c.id = e.carga_id
      WHERE e.id = v_entrega_id
    ),
    'eventos', (
      SELECT json_agg(
        json_build_object(
          'id', ev.id,
          'tipo', ev.tipo,
          'descricao', ev.observacao,
          'data', ev.created_at,
          'localizacao', CONCAT(ev.latitude, ', ', ev.longitude)
        ) ORDER BY ev.created_at DESC
      )
      FROM entrega_eventos ev
      WHERE ev.entrega_id = v_entrega_id
    )
  ) INTO v_result;

  RETURN v_result;
END;
$$;

-- 8. Backfill: Migrar códigos existentes CRG- → OFR- nas cargas
UPDATE public.cargas
SET codigo = REPLACE(codigo, 'CRG-', 'OFR-')
WHERE codigo LIKE 'CRG-%';

-- 9. Backfill: Migrar códigos existentes nas entregas: CRG- → OFR- e -E → -C
UPDATE public.entregas
SET codigo = REGEXP_REPLACE(
  REPLACE(codigo, 'CRG-', 'OFR-'),
  '-E(\d+)$',
  '-C\1'
)
WHERE codigo LIKE 'CRG-%' OR codigo ~ '-E\d+$';

-- 10. Backfill: Gerar tracking_code para entregas existentes que não têm
UPDATE public.entregas
SET tracking_code = public.generate_tracking_code()
WHERE tracking_code IS NULL;
