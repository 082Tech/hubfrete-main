-- Criar veículo para o Gesse da Silva
INSERT INTO veiculos (id, placa, tipo, carroceria, marca, modelo, ano, capacidade_kg, capacidade_m3, empresa_id, motorista_id, ativo)
VALUES (
  'f0000001-0000-0000-0000-000000000004',
  'GHI-3456',
  'bitrem',
  'graneleira',
  'Scania',
  'R450',
  2022,
  57000,
  90,
  999,
  '600d7cff-e4c4-40a8-94c3-0788c4239074',
  true
);

-- Criar 4 carrocerias, uma para cada veículo
-- Carroceria 1: para veículo ABC-1234 (Vitor - carreta)
INSERT INTO carrocerias (id, placa, tipo, marca, modelo, ano, capacidade_kg, capacidade_m3, empresa_id, motorista_id, ativo)
VALUES (
  'c0000001-0000-0000-0000-000000000001',
  'CAR-0001',
  'fechada_bau',
  'Randon',
  'SR BA',
  2021,
  28000,
  100,
  999,
  'e0000001-0000-0000-0000-000000000001',
  true
);

-- Carroceria 2: para veículo XYZ-5678 (Matheus - truck)
INSERT INTO carrocerias (id, placa, tipo, marca, modelo, ano, capacidade_kg, capacidade_m3, empresa_id, motorista_id, ativo)
VALUES (
  'c0000001-0000-0000-0000-000000000002',
  'CAR-0002',
  'fechada_bau',
  'Facchini',
  'FX12',
  2020,
  14000,
  60,
  999,
  'e0000001-0000-0000-0000-000000000002',
  true
);

-- Carroceria 3: para veículo DEF-9012 (Álvaro - toco)
INSERT INTO carrocerias (id, placa, tipo, marca, modelo, ano, capacidade_kg, capacidade_m3, empresa_id, motorista_id, ativo)
VALUES (
  'c0000001-0000-0000-0000-000000000003',
  'CAR-0003',
  'sider',
  'Guerra',
  'GR-S',
  2019,
  10000,
  45,
  999,
  'e0000001-0000-0000-0000-000000000003',
  true
);

-- Carroceria 4: para veículo GHI-3456 (Gesse - bitrem)
INSERT INTO carrocerias (id, placa, tipo, marca, modelo, ano, capacidade_kg, capacidade_m3, empresa_id, motorista_id, ativo)
VALUES (
  'c0000001-0000-0000-0000-000000000004',
  'CAR-0004',
  'graneleira',
  'Noma',
  'NGR',
  2022,
  57000,
  90,
  999,
  '600d7cff-e4c4-40a8-94c3-0788c4239074',
  true
);