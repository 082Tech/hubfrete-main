-- Atualizar cargas existentes com valor_frete_tonelada
UPDATE public.cargas SET valor_frete_tonelada = 150.00 WHERE id = 'a2912f8f-e841-4d2e-b01c-69e4ddc853c9';
UPDATE public.cargas SET valor_frete_tonelada = 120.00 WHERE id = 'b0000001-0000-0000-0000-000000000001';
UPDATE public.cargas SET valor_frete_tonelada = 130.00 WHERE id = 'b0000001-0000-0000-0000-000000000002';
UPDATE public.cargas SET valor_frete_tonelada = 145.00 WHERE id = 'b0000001-0000-0000-0000-000000000003';
UPDATE public.cargas SET valor_frete_tonelada = 160.00 WHERE id = 'b0000001-0000-0000-0000-000000000004';
UPDATE public.cargas SET valor_frete_tonelada = 180.00 WHERE id = 'b0000001-0000-0000-0000-000000000005';
UPDATE public.cargas SET valor_frete_tonelada = 140.00 WHERE id = 'b0000001-0000-0000-0000-000000000006';
UPDATE public.cargas SET valor_frete_tonelada = 135.00 WHERE id = 'c1000001-0000-0000-0000-000000000001';
UPDATE public.cargas SET valor_frete_tonelada = 155.00 WHERE id = 'c1000001-0000-0000-0000-000000000002';

-- Atualizar entregas existentes com peso_alocado_kg e valor_frete
UPDATE public.entregas SET peso_alocado_kg = 1200, valor_frete = 174.00 WHERE id = 'a0000001-0000-0000-0000-000000000001';
UPDATE public.entregas SET peso_alocado_kg = 800, valor_frete = 128.00 WHERE id = 'a0000001-0000-0000-0000-000000000002';
UPDATE public.entregas SET peso_alocado_kg = 300, valor_frete = 54.00 WHERE id = 'a0000001-0000-0000-0000-000000000003';
UPDATE public.entregas SET peso_alocado_kg = 2000, valor_frete = 280.00, entregue_em = NOW() - INTERVAL '3 days' WHERE id = 'a0000001-0000-0000-0000-000000000004';

-- Criar mais cargas para histórico com empresa_id=2 e filial_id=2 corretos
INSERT INTO public.cargas (codigo, descricao, tipo, peso_kg, peso_disponivel_kg, valor_mercadoria, valor_frete_tonelada, status, filial_id, empresa_id, endereco_origem_id, endereco_destino_id, publicada_em, updated_at)
VALUES 
  ('CRG-2025-0050', 'Minério de ferro para exportação', 'granel_solido', 30000, 0, 180000.00, 95.00, 'entregue', 2, 2, 'fcf1d41e-ead3-4b74-bd23-599462f73a7d', '7d6d3b3d-eb57-4c76-895b-af3f4cfce84d', NOW() - INTERVAL '15 days', NOW() - INTERVAL '5 days'),
  ('CRG-2025-0051', 'Carga refrigerada - alimentos', 'refrigerada', 8000, 0, 95000.00, 180.00, 'entregue', 2, 2, 'fcf1d41e-ead3-4b74-bd23-599462f73a7d', '7d6d3b3d-eb57-4c76-895b-af3f4cfce84d', NOW() - INTERVAL '12 days', NOW() - INTERVAL '7 days'),
  ('CRG-2025-0052', 'Equipamentos industriais', 'carga_seca', 5500, 5500, 220000.00, 200.00, 'cancelada', 2, 2, 'fcf1d41e-ead3-4b74-bd23-599462f73a7d', '7d6d3b3d-eb57-4c76-895b-af3f4cfce84d', NOW() - INTERVAL '10 days', NOW() - INTERVAL '8 days');

-- Criar entregas para as cargas do histórico
INSERT INTO public.entregas (carga_id, status, peso_alocado_kg, valor_frete, entregue_em)
SELECT id, 'entregue', 30000, 2850.00, NOW() - INTERVAL '5 days' FROM cargas WHERE codigo = 'CRG-2025-0050';

INSERT INTO public.entregas (carga_id, status, peso_alocado_kg, valor_frete, entregue_em)
SELECT id, 'entregue', 8000, 1440.00, NOW() - INTERVAL '7 days' FROM cargas WHERE codigo = 'CRG-2025-0051';

INSERT INTO public.entregas (carga_id, status, peso_alocado_kg, valor_frete)
SELECT id, 'devolvida', 5500, 1100.00 FROM cargas WHERE codigo = 'CRG-2025-0052';