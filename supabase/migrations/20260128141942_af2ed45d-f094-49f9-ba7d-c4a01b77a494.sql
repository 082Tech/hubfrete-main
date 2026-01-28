-- Create test vehicle for Alvaro Teste (autonomous driver)
INSERT INTO veiculos (
  placa,
  tipo,
  carroceria,
  marca,
  modelo,
  ano,
  capacidade_kg,
  capacidade_m3,
  motorista_id,
  ativo,
  carroceria_integrada,
  uf
) VALUES (
  'TST0001',
  'carreta',
  'bau',
  'Volvo',
  'FH 540',
  2022,
  30000,
  90,
  'c116a946-14c2-449b-a392-f238fabc9aac',
  true,
  false,
  'SP'
);

-- Create test carroceria for Alvaro Teste
INSERT INTO carrocerias (
  placa,
  tipo,
  marca,
  modelo,
  ano,
  capacidade_kg,
  capacidade_m3,
  motorista_id,
  ativo
) VALUES (
  'TST0002',
  'bau',
  'Randon',
  'SR BA',
  2021,
  28000,
  85,
  'c116a946-14c2-449b-a392-f238fabc9aac',
  true
);

-- Create test cargo from HubFrete (empresa_id=2, filial_id=2)
INSERT INTO cargas (
  codigo,
  descricao,
  tipo,
  peso_kg,
  peso_disponivel_kg,
  volume_m3,
  empresa_id,
  filial_id,
  status,
  valor_mercadoria,
  valor_frete_tonelada,
  data_coleta_de,
  data_coleta_ate,
  data_entrega_limite
) VALUES (
  NULL,
  'CARGA TESTE - Para testes do sistema',
  'carga_seca',
  15000,
  15000,
  45,
  2,
  2,
  'publicada',
  50000,
  150,
  NOW(),
  NOW() + INTERVAL '2 days',
  NOW() + INTERVAL '5 days'
);