-- Bloco 5: Atualizar trigger criar_financeiro_entrega (D+30 individual)
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

    v_valor_frete := COALESCE(NEW.valor_frete, 0);
    v_valor_comissao := ROUND(v_valor_frete * v_comissao_percent / 100, 2);
    v_valor_liquido := v_valor_frete - v_valor_comissao;

    v_data_vencimento := COALESCE(NEW.entregue_em, NOW()) + INTERVAL '30 days';

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

-- Bloco 7: Função get_public_tracking_info (versão final com origem/destino)
CREATE OR REPLACE FUNCTION public.get_public_tracking_info(_tracking_code text)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
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
           LEFT JOIN carrocerias c_veic ON c_veic.id = v.carroceria_id_2
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
        ),
        'origem', (
           SELECT json_build_object(
             'latitude', eo.latitude,
             'longitude', eo.longitude,
             'cidade', eo.cidade,
             'estado', eo.estado
           )
           FROM enderecos_carga eo
           WHERE eo.id = c.endereco_origem_id
        ),
        'destino', (
           SELECT json_build_object(
             'latitude', ed.latitude,
             'longitude', ed.longitude,
             'cidade', ed.cidade,
             'estado', ed.estado
           )
           FROM enderecos_carga ed
           WHERE ed.id = c.endereco_destino_id
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
$function$;