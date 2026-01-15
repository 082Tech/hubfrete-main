
-- Add more published cargas for better testing

-- Carga publicada #1 - Carga Seca
INSERT INTO enderecos_carga (id, tipo, logradouro, numero, bairro, cidade, estado, cep, latitude, longitude, contato_nome)
VALUES 
  ('11111111-0001-0001-0001-000000000001', 'origem', 'Rodovia PA-160, km 45', 's/n', 'Zona Industrial', 'Parauapebas', 'PA', '68515-000', -6.0679, -49.9032, 'Centro de Distribuição'),
  ('11111111-0001-0001-0001-000000000002', 'destino', 'Av. Brasil', '2500', 'Centro', 'Belém', 'PA', '66015-000', -1.4557, -48.4902, 'Depósito Central')
ON CONFLICT (id) DO NOTHING;

INSERT INTO cargas (id, codigo, descricao, tipo, peso_kg, peso_disponivel_kg, valor_mercadoria, valor_frete_tonelada, status, filial_id, empresa_id, endereco_origem_id, endereco_destino_id, data_coleta_de, data_coleta_ate, permite_fracionado)
VALUES (
  '22222222-0001-0001-0001-000000000001',
  'CRG-2026-0010',
  'Produtos Siderúrgicos - Vergalhões',
  'carga_seca',
  15000,
  15000,
  180000.00,
  95.00,
  'publicada',
  2, 2,
  '11111111-0001-0001-0001-000000000001', '11111111-0001-0001-0001-000000000002',
  '2026-01-20', '2026-01-25',
  true
)
ON CONFLICT (id) DO NOTHING;

-- Carga publicada #2 - Granel
INSERT INTO enderecos_carga (id, tipo, logradouro, numero, bairro, cidade, estado, cep, latitude, longitude, contato_nome)
VALUES 
  ('11111111-0002-0002-0002-000000000001', 'origem', 'Mina S11D', 's/n', 'Serra dos Carajás', 'Canaã dos Carajás', 'PA', '68537-000', -6.4256, -50.2889, 'Mina Principal'),
  ('11111111-0002-0002-0002-000000000002', 'destino', 'Porto de Itaqui', 's/n', 'Zona Portuária', 'São Luís', 'MA', '65085-370', -2.5553, -44.3509, 'Terminal Portuário')
ON CONFLICT (id) DO NOTHING;

INSERT INTO cargas (id, codigo, descricao, tipo, peso_kg, peso_disponivel_kg, valor_mercadoria, valor_frete_tonelada, status, filial_id, empresa_id, endereco_origem_id, endereco_destino_id, data_coleta_de, data_coleta_ate, permite_fracionado)
VALUES (
  '22222222-0002-0002-0002-000000000001',
  'CRG-2026-0011',
  'Minério de Ferro - Exportação',
  'granel_solido',
  45000,
  45000,
  350000.00,
  85.00,
  'publicada',
  2, 2,
  '11111111-0002-0002-0002-000000000001', '11111111-0002-0002-0002-000000000002',
  '2026-01-18', '2026-01-22',
  true
)
ON CONFLICT (id) DO NOTHING;

-- Carga publicada #3 - Refrigerada
INSERT INTO enderecos_carga (id, tipo, logradouro, numero, bairro, cidade, estado, cep, latitude, longitude, contato_nome)
VALUES 
  ('11111111-0003-0003-0003-000000000001', 'origem', 'Av. Industrial', '500', 'Distrito Industrial', 'Marabá', 'PA', '68507-000', -5.3685, -49.1176, 'Frigorífico Norte'),
  ('11111111-0003-0003-0003-000000000002', 'destino', 'Rua das Palmeiras', '1200', 'Jardim Europa', 'Goiânia', 'GO', '74310-240', -16.6869, -49.2648, 'Atacadão Alimentos')
ON CONFLICT (id) DO NOTHING;

INSERT INTO cargas (id, codigo, descricao, tipo, peso_kg, peso_disponivel_kg, valor_mercadoria, valor_frete_tonelada, status, filial_id, empresa_id, endereco_origem_id, endereco_destino_id, data_coleta_de, data_coleta_ate, permite_fracionado, requer_refrigeracao, temperatura_min, temperatura_max)
VALUES (
  '22222222-0003-0003-0003-000000000001',
  'CRG-2026-0012',
  'Carnes Congeladas - Exportação',
  'refrigerada',
  8000,
  8000,
  120000.00,
  180.00,
  'publicada',
  2, 2,
  '11111111-0003-0003-0003-000000000001', '11111111-0003-0003-0003-000000000002',
  '2026-01-17', '2026-01-18',
  false,
  true, -18, -10
)
ON CONFLICT (id) DO NOTHING;

-- More active loads (em_transito, em_coleta)
INSERT INTO enderecos_carga (id, tipo, logradouro, numero, bairro, cidade, estado, cep, latitude, longitude, contato_nome)
VALUES 
  ('11111111-0004-0004-0004-000000000001', 'origem', 'Rod. BR-155', 'km 30', 'Zona Rural', 'Eldorado dos Carajás', 'PA', '68488-000', -6.1083, -49.3544, 'Fazenda São João'),
  ('11111111-0004-0004-0004-000000000002', 'destino', 'Av. Paulista', '1000', 'Bela Vista', 'São Paulo', 'SP', '01310-100', -23.5505, -46.6333, 'Escritório Central')
ON CONFLICT (id) DO NOTHING;

INSERT INTO cargas (id, codigo, descricao, tipo, peso_kg, peso_disponivel_kg, valor_mercadoria, valor_frete_tonelada, status, filial_id, empresa_id, endereco_origem_id, endereco_destino_id, data_coleta_de)
VALUES (
  '22222222-0004-0004-0004-000000000001',
  'CRG-2026-0020',
  'Máquinas Agrícolas',
  'indivisivel',
  12000,
  0,
  450000.00,
  150.00,
  'em_transito',
  2, 2,
  '11111111-0004-0004-0004-000000000001', '11111111-0004-0004-0004-000000000002',
  '2026-01-10'
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO entregas (id, carga_id, status, peso_alocado_kg, valor_frete, motorista_id, veiculo_id, coletado_em)
VALUES (
  '33333333-0004-0004-0004-000000000001',
  '22222222-0004-0004-0004-000000000001',
  'em_transito',
  12000,
  1800.00,
  'e0000001-0000-0000-0000-000000000002',
  'f0000001-0000-0000-0000-000000000002',
  '2026-01-11 08:30:00+00'
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO enderecos_carga (id, tipo, logradouro, numero, bairro, cidade, estado, cep, latitude, longitude, contato_nome)
VALUES 
  ('11111111-0005-0005-0005-000000000001', 'origem', 'Rua dos Mineiros', '200', 'Centro', 'Parauapebas', 'PA', '68515-000', -6.0679, -49.9032, 'Depósito Local'),
  ('11111111-0005-0005-0005-000000000002', 'destino', 'Av. Beira Mar', '3500', 'Meireles', 'Fortaleza', 'CE', '60165-121', -3.7319, -38.5267, 'Centro Comercial')
ON CONFLICT (id) DO NOTHING;

INSERT INTO cargas (id, codigo, descricao, tipo, peso_kg, peso_disponivel_kg, valor_mercadoria, valor_frete_tonelada, status, filial_id, empresa_id, endereco_origem_id, endereco_destino_id, data_coleta_de)
VALUES (
  '22222222-0005-0005-0005-000000000001',
  'CRG-2026-0021',
  'Peças Automotivas',
  'carga_seca',
  3500,
  0,
  85000.00,
  120.00,
  'em_coleta',
  2, 2,
  '11111111-0005-0005-0005-000000000001', '11111111-0005-0005-0005-000000000002',
  '2026-01-15'
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO entregas (id, carga_id, status, peso_alocado_kg, valor_frete, motorista_id, veiculo_id)
VALUES (
  '33333333-0005-0005-0005-000000000001',
  '22222222-0005-0005-0005-000000000001',
  'em_coleta',
  3500,
  420.00,
  'e0000001-0000-0000-0000-000000000003',
  'f0000001-0000-0000-0000-000000000003'
)
ON CONFLICT (id) DO NOTHING;

-- Historical #1 - Entregue
INSERT INTO enderecos_carga (id, tipo, logradouro, numero, bairro, cidade, estado, cep, latitude, longitude, contato_nome)
VALUES 
  ('11111111-0007-0007-0007-000000000001', 'origem', 'Av. Industrial', '100', 'Centro', 'Parauapebas', 'PA', '68515-000', -6.0679, -49.9032, 'Fábrica Local'),
  ('11111111-0007-0007-0007-000000000002', 'destino', 'Rua do Comércio', '500', 'Centro', 'Rio de Janeiro', 'RJ', '20040-020', -22.9068, -43.1729, 'Loja Central')
ON CONFLICT (id) DO NOTHING;

INSERT INTO cargas (id, codigo, descricao, tipo, peso_kg, peso_disponivel_kg, valor_mercadoria, valor_frete_tonelada, status, filial_id, empresa_id, endereco_origem_id, endereco_destino_id, data_coleta_de)
VALUES (
  '22222222-0007-0007-0007-000000000001',
  'CRG-2026-0030',
  'Móveis Residenciais',
  'carga_seca',
  4500,
  0,
  75000.00,
  110.00,
  'entregue',
  2, 2,
  '11111111-0007-0007-0007-000000000001', '11111111-0007-0007-0007-000000000002',
  '2026-01-05'
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO entregas (id, carga_id, status, peso_alocado_kg, valor_frete, motorista_id, veiculo_id, coletado_em, entregue_em)
VALUES (
  '33333333-0007-0007-0007-000000000001',
  '22222222-0007-0007-0007-000000000001',
  'entregue',
  4500,
  495.00,
  'e0000001-0000-0000-0000-000000000001',
  'f0000001-0000-0000-0000-000000000001',
  '2026-01-05 07:00:00+00',
  '2026-01-08 14:30:00+00'
)
ON CONFLICT (id) DO NOTHING;
