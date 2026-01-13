-- Inserir empresa para transportadora de teste
INSERT INTO public.empresas (id, tipo, classe) 
VALUES (4, 'TRANSPORTADORA', 'COMÉRCIO')
ON CONFLICT (id) DO NOTHING;

-- Inserir transportadora de teste
INSERT INTO public.transportadoras (id, user_id, razao_social, nome_fantasia, cnpj, cidade, estado, ativo, empresa_id)
VALUES 
  ('c1234567-0000-0000-0000-000000000001', '535b9b9b-3541-496c-82b6-86e337470634', 'TransNorte Logística Ltda', 'TransNorte', '98.765.432/0001-10', 'Belém', 'PA', true, 4),
  ('c1234567-0000-0000-0000-000000000002', '535b9b9b-3541-496c-82b6-86e337470634', 'Rápido Pará Transportes', 'Rápido Pará', '87.654.321/0001-20', 'Marabá', 'PA', true, 4),
  ('c1234567-0000-0000-0000-000000000003', '535b9b9b-3541-496c-82b6-86e337470634', 'LogBrasil Cargas', 'LogBrasil', '76.543.210/0001-30', 'São Luís', 'MA', true, 4)
ON CONFLICT (id) DO NOTHING;

-- Inserir mais cargas de teste
INSERT INTO public.cargas (id, codigo, embarcador_id, descricao, tipo, peso_kg, status, valor_mercadoria, data_coleta_de, data_coleta_ate, data_entrega_limite)
VALUES 
  ('b0000001-0000-0000-0000-000000000001', 'CRG-2026-0002', 'f4396acb-86fa-4e2d-9e41-347c14516ca0', 'Minério de Cobre - Lote B', 'granel_solido', 25000, 'em_cotacao', 150000, '2026-01-15', '2026-01-16', '2026-01-20'),
  ('b0000001-0000-0000-0000-000000000002', 'CRG-2026-0003', 'f4396acb-86fa-4e2d-9e41-347c14516ca0', 'Equipamentos Industriais', 'carga_seca', 5000, 'aceita', 85000, '2026-01-14', '2026-01-14', '2026-01-18'),
  ('b0000001-0000-0000-0000-000000000003', 'CRG-2026-0004', 'f4396acb-86fa-4e2d-9e41-347c14516ca0', 'Peças de Reposição', 'carga_seca', 1200, 'em_transito', 45000, '2026-01-12', '2026-01-12', '2026-01-16'),
  ('b0000001-0000-0000-0000-000000000004', 'CRG-2026-0005', 'f4396acb-86fa-4e2d-9e41-347c14516ca0', 'Componentes Elétricos', 'carga_seca', 800, 'em_transito', 62000, '2026-01-13', '2026-01-13', '2026-01-17'),
  ('b0000001-0000-0000-0000-000000000005', 'CRG-2026-0006', 'f4396acb-86fa-4e2d-9e41-347c14516ca0', 'Material de Escritório', 'carga_seca', 300, 'em_coleta', 12000, '2026-01-13', '2026-01-13', '2026-01-15'),
  ('b0000001-0000-0000-0000-000000000006', 'CRG-2026-0007', 'f4396acb-86fa-4e2d-9e41-347c14516ca0', 'Produtos Alimentícios', 'refrigerada', 2000, 'entregue', 35000, '2026-01-08', '2026-01-08', '2026-01-10')
ON CONFLICT (id) DO NOTHING;

-- Inserir endereços para as cargas
INSERT INTO public.enderecos_carga (carga_id, tipo, logradouro, cidade, estado, cep)
VALUES 
  ('b0000001-0000-0000-0000-000000000001', 'origem', 'Rua das Minas, 100', 'Marabá', 'PA', '68500-000'),
  ('b0000001-0000-0000-0000-000000000001', 'destino', 'Porto de Barcarena, s/n', 'Barcarena', 'PA', '68445-000'),
  ('b0000001-0000-0000-0000-000000000002', 'origem', 'Av. Industrial, 500', 'São Paulo', 'SP', '01310-000'),
  ('b0000001-0000-0000-0000-000000000002', 'destino', 'Rod. PA-275, km 45', 'Parauapebas', 'PA', '68515-000'),
  ('b0000001-0000-0000-0000-000000000003', 'origem', 'Rua dos Mecânicos, 200', 'Curitiba', 'PR', '80010-000'),
  ('b0000001-0000-0000-0000-000000000003', 'destino', 'Av. Principal, 1000', 'Marabá', 'PA', '68500-100'),
  ('b0000001-0000-0000-0000-000000000004', 'origem', 'Av. Paulista, 1000', 'São Paulo', 'SP', '01310-100'),
  ('b0000001-0000-0000-0000-000000000004', 'destino', 'Rod. PA-275, km 50', 'Parauapebas', 'PA', '68515-100'),
  ('b0000001-0000-0000-0000-000000000005', 'origem', 'Rua do Comércio, 50', 'Belém', 'PA', '66010-000'),
  ('b0000001-0000-0000-0000-000000000005', 'destino', 'Av. Central, 200', 'São Luís', 'MA', '65010-000'),
  ('b0000001-0000-0000-0000-000000000006', 'origem', 'Rua das Frutas, 100', 'Belém', 'PA', '66020-000'),
  ('b0000001-0000-0000-0000-000000000006', 'destino', 'Mercado Central, s/n', 'Parauapebas', 'PA', '68515-200')
ON CONFLICT DO NOTHING;

-- Inserir cotações de teste
INSERT INTO public.cotacoes (id, carga_id, transportadora_id, valor_proposto, prazo_entrega_dias, status, observacoes)
VALUES 
  ('d0000001-0000-0000-0000-000000000001', 'b0000001-0000-0000-0000-000000000001', 'c1234567-0000-0000-0000-000000000001', 7800, 3, 'pendente', 'Veículo disponível imediatamente'),
  ('d0000001-0000-0000-0000-000000000002', 'b0000001-0000-0000-0000-000000000001', 'c1234567-0000-0000-0000-000000000002', 8200, 2, 'pendente', 'Frete expresso com rastreamento'),
  ('d0000001-0000-0000-0000-000000000003', 'b0000001-0000-0000-0000-000000000001', 'c1234567-0000-0000-0000-000000000003', 7500, 4, 'pendente', 'Melhor custo-benefício'),
  ('d0000001-0000-0000-0000-000000000004', 'b0000001-0000-0000-0000-000000000002', 'c1234567-0000-0000-0000-000000000001', 12500, 5, 'aceita', 'Carga especial com seguro'),
  ('d0000001-0000-0000-0000-000000000005', 'b0000001-0000-0000-0000-000000000003', 'c1234567-0000-0000-0000-000000000002', 6800, 4, 'aceita', NULL),
  ('d0000001-0000-0000-0000-000000000006', 'b0000001-0000-0000-0000-000000000004', 'c1234567-0000-0000-0000-000000000003', 5200, 4, 'aceita', NULL),
  ('d0000001-0000-0000-0000-000000000007', 'b0000001-0000-0000-0000-000000000005', 'c1234567-0000-0000-0000-000000000001', 2800, 2, 'aceita', NULL),
  ('d0000001-0000-0000-0000-000000000008', 'b0000001-0000-0000-0000-000000000006', 'c1234567-0000-0000-0000-000000000002', 4500, 2, 'aceita', NULL)
ON CONFLICT (id) DO NOTHING;

-- Inserir motoristas de teste
INSERT INTO public.motoristas (id, user_id, transportadora_id, nome_completo, cpf, cnh, categoria_cnh, validade_cnh, telefone, email, ativo)
VALUES 
  ('e0000001-0000-0000-0000-000000000001', '535b9b9b-3541-496c-82b6-86e337470634', 'c1234567-0000-0000-0000-000000000001', 'João Silva', '111.222.333-44', '12345678901', 'E', '2027-12-31', '(94) 99999-1234', 'joao.silva@email.com', true),
  ('e0000001-0000-0000-0000-000000000002', '535b9b9b-3541-496c-82b6-86e337470634', 'c1234567-0000-0000-0000-000000000002', 'Carlos Mendes', '222.333.444-55', '23456789012', 'E', '2028-06-30', '(11) 98888-5678', 'carlos.mendes@email.com', true),
  ('e0000001-0000-0000-0000-000000000003', '535b9b9b-3541-496c-82b6-86e337470634', 'c1234567-0000-0000-0000-000000000003', 'Pedro Santos', '333.444.555-66', '34567890123', 'D', '2027-08-15', '(91) 97777-9012', 'pedro.santos@email.com', true)
ON CONFLICT (id) DO NOTHING;

-- Inserir veículos de teste
INSERT INTO public.veiculos (id, transportadora_id, motorista_id, placa, tipo, carroceria, marca, modelo, capacidade_kg, ativo)
VALUES 
  ('f0000001-0000-0000-0000-000000000001', 'c1234567-0000-0000-0000-000000000001', 'e0000001-0000-0000-0000-000000000001', 'ABC-1234', 'carreta', 'fechada_bau', 'Scania', 'R450', 30000, true),
  ('f0000001-0000-0000-0000-000000000002', 'c1234567-0000-0000-0000-000000000002', 'e0000001-0000-0000-0000-000000000002', 'XYZ-5678', 'truck', 'fechada_bau', 'Volvo', 'FH540', 25000, true),
  ('f0000001-0000-0000-0000-000000000003', 'c1234567-0000-0000-0000-000000000003', 'e0000001-0000-0000-0000-000000000003', 'DEF-9012', 'toco', 'sider', 'Mercedes', 'Atego', 12000, true)
ON CONFLICT (id) DO NOTHING;

-- Inserir entregas de teste (usando UUIDs válidos começando com letras a-f)
INSERT INTO public.entregas (id, carga_id, transportadora_id, motorista_id, veiculo_id, cotacao_id, status, latitude_atual, longitude_atual, observacoes, coletado_em, entregue_em)
VALUES 
  ('a0000001-0000-0000-0000-000000000001', 'b0000001-0000-0000-0000-000000000003', 'c1234567-0000-0000-0000-000000000002', 'e0000001-0000-0000-0000-000000000001', 'f0000001-0000-0000-0000-000000000002', 'd0000001-0000-0000-0000-000000000005', 'em_transito', -16.6799, -49.2533, 'Próximo a Goiânia, GO', '2026-01-12 08:00:00', NULL),
  ('a0000001-0000-0000-0000-000000000002', 'b0000001-0000-0000-0000-000000000004', 'c1234567-0000-0000-0000-000000000003', 'e0000001-0000-0000-0000-000000000002', 'f0000001-0000-0000-0000-000000000003', 'd0000001-0000-0000-0000-000000000006', 'em_transito', -10.2128, -48.3603, 'Próximo a Palmas, TO', '2026-01-13 07:00:00', NULL),
  ('a0000001-0000-0000-0000-000000000003', 'b0000001-0000-0000-0000-000000000005', 'c1234567-0000-0000-0000-000000000001', 'e0000001-0000-0000-0000-000000000003', 'f0000001-0000-0000-0000-000000000001', 'd0000001-0000-0000-0000-000000000007', 'em_coleta', -1.4558, -48.4902, 'Saindo de Belém, PA', NULL, NULL),
  ('a0000001-0000-0000-0000-000000000004', 'b0000001-0000-0000-0000-000000000006', 'c1234567-0000-0000-0000-000000000002', 'e0000001-0000-0000-0000-000000000001', 'f0000001-0000-0000-0000-000000000002', 'd0000001-0000-0000-0000-000000000008', 'entregue', -6.0652, -49.9237, 'Entregue com sucesso', '2026-01-08 06:00:00', '2026-01-10 14:30:00')
ON CONFLICT (id) DO NOTHING;