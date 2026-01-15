-- Update cargas with vehicle requirements and special needs for testing
UPDATE cargas SET 
  veiculo_requisitos = '{"tipos_veiculo": ["truck", "carreta"], "tipos_carroceria": ["fechada_bau", "sider"]}'::jsonb,
  necessidades_especiais = ARRAY['Lona', 'Amarração'],
  carga_fragil = true
WHERE id = 'a2912f8f-e841-4d2e-b01c-69e4ddc853c9';

UPDATE cargas SET 
  veiculo_requisitos = '{"tipos_veiculo": ["bitrem", "rodotrem"], "tipos_carroceria": ["graneleira", "cacamba"]}'::jsonb,
  necessidades_especiais = ARRAY['Balança no local'],
  carga_perigosa = false,
  requer_refrigeracao = false
WHERE id = '22222222-0001-0001-0001-000000000001';

UPDATE cargas SET 
  veiculo_requisitos = '{"tipos_veiculo": ["carreta", "truck"], "tipos_carroceria": ["frigorifico", "bau_refrigerado"]}'::jsonb,
  necessidades_especiais = ARRAY['Termógrafo', 'Monitoramento de temperatura'],
  requer_refrigeracao = true,
  temperatura_min = -18,
  temperatura_max = -12
WHERE id = '22222222-0002-0002-0002-000000000001';

UPDATE cargas SET 
  veiculo_requisitos = '{"tipos_veiculo": ["vuc", "toco"], "tipos_carroceria": ["bau", "fechada_bau"]}'::jsonb,
  necessidades_especiais = ARRAY['Empilhadeira no destino'],
  empilhavel = true
WHERE id = '22222222-0003-0003-0003-000000000001';

UPDATE cargas SET 
  veiculo_requisitos = '{"tipos_veiculo": ["carreta"], "tipos_carroceria": ["tanque"]}'::jsonb,
  necessidades_especiais = ARRAY['FISPQ', 'EPI obrigatório', 'Licença IBAMA'],
  carga_perigosa = true,
  numero_onu = '1203'
WHERE id = 'c1000001-0000-0000-0000-000000000001';

-- Delete duplicate active deliveries, keeping only the oldest one per driver
DELETE FROM entregas 
WHERE id IN (
  SELECT id FROM (
    SELECT id, 
           ROW_NUMBER() OVER (PARTITION BY motorista_id ORDER BY created_at ASC) as rn
    FROM entregas 
    WHERE status NOT IN ('entregue', 'devolvida')
      AND motorista_id IS NOT NULL
  ) ranked
  WHERE rn > 1
);