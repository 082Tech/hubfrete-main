
DO $$
DECLARE
  v_empresa_id BIGINT := 9;
  v_filial_id BIGINT := 11;
  v_transp_id BIGINT := 999;
  v_motorista1 UUID := '3f5d6435-296f-4b1f-a9d5-5a911bedb6c9';
  v_motorista2 UUID := 'bab893ec-6efc-4c1a-829a-9e99efc710d6';
  v_motorista3 UUID := '600d7cff-e4c4-40a8-94c3-0788c4239074';
  v_veiculo1 UUID := '3d2203e9-5554-49cb-b837-097809593725';
  v_veiculo2 UUID := '4b3e83c3-3a37-4637-aadb-f77c11cb3e9d';
  v_carroceria1 UUID := 'ac01cb38-bde9-430f-a28b-5a11e1748d62';
  v_origem_id UUID;
  v_destino_id UUID;
  v_carga_id UUID;
  v_entrega_id UUID;
  v_viagem_id UUID;
  i INT;
  v_descricoes TEXT[] := ARRAY[
    'Argamassa Quartzolit AC-III - 50 ton',
    'Rejunte Quartzolit Cinza Platina - 30 ton',
    'Impermeabilizante Quartzolit - 25 ton',
    'Cimento Cola Quartzolit - 40 ton',
    'Massa Niveladora Quartzolit - 35 ton',
    'Argamassa Polimérica Quartzolit - 45 ton',
    'Rejunte Acrílico Quartzolit - 28 ton',
    'Tinta para Piso Quartzolit - 20 ton',
    'Selante Quartzolit Industrial - 32 ton'
  ];
  v_origens JSONB := '[
    {"cep":"06460-040","cidade":"Barueri","estado":"SP","logradouro":"Av. Liberdade","numero":"1701","bairro":"Tamboré","lat":-23.5040,"lng":-46.8400},
    {"cep":"13573-630","cidade":"São Carlos","estado":"SP","logradouro":"Rod. Washington Luís","numero":"Km 230","bairro":"Distrito Industrial","lat":-22.0087,"lng":-47.8909},
    {"cep":"57046-000","cidade":"Maceió","estado":"AL","logradouro":"Av. Fernandes Lima","numero":"500","bairro":"Farol","lat":-9.6498,"lng":-35.7089}
  ]'::jsonb;
  v_destinos JSONB := '[
    {"cep":"57020-510","cidade":"Maceió","estado":"AL","logradouro":"Av. Comendador Gustavo Paiva","numero":"5750","bairro":"Cruz das Almas","lat":-9.6280,"lng":-35.7050},
    {"cep":"50070-000","cidade":"Recife","estado":"PE","logradouro":"Av. Conde da Boa Vista","numero":"800","bairro":"Boa Vista","lat":-8.0631,"lng":-34.8836},
    {"cep":"40070-110","cidade":"Salvador","estado":"BA","logradouro":"Av. Sete de Setembro","numero":"3500","bairro":"Vitória","lat":-12.9931,"lng":-38.5260},
    {"cep":"60160-230","cidade":"Fortaleza","estado":"CE","logradouro":"Av. Beira Mar","numero":"2500","bairro":"Meireles","lat":-3.7227,"lng":-38.4980},
    {"cep":"58030-000","cidade":"João Pessoa","estado":"PB","logradouro":"Av. Epitácio Pessoa","numero":"1200","bairro":"Tambaú","lat":-7.1153,"lng":-34.8641},
    {"cep":"49035-000","cidade":"Aracaju","estado":"SE","logradouro":"Av. Beira Mar","numero":"800","bairro":"13 de Julho","lat":-10.9325,"lng":-37.0468},
    {"cep":"59020-100","cidade":"Natal","estado":"RN","logradouro":"Av. Engenheiro Roberto Freire","numero":"3000","bairro":"Ponta Negra","lat":-5.8765,"lng":-35.1768},
    {"cep":"57305-005","cidade":"Arapiraca","estado":"AL","logradouro":"Av. Ceci Cunha","numero":"500","bairro":"Centro","lat":-9.7517,"lng":-36.6611},
    {"cep":"57200-000","cidade":"Penedo","estado":"AL","logradouro":"Av. Floriano Peixoto","numero":"100","bairro":"Centro","lat":-10.2906,"lng":-36.5867}
  ]'::jsonb;
BEGIN
  FOR i IN 1..9 LOOP
    INSERT INTO enderecos_carga (cep, cidade, estado, logradouro, numero, bairro, latitude, longitude, tipo)
    VALUES (
      v_origens->((i-1) % 3)->>'cep', v_origens->((i-1) % 3)->>'cidade',
      v_origens->((i-1) % 3)->>'estado', v_origens->((i-1) % 3)->>'logradouro',
      v_origens->((i-1) % 3)->>'numero', v_origens->((i-1) % 3)->>'bairro',
      (v_origens->((i-1) % 3)->>'lat')::numeric, (v_origens->((i-1) % 3)->>'lng')::numeric,
      'origem'
    ) RETURNING id INTO v_origem_id;

    INSERT INTO enderecos_carga (cep, cidade, estado, logradouro, numero, bairro, latitude, longitude, tipo)
    VALUES (
      v_destinos->(i-1)->>'cep', v_destinos->(i-1)->>'cidade',
      v_destinos->(i-1)->>'estado', v_destinos->(i-1)->>'logradouro',
      v_destinos->(i-1)->>'numero', v_destinos->(i-1)->>'bairro',
      (v_destinos->(i-1)->>'lat')::numeric, (v_destinos->(i-1)->>'lng')::numeric,
      'destino'
    ) RETURNING id INTO v_destino_id;

    INSERT INTO cargas (
      codigo, descricao, peso_kg, peso_disponivel_kg, tipo, tipo_precificacao,
      valor_frete_tonelada, valor_mercadoria, empresa_id, filial_id,
      endereco_origem_id, endereco_destino_id,
      remetente_razao_social, remetente_cnpj, remetente_nome_fantasia,
      destinatario_razao_social, destinatario_cnpj, destinatario_nome_fantasia,
      data_coleta_de, data_coleta_ate, data_entrega_limite,
      expira_em, publicada_em, status, agendamento_entrega
    ) VALUES (
      NULL, v_descricoes[i],
      30000 + (i * 1500),
      CASE WHEN i <= 3 THEN 30000 + (i * 1500) ELSE 0 END,
      'carga_seca'::tipo_carga, 'por_tonelada'::tipo_precificacao,
      280 + (i * 15), 150000 + (i * 25000),
      v_empresa_id, v_filial_id, v_origem_id, v_destino_id,
      'Saint-Gobain do Brasil Produtos Industriais Ltda', '61064838000150', 'Quartzolit',
      'Construtora Demo ' || i || ' Ltda',
      LPAD((10000000000000 + i * 11)::text, 14, '0'),
      'Construtora Demo ' || i,
      (NOW() - (i || ' days')::interval)::date,
      (NOW() - (i || ' days')::interval + interval '2 days')::date,
      (NOW() + ((10 - i) || ' days')::interval)::date,
      NOW() + interval '30 days',
      NOW() - (i || ' days')::interval,
      CASE WHEN i <= 3 THEN 'publicada'::status_carga ELSE 'totalmente_alocada'::status_carga END,
      false
    ) RETURNING id INTO v_carga_id;

    INSERT INTO carga_eventos (carga_id, tipo, observacao, timestamp, user_nome)
    VALUES (v_carga_id, 'criada', 'Carga publicada por Nayara (Quartzolit)', NOW() - (i || ' days')::interval, 'Nayara');

    CONTINUE WHEN i <= 3;

    INSERT INTO entregas (
      carga_id, motorista_id, veiculo_id, carroceria_id,
      peso_alocado_kg, valor_frete, status,
      previsao_coleta, coletado_em, entregue_em,
      nome_recebedor, documento_recebedor
    ) VALUES (
      v_carga_id,
      CASE WHEN i % 3 = 0 THEN v_motorista1 WHEN i % 3 = 1 THEN v_motorista2 ELSE v_motorista3 END,
      CASE WHEN i % 2 = 0 THEN v_veiculo1 ELSE v_veiculo2 END,
      v_carroceria1,
      30000 + (i * 1500),
      (30000 + (i * 1500)) / 1000.0 * (280 + (i * 15)),
      CASE
        WHEN i = 4 THEN 'em_transito'::status_entrega
        WHEN i = 5 THEN 'saiu_para_entrega'::status_entrega
        WHEN i = 6 THEN 'saiu_para_coleta'::status_entrega
        ELSE 'entregue'::status_entrega
      END,
      NOW() - (i || ' days')::interval + interval '4 hours',
      CASE WHEN i >= 4 AND i <> 6 THEN NOW() - (i || ' days')::interval + interval '6 hours' ELSE NULL END,
      CASE WHEN i >= 7 THEN NOW() - ((i-3) || ' days')::interval ELSE NULL END,
      CASE WHEN i >= 7 THEN 'João Silva (Recebedor)' ELSE NULL END,
      CASE WHEN i >= 7 THEN '123.456.789-00' ELSE NULL END
    ) RETURNING id INTO v_entrega_id;

    INSERT INTO entrega_eventos (entrega_id, tipo, timestamp, observacao, user_nome) VALUES
      (v_entrega_id, 'criado', NOW() - (i || ' days')::interval + interval '1 hour', 'Entrega criada', 'Sistema'),
      (v_entrega_id, 'aceite', NOW() - (i || ' days')::interval + interval '1 hour 1 minute', 'Carga aceita pela Paleteria Alagoana', 'Paleteria Alagoana');

    IF i >= 4 AND i <> 6 THEN
      INSERT INTO entrega_eventos (entrega_id, tipo, timestamp, observacao, user_nome)
      VALUES (v_entrega_id, 'inicio_coleta', NOW() - (i || ' days')::interval + interval '4 hours', 'Motorista iniciou coleta', 'Motorista');
    END IF;
    IF i = 5 OR i >= 7 THEN
      INSERT INTO entrega_eventos (entrega_id, tipo, timestamp, observacao, user_nome)
      VALUES (v_entrega_id, 'inicio_rota', NOW() - (i || ' days')::interval + interval '1 day', 'Saiu para entrega', 'Motorista');
    END IF;
    IF i >= 7 THEN
      INSERT INTO entrega_eventos (entrega_id, tipo, timestamp, observacao, user_nome)
      VALUES (v_entrega_id, 'finalizado', NOW() - ((i-3) || ' days')::interval, 'Entrega concluída com sucesso', 'Motorista');
    END IF;

    INSERT INTO nfes (entrega_id, numero, serie, chave_acesso, valor_total, valor, url, remetente_razao_social, remetente_cnpj, destinatario_razao_social, destinatario_cnpj, peso_bruto, modelo)
    VALUES (
      v_entrega_id, LPAD((1000 + i)::text, 9, '0'), '1',
      LPAD((35200000000000000000 + i)::text, 44, '0'),
      150000 + (i * 25000), 150000 + (i * 25000),
      'https://demo.hubfrete.com/docs/nfe-' || i || '.pdf',
      'Saint-Gobain do Brasil Produtos Industriais Ltda', '61064838000150',
      'Construtora Demo ' || i || ' Ltda',
      LPAD((10000000000000 + i * 11)::text, 14, '0'),
      30000 + (i * 1500), '55'
    );

    INSERT INTO ctes (entrega_id, empresa_id, numero, serie, chave_acesso, valor, url)
    VALUES (
      v_entrega_id, v_transp_id, LPAD((2000 + i)::text, 9, '0'), '1',
      LPAD((57200000000000000000 + i)::text, 44, '0'),
      (30000 + (i * 1500)) / 1000.0 * (280 + (i * 15)),
      'https://demo.hubfrete.com/docs/cte-' || i || '.pdf'
    );

    INSERT INTO viagens (
      codigo, motorista_id, veiculo_id, carroceria_id,
      status, tipo, inicio_em, started_at, ended_at, fim_em,
      km_total, tempo_total_minutos
    ) VALUES (
      'VGM-' || EXTRACT(YEAR FROM NOW())::text || '-' || LPAD((1000 + i)::text, 4, '0'),
      CASE WHEN i % 3 = 0 THEN v_motorista1 WHEN i % 3 = 1 THEN v_motorista2 ELSE v_motorista3 END,
      CASE WHEN i % 2 = 0 THEN v_veiculo1 ELSE v_veiculo2 END,
      v_carroceria1,
      CASE WHEN i >= 7 THEN 'finalizada'::status_viagem ELSE 'em_andamento'::status_viagem END,
      'rodovia'::tipo_viagem,
      NOW() - (i || ' days')::interval + interval '4 hours',
      NOW() - (i || ' days')::interval + interval '4 hours',
      CASE WHEN i >= 7 THEN NOW() - ((i-3) || ' days')::interval ELSE NULL END,
      CASE WHEN i >= 7 THEN NOW() - ((i-3) || ' days')::interval ELSE NULL END,
      800 + (i * 50), 720 + (i * 30)
    ) RETURNING id INTO v_viagem_id;

    INSERT INTO viagem_entregas (viagem_id, entrega_id, ordem) VALUES (v_viagem_id, v_entrega_id, 1);

    INSERT INTO mdfes (viagem_id, empresa_id, numero, serie, chave_acesso, status, autorizado_at)
    VALUES (
      v_viagem_id, v_transp_id, LPAD((3000 + i)::text, 9, '0'), '1',
      LPAD((58200000000000000000 + i)::text, 44, '0'),
      'autorizado',
      NOW() - (i || ' days')::interval + interval '5 hours'
    );

    DECLARE
      lat_o NUMERIC := (v_origens->((i-1) % 3)->>'lat')::numeric;
      lng_o NUMERIC := (v_origens->((i-1) % 3)->>'lng')::numeric;
      lat_d NUMERIC := (v_destinos->(i-1)->>'lat')::numeric;
      lng_d NUMERIC := (v_destinos->(i-1)->>'lng')::numeric;
      max_pts INT := CASE WHEN i >= 7 THEN 10 WHEN i = 4 THEN 4 WHEN i = 5 THEN 8 ELSE 2 END;
      j INT;
      frac NUMERIC;
    BEGIN
      FOR j IN 0..max_pts LOOP
        frac := j::numeric / max_pts::numeric;
        INSERT INTO tracking_historico (viagem_id, latitude, longitude, speed, heading, accuracy, tracked_at, motivo_coleta, gps_quality)
        VALUES (
          v_viagem_id,
          lat_o + (lat_d - lat_o) * frac + (random() - 0.5) * 0.01,
          lng_o + (lng_d - lng_o) * frac + (random() - 0.5) * 0.01,
          60 + random() * 30, 90 + random() * 20, 5 + random() * 3,
          NOW() - (i || ' days')::interval + interval '6 hours' + (j * interval '1 hour'),
          'LOCATION_UPDATE', 4
        );
      END LOOP;
    END;
  END LOOP;
END $$;
