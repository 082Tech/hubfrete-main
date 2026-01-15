-- 1. Atualizar endereços de destino com informações B2B realistas (empresas de verdade)
UPDATE public.enderecos_carga 
SET contato_nome = 'Metalúrgica São Paulo Ltda', 
    contato_telefone = '(11) 3456-7890'
WHERE id = '95ef0102-51c6-4cbc-b266-bc94eb6b76d4';

UPDATE public.enderecos_carga 
SET contato_nome = 'Porto de Santos S.A.', 
    contato_telefone = '(13) 3202-6565'
WHERE id = 'f55a484a-a043-4e96-87bc-b31d14c0f7d1';

UPDATE public.enderecos_carga 
SET contato_nome = 'Alunorte - Alumina do Norte do Brasil S.A.', 
    contato_telefone = '(91) 3322-5500'
WHERE id = '0a42ced1-5a37-4d22-8bc8-294a4bf5dc46';

UPDATE public.enderecos_carga 
SET contato_nome = 'Distribuidora Maranhense de Alimentos Ltda', 
    contato_telefone = '(98) 3232-4545'
WHERE id = 'f709e507-b29a-4141-8ea1-c99ab3ec61b9';

UPDATE public.enderecos_carga 
SET contato_nome = 'Indústria Curitibana de Autopeças S.A.', 
    contato_telefone = '(41) 3333-8800'
WHERE id = 'fcf1d41e-ead3-4b74-bd23-599462f73a7d';

UPDATE public.enderecos_carga 
SET contato_nome = 'Comércio Atacadista Belém Ltda', 
    contato_telefone = '(91) 3212-9900'
WHERE id = 'f5517f87-6fc4-4030-9d8a-695121f64782';

-- 2. Atualizar a carga "publicada" com progresso de alocação (1500kg -> 800kg já alocados, 700kg disponíveis)
UPDATE public.cargas 
SET peso_disponivel_kg = 700.00
WHERE id = 'a2912f8f-e841-4d2e-b01c-69e4ddc853c9';

-- Criar entrega parcial para essa carga
INSERT INTO public.entregas (carga_id, status, peso_alocado_kg, valor_frete, motorista_id, veiculo_id)
VALUES ('a2912f8f-e841-4d2e-b01c-69e4ddc853c9', 'aguardando_coleta', 800, 120.00, 'e0000001-0000-0000-0000-000000000001', 'f0000001-0000-0000-0000-000000000001');

-- 3. Atualizar outra carga publicada da Filial SP para ter progresso
UPDATE public.cargas 
SET peso_disponivel_kg = 200.00
WHERE id = 'c1000001-0000-0000-0000-000000000001';

-- Criar entrega para carga da Filial SP
INSERT INTO public.entregas (carga_id, status, peso_alocado_kg, valor_frete, motorista_id, veiculo_id)
VALUES ('c1000001-0000-0000-0000-000000000001', 'em_coleta', 300, 40.50, 'e0000001-0000-0000-0000-000000000002', 'f0000001-0000-0000-0000-000000000002');

-- 4. Atualizar carga em_cotacao com algum progresso também
UPDATE public.cargas 
SET peso_disponivel_kg = 18000.00
WHERE id = 'b0000001-0000-0000-0000-000000000001';

-- Criar entrega parcial para carga em_cotacao
INSERT INTO public.entregas (carga_id, status, peso_alocado_kg, valor_frete, motorista_id, veiculo_id)
VALUES ('b0000001-0000-0000-0000-000000000001', 'aguardando_coleta', 7000, 840.00, 'e0000001-0000-0000-0000-000000000003', 'f0000001-0000-0000-0000-000000000003');

-- 5. Atualizar endereço de destino da carga original de teste para ter nome de empresa B2B
UPDATE public.enderecos_carga 
SET contato_nome = 'Distribuidora Eletrônica Campinas Ltda', 
    contato_telefone = '(19) 3242-5678'
WHERE id IN (
    SELECT endereco_destino_id FROM cargas WHERE id = 'a2912f8f-e841-4d2e-b01c-69e4ddc853c9'
);

-- 6. Atualizar endereço de origem com nome B2B
UPDATE public.enderecos_carga 
SET contato_nome = 'Carajás Mineração e Logística S.A.', 
    contato_telefone = '(94) 3346-1234'
WHERE id IN (
    SELECT endereco_origem_id FROM cargas WHERE id = 'a2912f8f-e841-4d2e-b01c-69e4ddc853c9'
);