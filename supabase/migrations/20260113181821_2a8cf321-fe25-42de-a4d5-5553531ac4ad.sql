-- Create new filial for testing branch switching
INSERT INTO filiais (id, empresa_id, nome, cnpj, cidade, estado, endereco, cep, is_matriz, ativa)
VALUES (100, 2, 'Carajás - Filial SP', '12.345.678/0002-99', 'São Paulo', 'SP', 'Av. Paulista, 1000', '01310-100', false, true);

-- Create 2 test cargas for the new filial
INSERT INTO cargas (id, codigo, descricao, tipo, peso_kg, empresa_id, filial_id, status)
VALUES 
  ('c1000001-0000-0000-0000-000000000001', 'CRG-2026-0100', 'Carga Teste Filial SP #1 - Eletrônicos', 'carga_seca', 500, 2, 100, 'publicada'),
  ('c1000001-0000-0000-0000-000000000002', 'CRG-2026-0101', 'Carga Teste Filial SP #2 - Móveis', 'carga_seca', 1200, 2, 100, 'em_cotacao');

-- Add enderecos for the new cargas
INSERT INTO enderecos_carga (carga_id, tipo, logradouro, cidade, estado, cep)
VALUES 
  ('c1000001-0000-0000-0000-000000000001', 'origem', 'Av. Paulista, 1000', 'São Paulo', 'SP', '01310-100'),
  ('c1000001-0000-0000-0000-000000000001', 'destino', 'Rua das Flores, 500', 'Campinas', 'SP', '13010-001'),
  ('c1000001-0000-0000-0000-000000000002', 'origem', 'Av. Paulista, 1000', 'São Paulo', 'SP', '01310-100'),
  ('c1000001-0000-0000-0000-000000000002', 'destino', 'Rua Principal, 200', 'Santos', 'SP', '11010-001');

-- Add a cotação for the second carga
INSERT INTO cotacoes (id, carga_id, empresa_id, valor_proposto, prazo_entrega_dias, status)
VALUES ('e1000001-0000-0000-0000-000000000001', 'c1000001-0000-0000-0000-000000000002', 4, 2500.00, 3, 'pendente');