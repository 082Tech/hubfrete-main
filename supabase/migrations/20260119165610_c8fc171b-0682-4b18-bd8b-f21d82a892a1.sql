
-- Criar 3 entregas em trânsito

-- Entrega 1: Equipamentos industriais (5500kg -> pega 3000kg)
INSERT INTO entregas (id, carga_id, motorista_id, veiculo_id, status, peso_alocado_kg, valor_frete, coletado_em)
VALUES (
  'd0000001-0000-0000-0000-000000000001',
  '8e6cd85b-41ce-45f9-b367-1eed2bfaa3ec',
  'e0000001-0000-0000-0000-000000000001',
  'f0000001-0000-0000-0000-000000000001',
  'em_transito',
  3000,
  4500.00,
  NOW() - INTERVAL '2 hours'
);

-- Entrega 2: Minério de Cobre (25000kg -> pega 12000kg)
INSERT INTO entregas (id, carga_id, motorista_id, veiculo_id, status, peso_alocado_kg, valor_frete, coletado_em)
VALUES (
  'd0000001-0000-0000-0000-000000000002',
  'b0000001-0000-0000-0000-000000000001',
  'e0000001-0000-0000-0000-000000000002',
  'f0000001-0000-0000-0000-000000000002',
  'em_transito',
  12000,
  18000.00,
  NOW() - INTERVAL '5 hours'
);

-- Entrega 3: Eletrônicos (1500kg -> pega 800kg)
INSERT INTO entregas (id, carga_id, motorista_id, veiculo_id, status, peso_alocado_kg, valor_frete, coletado_em)
VALUES (
  'd0000001-0000-0000-0000-000000000003',
  'a2912f8f-e841-4d2e-b01c-69e4ddc853c9',
  'e0000001-0000-0000-0000-000000000003',
  'f0000001-0000-0000-0000-000000000003',
  'em_transito',
  800,
  1200.00,
  NOW() - INTERVAL '1 hour'
);

-- Atualizar peso disponível e status das cargas
UPDATE cargas SET peso_disponivel_kg = 2500, status = 'parcialmente_alocada' WHERE id = '8e6cd85b-41ce-45f9-b367-1eed2bfaa3ec';
UPDATE cargas SET peso_disponivel_kg = 13000, status = 'parcialmente_alocada' WHERE id = 'b0000001-0000-0000-0000-000000000001';
UPDATE cargas SET peso_disponivel_kg = 700, status = 'parcialmente_alocada' WHERE id = 'a2912f8f-e841-4d2e-b01c-69e4ddc853c9';
