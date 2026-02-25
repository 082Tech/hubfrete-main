
-- Remove unique constraint to allow fractional loads (multiple entregas per carga)
ALTER TABLE entregas DROP CONSTRAINT IF EXISTS entregas_carga_id_key;

-- Now insert the remaining test data

-- Carga fracionada em trânsito (2 entregas)
INSERT INTO enderecos_carga (id, tipo, logradouro, numero, bairro, cidade, estado, cep, latitude, longitude, contato_nome)
VALUES 
  ('11111111-0006-0006-0006-000000000001', 'origem', 'Av. Principal', '1500', 'Industrial', 'Parauapebas', 'PA', '68515-000', -6.0700, -49.9100, 'Armazém Geral'),
  ('11111111-0006-0006-0006-000000000002', 'destino', 'Rod. BR-101', 'km 150', 'Zona Portuária', 'Vitória', 'ES', '29090-000', -20.3155, -40.3128, 'Terminal de Cargas');

INSERT INTO cargas (id, codigo, descricao, tipo, peso_kg, peso_disponivel_kg, valor_mercadoria, valor_frete_tonelada, status, filial_id, empresa_id, endereco_origem_id, endereco_destino_id, data_coleta_de, permite_fracionado, carga_perigosa, numero_onu)
VALUES (
  '22222222-0006-0006-0006-000000000001',
  'CRG-2026-0022',
  'Produtos Químicos',
  'perigosa',
  20000,
  0,
  280000.00,
  200.00,
  'em_transito',
  2, 2,
  '11111111-0006-0006-0006-000000000001', '11111111-0006-0006-0006-000000000002',
  '2026-01-12',
  true,
  true, '1203'
);

INSERT INTO entregas (id, carga_id, status, peso_alocado_kg, valor_frete, motorista_id, veiculo_id, coletado_em)
VALUES 
  ('33333333-0006-0006-0006-000000000001', '22222222-0006-0006-0006-000000000001', 'em_transito', 12000, 2400.00, 'e0000001-0000-0000-0000-000000000001', 'f0000001-0000-0000-0000-000000000001', '2026-01-13 06:00:00+00'),
  ('33333333-0006-0006-0006-000000000002', '22222222-0006-0006-0006-000000000001', 'em_transito', 8000, 1600.00, 'e0000001-0000-0000-0000-000000000002', 'f0000001-0000-0000-0000-000000000002', '2026-01-13 09:00:00+00');

-- Historical data - carga fracionada com múltiplas entregas

INSERT INTO enderecos_carga (id, tipo, logradouro, numero, bairro, cidade, estado, cep, latitude, longitude, contato_nome)
VALUES 
  ('11111111-0008-0008-0008-000000000001', 'origem', 'Rod. PA-275', 'km 80', 'Zona Rural', 'Curionópolis', 'PA', '68488-000', -6.0980, -49.6050, 'Mineradora'),
  ('11111111-0008-0008-0008-000000000002', 'destino', 'Av. Santos Dumont', '2000', 'Aldeota', 'Fortaleza', 'CE', '60150-160', -3.7319, -38.5267, 'Distribuidora');

INSERT INTO cargas (id, codigo, descricao, tipo, peso_kg, peso_disponivel_kg, valor_mercadoria, valor_frete_tonelada, status, filial_id, empresa_id, endereco_origem_id, endereco_destino_id, data_coleta_de, permite_fracionado)
VALUES (
  '22222222-0008-0008-0008-000000000001',
  'CRG-2026-0031',
  'Equipamentos Eletrônicos',
  'carga_seca',
  6000,
  0,
  180000.00,
  140.00,
  'entregue',
  2, 2,
  '11111111-0008-0008-0008-000000000001', '11111111-0008-0008-0008-000000000002',
  '2026-01-03',
  true
);

INSERT INTO entregas (id, carga_id, status, peso_alocado_kg, valor_frete, motorista_id, veiculo_id, coletado_em, entregue_em, observacoes)
VALUES 
  ('33333333-0008-0008-0008-000000000001', '22222222-0008-0008-0008-000000000001', 'entregue', 4000, 560.00, 'e0000001-0000-0000-0000-000000000002', 'f0000001-0000-0000-0000-000000000002', '2026-01-03 08:00:00+00', '2026-01-06 11:00:00+00', NULL),
  ('33333333-0008-0008-0008-000000000002', '22222222-0008-0008-0008-000000000001', 'problema', 2000, 280.00, 'e0000001-0000-0000-0000-000000000003', 'f0000001-0000-0000-0000-000000000003', '2026-01-03 10:00:00+00', NULL, 'Avaria durante transporte - carga danificada');

-- More historical data

INSERT INTO enderecos_carga (id, tipo, logradouro, numero, bairro, cidade, estado, cep, latitude, longitude, contato_nome)
VALUES 
  ('11111111-0009-0009-0009-000000000001', 'origem', 'Rua A', '50', 'Industrial', 'Parauapebas', 'PA', '68515-000', -6.0700, -49.9050, 'Depósito'),
  ('11111111-0009-0009-0009-000000000002', 'destino', 'Av. B', '300', 'Centro', 'Brasília', 'DF', '70040-010', -15.7942, -47.8822, 'Cliente Final');

INSERT INTO cargas (id, codigo, descricao, tipo, peso_kg, peso_disponivel_kg, valor_mercadoria, valor_frete_tonelada, status, filial_id, empresa_id, endereco_origem_id, endereco_destino_id, data_coleta_de)
VALUES (
  '22222222-0009-0009-0009-000000000001',
  'CRG-2026-0032',
  'Materiais de Construção',
  'carga_seca',
  8000,
  0,
  45000.00,
  90.00,
  'cancelada',
  2, 2,
  '11111111-0009-0009-0009-000000000001', '11111111-0009-0009-0009-000000000002',
  '2026-01-02'
);

INSERT INTO entregas (id, carga_id, status, peso_alocado_kg, valor_frete, motorista_id, veiculo_id, coletado_em, observacoes)
VALUES (
  '33333333-0009-0009-0009-000000000001',
  '22222222-0009-0009-0009-000000000001',
  'devolvida',
  8000,
  720.00,
  'e0000001-0000-0000-0000-000000000001',
  'f0000001-0000-0000-0000-000000000001',
  '2026-01-02 07:30:00+00',
  'Cliente recusou recebimento - endereço incorreto'
);
